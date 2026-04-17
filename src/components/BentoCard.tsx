import React from 'react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function BentoCard({ children, className, delay = 0 }: BentoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={cn(
        "bg-slate-800 border border-slate-700 rounded-2xl p-6 flex flex-col justify-between overflow-hidden",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
