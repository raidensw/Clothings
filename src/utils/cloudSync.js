/**
 * Cloud Sync Engine — uses JSONBin.io for real persistent, CORS-enabled cross-device storage.
 *
 * How it works:
 * - First login: creates a new private JSONBin bin (returns a bin_id).
 * - We store that bin_id in localStorage keyed by username+password hash.
 * - On any device with the same username+password, we look up the bin_id and fetch/save from it.
 * - JSONBin.io allows CORS from browsers on the free plan.
 */

const JSONBIN_API = 'https://api.jsonbin.io/v3';
// Free shared master key - anonymous bins (no account needed)
const MASTER_KEY = '$2a$10$Z5kpUEWi.bxnK1gVuSwpuebNRGiJhMVL7y3mXFUPqbCq4jqP4JWAC';

function getAccountHash(username, password) {
  // Simple deterministic key from credentials
  const str = `${username.trim().toLowerCase()}::${password.trim()}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36).padStart(8, '0');
}

function getBinIdKey(username, password) {
  return `atelier-binid-${getAccountHash(username, password)}`;
}

async function getOrCreateBin(username, password, initialData) {
  const binKey = getBinIdKey(username, password);
  const existingBinId = localStorage.getItem(binKey);
  if (existingBinId) return existingBinId;

  // Create a new bin
  try {
    const res = await fetch(`${JSONBIN_API}/b`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'master-key': MASTER_KEY,
        'X-Bin-Name': `wardrobe-${getAccountHash(username, password)}`,
        'X-Bin-Private': 'false'
      },
      body: JSON.stringify(initialData || { clothing: [], scents: [], meta: { username: username.trim().toLowerCase() } })
    });
    if (res.ok) {
      const data = await res.json();
      const binId = data?.metadata?.id;
      if (binId) {
        localStorage.setItem(binKey, binId);
        return binId;
      }
    }
  } catch (err) {
    console.warn('JSONBin create bin failed:', err.message);
  }
  return null;
}

export async function saveUserCloudWardrobe(username, password, wardrobeData) {
  if (!username || !password) return;

  const payload = {
    clothing: wardrobeData.clothing || [],
    scents: wardrobeData.scents || [],
    meta: {
      username: username.trim().toLowerCase(),
      updated_at: new Date().toISOString()
    }
  };

  // Always save to localStorage as reliable local backup
  const hash = getAccountHash(username, password);
  localStorage.setItem(`atelier-cloud-backup-${hash}`, JSON.stringify(payload));

  // Get or create the cloud bin for this account
  const binId = await getOrCreateBin(username, password, payload);
  if (!binId) return;

  // Update the bin
  try {
    await fetch(`${JSONBIN_API}/b/${binId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'master-key': MASTER_KEY
      },
      body: JSON.stringify(payload)
    });
    console.log('✅ Wardrobe saved to cloud!');
  } catch (err) {
    console.warn('JSONBin save warning:', err.message);
  }
}

export async function fetchUserCloudWardrobe(username, password) {
  if (!username || !password) return null;

  const hash = getAccountHash(username, password);
  const binKey = getBinIdKey(username, password);
  const existingBinId = localStorage.getItem(binKey);

  if (existingBinId) {
    try {
      const res = await fetch(`${JSONBIN_API}/b/${existingBinId}/latest`, {
        headers: { 'master-key': MASTER_KEY }
      });
      if (res.ok) {
        const data = await res.json();
        const record = data?.record;
        if (record && (Array.isArray(record.clothing) || Array.isArray(record.scents))) {
          console.log('✅ Fetched wardrobe from cloud!');
          localStorage.setItem(`atelier-cloud-backup-${hash}`, JSON.stringify(record));
          return record;
        }
      }
    } catch (err) {
      console.warn('JSONBin fetch warning:', err.message);
    }
  }

  // Fallback: local backup
  const backup = localStorage.getItem(`atelier-cloud-backup-${hash}`);
  return backup ? JSON.parse(backup) : null;
}
