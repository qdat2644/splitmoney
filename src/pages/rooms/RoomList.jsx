import { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { ArrowRight, CheckCircle, Copy, DoorOpen, HardDrive, Plus, Receipt, Users } from 'lucide-react';
import { roomApi } from '../../services/apiClient';
import { memberService, expenseService } from '../../services/storageService';

import { useNavigate } from 'react-router-dom';
import { SkeletonRow } from '../../components/ui/Skeleton';
import AppButton from '../../components/ui/AppButton';
import AppCard from '../../components/ui/AppCard';
import AppInput from '../../components/ui/AppInput';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';

export default function RoomList() {
  const { rooms, setRooms, loadingRooms, toast } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [isJoin, setIsJoin] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [guestsToClaim, setGuestsToClaim] = useState(null);
  const [selectedGuestId, setSelectedGuestId] = useState('');
  const [createdRoom, setCreatedRoom] = useState(null);
  const roomNameInputRef = useRef(null);

  const copyRoomCode = async (roomCode) => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      toast.success('Đã sao chép mã phòng.');
    } catch {
      toast.info(`Mã phòng: ${roomCode}`);
    }
  };

  const openCreatedRoom = (roomId, options = {}) => {
    if (!roomId) return;
    navigate(`/rooms/${roomId}/dashboard`, options);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name) return;
    setLoading(true);
    try {
      const res = await roomApi.createRoom({ name });
      toast.success('Đã tạo phòng.');
      // Refresh rooms
      const data = await roomApi.getRooms();
      setRooms(data.memberships);
      const membership = data.memberships.find((item) => item.roomId === res.room?.id);
      setCreatedRoom({
        id: res.room?.id,
        name: res.room?.name,
        code: res.room?.code,
        membership,
      });
      setName('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!code) return;

    if (!guestsToClaim) {
      setLoading(true);
      try {
        const res = await roomApi.getRoomGuestsByCode(code);
        if (res.guests && res.guests.length > 0) {
          setGuestsToClaim(res.guests);
          setLoading(false);
          return;
        }
      } catch (err) {
        // Just proceed if no guests or not found
      }
      setLoading(false);
    }

    setLoading(true);
    try {
      await roomApi.joinRoom({ 
        code, 
        claimGuestMemberId: selectedGuestId || undefined 
      });
      toast.success('Đã gửi yêu cầu tham gia!');
      // Refresh
      const data = await roomApi.getRooms();
      setRooms(data.memberships);
      setCode('');
      setGuestsToClaim(null);
      setSelectedGuestId('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLocal = () => {
    const localMembers = memberService.getAll() || [];
    const localExpenses = expenseService.getAll() || [];
    
    if (localMembers.length === 0 && localExpenses.length === 0) {
      toast.info('Không tìm thấy dữ liệu cũ trên máy này.');
      return;
    }
    
    // Navigate to local room route
    navigate('/rooms/local/dashboard');
  };

  return (
    <main data-testid="rooms-page" className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Nhóm"
        title="Phòng"
        subtitle={`Quản lý các phòng chia sẻ chi tiêu${user?.name ? ` của ${user.name}` : ''}.`}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <AppCard className="border border-white/5 bg-dark-800 p-5">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-dark-900">
              <Plus className="h-4 w-4 text-blue-300" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Tạo phòng mới</h2>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">Dùng cho nhà chung, chuyến đi hoặc nhóm chi tiêu riêng.</p>
            </div>
          </div>
          <form onSubmit={handleCreate} className="space-y-3">
            <AppInput
              ref={roomNameInputRef}
              data-testid="room-name-input"
              label="Tên phòng"
              placeholder="VD: Nhà Quận 3"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <AppButton data-testid="room-create-submit" loading={loading} type="submit" icon={Plus} fullWidth>
              Tạo phòng
            </AppButton>
          </form>
        </AppCard>

        <AppCard className="border border-white/5 bg-dark-800 p-5">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-dark-900">
              <Users className="h-4 w-4 text-blue-300" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Tham gia phòng</h2>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">Nhập mã 6 ký tự để gửi yêu cầu tham gia.</p>
            </div>
          </div>
          <form onSubmit={handleJoin} className="space-y-3">
            {guestsToClaim ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">Bạn có phải là một trong những thành viên ảo sau?</p>
                <div className="space-y-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/5 bg-dark-900/60 p-2 text-sm text-white">
                    <input type="radio" value="" checked={selectedGuestId === ''} onChange={() => setSelectedGuestId('')} />
                    Không, tôi là người mới
                  </label>
                  {guestsToClaim.map(g => (
                    <label key={g.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/5 bg-dark-900/60 p-2 text-sm text-white">
                      <input type="radio" value={g.id} checked={selectedGuestId === g.id} onChange={() => setSelectedGuestId(g.id)} />
                      Tôi là {g.displayName}
                    </label>
                  ))}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <AppButton type="button" variant="secondary" onClick={() => setGuestsToClaim(null)} fullWidth>Trở lại</AppButton>
                  <AppButton loading={loading} type="submit" fullWidth>Xác nhận</AppButton>
                </div>
              </div>
            ) : (
              <>
                <AppInput
                  className="uppercase"
                  label="Mã phòng"
                  placeholder="Nhập mã CODE"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  maxLength={6}
                />
                <AppButton loading={loading} type="submit" variant="secondary" icon={Users} fullWidth>
                  Yêu cầu tham gia
                </AppButton>
              </>
            )}
          </form>
        </AppCard>
      </section>

      {createdRoom && (
        <AppCard className="border border-emerald-500/15 bg-emerald-500/5 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-300" />
                <h2 className="text-sm font-semibold text-white">Phòng đã được tạo</h2>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-gray-400">
                Chia sẻ mã phòng để thành viên gửi yêu cầu tham gia. Chủ phòng sẽ duyệt yêu cầu trong trang Thành viên.
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/5 bg-dark-900/70 px-3 py-2">
                <span className="text-xs text-gray-500">Mã phòng</span>
                <span className="font-mono text-sm font-semibold tracking-widest text-white">{createdRoom.code}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
              <AppButton size="sm" variant="secondary" icon={Copy} onClick={() => copyRoomCode(createdRoom.code)}>
                Sao chép mã
              </AppButton>
              <AppButton size="sm" variant="secondary" icon={ArrowRight} onClick={() => openCreatedRoom(createdRoom.id)}>
                Mở phòng
              </AppButton>
              <AppButton
                size="sm"
                icon={Receipt}
                onClick={() => openCreatedRoom(createdRoom.id, { state: { openAddExpense: true } })}
              >
                Thêm khoản chi
              </AppButton>
            </div>
          </div>
        </AppCard>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Danh sách phòng</h2>
          <span className="text-xs text-gray-500">{rooms.length} phòng</span>
        </div>
        {loadingRooms ? (
          <div className="space-y-3">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : rooms.length === 0 ? (
          <EmptyState
            icon={DoorOpen}
            title="Bạn chưa tham gia phòng nào"
            description="Tạo phòng mới hoặc nhập mã mời để bắt đầu theo dõi chi tiêu chung."
            action={<AppButton onClick={() => roomNameInputRef.current?.focus()} icon={Plus}>Tạo phòng ở trên</AppButton>}
            compact
          />
        ) : (
          <div className="space-y-3">
            {rooms.map(membership => (
              <AppCard
                key={membership.id}
                data-testid="room-card"
                hover={membership.status === 'approved'}
                className={`flex flex-col gap-3 border p-4 transition-colors sm:flex-row sm:items-center sm:justify-between
                  ${membership.status === 'approved' ? 'cursor-pointer border-blue-500/20' : 'border-white/5 opacity-75'}
                `}
                onClick={() => membership.status === 'approved' && navigate(`/rooms/${membership.roomId}/dashboard`)}
              >
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-white">{membership.room.name}</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Mã phòng: <span className="font-mono tracking-widest text-gray-300">{membership.room.code}</span>
                  </p>
                </div>
                <div className="shrink-0">
                  <div className="flex flex-wrap gap-1.5 sm:justify-end">
                    {membership.status === 'approved' && (
                      <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-medium text-gray-300">
                        {membership.role === 'owner' ? 'Chủ phòng' : 'Thành viên'}
                      </span>
                    )}
                    {membership.status === 'approved' ? (
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">Đã vào</span>
                    ) : membership.status === 'pending' ? (
                      <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400">Chờ duyệt</span>
                    ) : (
                      <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400">Bị từ chối</span>
                    )}
                  </div>
                </div>
              </AppCard>
            ))}
          </div>
        )}
      </section>

      <div className="border-t border-white/5 pt-5 text-center">
        <button onClick={handleOpenLocal} className="mx-auto flex items-center justify-center gap-2 text-sm text-gray-400 transition-colors hover:text-white">
          <HardDrive className="h-4 w-4" />
          Xem lại dữ liệu cũ trên máy này
        </button>
      </div>
    </main>
  );
}
