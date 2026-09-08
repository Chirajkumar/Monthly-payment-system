import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

const DEMO_USER = {
  id: 'demo-user',
  name: 'Demo Member',
  memberId: 'MEM0001',
  email: 'member@kenjila.com',
  phone: '+254700000001',
  isAdmin: false,
};

const DEMO_ADMIN = {
  id: 'demo-admin',
  name: 'Demo Admin',
  memberId: 'ADM0001',
  email: 'admin@kenjila.com',
  phone: '+254700000002',
  isAdmin: true,
};

const isNetworkFailure = (error) => {
  return error?.code === 'ERR_NETWORK' || error?.message === 'Network Error' || !error?.response;
};

export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('demoUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
      localStorage.setItem('demoUser', JSON.stringify(response.data.user));
    } catch (error) {
      const savedUser = localStorage.getItem('demoUser');
      if (savedUser && isNetworkFailure(error)) {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setLoading(false);
        return;
      }

      localStorage.removeItem('token');
      localStorage.removeItem('demoUser');
      setToken(null);
      setUser(null);
      toast.error('Session expired. Please login again.');
    } finally {
      setLoading(false);
    }
  };

  const login = async (name, dateOfBirth) => {
    try {
      const response = await api.post('/auth/login', { name, dateOfBirth });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('demoUser', JSON.stringify(user));
      setToken(token);
      setUser(user);
      toast.success(`Welcome back, ${user.name}!`);
      return { success: true, user };
    } catch (error) {
      if (isNetworkFailure(error)) {
        const demoUser = { ...DEMO_USER, name: name || DEMO_USER.name };
        localStorage.setItem('token', 'demo-token');
        localStorage.setItem('demoUser', JSON.stringify(demoUser));
        setToken('demo-token');
        setUser(demoUser);
        toast.success(`Demo mode: Welcome, ${demoUser.name}!`);
        return { success: true, user: demoUser };
      }

      toast.error(error.response?.data?.message || 'Login failed');
      return { success: false, error: error.response?.data?.message };
    }
  };

  const adminLogin = async (email, password) => {
    try {
      const response = await api.post('/auth/admin/login', { email, password });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('demoUser', JSON.stringify(user));
      setToken(token);
      setUser(user);
      toast.success('Welcome Admin!');
      return { success: true, user };
    } catch (error) {
      if (isNetworkFailure(error)) {
        const demoUser = { ...DEMO_ADMIN, email: email || DEMO_ADMIN.email };
        localStorage.setItem('token', 'demo-admin-token');
        localStorage.setItem('demoUser', JSON.stringify(demoUser));
        setToken('demo-admin-token');
        setUser(demoUser);
        toast.success('Demo mode: Welcome Admin!');
        return { success: true, user: demoUser };
      }

      toast.error(error.response?.data?.message || 'Login failed');
      return { success: false, error: error.response?.data?.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('demoUser');
    setToken(null);
    setUser(null);
    toast.info('Logged out successfully');
  };

  const value = {
    user,
    loading,
    login,
    adminLogin,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.isAdmin || false
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};