import { useMemo, useState } from 'react';
import { FileSpreadsheet, Upload } from 'lucide-react';
import { ModalBody, ModalFooter, ModalHeader, ModalLayout } from '../ui/ModalLayout';
import AppButton from '../ui/AppButton';
import EmptyState from '../ui/EmptyState';
import { expenseApi, guestApi, importApi } from '../../services/apiClient';
import { useApp } from '../../context/AppContext';
import ImportPreviewTable from './ImportPreviewTable';
import MemberMappingPanel from './MemberMappingPanel';
import ImportSummaryCard from './ImportSummaryCard';

const STEPS = ['Tải lên', 'Xem trước', 'Ghép thành viên', 'Xác nhận', 'Kết quả'];

export default function ImportExcelModal({ open, onClose }) {
  const { currentRoom, members, toast, setExpenses, setMembers } = useApp();
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mappings, setMappings] = useState({});
  const [selectedRows, setSelectedRows] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const activeMembers = members.filter((member) => member.status === 'approved' || member.status === 'active');
  const selectedPreviewRows = useMemo(
    () => preview?.rows.filter((row) => selectedRows.includes(row.rowIndex)) || [],
    [preview, selectedRows],
  );
  const requiredSourceNames = useMemo(() => {
    const names = new Set();
    selectedPreviewRows.forEach((row) => {
      if (row.paidBySourceName) names.add(row.paidBySourceName);
      row.participantSourceNames.forEach((name) => names.add(name));
    });
    return names;
  }, [selectedPreviewRows]);
  const hasUnresolvedMappings = [...requiredSourceNames].some((name) => {
    const mapping = mappings[name];
    return !mapping?.type || (mapping.type !== 'create_guest' && !mapping.id) || (mapping.type === 'create_guest' && !mapping.displayName?.trim());
  });

  const close = () => {
    setStep(0);
    setFile(null);
    setPreview(null);
    setMappings({});
    setSelectedRows([]);
    setResult(null);
    setLoading(false);
    onClose();
  };

  const handlePreview = async () => {
    if (!file) return toast.error('Vui lòng chọn file Excel.');
    setLoading(true);
    try {
      const data = await importApi.previewRoomImport(currentRoom.roomId, file);
      setPreview(data);
      setSelectedRows(data.rows.filter((row) => row.status === 'valid' || row.status === 'warning').map((row) => row.rowIndex));
      setMappings(buildInitialMappings(data.members));
      setStep(1);
    } catch (error) {
      toast.error(error.message || 'Không thể xem trước dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    setLoading(true);
    try {
      const data = await importApi.commitRoomImport(currentRoom.roomId, {
        importId: preview.importId,
        memberMappings: mappings,
        selectedRows,
      });
      setResult(data);
      await refreshRoomCollections({
        roomId: currentRoom.roomId,
        members,
        setExpenses,
        setMembers,
      });
      toast.success('Đã nhập thành công.');
      setStep(4);
    } catch (error) {
      toast.error(error.message || 'Không thể nhập dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (rowIndex) => {
    setSelectedRows((current) => current.includes(rowIndex)
      ? current.filter((value) => value !== rowIndex)
      : [...current, rowIndex]);
  };

  return (
    <ModalLayout open={open} onClose={close} size="xl">
      <ModalHeader title="Nhập dữ liệu" subtitle={STEPS[step]} icon={FileSpreadsheet} onClose={close} />
      <ModalBody className="space-y-5">
        <StepBar step={step} />

        {step === 0 && (
          <div className="space-y-4">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-dark-800 px-6 py-10 text-center">
              <Upload className="mb-3 h-6 w-6 text-gray-400" />
              <span className="text-sm font-medium text-white">Tải lên file Excel</span>
              <span className="mt-1 text-xs text-gray-500">Hỗ trợ .xlsx</span>
              <input type="file" accept=".xlsx" className="hidden" onChange={(event) => setFile(event.target.files?.[0] || null)} />
            </label>
            {file && <p className="text-sm text-gray-300">{file.name}</p>}
          </div>
        )}

        {step === 1 && preview && (
          <div className="space-y-4">
            <ImportSummaryCard summary={preview.summary} />
            <ImportPreviewTable rows={preview.rows} selectedRows={selectedRows} onToggle={toggleRow} />
          </div>
        )}

        {step === 2 && preview && (
          <MemberMappingPanel
            detectedMembers={preview.members.filter((member) => requiredSourceNames.has(member.sourceName))}
            mappings={mappings}
            roomMembers={activeMembers}
            onChange={(sourceName, mapping) => setMappings((current) => ({ ...current, [sourceName]: mapping }))}
          />
        )}

        {step === 3 && preview && (
          <div className="space-y-4">
            <ImportSummaryCard summary={{
              totalRows: selectedRows.length,
              candidateRows: selectedRows.length,
              skippedRows: 0,
              validRows: selectedPreviewRows.filter((row) => row.status === 'valid').length,
              warningRows: selectedPreviewRows.filter((row) => row.status === 'warning').length,
              errorRows: 0,
              blockingRows: 0,
              totalAmount: selectedPreviewRows.reduce((sum, row) => sum + row.amount, 0),
            }} />
            <div className="rounded-xl border border-white/5 bg-dark-800 p-4 text-sm text-gray-300">
              <p>Bạn sắp nhập {selectedRows.length} dòng vào phòng hiện tại.</p>
              <p className="mt-1 text-gray-500">Các dòng lỗi đã được bỏ qua. Hãy xác nhận trước khi lưu.</p>
            </div>
          </div>
        )}

        {step === 4 && result && (
          <div className="space-y-4">
            <ImportSummaryCard summary={result} result />
            {result.errors.length > 0 ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
                {result.errors.map((error) => (
                  <p key={`${error.rowIndex}-${error.message}`}>Dòng {error.rowIndex}: {error.message}</p>
                ))}
              </div>
            ) : (
              <EmptyState icon={FileSpreadsheet} title="Đã nhập thành công" description="Các khoản chi đã được thêm vào phòng hiện tại." compact />
            )}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        {step === 0 && (
          <>
            <AppButton variant="secondary" onClick={close}>Huỷ</AppButton>
            <AppButton onClick={handlePreview} loading={loading}>Xem trước dữ liệu</AppButton>
          </>
        )}
        {step === 1 && (
          <>
            <AppButton variant="secondary" onClick={() => setStep(0)}>Quay lại</AppButton>
            <AppButton disabled={selectedRows.length === 0} onClick={() => setStep(2)}>Ghép thành viên</AppButton>
          </>
        )}
        {step === 2 && (
          <>
            <AppButton variant="secondary" onClick={() => setStep(1)}>Quay lại</AppButton>
            <AppButton disabled={hasUnresolvedMappings} onClick={() => setStep(3)}>Xác nhận nhập</AppButton>
          </>
        )}
        {step === 3 && (
          <>
            <AppButton variant="secondary" onClick={() => setStep(2)}>Quay lại</AppButton>
            <AppButton onClick={handleCommit} loading={loading}>Xác nhận nhập</AppButton>
          </>
        )}
        {step === 4 && <AppButton onClick={close}>Đóng</AppButton>}
      </ModalFooter>
    </ModalLayout>
  );
}

function StepBar({ step }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {STEPS.map((label, index) => (
        <div key={label}>
          <div className={`h-1 rounded-full ${index <= step ? 'bg-blue-500' : 'bg-white/10'}`} />
          <p className={`mt-1 text-[11px] ${index <= step ? 'text-gray-300' : 'text-gray-600'}`}>{label}</p>
        </div>
      ))}
    </div>
  );
}

function buildInitialMappings(detectedMembers) {
  return Object.fromEntries(detectedMembers.map((member) => {
    const match = member.suggestedMatch;
    return [member.sourceName, match.type === 'none'
      ? { type: '', id: null, displayName: '' }
      : { type: match.type, id: match.id, displayName: match.displayName }];
  }));
}

async function refreshRoomCollections({ roomId, members, setExpenses, setMembers }) {
  const [expensesData, guestsData] = await Promise.all([
    expenseApi.getExpenses(roomId),
    guestApi.getGuests(roomId),
  ]);
  setExpenses(expensesData.expenses.map((expense) => {
    const shareMap = {};
    expense.participants.forEach((participant) => {
      const participantId = participant.userId || participant.guestMemberId;
      if (participantId) shareMap[participantId] = participant.shareAmount;
    });
    return {
      id: expense.id,
      title: expense.title,
      amount: expense.amount,
      date: expense.date.split('T')[0],
      paidBy: expense.paidByUserId || expense.paidByGuestMemberId,
      createdBy: expense.createdByUserId,
      category: expense.category,
      note: expense.note,
      splitType: expense.splitType || 'equal',
      participants: expense.participants.map((participant) => participant.userId || participant.guestMemberId),
      shareMap,
    };
  }));
  const existingUsers = members.filter((member) => member.type === 'user');
  const refreshedGuests = guestsData.guests.map((guest, index) => ({
    id: guest.id,
    name: guest.displayName || guest.name || guest.username || guest.email || 'Unknown',
    status: guest.status,
    type: 'guest',
    claimedByUserId: guest.claimedByUserId,
    colorIndex: (index + existingUsers.length) % 5,
  }));
  setMembers([...existingUsers, ...refreshedGuests]);
}
