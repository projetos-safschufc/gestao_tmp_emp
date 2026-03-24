import client from './axiosClient';

export async function loginRequest({ email, password }) {
  const res = await client.post('/api/auth/login', { email, password });
  return res.data;
}

