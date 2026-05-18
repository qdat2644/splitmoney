import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Plus, Users, LogOut, Loader2, HardDrive } from 'lucide-react';
import { roomApi } from '../../services/apiClient';
import { memberService, expenseService } from '../../services/storageService';

import { useNavigate } from 'react-router-dom';
import { SkeletonRow } from '../../components/ui/Skeleton';

export default function RoomList() {
  const { rooms, setRooms, loadingRooms, toast } = useApp();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  
  const [isJoin, setIsJoin] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [guestsToClaim, setGuestsToClaim] = useState(null);
  const [selectedGuestId, setSelectedGuestId] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name) return;
    setLoading(true);
    try {
      const res = await roomApi.createRoom({ name });
      toast.success('Tạo room thành công!');
      // Refresh rooms
      const data = await roomApi.getRooms();
      setRooms(data.memberships);
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
    <div className="max-w-6xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Phòng của bạn</h1>
          <p className="text-gray-400">Chào, {user?.name}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
          <div className="card p-6 border border-white/5">
            <h2 className="text-lg font-semibold text-white mb-4">Tạo phòng mới</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <input 
                className="input-field" placeholder="Tên phòng..." 
                value={name} onChange={e => setName(e.target.value)}
              />
              <button disabled={loading} type="submit" className="btn-primary w-full flex justify-center gap-2">
                <Plus className="w-4 h-4" /> Tạo ngay
              </button>
            </form>
          </div>

          <div className="card p-6 border border-white/5">
            <h2 className="text-lg font-semibold text-white mb-4">Tham gia phòng</h2>
            <form onSubmit={handleJoin} className="space-y-3">
              {guestsToClaim ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-400">Bạn có phải là một trong những thành viên ảo sau?</p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-white bg-dark-800 p-2 rounded cursor-pointer border border-white/5">
                      <input type="radio" value="" checked={selectedGuestId === ''} onChange={() => setSelectedGuestId('')} />
                      Không, tôi là người mới
                    </label>
                    {guestsToClaim.map(g => (
                      <label key={g.id} className="flex items-center gap-2 text-white bg-dark-800 p-2 rounded cursor-pointer border border-white/5">
                        <input type="radio" value={g.id} checked={selectedGuestId === g.id} onChange={() => setSelectedGuestId(g.id)} />
                        Tôi là {g.displayName}
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setGuestsToClaim(null)} className="btn-secondary w-full">Trở lại</button>
                    <button disabled={loading} type="submit" className="btn-primary w-full">Xác nhận</button>
                  </div>
                </div>
              ) : (
                <>
                  <input 
                    className="input-field uppercase" placeholder="Nhập mã CODE (6 ký tự)..." 
                    value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                    maxLength={6}
                  />
                  <button disabled={loading} type="submit" className="btn-secondary w-full flex justify-center gap-2">
                    <Users className="w-4 h-4" /> Yêu cầu tham gia
                  </button>
                </>
              )}
            </form>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-white mb-4">Danh sách phòng</h2>
        {loadingRooms ? (
          <div className="space-y-3">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            Bạn chưa tham gia phòng nào.
          </div>
        ) : (
          <div className="space-y-3">
            {rooms.map(membership => (
              <div 
                key={membership.id} 
                className={`card p-4 flex items-center justify-between transition-colors
                  ${membership.status === 'approved' ? 'hover:bg-white/5 cursor-pointer border-blue-500/30' : 'opacity-75 border-white/5'}
                `}
                onClick={() => membership.status === 'approved' && navigate(`/rooms/${membership.roomId}/dashboard`)}
              >
                <div>
                  <h3 className="font-semibold text-white text-lg">{membership.room.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">Code: <span className="text-gray-300 font-mono tracking-widest">{membership.room.code}</span></p>
                </div>
                <div>
                  {membership.status === 'approved' ? (
                    <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full font-medium">Đã vào</span>
                  ) : membership.status === 'pending' ? (
                    <span className="text-xs bg-yellow-500/10 text-yellow-400 px-2.5 py-1 rounded-full font-medium">Chờ duyệt</span>
                  ) : (
                    <span className="text-xs bg-red-500/10 text-red-400 px-2.5 py-1 rounded-full font-medium">Bị từ chối</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <button onClick={handleOpenLocal} className="text-sm text-gray-400 hover:text-white flex items-center justify-center gap-2 mx-auto transition-colors">
            <HardDrive className="w-4 h-4" />
            Xem lại dữ liệu cũ (Local Offline)
          </button>
        </div>
      </div>
  );
}
