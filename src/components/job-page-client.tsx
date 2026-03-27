'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { IntentStatusSnapshot } from '@/lib/intent-status';

interface JobPageClientProps {
  initialStatus: IntentStatusSnapshot;
}

function formatTimestamp(value: string | null): string {
  if (!value) {
    return 'Not yet detected';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatRelativeCountdown(targetAt: string | null, nowMs: number): string {
  if (!targetAt) {
    return 'Unknown';
  }

  const remainingMs = new Date(targetAt).getTime() - nowMs;
  if (remainingMs <= 0) {
    return 'Expired';
  }

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

function shouldContinuePolling(status: IntentStatusSnapshot) {
  return (
    status.status === 'PENDING_PAYMENT' ||
    status.leaseStatus === 'QUEUED' ||
    status.leaseStatus === 'ACTIVE' ||
    status.payoutStatus === 'PENDING' ||
    status.payoutStatus === 'PROCESSING'
  );
}

function getHeadline(status: IntentStatusSnapshot) {
  if (status.isDisplayingIntent) {
    return 'Your chart is live in the overlay.';
  }

  if (status.leaseStatus === 'QUEUED') {
    return 'Your job is paid and queued for the overlay.';
  }

  if (status.status === 'CONFIRMED') {
    return 'Your payment was confirmed.';
  }

  if (status.status === 'EXPIRED') {
    return 'This job expired before CAMIKey saw payment.';
  }

  return 'Waiting for the exact SOL payment.';
}

function getStatusSummary(status: IntentStatusSnapshot) {
  if (status.isDisplayingIntent) {
    return 'Overlay live now';
  }

  if (status.leaseStatus === 'QUEUED') {
    return 'Queued';
  }

  if (status.status === 'CONFIRMED') {
    return 'Paid';
  }

  if (status.status === 'EXPIRED') {
    return 'Expired';
  }

  return 'Awaiting payment';
}

export function JobPageClient({ initialStatus }: JobPageClientProps) {
  const [status, setStatus] = useState(initialStatus);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const statusRef = useRef(initialStatus);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      try {
        const response = await fetch(`/api/intent/status?intentId=${encodeURIComponent(status.intentId)}`, {
          method: 'GET',
          cache: 'no-store',
        });

        if (!response.ok) {
          const json = (await response.json()) as { error?: string };
          throw new Error(json.error || 'Could not refresh job status.');
        }

        const json = (await response.json()) as IntentStatusSnapshot;
        if (cancelled) {
          return;
        }

        statusRef.current = json;
        setStatus(json);
        setRefreshMessage(null);

        if (shouldContinuePolling(json)) {
          timer = setTimeout(poll, 4000);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        setRefreshMessage(error instanceof Error ? error.message : 'Could not refresh job status.');
        timer = setTimeout(poll, 4000);
      }
    }

    if (shouldContinuePolling(statusRef.current)) {
      void poll();
    }

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [status.intentId]);

  const chartPreviewUrl = useMemo(() => {
    if (status.isDisplayingIntent) {
      return status.currentChartUrl || status.sponsoredDexscreenerUrl;
    }

    return status.sponsoredDexscreenerUrl;
  }, [status.currentChartUrl, status.isDisplayingIntent, status.sponsoredDexscreenerUrl]);

  return (
    <section className="stack">
      <div className="card panel stack">
        <div className="eyebrow">Job Tracker</div>
        <h1 style={{ fontSize: '2.4rem', margin: '10px 0 12px' }}>{getHeadline(status)}</h1>
        <p className="subtitle">
          Dedicated job page for <span className="mono">/{status.slug}</span>. This page keeps checking the
          deposit wallet, the queue, and the live overlay state until the job is done.
        </p>
        <div className="pill-row">
          <span className="pill">Job: {status.intentId}</span>
          <span className="pill">Tier: {status.tier}</span>
          <span className="pill">{getStatusSummary(status)}</span>
        </div>
      </div>

      <div className="job-layout">
        <div className="stack">
          <div className="card panel stack">
            <div className="eyebrow">Payment</div>
            <dl className="detail-list">
              <div className="detail">
                <dt>Deposit address</dt>
                <dd className="mono">{status.depositAddress}</dd>
              </div>
              <div className="detail">
                <dt>Exact amount</dt>
                <dd className="mono">{status.amountSol} SOL</dd>
              </div>
              <div className="detail">
                <dt>Payment status</dt>
                <dd>{status.status}</dd>
              </div>
              <div className="detail">
                <dt>Intent expires in</dt>
                <dd>{formatRelativeCountdown(status.expiresAt, nowMs)}</dd>
              </div>
              <div className="detail">
                <dt>Payment detected at</dt>
                <dd>{formatTimestamp(status.paidAt)}</dd>
              </div>
            </dl>

            {refreshMessage ? <div className="status error">{refreshMessage}</div> : null}
            {status.status === 'PENDING_PAYMENT' ? (
              <div className="status info">
                Waiting for the deposit wallet to receive the exact amount. CAMIKey will promote the job as
                soon as the payment is observed.
              </div>
            ) : null}
          </div>

          <div className="card panel stack">
            <div className="eyebrow">Overlay State</div>
            <dl className="detail-list">
              <div className="detail">
                <dt>Lease status</dt>
                <dd>{status.leaseStatus || 'Not queued yet'}</dd>
              </div>
              <div className="detail">
                <dt>Queued at</dt>
                <dd>{formatTimestamp(status.leaseQueuedAt)}</dd>
              </div>
              <div className="detail">
                <dt>Activated at</dt>
                <dd>{formatTimestamp(status.leaseActivatedAt)}</dd>
              </div>
              <div className="detail">
                <dt>Lease ends</dt>
                <dd>{formatTimestamp(status.leaseEndsAt)}</dd>
              </div>
              <div className="detail">
                <dt>Payout</dt>
                <dd>{status.payoutStatus}</dd>
              </div>
              <div className="detail">
                <dt>Forward tx</dt>
                <dd className="mono">{status.forwardTxSignature || 'Pending'}</dd>
              </div>
            </dl>

            {status.isDisplayingIntent ? (
              <div className="status success">
                This sponsored chart is the current live overlay chart for `/{status.slug}`.
              </div>
            ) : (
              <div className="status info">
                {status.leaseStatus === 'QUEUED'
                  ? 'The job is confirmed and waiting its turn in the overlay queue.'
                  : 'The sponsored chart preview is ready below. Once the lease activates, the overlay will swap to it.'}
              </div>
            )}

            {status.payoutFailureReason ? <div className="status error">{status.payoutFailureReason}</div> : null}

            <div className="button-row">
              <Link className="button" href={`/${status.slug}`}>
                Open stream
              </Link>
              <Link className="button secondary" href="/marketplace">
                Marketplace
              </Link>
            </div>
          </div>
        </div>

        <div className="card panel stack">
          <div className="stream-card-header">
            <div>
              <div className="eyebrow">Chart Preview</div>
              <h2 className="live-board-detail-title" style={{ fontSize: '1.9rem' }}>
                {status.streamerCoinSymbol || 'Stream'} / {status.buyerMint}
              </h2>
              <p className="subtitle">
                {status.isDisplayingIntent
                  ? 'Live overlay chart now.'
                  : 'Preview of the chart CAMIKey will push into the overlay for this job.'}
              </p>
            </div>
            <div className={`mini-status${status.isDisplayingIntent ? ' ready' : ''}`}>
              {status.isDisplayingIntent ? 'Live now' : getStatusSummary(status)}
            </div>
          </div>

          <div className="job-preview-frame">
            <iframe className="job-preview-iframe" key={chartPreviewUrl} src={chartPreviewUrl} title="Sponsored chart preview" />
          </div>

          <dl className="detail-list">
            <div className="detail">
              <dt>Buyer mint</dt>
              <dd className="mono">{status.buyerMint}</dd>
            </div>
            <div className="detail">
              <dt>Overlay current mint</dt>
              <dd className="mono">{status.currentMint || 'Unavailable'}</dd>
            </div>
            <div className="detail">
              <dt>Current chart URL</dt>
              <dd className="mono">{status.currentChartUrl || 'Unavailable'}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
