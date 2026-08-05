// Free Cloud Sync Engine for Cross-Device Account Wardrobe Storage

const CLOUD_BIN_API = 'https://api.jsonbin.io/v3/b';
const MASTER_KEY = '$2a$10$vQ6sQ3v5x1Lg.bW8YhR0e.uB7jP8e9r0W1x2y3z4a5b6c7d8e9f0';

export async function saveUserCloudWardrobe(username, userAccountKey, wardrobeData) {
  const accountId = `wardrobe_${username.toLowerCase()}_${userAccountKey.toLowerCase()}`.replace(/[^a-z0-9_]/g, '');
  
  // Save to cloud storage key
  try {
    const res = await fetch(`https://kvdb.io/W9U6zZ8sX5q4Y3v2u1t0r9/${accountId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wardrobeData)
    });
    if (res.ok) {
      console.log('Successfully synced wardrobe to Cloud!');
    }
  } catch (err) {
    console.warn('Cloud sync save notice:', err.message);
  }

  // Backup locally
  localStorage.setItem(`atelier-cloud-backup-${accountId}`, JSON.stringify(wardrobeData));
}

export async function fetchUserCloudWardrobe(username, userAccountKey) {
  const accountId = `wardrobe_${username.toLowerCase()}_${userAccountKey.toLowerCase()}`.replace(/[^a-z0-9_]/g, '');
  
  try {
    const res = await fetch(`https://kvdb.io/W9U6zZ8sX5q4Y3v2u1t0r9/${accountId}`);
    if (res.ok) {
      const data = await res.json();
      if (data && (data.clothing || data.scents)) {
        localStorage.setItem(`atelier-cloud-backup-${accountId}`, JSON.stringify(data));
        return data;
      }
    }
  } catch (err) {
    console.warn('Cloud fetch fallback to backup:', err.message);
  }

  // Fallback to local backup
  const backup = localStorage.getItem(`atelier-cloud-backup-${accountId}`);
  return backup ? JSON.parse(backup) : null;
}
