import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Restore user session on mount
  useEffect(() => {
    const restoreSession = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');
      const activeToken = urlToken || localStorage.getItem('token');

      if (urlToken) {
        localStorage.setItem('token', urlToken);
        setToken(urlToken);
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      if (activeToken) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data || res);
        } catch (error) {
          console.error('[Auth Restoration Error]', error.message);
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    restoreSession();
  }, []);

  const login = async (email, password) => {
    const data = await api.post('/auth/login', { email, password });

    if (data.requiresOtp) {
      return { requiresOtp: true, email: data.email, message: data.message };
    }

    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('token', data.token);
    return data.user;
  };

  const register = async (userData) => {
    const data = await api.post('/auth/register', userData);
    return data;
  };

  const verifyOtp = async (email, otp) => {
    const data = await api.post('/auth/verify-otp', { email, otp });
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('token', data.token);
    return data;
  };

  const resendOtp = async (email) => {
    const data = await api.post('/auth/resend-otp', { email });
    return data;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    navigate('/login');
  };

  const updateProfile = async (updates) => {
    try {
      const res = await api.put('/auth/profile', updates);
      setUser(res.data || { ...user, ...updates });
      return res;
    } catch (err) {
      setUser(prev => ({ ...prev, ...updates }));
      throw err;
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    verifyOtp,
    resendOtp,
    logout,
    updateProfile,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
