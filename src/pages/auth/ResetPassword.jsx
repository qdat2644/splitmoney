import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { KeyRound, Loader2 } from 'lucide-react';
import { authApi } from '../../services/apiClient';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: '', message: '' });

    if (!token) {
      setStatus({ type: 'error', message: 'Lien ket dat lai mat khau khong hop le.' });
      return;
    }

    if (newPassword.length < 8) {
      setStatus({ type: 'error', message: 'Mat khau moi can it nhat 8 ky tu.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', message: 'Mat khau xac nhan khong khop.' });
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword({ token, newPassword });
      setStatus({ type: 'success', message: 'Mat khau da duoc cap nhat. Hay dang nhap lai.' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-dark-900 p-4">
      <div className="card w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <h1 className="mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-3xl font-bold text-transparent">
            Zyra
          </h1>
          <p className="text-gray-400">Dat lai mat khau</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {status.message && (
            <div
              className={`rounded-lg p-3 text-sm ${
                status.type === 'success' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-red-400/10 text-red-400'
              }`}
            >
              {status.message}
            </div>
          )}

          <div>
            <label className="label-field">Mat khau moi</label>
            <input
              type="password"
              required
              minLength={8}
              className="input-field"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>

          <div>
            <label className="label-field">Xac nhan mat khau</label>
            <input
              type="password"
              required
              minLength={8}
              className="input-field"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>

          <button disabled={loading} type="submit" className="btn-primary mt-6 flex w-full justify-center gap-2">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <KeyRound className="h-5 w-5" />}
            {loading ? 'Dang xu ly...' : 'Cap nhat mat khau'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-400">
          <Link to="/" className="text-blue-400 hover:text-blue-300">Quay lai dang nhap</Link>
        </div>
      </div>
    </div>
  );
}
