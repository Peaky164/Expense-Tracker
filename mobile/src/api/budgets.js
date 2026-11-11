import client from "./client";

// Keep the trailing slash on /budgets/
export async function getBudgets() {
  const res = await client.get("/budgets/");
  return res.data;
}

export async function createBudget({ limit_amount, month, category_id }) {
  const res = await client.post("/budgets/", {
    limit_amount: Number(limit_amount),
    month,
    category_id: Number(category_id),
  });
  return res.data;
}

export async function updateBudget(id, { limit_amount }) {
  const res = await client.put(`/budgets/${id}`, {
    limit_amount: Number(limit_amount),
  });
  return res.data;
}

export async function deleteBudget(id) {
  await client.delete(`/budgets/${id}`);
}