import AsyncStorage from '@react-native-async-storage/async-storage';

// Every key starts with this, so one call can wipe all offline data
const PREFIX = 'offline:';

export async function saveOffline(key, value) {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {
    // Offline copy is a bonus; never break the app because of it
  }
}

export async function loadOffline(key) {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// Call this at logout so the next account never sees this account's data
export async function clearOfflineData() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys.filter((k) => k.startsWith(PREFIX)));
  } catch (e) {
    // ignore
  }
}

// True when the request never got any answer from the server (no connection)
export function isNetworkError(err) {
  return !!err && !err.response;
}