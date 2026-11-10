import axios from 'axios';
import { API_URL } from '../config';
import { getToken, clearToken } from '../storage/token';

const client = axios.create({
  baseURL: API_URL,
  timeout: 70000,
});

client.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) await clearToken();
    return Promise.reject(error);
  }
);

export default client;
