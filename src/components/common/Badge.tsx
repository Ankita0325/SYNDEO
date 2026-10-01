import React from 'react';
import { ShieldCheck, UserCheck, HelpCircle, FileCheck, Clock, CheckCircle2, XCircle } from 'lucide-react';
import type { ConfidenceType } from '../../types';

interface BadgeProps {
  type?: ConfidenceType | 'active' | 'revoked' | 'expired' | 'parsed';
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusBadge: React.FC<BadgeProps> = ({ type = 'evidence-backed', label, size = 'sm', className = '' }) => {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1 font-medium';

  switch (type) {
    case 'evidence-backed':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-medium ${sizeClasses} ${className}`}
        >
          <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>{label || 'Evidence attached'}</span>
        </span>
      );

    case 'user-confirmed':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border border-[#5a25eb]/40 bg-[#5a25eb]/15 text-[#cbbeff] font-medium ${sizeClasses} ${className}`}
        >
          <UserCheck className="w-3.5 h-3.5 text-[#cbbeff]" />
          <span>{label || 'Confirmed by you'}</span>
        </span>
      );

    case 'unknown':
    case 'unverified':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 font-medium ${sizeClasses} ${className}`}
        >
          <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
          <span>{label || 'Not verified'}</span>
        </span>
      );

    case 'active':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-medium ${sizeClasses} ${className}`}
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>{label || 'Active'}</span>
        </span>
      );

    case 'expired':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border border-zinc-600/40 bg-zinc-800/40 text-zinc-400 font-medium ${sizeClasses} ${className}`}
        >
          <Clock className="w-3 h-3 text-zinc-400" />
          <span>{label || 'Expired'}</span>
        </span>
      );

    case 'revoked':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 font-medium ${sizeClasses} ${className}`}
        >
          <XCircle className="w-3 h-3 text-red-400" />
          <span>{label || 'Revoked'}</span>
        </span>
      );

    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800 text-zinc-300 font-medium ${sizeClasses} ${className}`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{label}</span>
        </span>
      );
  }
};
