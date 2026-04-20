import axios from 'axios';


const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const axiosInstance = axios.create({
  baseURL:         BASE_URL,
  withCredentials: true, 
});

let _accessToken = null;
export const setAccessToken  = (t) => { _accessToken = t; };
export const getAccessToken  = ()  => _accessToken;
export const clearAccessToken = () => { _accessToken = null; };

axiosInstance.interceptors.request.use((config) => {
  if (_accessToken) config.headers['Authorization'] = `Bearer ${_accessToken}`;
  return config;
});

let isRefreshing      = false;
let refreshSubscribers = [];

const subscribeToRefresh = (cb) => refreshSubscribers.push(cb);
const notifySubscribers  = (token) => { refreshSubscribers.forEach(cb => cb(token)); refreshSubscribers = []; };

axiosInstance.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      error.response?.data?.error === 'TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeToRefresh((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            resolve(axiosInstance(originalRequest));
          });
        });
      }

      isRefreshing = true;
      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        const newToken = data.accessToken;
        setAccessToken(newToken);
        notifySubscribers(newToken);
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        clearAccessToken();
        notifySubscribers(null);
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
