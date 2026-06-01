import { useEffect, useState } from 'react';
import { Download, Lock, Mail, Save, ShieldAlert, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import { exportApi, userApi } from '../services/apiClient';
import AppButton from '../components/ui/AppButton';
import AppCard from '../components/ui/AppCard';
import AppInput from '../components/ui/AppInput';
import ExportButton from '../components/ui/ExportButton';
import PageHeader from '../components/ui/PageHeader';

const MIN_PASSWORD_LENGTH = 8;

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileError, setProfileError] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    setProfileName(user?.name || '');
  }, [user?.name]);

  const saveProfile = async (event) => {
    event.preventDefault();
    const name = profileName.trim();
    if (name.length < 2) {
      setProfileError('Tên hiển thị cần ít nhất 2 ký tự.');
      return;
    }

    setProfileSaving(true);
    setProfileError('');
    try {
      const result = await userApi.updateProfile({ name });
      updateUser(result.user);
      toast.success(result.message || 'Đã cập nhật hồ sơ.');
    } catch (error) {
      setProfileError(error.message || 'Không thể cập nhật hồ sơ.');
      toast.error(error.message || 'Không thể cập nhật hồ sơ.');
    } finally {
      setProfileSaving(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    const currentPassword = passwords.currentPassword;
    const newPassword = passwords.newPassword;
    const confirmPassword = passwords.confirmPassword;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Vui lòng nhập đầy đủ các trường mật khẩu.');
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordError('Mật khẩu mới cần ít nhất 8 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận chưa khớp.');
      return;
    }

    setPasswordSaving(true);
    setPasswordError('');
    try {
      const result = await userApi.changePassword({ currentPassword, newPassword });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success(result.message || 'Đã cập nhật mật khẩu.');
    } catch (error) {
      setPasswordError(error.message || 'Không thể cập nhật mật khẩu.');
      toast.error(error.message || 'Không thể cập nhật mật khẩu.');
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Tài khoản"
        title="Cài đặt"
        subtitle="Quản lý hồ sơ, bảo mật và dữ liệu tài khoản của bạn."
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        <ProfileSection
          email={user?.email}
          name={profileName}
          error={profileError}
          saving={profileSaving}
          onNameChange={setProfileName}
          onSubmit={saveProfile}
        />
        <DataSection />
      </section>

      <SecuritySection
        passwords={passwords}
        error={passwordError}
        saving={passwordSaving}
        onChange={(field, value) => setPasswords((prev) => ({ ...prev, [field]: value }))}
        onSubmit={changePassword}
      />

      <DangerZone />
    </main>
  );
}

function ProfileSection({ email, name, error, saving, onNameChange, onSubmit }) {
  return (
    <AppCard className="border border-white/5 bg-dark-800 p-5">
      <SectionHeader
        icon={UserRound}
        title="Hồ sơ"
        description="Tên hiển thị được dùng trong các phòng và khu vực cá nhân."
      />
      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <AppInput
          label="Tên hiển thị"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          error={error}
          icon={UserRound}
          autoComplete="name"
        />
        <AppInput
          label="Email"
          value={email || ''}
          icon={Mail}
          readOnly
          helperText="Email đang ở chế độ chỉ đọc vì Zyra chưa có luồng đổi email an toàn."
          className="cursor-not-allowed opacity-80"
        />
        <AppButton type="submit" icon={Save} loading={saving}>
          Lưu hồ sơ
        </AppButton>
      </form>
    </AppCard>
  );
}

function SecuritySection({ passwords, error, saving, onChange, onSubmit }) {
  return (
    <AppCard className="border border-white/5 bg-dark-800 p-5">
      <SectionHeader
        icon={Lock}
        title="Bảo mật"
        description="Đổi mật khẩu bằng mật khẩu hiện tại. Mật khẩu mới cần đủ mạnh để bảo vệ tài khoản."
      />
      <form onSubmit={onSubmit} className="mt-5 grid gap-4 md:grid-cols-3">
        <AppInput
          label="Mật khẩu hiện tại"
          type="password"
          value={passwords.currentPassword}
          onChange={(event) => onChange('currentPassword', event.target.value)}
          icon={Lock}
          autoComplete="current-password"
        />
        <AppInput
          label="Mật khẩu mới"
          type="password"
          value={passwords.newPassword}
          onChange={(event) => onChange('newPassword', event.target.value)}
          icon={Lock}
          autoComplete="new-password"
          helperText="Ít nhất 8 ký tự."
        />
        <AppInput
          label="Xác nhận mật khẩu"
          type="password"
          value={passwords.confirmPassword}
          onChange={(event) => onChange('confirmPassword', event.target.value)}
          icon={Lock}
          autoComplete="new-password"
        />
        {error && <p className="text-xs text-red-300 md:col-span-3">{error}</p>}
        <div className="md:col-span-3">
          <AppButton type="submit" icon={Lock} loading={saving}>
            Cập nhật mật khẩu
          </AppButton>
        </div>
      </form>
    </AppCard>
  );
}

function DataSection() {
  return (
    <AppCard className="border border-white/5 bg-dark-800 p-5">
      <SectionHeader
        icon={Download}
        title="Dữ liệu tài khoản"
        description="Bạn có thể xuất dữ liệu cá nhân để lưu trữ hoặc sao lưu."
      />
      <div className="mt-5 space-y-4">
        <div className="rounded-lg bg-white/3 px-3 py-3 text-xs leading-relaxed text-gray-400">
          File xuất dùng luồng export hiện có của Zyra, gồm dữ liệu cá nhân mà API đã hỗ trợ.
        </div>
        <ExportButton
          label="Xuất dữ liệu cá nhân"
          filename="personal_data"
          onExport={(format) => exportApi.exportMe(format)}
        />
      </div>
    </AppCard>
  );
}

function DangerZone() {
  return (
    <AppCard className="border border-red-500/10 bg-dark-800 p-5">
      <SectionHeader
        icon={ShieldAlert}
        title="Vùng nguy hiểm"
        description="Xóa tài khoản cần được thiết kế để không làm sai lệch lịch sử phòng, công nợ và thanh toán."
      />
      <div className="mt-5 flex flex-col gap-3 rounded-lg border border-red-500/10 bg-red-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-white">Xóa hoặc vô hiệu hóa tài khoản</p>
          <p className="mt-1 text-xs leading-relaxed text-gray-400">
            Tính năng này đang được chuẩn bị theo hướng an toàn. Zyra sẽ ưu tiên vô hiệu hóa có kiểm soát thay vì xóa cứng dữ liệu tài chính.
          </p>
        </div>
        <AppButton variant="danger" disabled>
          Sắp có
        </AppButton>
      </div>
    </AppCard>
  );
}

function SectionHeader({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-dark-900">
        <Icon className="h-4 w-4 text-blue-300" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {description && <p className="mt-1 text-xs leading-relaxed text-gray-500">{description}</p>}
      </div>
    </div>
  );
}
