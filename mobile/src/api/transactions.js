import client from "./client";

// One page of transactions (newest first)
export async function getTransactions(skip = 0, limit = 20) {
  const res = await client.get("/transactions/", { params: { skip, limit } });
  return res.data;
}

// Every transaction, fetched page by page (used by Budgets until it has its own endpoint)
export async function getAllTransactions() {
  const all = [];
  const pageSize = 100;
  let skip = 0;
  while (true) {
    const page = await getTransactions(skip, pageSize);
    all.push(...page);
    if (page.length < pageSize) break;
    skip += pageSize;
  }
  return all;
}

export async function createTransaction({ amount, description, payment_mode, category_id }) {
  const res = await client.post("/transactions/", {
    amount: Number(amount),
    description,
    payment_mode,
    category_id: Number(category_id),
  });
  return res.data;
}

export async function deleteTransaction(id) {
  await client.delete(`/transactions/${id}`);
}
export async function updateTransaction(id, { amount, description, payment_mode, category_id }) {
  const res = await client.put(`/transactions/${id}`, {
    amount: Number(amount),
    description,
    payment_mode,
    category_id: Number(category_id),
  });
  return res.data;
}
