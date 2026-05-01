'use client';

import { useEffect, useMemo, useState } from 'react';
import DexChart from '@/components/DexChart';
import MediaBanner from '@/components/MediaBanner';
import OverlayDisclosure from '@/components/OverlayDisclosure';
import { useDexScreener } from '@/hooks/useDexScreener';
import { DEFAULT_CHART_TOKEN_ADDRESS, DEFAULT_STREAM_BANNER_URL, STREAM_HEARTBEAT_INTERVAL_MS } from '@/lib/constants';
import { OverlayActiveAd, StreamRecord } from '@/lib/types';

type Platform = 'x' | 'pump';

interface OverlaySurfaceProps {
  platform: Platform;
  searchParams: URLSearchParams;
}

function getPositionClass(position: string) {
  return 'bottom-10 right-6';
}

function inferMediaType(src: string | null): OverlayActiveAd['media_type'] {
  if (!src) {
    return null;
  }
  const clean = src.split('?')[0]?.toLowerCase() ?? '';
  if (clean.endsWith('.gif')) {
    return 'gif';
  }
  if (clean.endsWith('.mp4') || clean.endsWith('.webm') || clean.endsWith('.mov')) {
    return 'video';
  }
  return 'image';
}

export default function OverlaySurface({ platform, searchParams }: OverlaySurfaceProps) {
  // OBS Overlay Window Size Recommendation:
  // For best results, set your browser source to 1920x1080 (or your stream resolution)
  // and use "Scale to inner size" with "Constrain proportions" unchecked.
  // Position the overlay in OBS to match your stream layout.
  const streamId = searchParams.get('stream');
  const heartbeatKey = searchParams.get('key');
  const [activeAds, setActiveAds] = useState<OverlayActiveAd[]>([]);
  const [stream, setStream] = useState<StreamRecord | null>(null);
  const activeAd = activeAds[0] ?? null;
  const isBannerAd = activeAd?.ad_type === 'banner';
  const streamDefaultToken =
    stream?.platform === 'pump'
      ? stream.pump_mint || stream.default_chart_token_address
      : stream?.default_chart_token_address;
  const token = !isBannerAd ? activeAd?.token_address || searchParams.get('token') || streamDefaultToken || DEFAULT_CHART_TOKEN_ADDRESS : '';
  const chain = activeAd?.chain || searchParams.get('chain') || 'solana';
  const position = activeAd?.position || 'bottom-right';
  const size = activeAd?.size || searchParams.get('size') || 'medium';
  const theme = searchParams.get('theme') || 'dark';
  const showChart = searchParams.get('showChart') !== 'false' && !isBannerAd;
  const showMedia = searchParams.get('showMedia') !== 'false' && isBannerAd;
  const mediaSrc = activeAd?.media_src || searchParams.get('mediaSrc') || (!activeAd ? stream?.default_banner_url || DEFAULT_STREAM_BANNER_URL : null);
  const mediaType = activeAd?.media_type || inferMediaType(mediaSrc);

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
