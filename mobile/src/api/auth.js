import client from './client';
import { saveToken } from '../storage/token';

export async function login(email, password) {
  const { data } = await client.post('/auth/login', { email, password });
  await saveToken(data.access_token);
  return data;
}

// Creates the account only. The caller then logs in with the same credentials.
export async function signup(name, email, password) {
  const { data } = await client.post('/auth/signup', { name, email, password });
  return data;
}

export async function getMe() {
  const { data } = await client.get('/auth/me');
  return data;
}

export async function googleLogin(idToken) {
  const { data } = await client.post('/auth/google', { id_token: idToken });
  await saveToken(data.access_token);
  return data;
}