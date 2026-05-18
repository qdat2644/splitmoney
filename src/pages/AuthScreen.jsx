import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Login from './auth/Login';
import Register from './auth/Register';
import { Loader2 } from 'lucide-react';

export default function AuthScreen() {
  const { loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 p-4">
      {isLogin ? (
        <Login onSwitch={() => setIsLogin(false)} />
      ) : (
        <Register onSwitch={() => setIsLogin(true)} />
      )}
    </div>
  );
}
