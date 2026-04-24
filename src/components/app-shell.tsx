'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { Activity, ArrowUpRight, RadioTower, TvMinimalPlay, Wallet } from 'lucide-react';
import { isPrivyEnabled } from '@/lib/env';

const NAV_ITEMS = [
  { href: '/', label: 'Overview' },
  { href: '/streams', label: 'Directory' },
  { href: '/dashboard/streamer', label: 'Creator Studio' },
  { href: '/dashboard/sponsor', label: 'Ad Desk' },
  { href: '/pump', label: 'PumpFun' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const privyEnabled = isPrivyEnabled();
  const pathname = usePathname();

  return (
    <div className="relative z-10 min-h-screen">
      <header className="sticky top-0 z-40 px-4 pt-4 sm:px-5">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 rounded-[30px] border border-white/10 bg-[rgba(5,10,13,0.78)] px-5 py-4 shadow-[0_18px_70px_rgba(3,8,10,0.45)] backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(124,228,210,0.42),_rgba(44,109,130,0.22)_55%,_rgba(8,16,19,0.1)_100%)] text-[var(--color-ink)] shadow-[0_10px_30px_rgba(37,120,117,0.24)]">
              <TvMinimalPlay className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className="text-xs uppercase tracking-[0.35em] text-[var(--color-accent)]">Hypertian</div>
                <span className="pill hidden md:inline-flex">Livestream ads</span>
              </div>
              <div className="text-sm text-[var(--color-copy-soft)]">Open livestream ads with direct streamer payouts.</div>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            {NAV_ITEMS.map((item) => (
              <Link
                aria-current={pathname === item.href ? 'page' : undefined}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  pathname === item.href
                    ? 'border-[rgba(124,228,210,0.5)] bg-[rgba(124,228,210,0.13)] text-white shadow-[0_8px_28px_rgba(54,164,157,0.18)]'
                    : 'border-white/10 bg-white/[0.03] text-[var(--color-copy-soft)] hover:border-white/20 hover:bg-white/[0.06] hover:text-white'
                }`}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a className="secondary-button hidden lg:inline-flex" href="#production-readiness">
              Product scope
              <ArrowUpRight className="h-4 w-4" />
            </a>
            {privyEnabled ? <PrivyAuthControls /> : null}
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 pb-16">{children}</main>
    </div>
  );
}

function PrivyAuthControls() {
  const { authenticated, login, logout, user } = usePrivy();

  if (authenticated) {
    return (
      <>
        <div className="pill max-w-[17rem] truncate">
          {user?.email?.address || user?.twitter?.username || 'Wallet connected'}
        </div>
        <button
          className="secondary-button"
          onClick={() => logout()}
          type="button"
        >
          Disconnect
        </button>
      </>
    );
  }

  return (
    <button
      className="primary-button"
      onClick={login}
      type="button"
    >
      Connect
    </button>
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
    <div className="panel rounded-[30px] p-5 shadow-[0_22px_65px_rgba(4,10,13,0.45)]">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-[var(--color-accent)]">
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-xs uppercase tracking-[0.3em] text-[var(--color-copy-faint)]">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
      <p className="mt-2 text-sm text-[var(--color-copy-soft)]">{hint}</p>
    </div>
  );
}
