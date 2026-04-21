import Link from 'next/link';

export default function PumpLanePage() {
  return (
    <div className="grid gap-6">
      <section className="rounded-[32px] border border-white/10 bg-slate-950/70 p-8">
        <div className="text-xs uppercase tracking-[0.3em] text-emerald-300">Pump Ads Lane</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white">Multi-user Pump.fun ad lane</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
          This lane is the reusable platform box: multiple streams, multiple sponsors, pending media jobs, payment tracking, and creator-controlled approvals before anything becomes visible in OBS.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950" href="/dashboard/streamer">
            Open dashboard
          </Link>
          <Link className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white" href="/pump-overlay?token=So11111111111111111111111111111111111111112&chain=solana&showChart=true&showMedia=true">
            Preview pump overlay
          </Link>
        </div>
      </section>
    </div>
  );
}
