import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  illustration?: 'approvals' | 'ledger' | 'offline' | 'agents';
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  title,
  description,
  illustration,
  action,
  className = '',
}: EmptyStateProps) {
  const illustrationSrc = illustration
    ? `/assets/aeon/empty-${illustration}.svg`
    : null;

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#181818] p-8 text-center transition-all sm:p-12 ${className}`}
    >
      {illustrationSrc && (
        <div className="mb-6 flex max-h-48 max-w-xs items-center justify-center overflow-hidden rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#121212]/80">
          <img
            src={illustrationSrc}
            alt=""
            width="320"
            height="240"
            className="h-auto w-full object-contain"
            loading="lazy"
          />
        </div>
      )}

      <h3 className="text-base font-semibold tracking-tight text-[#EBEBEB]">
        {title}
      </h3>
      <p className="mt-1.5 max-w-md text-xs leading-relaxed text-[#9EA1A5]">
        {description}
      </p>

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-5 inline-flex items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.14)] bg-[#202020] px-4 py-2 text-xs font-medium text-[#EBEBEB] transition-colors hover:border-[#00F0FF]/40 hover:bg-[#282828] hover:text-[#00F0FF] active:scale-[0.98]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
