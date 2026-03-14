'use client';

import { useEffect, useMemo, useState } from 'react';

interface StreamPageClientProps {
  streamId: string;
  slug: string;
  deployerWallet: string;
  streamerCoinMint: string;
  defaultDexscreenerUrl: string;
  verifiedAt: string | null;
  lastHeartbeatAt: string | null;
  liveViewers: number;
  liveFresh: boolean;
  heartbeatFresh: boolean;
  verificationFresh: boolean;
  purchaseReasons: string[];
  pricing: {
    base: {
      amountSol: number;
      displaySeconds: number;
    };
    priority: {
      amountSol: number;
      displaySeconds: number;
    };
  };
  events: Array<{
    eventId: string;
    type: string;
    message: string;
    createdAt: string;
  }>;
}

type VerifyUiState = 'idle' | 'pending' | 'success' | 'error';
type PurchaseUiState = 'idle' | 'creating' | 'ready' | 'error';
type PurchaseTier = 'BASE' | 'PRIORITY';

interface CreatedIntent {
  intentId: string;
  depositAddress: string;
  amountSol: number;
  amountLamports: number;
  displaySeconds: number;
  expiresAt: string;
  tier: PurchaseTier;
}

interface IntentStatusPayload {
  intentId: string;
  status: 'PENDING_PAYMENT' | 'CONFIRMED' | 'EXPIRED';
  payoutStatus: 'PENDING' | 'FORWARDED' | 'FAILED';
  leaseStatus: 'QUEUED' | 'ACTIVE' | 'COMPLETED' | 'PREEMPTED' | null;
  leaseEndsAt: string | null;
  paidAt: string | null;
  forwardTxSignature: string | null;
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

function formatRelativeCountdown(expiresAt: string | null): string {
  if (!expiresAt) {
    return 'Unknown';
  }

  const remainingMs = new Date(expiresAt).getTime() - Date.now();
  if (remainingMs <= 0) {
    return 'Expired';
  }

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

export function StreamPageClient({
  streamId,
  slug,
  deployerWallet,
  streamerCoinMint,
  defaultDexscreenerUrl,
  verifiedAt,
  lastHeartbeatAt,
  liveViewers,
  liveFresh,
  heartbeatFresh,
  verificationFresh,
  purchaseReasons,
  pricing,
  events,
}: StreamPageClientProps) {
  const [verifyState, setVerifyState] = useState<VerifyUiState>('idle');
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [currentVerifiedAt, setCurrentVerifiedAt] = useState<string | null>(verifiedAt);
  const [currentHeartbeatAt, setCurrentHeartbeatAt] = useState<string | null>(lastHeartbeatAt);
  const [purchaseTier, setPurchaseTier] = useState<PurchaseTier>('BASE');
  const [buyerMint, setBuyerMint] = useState('');
  const [purchaseState, setPurchaseState] = useState<PurchaseUiState>('idle');
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);
  const [createdIntent, setCreatedIntent] = useState<CreatedIntent | null>(null);
  const [intentStatus, setIntentStatus] = useState<IntentStatusPayload | null>(null);

  const tickerEvents =
    events.length > 0
      ? [...events, ...events]
      : [
          {
            eventId: 'empty',
            type: 'empty',
            message: 'No recent lease activations or purchases yet.',
            createdAt: new Date().toISOString(),
          },
      ];

  const currentVerificationFresh = currentVerifiedAt
    ? Date.now() - new Date(currentVerifiedAt).getTime() < 12 * 60 * 60 * 1000
    : verificationFresh;
  const currentHeartbeatFresh = currentHeartbeatAt
    ? Date.now() - new Date(currentHeartbeatAt).getTime() < 30 * 1000
    : heartbeatFresh;
  const effectiveCanPurchase = liveFresh && currentHeartbeatFresh && currentVerificationFresh;
  const effectivePurchaseReasons = [
    !liveFresh ? 'This stream is not live on Pump.fun right now.' : null,
    !currentHeartbeatFresh ? 'The OBS overlay heartbeat is stale.' : null,
    !currentVerificationFresh ? 'The overlay verification has expired.' : null,
  ].filter(Boolean) as string[];

  const gateSummary = useMemo(
    () => [
      liveFresh ? 'Live on Pump.fun' : 'Not live on Pump.fun',
      currentHeartbeatFresh ? 'Heartbeat fresh' : 'Heartbeat stale',
      currentVerificationFresh ? 'Overlay verified' : 'Verification expired',
    ],
    [currentHeartbeatFresh, currentVerificationFresh, liveFresh],
  );

  useEffect(() => {
    if (!createdIntent?.intentId) {
      return;
    }

    const activeIntentId = createdIntent.intentId;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      try {
        const response = await fetch(`/api/intent/status?intentId=${encodeURIComponent(activeIntentId)}`, {
          method: 'GET',
          cache: 'no-store',
        });

        if (!response.ok) {
          timer = setTimeout(poll, 4000);
          return;
        }

        const json = (await response.json()) as IntentStatusPayload;
        if (cancelled) {
          return;
        }

        setIntentStatus(json);

        const shouldContinue =
          json.status === 'PENDING_PAYMENT' ||
          json.leaseStatus === 'QUEUED' ||
          json.leaseStatus === 'ACTIVE';

        if (shouldContinue) {
          timer = setTimeout(poll, 4000);
        }
      } catch {
        timer = setTimeout(poll, 4000);
      }
    }

    void poll();

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [createdIntent?.intentId]);

  async function handleVerify() {
    try {
      setVerifyState('pending');
      setVerifyMessage(null);

      const requestResponse = await fetch('/api/overlay/verify/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ streamId }),
      });

      if (!requestResponse.ok) {
        const json = (await requestResponse.json()) as { error?: string };
        setVerifyState('error');
        setVerifyMessage(json.error || 'Not detected. Open OBS, switch to the scene with the overlay, then try again.');
        return;
      }

      const deadline = Date.now() + 30_000;
      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 1200));

