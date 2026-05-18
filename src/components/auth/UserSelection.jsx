// UserSelection.jsx — Lightweight current user selection
import { useApp } from '../../context/AppContext';
import Avatar from '../ui/Avatar';

export default function UserSelection() {
  const { members, setCurrentUser } = useApp();

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 p-4">
      <div className="card w-full max-w-md p-8 text-center space-y-8 animate-in fade-in zoom-in duration-300">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
            Zyra
          </h1>
          <p className="text-gray-400">Bạn là ai trong nhóm?</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => setCurrentUser(m)}
              className="flex flex-col items-center gap-3 p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-200 group"
            >
              <Avatar member={m} size="lg" className="group-hover:scale-110 transition-transform" />
              <span className="font-medium text-gray-200 group-hover:text-white">{m.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
