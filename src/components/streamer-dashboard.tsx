'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { AuthGate } from '@/components/auth-gate';
import { MetricCard } from '@/components/app-shell';
import { isPrivyEnabled } from '@/lib/env';
import { AdRecord, MediaJobRecord, StreamRecord } from '@/lib/types';

type StreamerDashboardProps = {
  initialStreams: StreamRecord[];
  initialAds: AdRecord[];
  initialMediaJobs: MediaJobRecord[];
};

function StreamerDashboardContent({
  initialStreams,
  initialAds,
  initialMediaJobs,
  canCreate,
  wallet,
  onCreateStream,
  creating,
  platform,
  setPlatform,
}: StreamerDashboardProps & {
  canCreate: boolean;
  wallet: string | null;
  onCreateStream?: () => Promise<void>;
  creating: boolean;
  platform: 'x' | 'youtube' | 'twitch' | 'pump';
  setPlatform: (platform: 'x' | 'youtube' | 'twitch' | 'pump') => void;
}) {
  const baseUrl = typeof window === 'undefined' ? 'http://localhost:3000' : window.location.origin;
  const activeAds = useMemo(
    () => initialAds.filter((ad) => ad.is_active && new Date(ad.expires_at).getTime() > Date.now()),
    [initialAds],
  );

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard icon="stream" label="Streams" value={String(initialStreams.length)} hint="Each stream gets a reusable OBS-safe overlay key." />
        <MetricCard icon="activity" label="Live Ads" value={String(activeAds.length)} hint="Supabase Realtime pushes ad activation into the overlay instantly." />
        <MetricCard icon="wallet" label="Pending Jobs" value={String(initialMediaJobs.filter((job) => job.status === 'pending').length)} hint={wallet ? `${wallet.slice(0, 4)}...${wallet.slice(-4)}` : canCreate ? 'Connect Privy wallet to review media.' : 'Privy is optional and currently disabled.'} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[32px] border border-white/10 bg-slate-950/70 p-6">
          <div className="text-xs uppercase tracking-[0.3em] text-emerald-300">Create stream</div>
          <h2 className="mt-3 text-2xl font-semibold text-white">Generate an OBS-ready overlay stream</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Use this for X livestreams, RTMP productions, or any browser-source friendly scene. The overlay URL can be customized with token, position, theme, and sponsor branding.
          </p>
          <div className="mt-6 grid gap-4">
            <select
              className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none ring-0"
              onChange={(event) => setPlatform(event.target.value as typeof platform)}
              value={platform}
            >
              <option value="x">X Livestream</option>
              <option value="youtube">YouTube</option>
              <option value="twitch">Twitch</option>
              <option value="pump">Pump.fun</option>
            </select>
            <button
              className="rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
              disabled={!canCreate || creating}
              onClick={() => void onCreateStream?.()}
              type="button"
            >
              {creating ? 'Generating...' : canCreate ? 'Create stream record' : 'Enable Privy to create streams'}
            </button>
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-slate-950/70 p-6">
          <div className="text-xs uppercase tracking-[0.3em] text-cyan-300">Streams</div>
          <div className="mt-4 grid gap-4">
            {initialStreams.map((stream) => {
              const route =
                stream.platform === 'youtube'
                  ? 'youtube-overlay'
                  : stream.platform === 'twitch'
                    ? 'twitch-overlay'
                    : stream.platform === 'pump'
                      ? 'pump-overlay'
                      : 'x-overlay';
              const overlayUrl = `${baseUrl}/${route}?stream=${stream.id}&token=So11111111111111111111111111111111111111112&chain=solana&position=bottom-right&size=medium&theme=dark&showChart=true&showMedia=true`;
              return (
                <article className="rounded-3xl border border-white/10 bg-white/5 p-5" key={stream.id}>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{stream.platform.toUpperCase()} stream</h3>
                      <p className="mt-1 text-sm text-slate-300">
                        Stream ID · {stream.id}
                      </p>
                    </div>
                    <div className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-slate-200">
                      {stream.is_live ? 'Live' : 'Standby'}
                    </div>
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm text-slate-300">
                    <div>
                      <dt className="text-[10px] uppercase tracking-[0.3em] text-slate-500">OBS URL</dt>
                      <dd className="mt-1 break-all font-mono text-xs text-emerald-200">{overlayUrl}</dd>
                    </div>
                  </dl>
                </article>
              );
            })}
            {!initialStreams.length ? <p className="text-sm text-slate-400">No streams yet. Create your first overlay stream above.</p> : null}
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-slate-950/70 p-6">
        <div className="text-xs uppercase tracking-[0.3em] text-fuchsia-300">Pending media jobs</div>
        <div className="mt-4 grid gap-4">
          {initialMediaJobs.map((job) => (
            <article className="rounded-3xl border border-white/10 bg-white/5 p-5" key={job.id}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">{job.media_type || 'media'} job</h3>
                  <p className="mt-1 break-all text-xs text-slate-400">{job.media_path}</p>
                </div>
                <div className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-slate-200">
                  {job.status}
                </div>
              </div>
            </article>
          ))}
          {!initialMediaJobs.length ? <p className="text-sm text-slate-400">No pending media jobs yet.</p> : null}
        </div>
      </section>
    </div>
  );
}

function PrivyStreamerDashboard(props: StreamerDashboardProps) {
  const { getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const [platform, setPlatform] = useState<'x' | 'youtube' | 'twitch' | 'pump'>('x');
  const [creating, setCreating] = useState(false);
  const [streams, setStreams] = useState(props.initialStreams);
  const [ads, setAds] = useState(props.initialAds);
  const [mediaJobs, setMediaJobs] = useState(props.initialMediaJobs);
  const wallet = wallets.find((item) => item.address)?.address || null;

  useEffect(() => {
    async function loadDashboard() {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        return;
      }

      const response = await fetch('/api/dashboard/streamer', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        return;
      }

      const json = (await response.json()) as {
        streams?: StreamRecord[];
        ads?: AdRecord[];
        mediaJobs?: MediaJobRecord[];
      };

      setStreams(json.streams ?? []);
      setAds(json.ads ?? []);
      setMediaJobs(json.mediaJobs ?? []);
    }

    void loadDashboard();
  }, [getAccessToken]);

  async function createStream() {
    setCreating(true);
    try {
      const accessToken = await getAccessToken();
      const response = await fetch('/api/streams', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to create stream.');
      }
      window.location.reload();
    } finally {
      setCreating(false);
    }
  }

  return (
    <AuthGate role="streamer">
      <StreamerDashboardContent
        initialAds={ads}
        initialMediaJobs={mediaJobs}
        initialStreams={streams}
        canCreate
        creating={creating}
        onCreateStream={createStream}
        platform={platform}
        setPlatform={setPlatform}
        wallet={wallet}
      />
    </AuthGate>
  );
}

export function StreamerDashboard(props: StreamerDashboardProps) {
  const [platform, setPlatform] = useState<'x' | 'youtube' | 'twitch' | 'pump'>('x');

  if (!isPrivyEnabled()) {
    return (
      <StreamerDashboardContent
        {...props}
        canCreate={false}
        creating={false}
        platform={platform}
        setPlatform={setPlatform}
        wallet={null}
      />
    );
  }

  return <PrivyStreamerDashboard {...props} />;
}
