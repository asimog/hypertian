'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { AuthGate } from '@/components/auth-gate';
import { MetricCard } from '@/components/app-shell';
import { DEFAULT_AD_PRICE_SOL } from '@/lib/constants';
import { isPrivyEnabled } from '@/lib/env';
import { AdRecord, StreamRecord } from '@/lib/types';

interface PendingPayment {
  paymentId: string;
  amount: number;
  currency: 'SOL';
  depositAddress: string | null;
}

export function SponsorDashboard({
  streams,
  ads,
}: {
  streams: StreamRecord[];
  ads: AdRecord[];
}) {
  if (isPrivyEnabled()) {
    return <PrivySponsorDashboard ads={ads} streams={streams} />;
  }

  return <SponsorDashboardContent initialAds={ads} initialStreams={streams} />;
}

function PrivySponsorDashboard({
  streams,
  ads,
}: {
  streams: StreamRecord[];
  ads: AdRecord[];
}) {
  const { getAccessToken } = usePrivy();
  const [dashboardStreams, setDashboardStreams] = useState(streams);
  const [dashboardAds, setDashboardAds] = useState(ads);

  useEffect(() => {
    async function loadDashboard() {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        return;
      }

      const response = await fetch('/api/dashboard/sponsor', {
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
      };

      setDashboardStreams(json.streams ?? []);
      setDashboardAds(json.ads ?? []);
    }

    void loadDashboard();
  }, [getAccessToken]);

  return (
    <AuthGate role="sponsor">
      <SponsorDashboardContent
        getAccessToken={getAccessToken}
        initialAds={dashboardAds}
        initialStreams={dashboardStreams}
      />
    </AuthGate>
  );
}

