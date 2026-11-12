import React, { useEffect, useState } from 'react';
import type { ServiceHealthResponse } from '../types';
import { API_MODE } from '../services/config';
import { IconRefresh } from './icons';

interface HeaderProps {
  health: ServiceHealthResponse | null;
  loading: boolean;
  onRefresh: () => void;
  onLogout: () => void;
  onMenuClick: () => void;
  lastSyncTime?: Date | null;
}

export function Header({
  health,
  loading,
  onRefresh,
  onLogout,
  onMenuClick,
  lastSyncTime,
}: HeaderProps) {
  const isHealthy = health?.status === 'healthy';
  const [displaySync, setDisplaySync] = useState<string>('Just now');

  useEffect(() => {
    if (!lastSyncTime) return;
    const updateTime = () => {
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - lastSyncTime.getTime()) / 1000);
      if (diffSec < 10) setDisplaySync('Just now');
      else if (diffSec < 60) setDisplaySync(`${diffSec}s ago`);
      else setDisplaySync(lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 5000);
    return () => clearInterval(interval);
  }, [lastSyncTime]);

  return (
    <header className="sticky top-0 z-40 flex h-[68px] shrink-0 items-center justify-between border-b border-[rgba(255,255,255,0.08)] bg-[#181818] px-5 sm:px-8">
      {/* Left: Mobile Toggle & Context Breadcrumb */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[rgba(255,255,255,0.1)] bg-[#202020] text-[#9EA1A5] transition-colors hover:border-[#00F0FF]/40 hover:text-white lg:hidden"
        >
          <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#777777]">
              CONTROL PLANE
            </span>
            <span className="text-[10px] text-[#55585D]">/</span>
            <span className="text-[10px] font-mono text-[#00F0FF] uppercase tracking-wider">
              POLICY VERIFICATION
            </span>
          </div>
          <h1 className="truncate text-sm font-semibold tracking-tight text-[#EBEBEB] sm:text-base">
            Autonomous Procurement Governance
          </h1>
        </div>
      </div>

      {/* Right: Telemetry & Actions */}
      <div className="flex shrink-0 items-center gap-3">
        {/* Explicit Demo Mode Warning Badge */}
        {API_MODE === 'demo' && (
          <div className="flex items-center gap-1.5 rounded-full border border-[rgba(245,185,66,0.3)] bg-[rgba(245,185,66,0.08)] px-2.5 py-1 text-[10px] font-mono font-medium text-[#F5B942]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#F5B942] animate-pulse" />
            <span>DEMO MODE (SYNTHETIC DATA)</span>
          </div>
        )}

        {/* Sync Telemetry Badge */}
        <div className="hidden items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#202020] px-3 py-1.5 md:flex">
          <span className="text-[11px] font-mono text-[#777777]">SYNC:</span>
          <span className="tabular-nums text-[11px] font-mono text-[#9EA1A5]">{displaySync}</span>
        </div>

        {/* API Backend Health Status */}
        <div className="flex items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#202020] px-3 py-1.5">
          <span
            className={`h-2 w-2 rounded-full ${
              loading
                ? 'bg-[#F5B942] animate-pulse'
                : isHealthy
                  ? 'bg-[#1DB954]'
                  : 'bg-[#EF4444]'
            }`}
          />
          <span className="text-[11px] font-mono text-[#777777] hidden sm:inline">FASTAPI</span>
          <span
            className={`text-[11px] font-mono font-medium ${
              loading
                ? 'text-[#F5B942]'
                : isHealthy
                  ? 'text-[#1DB954]'
                  : 'text-[#EF4444]'
            }`}
          >
            {loading ? 'SYNCING' : isHealthy ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>

        {/* Refresh Trigger */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh telemetry"
          aria-label="Refresh telemetry"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#202020] text-[#9EA1A5] transition-colors hover:border-[#00F0FF]/40 hover:text-[#00F0FF] active:scale-[0.97] disabled:opacity-50"
        >
          <IconRefresh className={`h-4 w-4 ${loading ? 'animate-spin text-[#00F0FF]' : ''}`} />
        </button>

        {/* Session Sign Out */}
        <button
          type="button"
          onClick={onLogout}
          className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#202020] px-3 py-1.5 text-xs font-medium text-[#9EA1A5] transition-colors hover:border-[rgba(239,68,68,0.4)] hover:bg-[rgba(239,68,68,0.08)] hover:text-[#EF4444] active:scale-[0.97]"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
