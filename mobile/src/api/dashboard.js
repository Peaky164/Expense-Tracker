import client from "./client";

export async function getSummary(month) {
  const res = await client.get("/dashboard/summary", { params: { month } });
  return res.data;
}