'use client';

import { useEffect, useMemo, useState } from 'react';
import DexChart from '@/components/DexChart';
import MediaBanner from '@/components/MediaBanner';
import OverlayDisclosure from '@/components/OverlayDisclosure';
import { useDexScreener } from '@/hooks/useDexScreener';
import { STREAM_HEARTBEAT_INTERVAL_MS } from '@/lib/constants';
import { OverlayActiveAd, StreamRecord } from '@/lib/types';

type Platform = 'x' | 'pump';

interface OverlaySurfaceProps {
  platform: Platform;
  searchParams: URLSearchParams;
}

function getPositionClass(position: string) {
  switch (position) {
    case 'top-left':
      return 'top-6 left-6';
    case 'top-right':
      return 'top-6 right-6';
    case 'center':
      return 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2';
    case 'bottom-left':
      return 'bottom-10 left-6';
    case 'bottom-right':
      return 'bottom-10 right-6';
    case 'full':
      return 'inset-0 w-full h-full justify-center items-center';
    default:
      return 'bottom-10 right-6';
  }
}

export default function OverlaySurface({ platform, searchParams }: OverlaySurfaceProps) {
  const streamId = searchParams.get('stream');
  const heartbeatKey = searchParams.get('key');
  const [activeAds, setActiveAds] = useState<OverlayActiveAd[]>([]);
  const [stream, setStream] = useState<StreamRecord | null>(null);
  const activeAd = activeAds[0] ?? null;
  const isBannerAd = activeAd?.ad_type === 'banner';
  const token = !isBannerAd ? activeAd?.token_address || searchParams.get('token') || '' : '';
  const chain = activeAd?.chain || searchParams.get('chain') || 'solana';
  const position = activeAd?.position || searchParams.get('position') || 'bottom-right';
  const size = activeAd?.size || searchParams.get('size') || 'medium';
  const theme = searchParams.get('theme') || 'dark';
  const showChart = searchParams.get('showChart') !== 'false' && !isBannerAd;
  const showMedia = searchParams.get('showMedia') !== 'false';
  const mediaSrc = activeAd?.media_src || (!activeAd ? stream?.default_banner_url : null) || searchParams.get('mediaSrc');
  const mediaType = activeAd?.media_type || (mediaSrc ? 'image' : null);

  const { data, loading } = useDexScreener(token, chain);
  const chartSize = useMemo(
    () => (size === 'large' ? { width: 480, height: 260 } : { width: 380, height: 210 }),
    [size],
  );

  useEffect(() => {
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';

    const sendHeartbeat = () => {
      if (!streamId || !heartbeatKey) {
        return;
      }

      void fetch('/api/streams/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamId, key: heartbeatKey }),
      });
    };

    sendHeartbeat();
    const heartbeat = streamId
      ? setInterval(() => {
          sendHeartbeat();
        }, STREAM_HEARTBEAT_INTERVAL_MS)
      : null;

    const loadActiveAds = async () => {
      if (!streamId) {
        setActiveAds([]);
        return;
      }

      try {
        const response = await fetch(`/api/ads?stream=${encodeURIComponent(streamId)}`, {
          cache: 'no-store',
        });
        if (!response.ok) {
          return;
        }
        const json = (await response.json()) as { ads?: OverlayActiveAd[]; stream?: StreamRecord | null };
        setStream(json.stream ?? null);
        setActiveAds(json.ads ?? []);
      } catch {
        // Query-param previews should keep working even when the ad feed is unreachable.
      }
    };

    void loadActiveAds();
    const adRefresh = streamId
      ? setInterval(() => {
          void loadActiveAds();
        }, 20_000)
      : null;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        window.dispatchEvent(new Event('resize'));
        void loadActiveAds();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (heartbeat) {
        clearInterval(heartbeat);
      }
      if (adRefresh) {
        clearInterval(adRefresh);
      }
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [heartbeatKey, streamId]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-transparent select-none">
      <div className={`absolute ${getPositionClass(position)} flex max-w-[calc(100vw-3rem)] flex-wrap gap-4`}>
        {showChart && token ? (
          <div className="rounded-[24px] border border-white/10 bg-zinc-950/90 p-4 backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between gap-4 text-sm">
              <span className="font-mono text-cyan-400">{token.slice(0, 8)}...</span>
              <span className="text-emerald-400">
                {loading ? 'Loading…' : `$${Number(data?.priceUsd || 0).toFixed(6)}`}
              </span>
            </div>
            <DexChart chain={chain} height={chartSize.height} theme={theme === 'light' ? 'light' : 'dark'} tokenAddress={token} width={chartSize.width} />
            <div className="mt-3 grid grid-cols-3 gap-3 text-[11px] uppercase tracking-[0.2em] text-zinc-400">
              <Metric label="24H VOL" value={data?.volume?.h24 ? `$${Math.round(data.volume.h24).toLocaleString()}` : '—'} />
              <Metric label="LIQ" value={data?.liquidity?.usd ? `$${Math.round(data.liquidity.usd).toLocaleString()}` : '—'} />
              <Metric label="24H" value={typeof data?.priceChange?.h24 === 'number' ? `${data.priceChange.h24.toFixed(2)}%` : '—'} />
            </div>
          </div>
        ) : null}

        {showMedia ? <MediaBanner src={mediaSrc} type={mediaType} /> : null}
      </div>

      {platform === 'x' ? <OverlayDisclosure /> : <OverlayDisclosure />}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div>{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}
