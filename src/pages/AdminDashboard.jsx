import { Shield } from 'lucide-react';
import AppCard from '../components/ui/AppCard';
import PageHeader from '../components/ui/PageHeader';

export default function AdminDashboard() {
  return (
    <main className="mx-auto max-w-5xl space-y-6">
      <PageHeader eyebrow="System" title="Admin" subtitle="Foundation for future moderation, AI monitoring, and room inspection." />
      <AppCard className="p-5">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-blue-300" />
          <h2 className="text-sm font-semibold text-white">Admin foundation</h2>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {['Users', 'Rooms', 'AI jobs'].map((item) => (
            <div key={item} className="rounded-lg border border-white/5 bg-white/3 p-3">
              <p className="text-xs text-gray-500">{item}</p>
              <p className="mt-1 text-sm font-semibold text-white">TODO</p>
            </div>
          ))}
        </div>
      </AppCard>
    </main>
  );
}
