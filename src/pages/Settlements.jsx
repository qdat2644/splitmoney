// Settlements.jsx — Full debt settlement page with payment history
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeftRight, Download, Info, Plus, Trash2, Clock, Wallet } from 'lucide-react';
import { useApp } from '../context/AppContext';
import SettlementList from '../components/settlements/SettlementList';
import PaymentModal from '../components/settlements/PaymentModal';
import Avatar from '../components/ui/Avatar';
import { formatCurrency, formatDate, formatRelativeDate } from '../utils/formatters';
import { exportSettlementsToCsv } from '../utils/exportCsv';
import { useConfirm } from '../hooks/useConfirm';
import PageHeader from '../components/ui/PageHeader';
import AppButton from '../components/ui/AppButton';
import AppCard from '../components/ui/AppCard';

export default function Settlements() {
  const { settlements, members, stats, payments, deletePayment, toast } = useApp();
  const confirm = useConfirm();
  const [payModal, setPayModal] = useState({ open: false, prefill: null });

  const openPay = (prefill = null) => setPayModal({ open: true, prefill });
  const closePay = () => setPayModal({ open: false, prefill: null });

  const handleExport = () => {
    exportSettlementsToCsv(settlements, members);
    toast.success('Đã xuất danh sách công nợ!');
  };

  const handleDeletePayment = async (paymentId) => {
    if (!await confirm({ title: 'Xoá thanh toán?', message: 'Thao tác này không thể hoàn tác.' })) return;
    await deletePayment(paymentId);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <PageHeader
        title="Công nợ"
        subtitle={`${settlements.length} giao dịch còn lại · ${payments.length} lần đã thanh toán`}
        actions={
          <>
            <AppButton onClick={handleExport} icon={Download} variant="secondary">
              Xuất CSV
            </AppButton>
            <AppButton onClick={() => openPay()} icon={Plus}>
              Ghi nhận thanh toán
            </AppButton>
          </>
        }
      />

      {/* Balance summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <AppCard className="p-5">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">Số dư từng người (sau thanh toán)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {stats.perMember.map((m, i) => {
            const member = members.find((mem) => mem.id === m.id);
            const isPos = m.balance > 1;
            const isNeg = m.balance < -1;
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/3 border border-white/5"
              >
                <Avatar member={member} size="md" />
                <p className="text-xs font-medium text-gray-300">{m.name}</p>
                <p className={`text-sm font-bold
                  ${isPos ? 'text-emerald-400' : isNeg ? 'text-red-400' : 'text-gray-500'}`}>
                  {isPos ? '+' : ''}{formatCurrency(m.balance, true)}
                </p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full
                  ${isPos ? 'badge-green' : isNeg ? 'badge-red' : 'badge-blue'}`}>
                  {isPos ? 'Được nhận' : isNeg ? 'Cần trả' : 'Cân bằng'}
                </span>
                {/* Quick pay button for debtors */}
                {isNeg && (
                  <button
                    onClick={() => openPay({ from: m.id, to: '', amount: Math.abs(m.balance) })}
                    className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-0.5"
                  >
                    <Wallet className="w-2.5 h-2.5" />
                    Trả tiền
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
        </AppCard>
      </motion.div>

      {/* Algorithm info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex items-start gap-2 px-4 py-3 rounded-xl bg-blue-500/5 border border-blue-500/15 text-xs text-blue-300"
      >
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <p>
          Thuật toán tối ưu giảm số giao dịch xuống còn <strong>{settlements.length}</strong>.
          Nhấn <strong>"Trả tiền"</strong> để ghi nhận thanh toán với số tiền bất kỳ — hệ thống sẽ
          cập nhật số dư ngay lập tức.
        </p>
      </motion.div>

      {/* Settlement list */}
      <div>
        <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-purple-400" />
          Giao dịch cần thực hiện
        </h2>
        <SettlementList
          settlements={settlements}
          onMark={(s) => openPay({ from: s.from, to: s.to, amount: s.amount })}
          markLabel="Trả tiền"
        />
      </div>

      {/* Payment history */}
      {payments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            Lịch sử thanh toán
            <span className="badge-cyan">{payments.length}</span>
          </h2>
          <div className="space-y-2">
            <AnimatePresence>
              {payments.map((p, i) => {
                const from = members.find((m) => m.id === p.from);
                const to   = members.find((m) => m.id === p.to);
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10, height: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="glass-card p-3 flex items-center gap-3 group"
                  >
                    {/* From */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Avatar member={from} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-400">Người trả</p>
                        <p className="text-sm font-medium text-white truncate">{from?.name ?? '?'}</p>
                      </div>
                    </div>

                    {/* Amount & arrow */}
                    <div className="flex flex-col items-center shrink-0 px-2">
                      <p className="text-sm font-bold text-emerald-400">{formatCurrency(p.amount, true)}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className="w-6 h-px bg-gradient-to-r from-red-500 to-emerald-500" />
                        <ArrowLeftRight className="w-3 h-3 text-gray-500" />
                      </div>
                      <p className="text-[10px] text-gray-600 mt-0.5">
                        {p.date ? formatDate(p.date) : formatRelativeDate(p.createdAt?.split('T')[0])}
                      </p>
                    </div>

                    {/* To */}
                    <div className="flex items-center gap-2 flex-1 min-w-0 justify-end text-right">
                      <div className="min-w-0">
                        <p className="text-xs text-gray-400">Người nhận</p>
                        <p className="text-sm font-medium text-white truncate">{to?.name ?? '?'}</p>
                      </div>
                      <Avatar member={to} size="sm" />
                    </div>

                    {/* Note + delete */}
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDeletePayment(p.id)}
                        className="btn-danger p-1.5"
                        title="Xoá thanh toán này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Total paid */}
          <div className="mt-3 text-right text-xs text-gray-500">
            Tổng đã thanh toán:{' '}
            <span className="text-emerald-400 font-semibold">
              {formatCurrency(payments.reduce((s, p) => s + Number(p.amount), 0), true)}
            </span>
          </div>
        </motion.div>
      )}

      {/* Payment Modal */}
      <PaymentModal
        open={payModal.open}
        onClose={closePay}
        prefill={payModal.prefill}
      />
    </div>
  );
}
