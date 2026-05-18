// Members.jsx — Member management page
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import MemberCard from '../components/members/MemberCard';
import AddGuestModal from '../components/members/AddGuestModal';
import { Check, X as XIcon, Shield, Users } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import AppButton from '../components/ui/AppButton';
import AppCard from '../components/ui/AppCard';

export default function Members() {
  const { members, approvedMembers, approveMember, rejectMember, removeMember, currentRoom, currentUser } = useApp();
  const [showAddGuest, setShowAddGuest] = useState(false);
  
  const isOwner = currentRoom?.role === 'owner';
  
  const pendingMembers = members.filter(m => m.status === 'pending');

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <PageHeader
        title="Thành viên"
        subtitle={`${approvedMembers.length} thành viên chính thức/ảo`}
        actions={
          isOwner && (
            <AppButton onClick={() => setShowAddGuest(true)} icon={UserPlus} variant="ghost" className="border border-white/5 bg-white/5">
              <span className="hidden sm:inline">Thêm người ảo</span>
            </AppButton>
          )
        }
      />

      {/* Pending members */}
      {isOwner && pendingMembers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <AppCard className="p-5 border-yellow-500/20 bg-yellow-500/5">
          <h2 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Cần duyệt ({pendingMembers.length})
          </h2>
          <div className="space-y-2">
            {pendingMembers.map(m => {
              const claimedGuest = members.find(g => g.id === m.claimGuestMemberId);
              return (
              <div key={m.id} className="flex flex-col gap-2 p-3 bg-dark-800/50 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-gray-200 font-medium">{m.name}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => rejectMember(m.id)} className="btn-icon text-red-400 hover:bg-red-400/10" title="Từ chối">
                      <XIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => approveMember(m.id)} className="btn-icon text-emerald-400 hover:bg-emerald-400/10" title="Duyệt">
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {claimedGuest && (
                  <p className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded inline-block self-start border border-blue-500/20">
                    Yêu cầu nhận diện: {claimedGuest.name}
                  </p>
                )}
              </div>
              );
            })}
          </div>
          </AppCard>
        </motion.div>
      )}

      {/* Members grid */}
      {approvedMembers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Chưa có thành viên chính thức"
          description={
            <>
              Mời bạn bè tham gia bằng mã phòng: <span className="font-mono text-white tracking-widest">{currentRoom?.room?.code}</span>
            </>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {approvedMembers.map((m, i) => (
              <MemberCard key={m.id} member={m} index={i} isOwner={isOwner} currentUser={currentUser} />
            ))}
          </AnimatePresence>
        </div>
      )}
      
      <AddGuestModal isOpen={showAddGuest} onClose={() => setShowAddGuest(false)} />
    </div>
  );
}
