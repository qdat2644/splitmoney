import { Settings } from 'lucide-react';
import AppCard from '../components/ui/AppCard';
import PageHeader from '../components/ui/PageHeader';

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-6">
      <PageHeader eyebrow="System" title="Settings" subtitle="Account and product preferences." />
      <AppCard className="p-5">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-gray-300" />
          <p className="text-sm text-gray-300">Settings foundation ready for future preferences.</p>
        </div>
      </AppCard>
    </main>
  );
}
