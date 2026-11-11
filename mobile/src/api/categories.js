import client from './client';

export async function getCategories() {
  const { data } = await client.get('/categories/');
  return data;
}

export async function createCategory(name, type) {
  const { data } = await client.post('/categories/', { name, type });
  return data;
}

export async function deleteCategory(id) {
  await client.delete(`/categories/${id}`);
}