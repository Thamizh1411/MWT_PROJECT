import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const login = async (email, password) => {
    const response = await fetch(`${import.meta.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message);
    }
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('token', data.token);
    return data.user;
  };

  const register = async (userData) => {
    const response = await fetch(`${import.meta.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message);
    }
    return data;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  const handleOAuthCallback = async (token) => {
    // Store token and fetch full user data
    localStorage.setItem('token', token);
    setToken(token);

    try {
      const response = await fetch(`${import.meta.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        // Navigate to home page after successful OAuth
        navigate(`/${userData.role}`);
      } else {
        console.error('Failed to fetch user data');
        localStorage.removeItem('token');
        setToken(null);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      localStorage.removeItem('token');
      setToken(null);
    }
  };

  const updateProfile = (updates) => {
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
  };

  // Check for OAuth callback on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
      handleOAuthCallback(token);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      // Check for stored token and fetch user data
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        handleOAuthCallback(storedToken);
      }
    }
  }, []);

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
