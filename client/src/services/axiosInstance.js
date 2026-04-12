import axios from 'axios';

/**
 * axiosInstance — all API calls go through this.
 *
 * Request interceptor: attaches the in-memory access token to every request.
 * Response interceptor: if the server returns TOKEN_EXPIRED (401), silently
 *   calls /auth/refresh (which reads the HttpOnly refresh cookie), gets a new
 *   access token, updates the in-memory store, and retries the original request
 *   once. If refresh also fails, the user is logged out.
 */

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const axiosInstance = axios.create({
  baseURL:         BASE_URL,
  withCredentials: true, // needed so HttpOnly refresh cookie is sent
});

// ── In-memory access token store ──────────────────────
// Stored in a plain object (not localStorage) so it is never persisted to disk.
// It survives page navigation but NOT a hard refresh — on hard refresh the
// refresh endpoint is called immediately to re-issue a token.
let _accessToken = null;
export const setAccessToken  = (t) => { _accessToken = t; };
export const getAccessToken  = ()  => _accessToken;
export const clearAccessToken = () => { _accessToken = null; };

// ── Request interceptor ───────────────────────────────
axiosInstance.interceptors.request.use((config) => {
  if (_accessToken) config.headers['Authorization'] = `Bearer ${_accessToken}`;
  return config;
});

// ── Response interceptor ──────────────────────────────
let isRefreshing      = false;
let refreshSubscribers = [];

const subscribeToRefresh = (cb) => refreshSubscribers.push(cb);
const notifySubscribers  = (token) => { refreshSubscribers.forEach(cb => cb(token)); refreshSubscribers = []; };

axiosInstance.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    // If 401 + TOKEN_EXPIRED and we haven't retried yet
    if (
      error.response?.status === 401 &&
      error.response?.data?.error === 'TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      // If another request is already refreshing, queue this one
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
        // Refresh failed — clear token and force logout
        clearAccessToken();
        notifySubscribers(null);
        // Dispatch a custom event so auth store can react
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
