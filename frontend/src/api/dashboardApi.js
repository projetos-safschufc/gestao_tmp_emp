import client from './axiosClient';

export async function getDashboardMetrics() {
  const res = await client.get('/api/dashboard/metrics');
  return res.data;
}

