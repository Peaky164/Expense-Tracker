import Constants from 'expo-constants';

// Backup address, used only if the app cannot find the dev server's address.
const FALLBACK = 'http://10.198.23.89:8000';

// In development, Metro's address is the PC's address, so it stays correct
// even when the hotspot gives the PC a new IP.
const host = Constants.expoConfig?.hostUri?.split(':')[0];

export const API_URL = host ? `http://${host}:8000` : FALLBACK;