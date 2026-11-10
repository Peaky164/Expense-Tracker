import * as SecureStore from 'expo-secure-store';

const KEY = 'access_token';

export const saveToken = (token) => SecureStore.setItemAsync(KEY, token);
export const getToken = () => SecureStore.getItemAsync(KEY);
export const clearToken = () => SecureStore.deleteItemAsync(KEY);
