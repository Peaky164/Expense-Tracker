import client from "./client";

// Note: keep the trailing slash on /transactions/
export async function getTransactions() {
  const res = await client.get("/transactions/");
  return res.data;
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
