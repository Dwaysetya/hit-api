import axios from 'axios';

const api = axios.create({
  baseURL: 'https://dimas-api-surrounding.telkom.co.id',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
