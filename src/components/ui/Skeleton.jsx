// Skeleton.jsx — Reusable skeleton loaders
import { motion } from 'framer-motion';

const shimmerTransition = {
  duration: 1.5,
  ease: 'linear',
  repeat: Infinity,
};

export function SkeletonBlock({ className = '', rounded = 'rounded-lg' }) {
  return (
    <motion.div
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={shimmerTransition}
      className={`bg-white/5 border border-white/5 ${rounded} ${className}`}
    />
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-3 w-full bg-white/2 border border-white/5 rounded-xl">
      <SkeletonBlock className="w-10 h-10 shrink-0" rounded="rounded-xl" />
      <div className="flex-1 space-y-2">
        <SkeletonBlock className="h-4 w-1/3" rounded="rounded-md" />
        <div className="flex gap-2">
          <SkeletonBlock className="h-3 w-20" rounded="rounded-md" />
          <SkeletonBlock className="h-3 w-16" rounded="rounded-md" />
        </div>
      </div>
      <SkeletonBlock className="w-16 h-8 shrink-0" rounded="rounded-lg" />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="glass-card p-4 flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <SkeletonBlock className="w-10 h-10" rounded="rounded-xl" />
        <SkeletonBlock className="w-8 h-8" rounded="rounded-lg" />
      </div>
      <div className="space-y-2 mt-2">
        <SkeletonBlock className="h-5 w-2/3" rounded="rounded-md" />
        <SkeletonBlock className="h-4 w-1/2" rounded="rounded-md" />
      </div>
      <div className="flex justify-between items-end mt-2">
        <SkeletonBlock className="h-6 w-24" rounded="rounded-md" />
        <SkeletonBlock className="w-8 h-8 rounded-full" rounded="rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="space-y-6 animate-pulse opacity-70">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonBlock className="w-48 h-8" rounded="rounded-lg" />
          <SkeletonBlock className="w-64 h-4" rounded="rounded-md" />
        </div>
        <div className="flex gap-2">
          <SkeletonBlock className="w-24 h-10" rounded="rounded-xl" />
          <SkeletonBlock className="w-24 h-10" rounded="rounded-xl" />
        </div>
      </div>
      {/* Content */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="space-y-3">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    </div>
  );
}
