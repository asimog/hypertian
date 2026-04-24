'use client';

import { useEffect, useMemo, useState } from 'react';
import { LoaderCircle, WalletCards } from 'lucide-react';
import { MetricCard } from '@/components/app-shell';
import { CopyButton } from '@/components/copy-button';
import { DEFAULT_AD_PRICE_SOL, STREAM_PLATFORM_NAMES } from '@/lib/constants';
import { isFreshHeartbeat } from '@/lib/platform';
import { AdRecord, StreamRecord } from '@/lib/types';

interface PendingPayment {
  ad: AdRecord;
  paymentId: string;
  amount: number;
  currency: 'SOL';
  recipientAddress: string | null;
  paymentRecipientKind?: 'streamer_direct' | 'escrow';
  paidToWallet?: string | null;
  commissionBps?: number;
  platformFeeAmount?: number;
  streamerAmount?: number;
  durationMinutes: number;
}

export function SponsorDashboard({
  streams,
  ads,
}: {
  streams: StreamRecord[];
  ads: AdRecord[];
}) {
  return <SponsorDashboardContent initialAds={ads} initialStreams={streams} />;
}

function SponsorDashboardContent({
  initialStreams,
  initialAds,
}: {
  initialStreams: StreamRecord[];
  initialAds: AdRecord[];
}) {
  const panelClassName = 'panel rounded-[32px] p-6';
  const fieldClassName = 'field';
  const [streams, setStreams] = useState(initialStreams);
  const [selectedStreamId, setSelectedStreamId] = useState(initialStreams[0]?.id || '');
  const [adType, setAdType] = useState<'chart' | 'banner'>('chart');
  const [tokenAddress, setTokenAddress] = useState('');
  const [chain, setChain] = useState<'solana' | 'base' | 'ethereum' | 'bsc' | 'arbitrum' | 'polygon'>('solana');
  const [bannerUrl, setBannerUrl] = useState('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [position, setPosition] = useState<'bottom-right' | 'top-left' | 'top-right' | 'bottom-left' | 'full'>('bottom-right');
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [advertiserContact, setAdvertiserContact] = useState('');
  const [txSignature, setTxSignature] = useState('');
  const [createdPayment, setCreatedPayment] = useState<PendingPayment | null>(null);
  const [paymentState, setPaymentState] = useState<'idle' | 'pending' | 'verified'>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [loadingStreams, setLoadingStreams] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadStreams() {
      try {
        const response = await fetch('/api/streams', { cache: 'no-store' });
        if (!response.ok) {
          return;
        }
        const json = (await response.json()) as { streams?: StreamRecord[] };
        const nextStreams = json.streams ?? [];
        setStreams(nextStreams);
        setSelectedStreamId((current) => current || nextStreams[0]?.id || '');
      } finally {
        setLoadingStreams(false);
      }
    }

    void loadStreams();
  }, []);

  const selectedStream = useMemo(
    () => streams.find((stream) => stream.id === selectedStreamId) ?? null,
    [selectedStreamId, streams],
  );

  async function submitCampaign() {
    setSubmitting(true);
    setErrorMessage(null);
    setPaymentState('idle');
    setCreatedPayment(null);

    try {
      const response = await fetch('/api/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streamId: selectedStreamId,
          adType,
          tokenAddress: adType === 'chart' ? tokenAddress : null,
          chain,
          bannerUrl: adType === 'banner' ? bannerUrl : null,
          position,
          size,
          advertiserContact: advertiserContact || null,
        }),
      });

      const json = (await response.json()) as PendingPayment & { error?: string };
      if (!response.ok) {
        throw new Error(json.error || 'Failed to create ad checkout.');
      }

      setCreatedPayment(json);
      setPaymentState('pending');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create ad checkout.');
    } finally {
      setSubmitting(false);
    }
  }

  async function uploadBanner() {
    if (!bannerFile) {
      return;
    }

    setUploadingBanner(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/filebase/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: bannerFile.name,
          contentType: bannerFile.type,
          fileSize: bannerFile.size,
        }),
      });
      const json = (await response.json()) as { uploadUrl?: string; publicUrl?: string; error?: string };
      if (!response.ok || !json.uploadUrl || !json.publicUrl) {
        throw new Error(json.error || 'Failed to prepare Filebase upload.');
      }

      const uploadResponse = await fetch(json.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': bannerFile.type,
        },
        body: bannerFile,
      });

      if (!uploadResponse.ok) {
        throw new Error('Filebase upload failed.');
      }

      setBannerUrl(json.publicUrl);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to upload banner.');
    } finally {
      setUploadingBanner(false);
    }
  }

  async function verifyPayment() {
    if (!createdPayment) {
      return;
    }

    setVerifying(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: createdPayment.paymentId,
          txSignature,
        }),
      });
      const json = (await response.json()) as { status?: string; reason?: string | null; error?: string };
      if (!response.ok) {
        throw new Error(json.error || 'Failed to verify payment.');
      }
      if (json.status === 'active' || json.status === 'pending_streamer_approval') {
        setPaymentState('verified');
      } else {
        setErrorMessage(json.reason || 'Payment is not verified yet.');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to verify payment.');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard icon="stream" label="Directory" value={String(streams.length)} hint="Open stream inventory. Sponsors can browse without login." />
        <MetricCard icon="activity" label="Ad types" value="Chart + Banner" hint="Chart ads activate after payment. Banner ads also require creator approval." />
        <MetricCard icon="wallet" label="Starting rate" value={`${DEFAULT_AD_PRICE_SOL} SOL`} hint="Final routing depends on the stream and ad type." />
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className={panelClassName}>
          <div className="section-kicker">Sponsor checkout</div>
          <h2 className="section-heading">Book a chart or banner placement</h2>
          <p className="section-copy">
            Pick a stream, choose the creative format, and create a payment request. You can use a direct HTTPS banner URL or upload to Filebase first.
          </p>
          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-white" htmlFor="sponsor-stream">
              Stream
              <select disabled={loadingStreams} id="sponsor-stream" className={fieldClassName} onChange={(event) => setSelectedStreamId(event.target.value)} value={selectedStreamId}>
                {!streams.length ? <option value="">No streams available</option> : null}
                {streams.map((stream) => (
                  <option key={stream.id} value={stream.id}>
                    {STREAM_PLATFORM_NAMES[stream.platform]} · {stream.display_name || stream.id.slice(0, 8)} · {isFreshHeartbeat(stream.last_heartbeat) ? 'Live' : 'Offline'}
                  </option>
                ))}
              </select>
            </label>
            {loadingStreams ? (
              <div className="soft-card flex items-center gap-3 text-sm text-[var(--color-copy-soft)]">
                <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin text-[var(--color-accent)]" />
                Loading stream inventory...
              </div>
            ) : null}
            <label className="grid gap-2 text-sm font-medium text-white" htmlFor="ad-type">
              Ad type
              <select id="ad-type" className={fieldClassName} onChange={(event) => setAdType(event.target.value as typeof adType)} value={adType}>
                <option value="chart">DexScreener chart</option>
                <option value="banner">Banner creative</option>
              </select>
            </label>
            {adType === 'chart' ? (
              <>
                <label className="grid gap-2 text-sm font-medium text-white" htmlFor="token-address">
                  Token contract
                  <input autoCapitalize="off" autoCorrect="off" id="token-address" className={fieldClassName} onChange={(event) => setTokenAddress(event.target.value)} placeholder="So11111111111111111111111111111111111111112" spellCheck={false} value={tokenAddress} />
                </label>
                <label className="grid gap-2 text-sm font-medium text-white" htmlFor="chain">
                  Network
                  <select id="chain" className={fieldClassName} onChange={(event) => setChain(event.target.value as typeof chain)} value={chain}>
                    <option value="solana">Solana</option>
                    <option value="base">Base</option>
                    <option value="ethereum">Ethereum</option>
                    <option value="bsc">BSC</option>
                    <option value="arbitrum">Arbitrum</option>
                    <option value="polygon">Polygon</option>
                  </select>
                </label>
              </>
            ) : (
              <div className="grid gap-4">
                <label className="grid gap-2 text-sm font-medium text-white" htmlFor="banner-url">
                  Banner URL
                  <input autoComplete="url" id="banner-url" className={fieldClassName} inputMode="url" onChange={(event) => setBannerUrl(event.target.value)} placeholder="https://example.com/banner.png" type="url" value={bannerUrl} />
                </label>
                <div className="soft-card grid gap-3">
                  <label className="grid gap-2 text-sm font-medium text-white" htmlFor="banner-file">
                    Upload banner to Filebase
                    <input
                      id="banner-file"
                      accept="image/png,image/jpeg,image/gif"
                      className={fieldClassName}
                      onChange={(event) => setBannerFile(event.target.files?.[0] ?? null)}
                      type="file"
                    />
                  </label>
                  <div className="text-sm text-[var(--color-copy-soft)]">
                    Uploading is optional. If you already have a public HTTPS asset, paste the URL above instead.
                  </div>
                  <button className="secondary-button" disabled={!bannerFile || uploadingBanner} onClick={uploadBanner} type="button">
                    {uploadingBanner ? 'Uploading...' : 'Upload to Filebase'}
                  </button>
                </div>
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-white" htmlFor="placement-position">
                Placement
                <select id="placement-position" className={fieldClassName} onChange={(event) => setPosition(event.target.value as typeof position)} value={position}>
                  <option value="bottom-right">Bottom right</option>
                  <option value="bottom-left">Bottom left</option>
                  <option value="top-right">Top right</option>
                  <option value="top-left">Top left</option>
                  <option value="full">Full screen</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-white" htmlFor="placement-size">
                Size
                <select id="placement-size" className={fieldClassName} onChange={(event) => setSize(event.target.value as typeof size)} value={size}>
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </label>
            </div>
            <label className="grid gap-2 text-sm font-medium text-white" htmlFor="advertiser-contact">
              Contact
              <input autoComplete="email" id="advertiser-contact" className={fieldClassName} onChange={(event) => setAdvertiserContact(event.target.value)} placeholder="email or @handle for campaign follow-up" value={advertiserContact} />
            </label>
            <div className="status-note">
              Chart campaigns activate after payment verification. Banner campaigns also wait for creator approval before they render live.
            </div>
            <button aria-busy={submitting} className="primary-button" disabled={!selectedStreamId || submitting || (adType === 'chart' ? !tokenAddress : !bannerUrl)} onClick={submitCampaign} type="button">
              {submitting ? 'Creating checkout...' : `Create ${selectedStream?.price_sol ?? DEFAULT_AD_PRICE_SOL} SOL checkout`}
            </button>
            {errorMessage ? <div className="status-note" data-tone="danger">{errorMessage}</div> : null}
            {createdPayment ? (
              <div className="soft-card text-sm text-[var(--color-copy-soft)]">
                <div className="section-kicker text-[var(--color-accent-alt)]">Payment request</div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {createdPayment.amount} {createdPayment.currency}
                </div>
                <div className="mt-3 text-xs uppercase tracking-[0.24em] text-[var(--color-copy-faint)]">
                  {createdPayment.paymentRecipientKind === 'escrow' ? 'Escrow deposit address' : 'Streamer payout wallet'}
                </div>
                <div className="mt-1 break-all font-mono text-xs text-[var(--color-accent)]">{createdPayment.recipientAddress}</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {createdPayment.recipientAddress ? <CopyButton className="secondary-button" label="Copy address" value={createdPayment.recipientAddress} /> : null}
                </div>
                {createdPayment.paymentRecipientKind === 'escrow' ? (
                  <div className="mt-4 text-sm leading-6 text-[var(--color-copy-soft)]">
                    Final payout wallet: <span className="break-all font-mono text-[var(--color-accent)]">{createdPayment.paidToWallet}</span>
                    {createdPayment.commissionBps ? (
                      <span className="mt-1 block">
                        Pump commission: {(createdPayment.commissionBps / 100).toFixed(2)}% · streamer share {createdPayment.streamerAmount} SOL · platform fee {createdPayment.platformFeeAmount} SOL
                      </span>
                    ) : null}
                  </div>
                ) : null}
                <label className="mt-4 grid gap-2 text-sm font-medium text-white" htmlFor="tx-signature">
                  Transaction signature
                  <input autoCapitalize="off" autoCorrect="off" id="tx-signature" className={fieldClassName} onChange={(event) => setTxSignature(event.target.value)} placeholder="Paste Solana tx signature" spellCheck={false} value={txSignature} />
                </label>
                <button className="secondary-button mt-3" disabled={!txSignature || verifying} onClick={verifyPayment} type="button">
                  {verifying ? 'Verifying...' : 'Verify payment'}
                </button>
                <div className="pill mt-3">
                  {paymentState === 'verified'
                    ? adType === 'banner'
                      ? 'Paid · Waiting for creator approval'
                      : 'Paid · Campaign ready'
                    : 'Waiting for payment'}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className={panelClassName}>
          <div className="section-kicker text-[var(--color-accent-alt)]">Open directory</div>
          <h2 className="section-heading">Choose a stream with current inventory</h2>
          <p className="section-copy">
            The directory shows each stream&apos;s platform, starting rate, and whether the OBS source is still checking in.
          </p>
          <div className="mt-4 grid gap-4">
            {streams.map((stream) => (
              <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5" key={stream.id}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{stream.display_name || STREAM_PLATFORM_NAMES[stream.platform]}</h3>
                    <p className="mt-1 text-sm text-[var(--color-copy-soft)]">
                      {STREAM_PLATFORM_NAMES[stream.platform]} · {stream.price_sol ?? DEFAULT_AD_PRICE_SOL} SOL · {isFreshHeartbeat(stream.last_heartbeat) ? 'Heartbeat live' : 'Offline or stale'}
                    </p>
                  </div>
                  <button className="secondary-button" onClick={() => setSelectedStreamId(stream.id)} type="button">
                    Select stream
                  </button>
                </div>
                <div className="mt-3 grid gap-1 text-xs text-[var(--color-copy-faint)]">
                  {stream.profile_url ? (
                    <a className="break-all text-[var(--color-accent)]" href={stream.profile_url} rel="noreferrer" target="_blank">
                      {stream.profile_url}
                    </a>
                  ) : null}
                  {stream.stream_url ? (
                    <a className="break-all text-[var(--color-accent)]" href={stream.stream_url} rel="noreferrer" target="_blank">
                      {stream.stream_url}
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
            {!loadingStreams && !streams.length ? (
              <div className="soft-card">
                <div className="flex items-start gap-3">
                  <WalletCards aria-hidden="true" className="mt-1 h-5 w-5 text-[var(--color-accent)]" />
                  <div>
                    <h3 className="text-base font-semibold text-white">No streamer inventory yet</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-copy-soft)]">
                      Check back after a creator registers a stream, or use the creator dashboard to add one first.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
            {initialAds.length ? <div className="status-note">{initialAds.length} previous campaigns loaded.</div> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
