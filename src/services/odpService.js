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
    // Log as a string with warn instead of error object to avoid Next.js Error Overlay blocking the screen
    console.warn(`Sync ODP error for ${odp_name}: ${error.message || 'Unknown error'}`);
    
    // Explicitly handle 404 errors as they often mean the ODP doesn't exist
    if (error.response?.status === 404) {
      throw `ODP not found or endpoint unavailable (404)`;
    }

    // Try to get a clean error message from the response data
    const errorData = error.response?.data;
    if (errorData && typeof errorData === 'object' && errorData.message) {
      throw errorData.message;
    }
    
    throw errorData || error.message || 'Unknown error';
  }
};