        const statusResponse = await fetch(`/api/overlay/verify/status?streamId=${encodeURIComponent(streamId)}`, {
          method: 'GET',
          cache: 'no-store',
        });

        if (!statusResponse.ok) {
          continue;
        }

        const statusJson = (await statusResponse.json()) as {
          status: 'pending' | 'success' | 'failed' | 'verified' | 'idle';
          verifiedAt: string | null;
          lastHeartbeatAt: string | null;
        };

        if (statusJson.status === 'success' || statusJson.status === 'verified') {
          setVerifyState('success');
          setVerifyMessage('Verified. We detected your OBS overlay running.');
          setCurrentVerifiedAt(statusJson.verifiedAt);
          setCurrentHeartbeatAt(statusJson.lastHeartbeatAt);
          return;
        }

        if (statusJson.status === 'failed') {
          setVerifyState('error');
          setVerifyMessage('Not detected. Open OBS, switch to the scene with the overlay, then try again.');
          return;
        }
      }

      setVerifyState('error');
      setVerifyMessage('Not detected. Open OBS, switch to the scene with the overlay, then try again.');
    } catch {
      setVerifyState('error');
      setVerifyMessage('Not detected. Open OBS, switch to the scene with the overlay, then try again.');
    }
  }

  async function handleCreateIntent() {
    try {
      setPurchaseState('creating');
      setPurchaseMessage(null);
      setCreatedIntent(null);
      setIntentStatus(null);

      const response = await fetch('/api/intent/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          streamId,
          tier: purchaseTier,
          buyerMint,
        }),
      });

      const json = (await response.json()) as CreatedIntent & { error?: string };
      if (!response.ok) {
        throw new Error(json.error || 'Could not create purchase intent.');
      }

      setCreatedIntent(json);
      setIntentStatus({
        intentId: json.intentId,
        status: 'PENDING_PAYMENT',
        payoutStatus: 'PENDING',
        leaseStatus: null,
        leaseEndsAt: null,
        paidAt: null,
        forwardTxSignature: null,
      });
      setPurchaseState('ready');
      setPurchaseMessage('Send the exact amount to the deposit address below. CAMIKey will auto-confirm it.');
    } catch (error) {
      setPurchaseState('error');
      setPurchaseMessage(error instanceof Error ? error.message : 'Could not create purchase intent.');
    }
  }

  function resetPurchase() {
    setBuyerMint('');
    setPurchaseState('idle');
    setPurchaseMessage(null);
    setCreatedIntent(null);
    setIntentStatus(null);
  }

  return (
    <div className="stack">
      <div className="ticker-tape">
        <div className="ticker-track">
          {tickerEvents.map((event, index) => (
            <span className="ticker-item" key={`${event.eventId}-${index}`}>
              {event.message} · {formatTimestamp(event.createdAt)}
            </span>
          ))}
        </div>
      </div>

      <section className="hero">
        <div className="card panel stack">
          <div className="eyebrow">Stream Page</div>
          <h1 style={{ fontSize: '2.4rem', margin: '10px 0 12px' }}>/{slug}</h1>
          <p className="subtitle">
            Buyers can sponsor a Dexscreener chart swap here, and streamers can re-verify that OBS is
            still running the overlay without typing anything.
          </p>

          <div className="pill-row">
            <span className="pill">{liveViewers.toLocaleString()} viewers</span>
            {gateSummary.map((item) => (
              <span className="pill" key={item}>
                {item}
              </span>
            ))}
          </div>

          <dl className="detail-list">
            <div className="detail">
              <dt>Deployer wallet</dt>
              <dd className="mono">{deployerWallet}</dd>
            </div>
            <div className="detail">
              <dt>Streamer coin mint</dt>
              <dd className="mono">{streamerCoinMint}</dd>
            </div>
            <div className="detail">
              <dt>Default chart</dt>
              <dd className="mono">{defaultDexscreenerUrl}</dd>
            </div>
          </dl>
        </div>

        <div className="stack">
          <div className="card panel stack">
            <div>
              <div className="eyebrow">Overlay Verification</div>
              <h2 style={{ fontSize: '1.6rem', margin: '10px 0 12px' }}>
                Verify that OBS is actually running the overlay.
              </h2>
              <p className="subtitle">
                Click once here, then CAMIKey waits for the live overlay itself to answer from OBS.
              </p>
            </div>

            <div className="button-row">
              <button className="button" disabled={verifyState === 'pending'} onClick={handleVerify} type="button">
                {verifyState === 'pending' ? 'Waiting for overlay...' : 'Verify overlay'}
              </button>
            </div>

            {verifyMessage ? (
              <div className={`status ${verifyState === 'success' ? 'success' : 'error'}`}>{verifyMessage}</div>
            ) : null}

            <div className="status info">Verification expires in 12h (auto-renews while overlay is running).</div>

            <dl className="detail-list">
              <div className="detail">
                <dt>Last verified</dt>
                <dd>{formatTimestamp(currentVerifiedAt)}</dd>
              </div>
              <div className="detail">
                <dt>Last overlay heartbeat</dt>
                <dd>{formatTimestamp(currentHeartbeatAt)}</dd>
              </div>
              <div className="detail">
                <dt>OBS reminder</dt>
                <dd>Keep the Browser Source on the scene with the overlay slot visible while verifying.</dd>
              </div>
            </dl>
          </div>

          <div className="card panel stack">
            <div>
              <div className="eyebrow">Buy Chart Slot</div>
              <h2 style={{ fontSize: '1.6rem', margin: '10px 0 12px' }}>Sponsor this stream&apos;s chart slot.</h2>
              <p className="subtitle">
                Choose a tier, enter only the buyer token mint, then send the exact SOL amount to the
                unique deposit address CAMIKey generates for this purchase.
              </p>
            </div>

            <div className="tier-grid">
              <button
                className={`button secondary ${purchaseTier === 'BASE' ? 'active' : ''}`}
                onClick={() => setPurchaseTier('BASE')}
                type="button"
              >
                BASE · {pricing.base.amountSol} SOL · {pricing.base.displaySeconds}s
              </button>
              <button
                className={`button secondary ${purchaseTier === 'PRIORITY' ? 'active' : ''}`}
                onClick={() => setPurchaseTier('PRIORITY')}
                type="button"
              >
                PRIORITY · {pricing.priority.amountSol} SOL · {pricing.priority.displaySeconds}s
              </button>
            </div>

            <label>
              <span className="label">Buyer token mint</span>
              <input
                className="input mono"
                onChange={(event) => setBuyerMint(event.target.value)}
                placeholder="Sponsored token mint"
                value={buyerMint}
              />
            </label>

            <div className="button-row">
              <button
                className="button"
                disabled={!effectiveCanPurchase || purchaseState === 'creating' || buyerMint.trim().length < 32}
                onClick={handleCreateIntent}
                type="button"
              >
                {purchaseState === 'creating' ? 'Creating intent...' : 'Create purchase intent'}
              </button>
              {(createdIntent || intentStatus) ? (
                <button className="button secondary" onClick={resetPurchase} type="button">
                  Reset
                </button>
              ) : null}
            </div>

            {!effectiveCanPurchase ? (
              <div className="status info">
                {effectivePurchaseReasons[0] || purchaseReasons[0] || 'Purchases are temporarily unavailable.'}
              </div>
            ) : null}

            {purchaseMessage ? (
              <div className={`status ${purchaseState === 'error' ? 'error' : 'success'}`}>{purchaseMessage}</div>
            ) : null}

            {createdIntent ? (
              <div className="stack">
                <dl className="detail-list">
                  <div className="detail">
                    <dt>Deposit address</dt>
                    <dd className="mono">{createdIntent.depositAddress}</dd>
                  </div>
                  <div className="detail">
                    <dt>Exact amount</dt>
                    <dd className="mono">{createdIntent.amountSol} SOL</dd>
                  </div>
                  <div className="detail">
                    <dt>Intent expires in</dt>
                    <dd>{formatRelativeCountdown(createdIntent.expiresAt)}</dd>
                  </div>
                  <div className="detail">
                    <dt>Display length</dt>
                    <dd>{createdIntent.displaySeconds} seconds</dd>
                  </div>
                </dl>

                {intentStatus ? (
                  <div className="status info">
                    Payment status: {intentStatus.status}
                    {intentStatus.leaseStatus ? ` · Lease: ${intentStatus.leaseStatus}` : ''}
                    {intentStatus.leaseEndsAt ? ` · Ends: ${formatTimestamp(intentStatus.leaseEndsAt)}` : ''}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
