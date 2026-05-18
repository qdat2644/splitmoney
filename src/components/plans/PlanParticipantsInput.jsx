import { useMemo, useState } from 'react';
import { Check, Pencil, Plus, User, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const getName = (participant) => participant.name || participant.displayName || 'Unknown';
const getKey = (participant) => participant.id ? `${participant.type}:${participant.id}` : `manual:${getName(participant).trim().toLowerCase()}`;

export default function PlanParticipantsInput({ value, onChange, showRoomMembers = false, lockedParticipantIds = [] }) {
  const { members } = useApp();
  const [newName, setNewName] = useState('');
  const [editingKey, setEditingKey] = useState(null);
  const [editingName, setEditingName] = useState('');
  const names = useMemo(() => new Set(value.map((item) => getName(item).trim().toLowerCase())), [value]);

  const addManual = () => {
    const name = newName.trim();
    if (!name || names.has(name.toLowerCase())) return;
    onChange([...value, { name, displayName: name, type: 'manual' }]);
    setNewName('');
  };

  const addRoomMember = (member) => {
    const name = getName(member);
    if (value.some((item) => item.id === member.id || getName(item).trim().toLowerCase() === name.trim().toLowerCase())) return;
    onChange([...value, { name, type: member.type, id: member.id }]);
  };

  const saveRename = () => {
    const name = editingName.trim();
    if (!name) return;
    if (value.some((item) => getKey(item) !== editingKey && getName(item).trim().toLowerCase() === name.toLowerCase())) return;
    onChange(value.map((item) => getKey(item) === editingKey ? { ...item, name, displayName: name } : item));
    setEditingKey(null);
    setEditingName('');
  };

  return (
    <div className="space-y-3">
      <label className="text-xs text-gray-400 block">Thành viên tham gia</label>
      <div className="flex flex-wrap gap-2">
        {value.map((participant) => {
          const key = getKey(participant);
          const locked = participant.id && lockedParticipantIds.includes(participant.id);
          return (
            <div key={key} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 border border-white/10 text-xs text-white">
              <User className={`w-3 h-3 ${participant.type === 'manual' ? 'text-gray-400' : 'text-blue-400'}`} />
              {editingKey === key ? (
                <>
                  <input className="w-24 bg-transparent border-b border-white/20 focus:outline-none" value={editingName} onChange={(event) => setEditingName(event.target.value)} />
                  <button type="button" onClick={saveRename} className="text-emerald-400"><Check className="w-3 h-3" /></button>
                </>
              ) : (
                <>
                  {getName(participant)} {participant.type === 'manual' && '(tạm)'}
                  {participant.type === 'manual' && (
                    <button type="button" onClick={() => { setEditingKey(key); setEditingName(getName(participant)); }} className="text-gray-500 hover:text-white ml-1">
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                  {!locked && (
                    <button type="button" onClick={() => onChange(value.filter((item) => getKey(item) !== key))} className="text-gray-500 hover:text-red-400 ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <input className="input-field py-1.5 text-xs flex-1" placeholder="Nhập tên người tham gia..." value={newName} onChange={(event) => setNewName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && (event.preventDefault(), addManual())} />
        <button type="button" onClick={addManual} className="btn-secondary py-1.5 px-3 text-xs"><Plus className="w-3.5 h-3.5" /></button>
      </div>
      {showRoomMembers && members.length > 0 && (
        <div className="mt-2">
          <p className="text-[10px] text-gray-500 mb-1">Chọn từ phòng hiện tại:</p>
          <div className="flex flex-wrap gap-1.5">
            {members.filter((member) => !value.some((item) => item.id === member.id)).map((member) => (
              <button key={member.id} type="button" onClick={() => addRoomMember(member)} className="text-[10px] px-2 py-1 rounded border border-white/10 text-gray-400 hover:text-white hover:bg-white/5">
                + {getName(member)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
