import client from './client';

export async function registerPushToken(token) {
  const { data } = await client.post('/push-tokens/', { token });
  return data;
}

export async function unregisterPushToken(token) {
  // Expo tokens contain [ ], so they must be URL-encoded in the path
  await client.delete(`/push-tokens/${encodeURIComponent(token)}`);
}