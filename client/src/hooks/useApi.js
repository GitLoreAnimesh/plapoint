import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import useAuth from '../store/authStore';


export function useApi(apiFn, options = {}) {
  const { successMsg, errorMsg, onSuccess, onError, showErrorToast = true } = options;
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [data,    setData]    = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFn(...args);
      setData(res.data);
      if (successMsg) toast.success(successMsg);
      if (onSuccess)  onSuccess(res.data);
      return res.data;
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Something went wrong.';
      setError(message);
      if (showErrorToast) toast.error(errorMsg || message);
      if (onError) onError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFn, successMsg, errorMsg, onSuccess, onError, showErrorToast]);

  return { execute, loading, error, data };
}


export function useBootstrap() {
  const { bootstrap, initialised } = useAuth();
  useEffect(() => { bootstrap(); }, [bootstrap]);
  return initialised;
}


export function useRequireAuth(navigate, requiredRole = null) {
  const { user, initialised } = useAuth();
  useEffect(() => {
    if (!initialised) return;
    if (!user) { navigate('/login'); return; }
    if (requiredRole && user.role !== requiredRole) navigate('/');
  }, [user, initialised, navigate, requiredRole]);
  return { user, loading: !initialised };
}
