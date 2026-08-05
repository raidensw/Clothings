// High-Availability Open-CORS Cloud Storage Engine for Mobile <-> PC Sync

export async function saveUserCloudWardrobe(username, userAccountKey, wardrobeData) {
  if (!username || !userAccountKey) return;
  const accountId = `atelier_${username.trim().toLowerCase()}_${userAccountKey.trim().toLowerCase()}`.replace(/[^a-z0-9_]/g, '');

  const payload = {
    username: username.trim(),
    updated_at: new Date().toISOString(),
    clothing: wardrobeData.clothing || [],
    scents: wardrobeData.scents || [],
    presets: wardrobeData.presets || []
  };

  // Always save backup to local storage first
  localStorage.setItem(`atelier-cloud-backup-${accountId}`, JSON.stringify(payload));

  // 1. Sync to public CORS key-value store (keyval.org)
  try {
    const res = await fetch(`https://api.keyval.org/v1/set/${accountId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      console.log('✅ Wardrobe synced to keyval cloud!');
    }
  } catch (err) {
    console.warn('Keyval cloud sync notice:', err.message);
  }

  // 2. Secondary sync to fallback cloud endpoint
  try {
    await fetch(`https://jsonblob.com/api/jsonBlob/${accountId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) {}
}

export async function fetchUserCloudWardrobe(username, userAccountKey) {
  if (!username || !userAccountKey) return null;
  const accountId = `atelier_${username.trim().toLowerCase()}_${userAccountKey.trim().toLowerCase()}`.replace(/[^a-z0-9_]/g, '');

  // 1. Try Keyval Cloud API
  try {
    const res = await fetch(`https://api.keyval.org/v1/get/${accountId}`);
    if (res.ok) {
      const data = await res.json();
      if (data && (Array.isArray(data.clothing) || Array.isArray(data.scents))) {
        console.log('✅ Fetched live wardrobe from Cloud!');
        localStorage.setItem(`atelier-cloud-backup-${accountId}`, JSON.stringify(data));
        return data;
      }
    }
  } catch (err) {
    console.warn('Keyval cloud fetch notice:', err.message);
  }

  // 2. Try JSONBlob Cloud API
  try {
    const res = await fetch(`https://jsonblob.com/api/jsonBlob/${accountId}`);
    if (res.ok) {
      const data = await res.json();
      if (data && (Array.isArray(data.clothing) || Array.isArray(data.scents))) {
        localStorage.setItem(`atelier-cloud-backup-${accountId}`, JSON.stringify(data));
        return data;
      }
    }
  } catch (err) {}

  // 3. Fallback to local storage backup
  const backup = localStorage.getItem(`atelier-cloud-backup-${accountId}`);
  return backup ? JSON.parse(backup) : null;
}
