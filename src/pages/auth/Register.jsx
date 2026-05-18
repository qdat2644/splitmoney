import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserPlus } from 'lucide-react';

export default function Register({ onSwitch }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(name, email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card w-full max-w-md p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
          Zyra
        </h1>
        <p className="text-gray-400">Tạo tài khoản mới</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="text-red-400 text-sm p-3 bg-red-400/10 rounded-lg">{error}</div>}
        
        <div>
          <label className="label-field">Tên của bạn</label>
          <input 
            type="text" required className="input-field" 
            value={name} onChange={e => setName(e.target.value)} 
          />
        </div>
        <div>
          <label className="label-field">Email</label>
          <input 
            type="email" required className="input-field" 
            value={email} onChange={e => setEmail(e.target.value)} 
          />
        </div>
        <div>
          <label className="label-field">Mật khẩu</label>
          <input 
            type="password" required className="input-field" 
            value={password} onChange={e => setPassword(e.target.value)} 
          />
        </div>

        <button disabled={loading} type="submit" className="btn-primary w-full flex justify-center gap-2 mt-6">
          <UserPlus className="w-5 h-5" />
          {loading ? 'Đang xử lý...' : 'Đăng ký'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-400">
        Đã có tài khoản?{' '}
        <button onClick={onSwitch} className="text-blue-400 hover:text-blue-300">Đăng nhập</button>
      </div>
    </div>
  );
}
