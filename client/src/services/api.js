import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
});

const token = localStorage.getItem('agrifert_token');
if (token) API.defaults.headers.common['Authorization'] = `Bearer ${token}`;

API.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('agrifert_token');
      delete API.defaults.headers.common['Authorization'];
    }
    return Promise.reject(err);
  }
);

export default API;
