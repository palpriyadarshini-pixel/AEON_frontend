import React from 'react';
import { StatusBadge, StatusVariant } from './StatusBadge';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  badgeText: string;
  badgeVariant?: StatusVariant;
  icon: (props: { className?: string }) => JSX.Element;
  trend?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  badgeText,
  badgeVariant = 'neutral',
  icon: Icon,
  trend,
}: MetricCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#181818] p-5.5 transition-all duration-150 hover:border-[rgba(255,255,255,0.14)] hover:bg-[#1B1B1B]">
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium tracking-wide uppercase text-[#9EA1A5]">
          {title}
        </span>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#202020] text-[#9EA1A5] transition-colors group-hover:border-[#00F0FF]/30 group-hover:text-[#00F0FF]">
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>

      {/* Main Metric Value */}
      <div className="mt-3.5">
        <p className="tabular-nums text-2xl font-bold tracking-tight text-[#EBEBEB] sm:text-3xl">
          {value}
        </p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="truncate text-xs text-[#777777]">
            {subtitle}
          </p>
          {trend && (
            <span className="tabular-nums text-[11px] font-mono text-[#00F0FF]">
              {trend}
            </span>
          )}
        </div>
      </div>

      {/* Footer Status Pill */}
      <div className="mt-4.5 flex items-center justify-between border-t border-[rgba(255,255,255,0.06)] pt-3">
        <span className="text-[11px] uppercase tracking-wider text-[#55585D] font-mono">
          System State
        </span>
        <StatusBadge value={badgeText} variant={badgeVariant} />
      </div>
    </div>
  );
}
