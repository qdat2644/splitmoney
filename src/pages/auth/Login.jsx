import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/apiClient';
import { LogIn, Mail } from 'lucide-react';

export default function Login({ onSwitch }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const response = await authApi.forgotPassword({ email: forgotEmail });
      setNotice(response.message || 'Neu email ton tai, lien ket dat lai mat khau da duoc gui.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (showForgot) {
    return (
      <div data-testid="forgot-password-form" className="card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
            Zyra
          </h1>
          <p className="text-gray-400">Dat lai mat khau</p>
        </div>

        <form onSubmit={handleForgotPassword} className="space-y-4">
          {error && <div data-testid="forgot-password-error" className="text-red-400 text-sm p-3 bg-red-400/10 rounded-lg">{error}</div>}
          {notice && <div data-testid="forgot-password-notice" className="text-emerald-300 text-sm p-3 bg-emerald-400/10 rounded-lg">{notice}</div>}

          <div>
            <label className="label-field">Email</label>
            <input
              data-testid="forgot-email-input"
              type="email"
              required
              className="input-field"
              value={forgotEmail}
              onChange={e => setForgotEmail(e.target.value)}
            />
          </div>

          <button data-testid="forgot-password-submit" disabled={loading} type="submit" className="btn-primary w-full flex justify-center gap-2 mt-6">
            <Mail className="w-5 h-5" />
            {loading ? 'Dang xu ly...' : 'Gui lien ket dat lai'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-400">
          <button data-testid="back-to-login" onClick={() => setShowForgot(false)} className="text-blue-400 hover:text-blue-300">Quay lai dang nhap</button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="login-form" className="card w-full max-w-md p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
          Zyra
        </h1>
        <p className="text-gray-400">Đăng nhập để tiếp tục</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div data-testid="login-error" className="text-red-400 text-sm p-3 bg-red-400/10 rounded-lg">{error}</div>}
        
        <div>
          <label className="label-field">Email</label>
          <input 
            data-testid="login-email"
            type="email" required className="input-field" 
            value={email} onChange={e => setEmail(e.target.value)} 
          />
        </div>
        <div>
          <label className="label-field">Mật khẩu</label>
          <input 
            data-testid="login-password"
            type="password" required className="input-field" 
            value={password} onChange={e => setPassword(e.target.value)} 
          />
          <button
            data-testid="forgot-password-toggle"
            type="button"
            onClick={() => {
              setForgotEmail(email);
              setError('');
              setNotice('');
              setShowForgot(true);
            }}
            className="mt-2 text-sm text-blue-400 hover:text-blue-300"
          >
            Quen mat khau?
          </button>
        </div>

        <button data-testid="login-submit" disabled={loading} type="submit" className="btn-primary w-full flex justify-center gap-2 mt-6">
          <LogIn className="w-5 h-5" />
          {loading ? 'Đang xử lý...' : 'Đăng nhập'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-400">
        Chưa có tài khoản?{' '}
        <button onClick={onSwitch} className="text-blue-400 hover:text-blue-300">Đăng ký ngay</button>
      </div>
    </div>
  );
}
