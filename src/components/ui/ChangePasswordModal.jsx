// ChangePasswordModal.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Lock, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { ModalLayout, ModalHeader, ModalBody, ModalFooter } from './ModalLayout';
import AppInput from './AppInput';
import AppButton from './AppButton';
import { authApi } from '../../services/apiClient';
import { useToast } from '../../hooks/useToast';

export default function ChangePasswordModal({ open, onClose }) {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess(false);
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Xác nhận mật khẩu không khớp.');
      return;
    }
    if (currentPassword === newPassword) {
      setError('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
      return;
    }

    setLoading(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setSuccess(true);
      toast.success('Đã đổi mật khẩu');
      setTimeout(() => handleClose(), 2000);
    } catch (err) {
      setError(err.message || 'Đổi mật khẩu thất bại.');
      toast.error(err.message || 'Đổi mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalLayout open={open} onClose={handleClose} size="sm">
      <ModalHeader title="Đổi mật khẩu" icon={Lock} onClose={handleClose} />
      
      {success ? (
        <ModalBody>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3 py-6 text-center"
          >
            <CheckCircle2 className="w-14 h-14 text-emerald-400" />
            <p className="text-white font-semibold">Đổi mật khẩu thành công!</p>
            <p className="text-gray-400 text-sm">Đang đóng...</p>
          </motion.div>
        </ModalBody>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <ModalBody className="space-y-4">
            <AppInput
              label="Mật khẩu hiện tại"
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              action={
                <button
                  type="button"
                  onClick={() => setShowCurrent(v => !v)}
                  className="text-gray-400 hover:text-gray-200"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            <AppInput
              label="Mật khẩu mới"
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Ít nhất 6 ký tự"
              required
              autoComplete="new-password"
              action={
                <button
                  type="button"
                  onClick={() => setShowNew(v => !v)}
                  className="text-gray-400 hover:text-gray-200"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            <AppInput
              label="Xác nhận mật khẩu mới"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}
          </ModalBody>
          <ModalFooter>
            <AppButton
              type="submit"
              loading={loading}
              className="w-full"
            >
              Xác nhận đổi mật khẩu
            </AppButton>
          </ModalFooter>
        </form>
      )}
    </ModalLayout>
  );
}
