import api from '../api/axios';

export const login = async (username, password) => {
  try {
    const response = await api.post('/api/aggregator/login', {
      username,
      password,
    });
    
    // Attempt to extract token from various common response structures
    const token = response.data?.accessToken || response.data?.token || response.data?.data?.token || response.data?.access_token || response.data?.data?.access_token;
    if (!token) {
      console.warn('Token not found in expected paths. Response data:', response.data);
      throw new Error(`Token not found in response. API returned: ${JSON.stringify(response.data)}`);
    }
    return token;
  } catch (error) {
    console.error('Login error:', error);
    throw new Error(error.response?.data?.message || error.message || 'Failed to login');
  }
};
