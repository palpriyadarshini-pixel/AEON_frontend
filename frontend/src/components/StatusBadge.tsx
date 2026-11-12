import React from 'react';

export type StatusVariant = 'emerald' | 'cyan' | 'amber' | 'crimson' | 'neutral';

interface StatusBadgeProps {
  value: string;
  variant?: StatusVariant;
  className?: string;
  dot?: boolean;
}

export function getStatusVariant(value: string): StatusVariant {
  const norm = (value || '').toUpperCase().trim();
  
  // Emerald: verified, authorized, capture completed, reconciled, settled
  if (['SETTLED', 'COMPLETED', 'AUTHORIZED', 'DELIVERED', 'ACTIVE', 'VERIFIED', 'APPROVED', 'HEALTHY'].includes(norm)) {
    return 'emerald';
  }
  
  // Cyan: active agent telemetry, live policy evaluation, connected systems
  if (['RECOMMENDED', 'QUOTING', 'LIVE', 'CONNECTED', 'EVALUATED'].includes(norm)) {
    return 'cyan';
  }
  
  // Amber: flagged, human approval required, pending capture, pending review
  if (['REQUIRES_APPROVAL', 'PENDING', 'PENDING_REVIEW', 'BUYER_APPROVAL_PENDING', 'CAPTURE_PENDING', 'FLAGGED', 'EXPIRED'].includes(norm)) {
    return 'amber';
  }
  
  // Crimson: hard policy block, denied payment, critical error, rejected
  if (['BLOCKED', 'DENIED', 'FAILED', 'REJECTED', 'CRITICAL', 'UNAUTHORIZED', 'DISCONNECTED'].includes(norm)) {
    return 'crimson';
  }
  
  // Neutral: created, unknown, unavailable, inactive, historical, cancelled, refunded, released
  return 'neutral';
}

export function StatusBadge({
  value,
  variant,
  className = '',
  dot = true,
}: StatusBadgeProps) {
  const resolvedVariant = variant || getStatusVariant(value);

  const styleMap: Record<StatusVariant, { badge: string; dot: string; text: string }> = {
    emerald: {
      badge: 'border-[rgba(29,185,84,0.25)] bg-[rgba(29,185,84,0.08)] text-[#1DB954]',
      dot: 'bg-[#1DB954]',
      text: 'text-[#1DB954]',
    },
    cyan: {
      badge: 'border-[rgba(0,240,255,0.25)] bg-[rgba(0,240,255,0.08)] text-[#00F0FF]',
      dot: 'bg-[#00F0FF]',
      text: 'text-[#00F0FF]',
    },
    amber: {
      badge: 'border-[rgba(245,185,66,0.25)] bg-[rgba(245,185,66,0.08)] text-[#F5B942]',
      dot: 'bg-[#F5B942]',
      text: 'text-[#F5B942]',
    },
    crimson: {
      badge: 'border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] text-[#EF4444]',
      dot: 'bg-[#EF4444]',
      text: 'text-[#EF4444]',
    },
    neutral: {
      badge: 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[#9EA1A5]',
      dot: 'bg-[#777777]',
      text: 'text-[#9EA1A5]',
    },
  };

  const style = styleMap[resolvedVariant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase font-mono ${style.badge} ${className}`}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${style.dot} ${
            resolvedVariant === 'cyan' ? 'telemetry-pulse' : ''
          }`}
          aria-hidden="true"
        />
      )}
      <span className="truncate">{value || 'UNKNOWN'}</span>
    </span>
  );
}
