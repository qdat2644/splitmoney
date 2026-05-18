// DashboardSkeleton.jsx — Loading skeleton for personal dashboard
export default function DashboardSkeleton() {
  const Skel = ({ className }) => (
    <div className={`animate-pulse bg-white/5 rounded-xl ${className}`} />
  );

  return (
    <div className="space-y-6">
      {/* Top Row: Hero (2 cols) + 2 Summary Cards (1 col) */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Skel className="lg:col-span-2 h-[220px]" />
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
          <Skel className="h-[104px]" />
          <Skel className="h-[104px]" />
        </div>
      </div>
      {/* Middle row */}
      <div className="grid md:grid-cols-2 gap-4">
        <Skel className="h-64" />
        <Skel className="h-64" />
      </div>
      {/* Bottom row */}
      <div className="grid md:grid-cols-2 gap-4">
        <Skel className="h-80" />
        <Skel className="h-80" />
      </div>
    </div>
  );
}
