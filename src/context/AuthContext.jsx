import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('spliteasy_token');
      if (token) {
        try {
          const data = await authApi.getMe();
          setUser(data.user);
        } catch (error) {
          console.error('Failed to load user', error);
          localStorage.removeItem('spliteasy_token');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    const data = await authApi.login({ email, password });
    localStorage.setItem('spliteasy_token', data.token);
    setUser(data.user);
  };

  const register = async (name, email, password) => {
    const data = await authApi.register({ name, email, password });
    localStorage.setItem('spliteasy_token', data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('spliteasy_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
