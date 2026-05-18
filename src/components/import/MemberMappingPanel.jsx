import AppInput from '../ui/AppInput';
import AppSelect from '../ui/AppSelect';

export default function MemberMappingPanel({ detectedMembers, mappings, roomMembers, onChange }) {
  return (
    <div className="space-y-4">
      {detectedMembers.map((member) => {
        const mapping = mappings[member.sourceName] || {};
        const selectValue = mapping.type === 'create_guest'
          ? 'create_guest'
          : mapping.type && mapping.id
            ? `${mapping.type}:${mapping.id}`
            : '';

        return (
          <div key={member.sourceName} className="rounded-xl border border-white/5 bg-dark-800 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">{member.sourceName}</p>
                <p className="text-xs text-gray-500">
                  {member.suggestedMatch.type === 'none'
                    ? 'Chưa có gợi ý phù hợp'
                    : `Gợi ý: ${member.suggestedMatch.displayName}`}
                </p>
              </div>
              <span className="text-xs text-gray-500">{Math.round((member.suggestedMatch.confidence || 0) * 100)}%</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <AppSelect
                label="Ghép với"
                value={selectValue}
                onChange={(event) => handleSelect(event.target.value, member.sourceName, onChange)}
              >
                <option value="">Chọn thành viên</option>
                {roomMembers.map((roomMember) => (
                  <option key={`${roomMember.type}:${roomMember.id}`} value={`${roomMember.type}:${roomMember.id}`}>
                    {roomMember.name}
                  </option>
                ))}
                <option value="create_guest">Tạo khách mới</option>
              </AppSelect>

              {mapping.type === 'create_guest' && (
                <AppInput
                  label="Tên khách mới"
                  value={mapping.displayName || member.sourceName}
                  onChange={(event) => onChange(member.sourceName, {
                    type: 'create_guest',
                    id: null,
                    displayName: event.target.value,
                  })}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function handleSelect(value, sourceName, onChange) {
  if (!value) {
    onChange(sourceName, { type: '', id: null, displayName: '' });
    return;
  }
  if (value === 'create_guest') {
    onChange(sourceName, { type: 'create_guest', id: null, displayName: sourceName });
    return;
  }
  const [type, id] = value.split(':');
  onChange(sourceName, { type, id, displayName: '' });
}
