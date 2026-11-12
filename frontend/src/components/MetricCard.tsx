
interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  badgeText: string;
  badgeVariant?: 'neutral' | 'success' | 'warning' | 'danger' | 'cyan';
  icon: (props: { className?: string }) => JSX.Element;
}

export function MetricCard({
  title,
  value,
  subtitle,
  badgeText,
  badgeVariant = 'neutral',
  icon: Icon,
}: MetricCardProps) {
  const badgeClasses = {
    neutral: 'bg-slate-700/40 text-slate-300',
    success: 'bg-emerald-500/10 text-emerald-400',
    warning: 'bg-amber-500/10 text-amber-400',
    danger: 'bg-red-500/10 text-red-400',
    cyan: 'bg-blue-500/10 text-blue-400',
  }[badgeVariant];

  return (
    <div className="rounded-xl border border-[#2E3A47] bg-[#1A222C] p-5 transition-all duration-200 hover:border-[#3C50E0]/60">
      {/* Card heading */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-400">
          {title}
        </h3>

        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#24303F] text-[#8098F9]">
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {/* Metric */}
      <div className="mt-4">
        <p className="break-words text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {value}
        </p>
        <p className="mt-2 text-xs text-slate-400">
          {subtitle}
        </p>
      </div>

      {/* Integration status */}
      <div className="mt-5 flex items-center justify-between border-t border-[#2E3A47] pt-4">
        <span className="text-xs text-slate-500">
          Integration state
        </span>

        <span className={`rounded-full px-3 py-1 text-[10px] font-medium ${badgeClasses}`}>
          {badgeText}
        </span>
      </div>
    </div>
  );
}
