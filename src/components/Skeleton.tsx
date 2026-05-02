import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  count?: number;
  variant?: 'text' | 'card' | 'circle' | 'bar' | 'profile';
}

const Skeleton = ({ className = '', count = 1, variant = 'text' }: SkeletonProps) => {
  const baseClasses = 'animate-pulse rounded-xl';
  const variants = {
    text: 'h-4 bg-white/10',
    card: 'h-40 bg-white/5 border border-white/10',
    circle: 'w-12 h-12 rounded-full bg-white/10',
    bar: 'h-3 bg-white/10 rounded-full',
    profile: '',
  };

  if (variant === 'profile') {
    return (
      <div className={`glass-card p-8 ${className}`}>
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="w-32 h-32 rounded-full bg-white/10 animate-pulse" />
          <div className="flex-1 space-y-3 w-full">
            <div className="h-8 bg-white/10 rounded-lg w-1/3 animate-pulse" />
            <div className="h-3 bg-white/10 rounded-lg w-2/3 animate-pulse" />
            <div className="h-3 bg-white/10 rounded-lg w-full animate-pulse" />
            <div className="flex gap-4 mt-4">
              <div className="h-6 bg-white/10 rounded-full w-24 animate-pulse" />
              <div className="h-6 bg-white/10 rounded-full w-20 animate-pulse" />
              <div className="h-6 bg-white/10 rounded-full w-28 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.1 }}
          className={`${baseClasses} ${variants[variant]} ${className}`}
        />
      ))}
    </>
  );
};

export default Skeleton;
