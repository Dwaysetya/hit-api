import api from '../api/axios';

export const syncODP = async (token, odp_name) => {
  try {
    const response = await api.post('/api/aggregator/syncODP', { odp_name }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Sync ODP error for ${odp_name}:`, error);
    // Return structured error instead of throwing to avoid breaking the loop if not handled properly
    // We handle this gracefully in the loop, but rejecting here is also fine since we use try/catch in the loop
    throw error.response?.data || error.message || 'Unknown error';
  }
};
