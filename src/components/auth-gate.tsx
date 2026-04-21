'use client';

import { usePrivy } from '@privy-io/react-auth';
import { LoaderCircle, LockKeyhole } from 'lucide-react';
import { ReactNode } from 'react';
import { SyncUser } from '@/components/sync-user';
import { isPrivyEnabled } from '@/lib/env';
import { UserRole } from '@/lib/types';

function PrivyAuthGate({
  role,
  children,
}: {
  role: UserRole;
  children: ReactNode;
}) {
  const { authenticated, login, ready } = usePrivy();

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-300">
        <LoaderCircle className="mr-3 h-5 w-5 animate-spin" />
        Checking wallet session...
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-8 text-center shadow-2xl shadow-emerald-950/30">
        <LockKeyhole className="mx-auto mb-4 h-10 w-10 text-emerald-400" />
        <h2 className="text-2xl font-semibold text-white">{role === 'streamer' ? 'Streamer' : 'Sponsor'} login required</h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Privy handles wallet + social auth, creates embedded wallets, and syncs your profile into Supabase.
        </p>
        <button
          className="mt-6 rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
          onClick={login}
          type="button"
        >
          Continue with Privy
        </button>
      </div>
    );
  }

  return (
    <>
      <SyncUser role={role} />
      {children}
    </>
  );
}

export function AuthGate(props: { role: UserRole; children: ReactNode }) {
  if (!isPrivyEnabled()) {
    return <>{props.children}</>;
  }

  return <PrivyAuthGate {...props} />;
}
