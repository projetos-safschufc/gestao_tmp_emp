import client from './axiosClient';

export async function listUsers({ limit = 20, offset = 0 } = {}) {
  const res = await client.get('/api/users', { params: { limit, offset } });
  return res.data;
}

export async function getUserById(id) {
  const res = await client.get(`/api/users/${id}`);
  return res.data;
}

export async function createUser(payload) {
  const res = await client.post('/api/users', payload);
  return res.data;
}

export async function registerUser(payload) {
  const res = await client.post('/api/users/register', payload);
  return res.data;
}

export async function resetPassword(id, senha) {
  const res = await client.post(`/api/users/${id}/reset-password`, { senha });
  return res.data;
}

export async function updateUserAccess(id, payload) {
  const res = await client.patch(`/api/users/${id}/access`, payload);
  return res.data;
}

