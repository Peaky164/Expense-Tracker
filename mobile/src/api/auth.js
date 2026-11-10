import client from './client';
import { saveToken } from '../storage/token';

export async function login(email, password) {
  const { data } = await client.post('/auth/login', { email, password });
  await saveToken(data.access_token);
  return data;
}

export async function getMe() {
  const { data } = await client.get('/auth/me');
  return data;
}