function SponsorDashboardContent({
  getAccessToken,
  initialStreams,
  initialAds,
}: {
  getAccessToken?: () => Promise<string | null>;
  initialStreams: StreamRecord[];
  initialAds: AdRecord[];
}) {
  const [selectedStreamId, setSelectedStreamId] = useState(initialStreams[0]?.id || '');
  const [tokenAddress, setTokenAddress] = useState('');
  const [chain, setChain] = useState<'solana' | 'base' | 'ethereum'>('solana');
  const [position, setPosition] = useState<'bottom-right' | 'top-left' | 'full'>('bottom-right');
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [submitting, setSubmitting] = useState(false);
  const [paymentState, setPaymentState] = useState<'idle' | 'pending' | 'verified'>('idle');
  const [amountReceived, setAmountReceived] = useState<number | null>(null);
  const [createdPayment, setCreatedPayment] = useState<PendingPayment | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setSelectedStreamId((current) => current || initialStreams[0]?.id || '');
  }, [initialStreams]);

  async function submitCampaign() {
    setSubmitting(true);
    setErrorMessage(null);
    setPaymentState('idle');
    setAmountReceived(null);

    try {
      const accessToken = await getAccessToken?.();
      const response = await fetch('/api/ads', {
        method: 'POST',
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          streamId: selectedStreamId,
          tokenAddress,
          chain,
          position,
          size,
          asset: 'SOL',
        }),
      });

      const json = (await response.json()) as PendingPayment & { error?: string };
      if (!response.ok) {
        throw new Error(json.error || 'Failed to create campaign.');
      }

      setCreatedPayment({
        paymentId: json.paymentId,
        amount: json.amount,
        currency: json.currency,
        depositAddress: json.depositAddress,
      });
      setPaymentState('pending');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create campaign.');
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (!createdPayment || paymentState === 'verified') {
      return;
    }

    const timer = window.setInterval(async () => {
      const response = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentId: createdPayment.paymentId,
        }),
      });

      const json = (await response.json()) as {
        status?: 'pending' | 'verified';
        amountReceived?: number;
        error?: string;
      };

      if (!response.ok) {
        setErrorMessage(json.error || 'Failed to check payment status.');
        return;
      }

      setAmountReceived(json.amountReceived ?? null);
      if (json.status === 'verified') {
        setPaymentState('verified');
        window.clearInterval(timer);
        window.setTimeout(() => window.location.reload(), 1200);
      }
    }, 8000);

    return () => window.clearInterval(timer);
  }, [createdPayment, paymentState]);

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard icon="stream" label="Streams" value={String(initialStreams.length)} hint="Choose the livestream feed where your chart ad should appear." />
        <MetricCard icon="activity" label="Campaigns" value={String(initialAds.length)} hint="Ads activate automatically after the Solana deposit lands." />
        <MetricCard icon="wallet" label="Pricing" value={`${DEFAULT_AD_PRICE_SOL} SOL`} hint={isPrivyEnabled() ? 'Authenticated sponsors get one generated address per ad slot.' : 'One generated address per ad slot.'} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[32px] border border-white/10 bg-slate-950/70 p-6">
          <div className="text-xs uppercase tracking-[0.3em] text-emerald-300">Launch a sponsor slot</div>
          <div className="mt-6 grid gap-4">
            <select className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white" onChange={(event) => setSelectedStreamId(event.target.value)} value={selectedStreamId}>
              {initialStreams.map((stream) => (
                <option key={stream.id} value={stream.id}>
                  {stream.platform.toUpperCase()} · {stream.id.slice(0, 8)}
                </option>
              ))}
            </select>
            <input className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white" onChange={(event) => setTokenAddress(event.target.value)} placeholder="Token contract address" value={tokenAddress} />
            <div className="grid gap-4 md:grid-cols-2">
              <select className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white" onChange={(event) => setChain(event.target.value as typeof chain)} value={chain}>
                <option value="solana">Solana</option>
                <option value="base">Base</option>
                <option value="ethereum">Ethereum</option>
              </select>
              <div className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-300">
                Payment asset · SOL
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <select className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white" onChange={(event) => setPosition(event.target.value as typeof position)} value={position}>
                <option value="bottom-right">Bottom Right</option>
                <option value="top-left">Top Left</option>
                <option value="full">Full</option>
              </select>
              <select className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white" onChange={(event) => setSize(event.target.value as typeof size)} value={size}>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
            <button className="rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60" disabled={!tokenAddress || !selectedStreamId || submitting} onClick={submitCampaign} type="button">
              {submitting ? 'Generating deposit address...' : `Create ${DEFAULT_AD_PRICE_SOL} SOL payment`}
            </button>
            {errorMessage ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{errorMessage}</div> : null}
            {createdPayment ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                <div className="text-xs uppercase tracking-[0.24em] text-cyan-200">Send exact payment</div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {createdPayment.amount} {createdPayment.currency}
                </div>
                <div className="mt-3 text-xs text-slate-400">Deposit address</div>
                <div className="mt-1 break-all font-mono text-xs text-cyan-200">{createdPayment.depositAddress}</div>
                <div className="mt-3 text-xs text-slate-400">
                  The ad activates automatically after the deposit confirms on Solana.
                </div>
                {amountReceived !== null ? (
                  <div className="mt-3 text-xs text-slate-300">
                    Received so far: {amountReceived.toFixed(6)} SOL
                  </div>
                ) : null}
                <div className="mt-3 rounded-full border border-white/10 px-3 py-2 text-[11px] uppercase tracking-[0.24em] text-slate-200">
                  {paymentState === 'verified' ? 'Verified • Ad live' : 'Waiting for on-chain payment'}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-slate-950/70 p-6">
          <div className="text-xs uppercase tracking-[0.3em] text-cyan-300">Recent campaigns</div>
          <div className="mt-4 grid gap-4">
            {initialAds.map((ad) => (
              <article className="rounded-3xl border border-white/10 bg-white/5 p-5" key={ad.id}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{ad.token_address}</h3>
                    <p className="mt-1 text-sm text-slate-300">
                      {ad.chain} · {ad.position} · {ad.size}
                    </p>
                  </div>
                  <div className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-slate-200">
                    {ad.is_active ? 'Active' : 'Pending'}
                  </div>
                </div>
              </article>
            ))}
            {!initialAds.length ? <p className="text-sm text-slate-400">No campaigns yet. Choose a stream and token to launch your first billboard.</p> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
