import { createTransaction } from '../api/transactions';
import { saveOffline, loadOffline, isNetworkError } from './offline';

const KEY = 'pending_transactions';
let flushing = false;

export async function getPending() {
  return (await loadOffline(KEY)) || [];
}

// Save a transaction on the phone until it can be uploaded
export async function addPending(payload) {
  const list = await getPending();
  const item = {
    ...payload,
    localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  await saveOffline(KEY, [...list, item]);
  return item;
}

// Upload waiting transactions one by one, oldest first.
// Stops (and keeps the rest) as soon as the server cannot be reached.
export async function flushPending() {
  if (flushing) return { sent: 0, rejected: 0, left: null };
  flushing = true;
  let sent = 0;
  let rejected = 0;
  try {
    let list = await getPending();
    while (list.length > 0) {
      try {
        await createTransaction(list[0]);
        sent += 1;
      } catch (err) {
        if (isNetworkError(err)) break; // still offline, try again later
        rejected += 1; // the server answered "no" (e.g. category was deleted)
      }
      list = list.slice(1);
      await saveOffline(KEY, list);
    }
    return { sent, rejected, left: list.length };
  } finally {
    flushing = false;
  }
}