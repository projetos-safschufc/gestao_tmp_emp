import client from './axiosClient';

/**
 * @param {{ trendDays?: number }} [params] - janela em dias para a série temporal (7–365).
 */
export async function getDashboardMetrics(params = {}) {
  const search = {};
  if (params.trendDays !== undefined && params.trendDays !== null) {
    search.trendDays = params.trendDays;
  }
  const res = await client.get('/api/dashboard/metrics', { params: search });
  return res.data;
}
