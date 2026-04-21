import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="grid gap-8">
      <section className="rounded-[40px] border border-white/10 bg-slate-950/70 p-8 shadow-2xl shadow-cyan-950/20">
        <div className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-[11px] uppercase tracking-[0.35em] text-cyan-100">
          Run your own advertising channel
        </div>
        <h1 className="mt-6 max-w-5xl text-5xl font-semibold tracking-[-0.06em] text-white md:text-7xl">
          Hypertian turns your livestream into a self-hosted chart + media ad rail.
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
          X Livestreams is the highest-priority lane, followed by YouTube, Twitch, and Pump.fun. You approve every sponsor asset, every media job, and every live overlay that reaches OBS.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950" href="/x-overlay?token=So11111111111111111111111111111111111111112&chain=solana&position=bottom-right&size=large&theme=dark&showChart=true&showMedia=true">
            Preview X overlay
          </Link>
          <Link className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white" href="/dashboard/streamer">
            Open dashboard
          </Link>
          <Link className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white" href="/pump">
            Pump lane
          </Link>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        {[
          ['X Overlay', '/x-overlay', 'Most polished lane, optimized for OBS + X RTMP ingestion.'],
          ['YouTube Overlay', '/youtube-overlay', 'Shared overlay engine for creator-owned YouTube streams.'],
          ['Twitch Overlay', '/twitch-overlay', 'Same disclosure and heartbeat box, Twitch-specific route.'],
          ['Pump Overlay', '/pump-overlay', 'Pump.fun-focused overlay route paired with the multi-user lane.'],
        ].map(([title, href, body]) => (
          <Link className="rounded-[28px] border border-white/10 bg-slate-950/60 p-6 transition hover:border-cyan-400/50 hover:bg-slate-950/80" href={href} key={href}>
            <div className="text-xs uppercase tracking-[0.3em] text-emerald-300">{title}</div>
            <p className="mt-4 text-sm leading-7 text-slate-300">{body}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <article className="rounded-[32px] border border-white/10 bg-slate-950/60 p-6">
          <div className="text-xs uppercase tracking-[0.3em] text-emerald-300">Media workflow</div>
          <h2 className="mt-4 text-2xl font-semibold text-white">Sponsors propose. Creators approve.</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Uploaded media lands as a pending job in Supabase Storage. Nothing appears on-stream until the creator explicitly approves it and payment is verified.
          </p>
        </article>
        <article className="rounded-[32px] border border-white/10 bg-slate-950/60 p-6">
          <div className="text-xs uppercase tracking-[0.3em] text-cyan-300">Shared engine</div>
          <h2 className="mt-4 text-2xl font-semibold text-white">Dex chart + approved media together</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Every overlay uses the same reusable chart, disclosure, media banner, and heartbeat components so the lanes stay consistent while the routes stay separate.
          </p>
        </article>
        <article className="rounded-[32px] border border-white/10 bg-slate-950/60 p-6">
          <div className="text-xs uppercase tracking-[0.3em] text-fuchsia-300">Self-hosted</div>
          <h2 className="mt-4 text-2xl font-semibold text-white">No middleman platform required</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Hypertian is designed as a personal, self-hosted creator tool. Supabase, Privy, and Vercel are the boxes underneath. You own the workflow.
          </p>
        </article>
      </section>
    </div>
  );
}
