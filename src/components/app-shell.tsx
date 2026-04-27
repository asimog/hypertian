'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { Activity, Music2, Pause, Play, RadioTower, TvMinimalPlay, Wallet } from 'lucide-react';
import { isPrivyEnabled } from '@/lib/env';
import { useMusic } from '@/components/music-provider';

const NAV_ITEMS = [
  { href: '/streamer', label: 'Streamer' },
  { href: '/directory', label: 'Directory' },
  { href: '/feed', label: 'Feed' },
  { href: '/music', label: 'Music' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const privyEnabled = isPrivyEnabled();
  const pathname = usePathname();
  const isOverlayRoute = pathname?.startsWith('/overlay');
  const isHome = pathname === '/';

  if (isOverlayRoute) {
    return <>{children}</>;
  }

  return (
    <div className="relative z-10 min-h-screen">
      {!isHome ? (
        <header className="sticky top-0 z-40 px-4 pt-4 sm:px-5">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 rounded-[26px] border border-white/10 bg-[rgba(5,10,13,0.48)] px-4 py-3 shadow-[0_18px_60px_rgba(3,8,10,0.28)] backdrop-blur-xl md:flex-row md:items-center md:justify-between">
            <Link aria-label="Hypertian home" className="flex items-center gap-3" href="/">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(124,228,210,0.42),_rgba(44,109,130,0.22)_55%,_rgba(8,16,19,0.1)_100%)] text-[var(--color-ink)]">
                <TvMinimalPlay className="h-5 w-5" />
              </div>
              <div className="text-xs uppercase tracking-[0.32em] text-[var(--color-accent)]">Hypertian</div>
            </Link>

            <nav aria-label="Primary" className="flex flex-wrap items-center gap-1.5">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                return (
                  <Link
                    aria-current={active ? 'page' : undefined}
                    className={`inline-flex min-h-9 items-center rounded-full border px-3.5 py-1.5 text-sm transition ${
                      active
                        ? 'border-[rgba(124,228,210,0.5)] bg-[rgba(124,228,210,0.13)] text-white'
                        : 'border-white/10 bg-white/[0.03] text-[var(--color-copy-soft)] hover:border-white/20 hover:bg-white/[0.06] hover:text-white'
                    }`}
                    href={item.href}
                    key={item.href}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              {privyEnabled ? <PrivyAuthControls /> : <span className="text-xs text-[var(--color-copy-faint)]">Sign-in optional</span>}
            </div>
          </div>
        </header>
      ) : null}
      <main className={isHome ? undefined : 'mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 pb-16 sm:px-5'} id="main-content">
        {children}
      </main>
      <footer className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 pb-8 sm:px-5 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-copy-faint)]">
          <span>Hypertian</span>
          <span aria-hidden>·</span>
          <Link className="text-[var(--color-copy-soft)] underline-offset-4 hover:text-white hover:underline" href="/feedback">
            Feedback
          </Link>
          <span aria-hidden>·</span>
          <Link className="text-[var(--color-copy-soft)] underline-offset-4 hover:text-white hover:underline" href="/admin">
            Admin
          </Link>
        </div>
        <FooterMusicControls />
      </footer>
    </div>
  );
}

function FooterMusicControls() {
  const music = useMusic();
  const title = music.sourceKind === 'youtube' ? 'YouTube audio' : music.selectedTrack?.label ?? 'Music ready';

  return (
    <div className="flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-2 py-1 text-xs text-[var(--color-copy-soft)]">
      <Link className="inline-flex items-center gap-1.5 px-2 text-white" href="/music">
        <Music2 aria-hidden className="h-3.5 w-3.5 text-[var(--color-accent)]" />
        <span className="max-w-[11rem] truncate">{title}</span>
      </Link>
      <button
        aria-label={music.isPlaying ? 'Pause music' : 'Play music'}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white hover:border-white/20"
        onClick={() => void music.toggle()}
        type="button"
      >
        {music.isPlaying ? <Pause aria-hidden className="h-4 w-4" /> : <Play aria-hidden className="h-4 w-4" />}
      </button>
    </div>
  );
}

function PrivyAuthControls() {
  const { authenticated, login, logout, user } = usePrivy();

  if (authenticated) {
    return (
      <button
        aria-label="Disconnect"
        className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-[var(--color-copy-soft)] transition hover:border-white/20 hover:text-white"
        onClick={() => logout()}
        title={user?.email?.address || user?.twitter?.username || 'Wallet connected'}
        type="button"
      >
        Sign out
      </button>
    );
  }

  return (
    <button
      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-[var(--color-copy-soft)] transition hover:border-white/20 hover:text-white"
      onClick={login}
      type="button"
    >
      Optional sign-in
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
  return (
    <div className="panel rounded-[16px] p-3">
      <div className="text-[9px] uppercase tracking-[0.28em] text-[var(--color-copy-faint)]">{label}</div>
      <div className="mt-0.5 text-xl font-semibold text-white">{value}</div>
      <p className="text-[10px] text-[var(--color-copy-soft)]">{hint}</p>
    </div>
  );
}
