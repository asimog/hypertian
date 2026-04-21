'use client';

import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { Activity, RadioTower, TvMinimalPlay, Wallet } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Overview' },
  { href: '/dashboard/streamer', label: 'Streamer' },
  { href: '/dashboard/sponsor', label: 'Sponsor' },
  { href: '/x-overlay', label: 'X Overlay' },
  { href: '/pump', label: 'Pump Lane' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { authenticated, login, logout, user } = usePrivy();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 via-cyan-400 to-blue-500 text-slate-950 shadow-lg shadow-cyan-900/40">
              <TvMinimalPlay className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.35em] text-emerald-300">Hypertian</div>
              <div className="text-sm text-slate-300">Run your own advertising channel</div>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            {NAV_ITEMS.map((item) => (
              <Link
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:border-emerald-400/50 hover:bg-white/5"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {authenticated ? (
              <>
                <div className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-300">
                  {user?.email?.address || user?.twitter?.username || 'Wallet connected'}
                </div>
                <button
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950"
                  onClick={() => logout()}
                  type="button"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950"
                onClick={login}
                type="button"
              >
                Connect
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8">{children}</main>
    </div>
  );
}

export function MetricCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: 'wallet' | 'activity' | 'stream';
  label: string;
  value: string;
  hint: string;
}) {
  const Icon = icon === 'wallet' ? Wallet : icon === 'activity' ? Activity : RadioTower;
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5 shadow-2xl shadow-slate-950/40">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 text-emerald-300">
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-xs uppercase tracking-[0.3em] text-slate-400">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
      <p className="mt-2 text-sm text-slate-300">{hint}</p>
    </div>
  );
}
