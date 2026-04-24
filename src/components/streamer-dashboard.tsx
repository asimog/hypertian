'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { AuthGate } from '@/components/auth-gate';
import { MetricCard } from '@/components/app-shell';
import { DEFAULT_AD_PRICE_SOL, STREAM_PLATFORM_NAMES } from '@/lib/constants';
import { isPrivyEnabled } from '@/lib/env';
import { isFreshHeartbeat } from '@/lib/platform';
import { AdRecord, MediaJobRecord, StreamPlatform, StreamRecord } from '@/lib/types';

type StreamerDashboardProps = {
  initialStreams: StreamRecord[];
  initialAds: AdRecord[];
  initialMediaJobs: MediaJobRecord[];
};

function StreamerDashboardContent({
  initialStreams,
  initialAds,
  canCreate,
  wallet,
  getAccessToken,
}: StreamerDashboardProps & {
  canCreate: boolean;
  wallet: string | null;
  getAccessToken?: () => Promise<string | null>;
}) {
  const panelClassName = 'panel rounded-[32px] p-6';
  const fieldClassName = 'field';
  const baseUrl = typeof window === 'undefined' ? 'http://localhost:3000' : window.location.origin;
  const [streams, setStreams] = useState(initialStreams);
  const [ads, setAds] = useState(initialAds);
  const [platform, setPlatform] = useState<StreamPlatform>('x');
  const [displayName, setDisplayName] = useState('');
  const [profileUrl, setProfileUrl] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [payoutWallet, setPayoutWallet] = useState(wallet || '');
  const [priceSol, setPriceSol] = useState(String(DEFAULT_AD_PRICE_SOL));
  const [defaultBannerUrl, setDefaultBannerUrl] = useState('');
  const [pumpMint, setPumpMint] = useState('');
  const [pumpDeployerWallet, setPumpDeployerWallet] = useState('');
  const [creating, setCreating] = useState(false);
  const [reviewingAdId, setReviewingAdId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setPayoutWallet((current) => current || wallet || '');
  }, [wallet]);

  useEffect(() => {
    async function loadDashboard() {
      const accessToken = await getAccessToken?.();
      if (!accessToken) {
        return;
      }

      const response = await fetch('/api/dashboard/streamer', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        return;
      }
      const json = (await response.json()) as { streams?: StreamRecord[]; ads?: AdRecord[] };
      setStreams(json.streams ?? []);
      setAds(json.ads ?? []);
    }

    void loadDashboard();
  }, [getAccessToken]);

  const activeAds = useMemo(
    () => ads.filter((ad) => ad.status === 'active' && ad.is_active && new Date(ad.expires_at).getTime() > Date.now()),
    [ads],
  );
  const pendingBannerAds = useMemo(
    () => ads.filter((ad) => ad.ad_type === 'banner' && ad.status === 'pending_streamer_approval'),
    [ads],
  );

  async function createStream() {
    setCreating(true);
    setErrorMessage(null);
    try {
      const accessToken = await getAccessToken?.();
      const response = await fetch('/api/streams', {
        method: 'POST',
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform,
          displayName,
          profileUrl,
          streamUrl,
          payoutWallet,
          priceSol: Number(priceSol || DEFAULT_AD_PRICE_SOL),
          defaultBannerUrl: defaultBannerUrl || null,
          pumpMint: platform === 'pump' ? pumpMint || null : null,
          pumpDeployerWallet: platform === 'pump' ? pumpDeployerWallet || payoutWallet : null,
        }),
      });
      const json = (await response.json()) as { stream?: StreamRecord; error?: string };
      if (!response.ok || !json.stream) {
        throw new Error(json.error || 'Failed to create stream.');
      }
      setStreams((current) => [json.stream!, ...current]);
      setDisplayName('');
      setProfileUrl('');
      setStreamUrl('');
      setDefaultBannerUrl('');
      setPumpMint('');
      setPumpDeployerWallet('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create stream.');
    } finally {
      setCreating(false);
    }
  }

  async function reviewAd(adId: string, decision: 'approved' | 'rejected') {
    setReviewingAdId(adId);
    setErrorMessage(null);
    try {
      const accessToken = await getAccessToken?.();
      const response = await fetch('/api/ads/review', {
        method: 'POST',
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adId, decision }),
      });
      const json = (await response.json()) as { ad?: AdRecord; error?: string };
      if (!response.ok || !json.ad) {
        throw new Error(json.error || 'Failed to review ad.');
      }
      setAds((current) => current.map((ad) => (ad.id === json.ad!.id ? json.ad! : ad)));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to review ad.');
    } finally {
      setReviewingAdId(null);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard icon="stream" label="Streams" value={String(streams.length)} hint="Registered livestream ad inventory." />
        <MetricCard icon="activity" label="Live ads" value={String(activeAds.length)} hint="Paid ads currently eligible to render." />
        <MetricCard icon="wallet" label="Banner approvals" value={String(pendingBannerAds.length)} hint={wallet ? `${wallet.slice(0, 4)}...${wallet.slice(-4)}` : 'Connect a streamer wallet.'} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className={panelClassName}>
          <div className="text-xs uppercase tracking-[0.3em] text-[var(--color-accent)]">Streamer setup</div>
          <h2 className="mt-3 text-2xl font-semibold text-white">Register a livestream</h2>
          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-white" htmlFor="stream-platform">
              Platform
              <select id="stream-platform" className={fieldClassName} onChange={(event) => setPlatform(event.target.value as StreamPlatform)} value={platform}>
                <option value="x">X</option>
                <option value="pump">PumpFun</option>
                <option value="kick">Kick</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-white" htmlFor="display-name">
              Display name
              <input id="display-name" className={fieldClassName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Channel name" value={displayName} />
            </label>
            <label className="grid gap-2 text-sm font-medium text-white" htmlFor="profile-url">
              Profile URL
              <input id="profile-url" className={fieldClassName} onChange={(event) => setProfileUrl(event.target.value)} placeholder="https://..." value={profileUrl} />
            </label>
            <label className="grid gap-2 text-sm font-medium text-white" htmlFor="stream-url">
              Stream URL
              <input id="stream-url" className={fieldClassName} onChange={(event) => setStreamUrl(event.target.value)} placeholder="https://..." value={streamUrl} />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-white" htmlFor="payout-wallet">
                Payout wallet
                <input id="payout-wallet" className={fieldClassName} onChange={(event) => setPayoutWallet(event.target.value)} placeholder="Solana wallet" value={payoutWallet} />
              </label>
              <label className="grid gap-2 text-sm font-medium text-white" htmlFor="price-sol">
                Price SOL
                <input id="price-sol" className={fieldClassName} inputMode="decimal" onChange={(event) => setPriceSol(event.target.value)} value={priceSol} />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-medium text-white" htmlFor="default-banner">
              Default banner URL
              <input id="default-banner" className={fieldClassName} onChange={(event) => setDefaultBannerUrl(event.target.value)} placeholder="https://example.com/default.png" value={defaultBannerUrl} />
            </label>
            {platform === 'pump' ? (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-white" htmlFor="pump-mint">
                  Pump mint
                  <input id="pump-mint" className={fieldClassName} onChange={(event) => setPumpMint(event.target.value)} placeholder="Token mint" value={pumpMint} />
                </label>
                <label className="grid gap-2 text-sm font-medium text-white" htmlFor="pump-deployer">
                  Pump deployer wallet
                  <input id="pump-deployer" className={fieldClassName} onChange={(event) => setPumpDeployerWallet(event.target.value)} placeholder="Creator wallet" value={pumpDeployerWallet} />
                </label>
              </div>
            ) : null}
            <button className="primary-button disabled:opacity-60" disabled={!canCreate || creating || !displayName || !profileUrl || !streamUrl || !payoutWallet} onClick={createStream} type="button">
              {creating ? 'Creating...' : canCreate ? 'Create stream' : 'Streamer login required'}
            </button>
            {errorMessage ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{errorMessage}</div> : null}
          </div>
        </div>

        <div className={panelClassName}>
          <div className="text-xs uppercase tracking-[0.3em] text-[var(--color-accent-alt)]">Browser sources</div>
          <div className="mt-4 grid gap-4">
            {streams.map((stream) => {
              const overlayUrl = `${baseUrl}/overlay/${stream.id}`;
              return (
                <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5" key={stream.id}>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{stream.display_name || STREAM_PLATFORM_NAMES[stream.platform]}</h3>
                      <p className="mt-1 text-sm text-[var(--color-copy-soft)]">
                        {STREAM_PLATFORM_NAMES[stream.platform]} · {stream.price_sol ?? DEFAULT_AD_PRICE_SOL} SOL · {isFreshHeartbeat(stream.last_heartbeat) ? 'Visible' : 'Waiting for source'}
                      </p>
                    </div>
                    <div className="pill">{stream.verification_status || 'unverified'}</div>
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm text-[var(--color-copy-soft)]">
                    <div>
                      <dt className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-copy-faint)]">OBS browser source</dt>
                      <dd className="mt-1 break-all font-mono text-xs text-[var(--color-accent)]">{overlayUrl}</dd>
                    </div>
                  </dl>
                </article>
              );
            })}
            {!streams.length ? <p className="text-sm text-[var(--color-copy-faint)]">No livestreams yet. Register one to appear in the public directory.</p> : null}
          </div>
        </div>
      </section>

      <section className={panelClassName}>
        <div className="text-xs uppercase tracking-[0.3em] text-[var(--color-copy)]">Pending banner approvals</div>
        <div className="mt-4 grid gap-4">
          {pendingBannerAds.map((ad) => (
            <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5" key={ad.id}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Banner URL</h3>
                  <a className="mt-1 block break-all text-xs text-[var(--color-accent)]" href={ad.banner_url || '#'} rel="noreferrer" target="_blank">
                    {ad.banner_url}
                  </a>
                </div>
                <div className="flex gap-2">
                  <button className="secondary-button disabled:opacity-60" disabled={reviewingAdId === ad.id} onClick={() => void reviewAd(ad.id, 'rejected')} type="button">
                    Reject
                  </button>
                  <button className="primary-button disabled:opacity-60" disabled={reviewingAdId === ad.id} onClick={() => void reviewAd(ad.id, 'approved')} type="button">
                    Approve
                  </button>
                </div>
              </div>
            </article>
          ))}
          {!pendingBannerAds.length ? <p className="text-sm text-[var(--color-copy-faint)]">No paid banner URLs are waiting for approval.</p> : null}
        </div>
      </section>
    </div>
  );
}

function PrivyStreamerDashboard(props: StreamerDashboardProps) {
  const { getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const wallet = wallets.find((item) => item.address)?.address || null;

  return (
    <AuthGate role="streamer">
      <StreamerDashboardContent
        {...props}
        canCreate
        getAccessToken={getAccessToken}
        wallet={wallet}
      />
    </AuthGate>
  );
}

export function StreamerDashboard(props: StreamerDashboardProps) {
  if (!isPrivyEnabled()) {
    return <StreamerDashboardContent {...props} canCreate={false} wallet={null} />;
  }

  return <PrivyStreamerDashboard {...props} />;
}
