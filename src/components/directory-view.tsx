'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, ImagePlus, LineChart, RefreshCw } from 'lucide-react';
import { DirectoryStream } from '@/lib/supabase/anon-queries';
import { STREAM_PLATFORM_NAMES } from '@/lib/constants';
import { RequestAdDialog } from '@/components/request-ad-dialog';

const REFRESH_MS = 60_000;

type Props = { initialStreams: DirectoryStream[] };

type RequestKind = 'chart' | 'banner';

export function DirectoryView({ initialStreams }: Props) {
  const [streams, setStreams] = useState(initialStreams);
  const [refreshedAt, setRefreshedAt] = useState<number>(Date.now());
  const [target, setTarget] = useState<{ stream: DirectoryStream; kind: RequestKind } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const res = await fetch('/api/public/directory', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { streams?: DirectoryStream[] };
        if (!cancelled && data.streams) {
          setStreams(data.streams);
          setRefreshedAt(Date.now());
        }
      } catch {
        // ignore transient errors
      }
    }

    const handle = window.setInterval(refresh, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(handle);
    };
  }, []);

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.32em] text-[var(--color-accent)]">Directory</div>
          <h1 className="mt-1 text-3xl font-semibold text-white">Live streams</h1>
          <p className="mt-1 text-sm text-[var(--color-copy-soft)]">Heartbeat checked every 60s. Anyone can trigger a chart or media request.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--color-copy-faint)]">
          <RefreshCw className="h-3.5 w-3.5" />
          {streams.length} live · refreshed {timeAgo(refreshedAt)}
        </div>
      </header>

      {!streams.length ? (
        <div className="soft-card text-sm text-[var(--color-copy-soft)]">
          No streams are live right now. Streams appear here automatically when an overlay heartbeat lands within the last 60 seconds.
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {streams.map((stream) => (
          <article className="panel rounded-3xl p-5" key={stream.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-white">
                  {stream.display_name || STREAM_PLATFORM_NAMES[stream.platform]}
                </div>
                <div className="mt-1 text-xs text-[var(--color-copy-soft)]">
                  {STREAM_PLATFORM_NAMES[stream.platform]} · {stream.price_sol ?? 0} SOL
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(124,228,210,0.5)] bg-[rgba(124,228,210,0.13)] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white">
                <CheckCircle2 className="h-3 w-3" /> live
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {stream.stream_url ? (
                <a className="secondary-button" href={stream.stream_url} rel="noreferrer" target="_blank">
                  <ExternalLink className="h-3.5 w-3.5" /> Watch
                </a>
              ) : null}
              <button className="primary-button" onClick={() => setTarget({ stream, kind: 'chart' })} type="button">
                <LineChart className="h-3.5 w-3.5" /> Request chart
              </button>
              <button className="secondary-button" onClick={() => setTarget({ stream, kind: 'banner' })} type="button">
                <ImagePlus className="h-3.5 w-3.5" /> Request media
              </button>
            </div>
          </article>
        ))}
      </div>

      {target ? (
        <RequestAdDialog
          kind={target.kind}
          onClose={() => setTarget(null)}
          stream={target.stream}
        />
      ) : null}
    </div>
  );
}

function timeAgo(ts: number) {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
}
