import Link from 'next/link';
import { Activity, ArrowRight, BadgeDollarSign, RadioTower, ShieldCheck, Sparkles, UserRoundCheck } from 'lucide-react';

const LANES = [
  ['X Ads', '/x-overlay', 'Premium placements for @HyperMythX with live token context and clear sponsor disclosure.'],
  ['PumpAds', '/pump', 'A creator network for Pump streamers with approved media and verified sponsor demand.'],
  ['Ad Desk', '/dashboard/sponsor', 'Book placements, confirm deposits, and follow campaign status in one flow.'],
  ['Creator Studio', '/dashboard/streamer', 'Package live inventory, approve creative, and keep payouts ready.'],
] as const;

const READINESS_ITEMS = [
  'X Ads stays exclusive to @HyperMythX.',
  'PumpAds gives Pump creators a simple path into sponsor inventory.',
  'Payments, approvals, and live placements are production-ready.',
] as const;

export default function HomePage() {
  return (
    <div className="grid gap-8">
      <section className="hero-panel overflow-hidden rounded-[40px] p-8 md:p-10">
        <div className="hero-grid">
          <div>
            <div className="eyebrow">
              <Sparkles className="h-3.5 w-3.5" />
              Livestream ad rails
            </div>
            <h1 className="mt-6 max-w-5xl text-5xl font-semibold text-white md:text-7xl">
              Livestream ads with creator control built in.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--color-copy-soft)]">
              Hypertian helps sponsors book verified placements while creators approve what reaches their audience.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="primary-button" href="/x-overlay?token=So11111111111111111111111111111111111111112&chain=solana&position=bottom-right&size=large&theme=dark&showChart=true&showMedia=true">
                View X Ads
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link className="secondary-button" href="/dashboard/streamer">
                Creator Studio
              </Link>
              <Link className="secondary-button" href="/pump">
                Explore PumpAds
              </Link>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="hero-stat">
                <span>1</span>
                premium X lane
              </div>
              <div className="hero-stat">
                <span>Open</span>
                Pump creator signups
              </div>
              <div className="hero-stat">
                <span>Live</span>
                payment checks
              </div>
            </div>
          </div>

          <div className="panel relative overflow-hidden rounded-[34px] p-6">
            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(124,228,210,0.7)] to-transparent" />
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.28em] text-[var(--color-accent)]">Live ad operations</div>
                <h2 className="mt-3 text-2xl font-semibold text-white">Two ad lanes. One trusted stack.</h2>
              </div>
              <div className="pill">Separated inventory</div>
            </div>
            <div className="mt-6 grid gap-4">
              {[
                ['X Ads', 'Premium inventory for @HyperMythX with clear brand control.'],
                ['PumpAds', 'Sponsor-ready inventory for Pump creators.'],
                ['Verified delivery', 'Placements run after payment confirmation and creator approval.'],
              ].map(([title, body], index) => (
                <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4" key={title}>
                  <div className="font-mono text-xs uppercase tracking-[0.24em] text-[var(--color-copy-faint)]">0{index + 1}</div>
                  <div className="mt-2 text-base font-medium text-white">{title}</div>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-copy-soft)]">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        {LANES.map(([title, href, body]) => (
          <Link className="panel group rounded-[30px] p-6 transition hover:-translate-y-0.5" href={href} key={href}>
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-[0.3em] text-[var(--color-accent)]">{title}</div>
              <ArrowRight className="h-4 w-4 text-[var(--color-copy-faint)] transition group-hover:text-white" />
            </div>
            <p className="mt-4 text-sm leading-7 text-[var(--color-copy-soft)]">{body}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="panel rounded-[34px] p-6 md:p-8">
          <div className="eyebrow">Product lanes</div>
          <h2 className="mt-5 text-3xl font-semibold text-white">Built for sponsors. Clear for creators.</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <RadioTower className="h-6 w-6 text-[var(--color-accent)]" />
              <h3 className="mt-4 text-lg font-semibold text-white">X Ads</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--color-copy-soft)]">
                Reserved inventory for @HyperMythX with controlled audience, pricing, and creative review.
              </p>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <UserRoundCheck className="h-6 w-6 text-[var(--color-accent-alt)]" />
              <h3 className="mt-4 text-lg font-semibold text-white">PumpAds</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--color-copy-soft)]">
                Pump creators can turn live attention into sponsor-ready inventory.
              </p>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <BadgeDollarSign className="h-6 w-6 text-[var(--color-accent)]" />
              <h3 className="mt-4 text-lg font-semibold text-white">Buyer confidence</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--color-copy-soft)]">
                Deposits, campaign status, and banner approval are visible before launch.
              </p>
            </div>
          </div>
        </article>

        <article className="panel rounded-[34px] p-6 md:p-8" id="production-readiness">
          <div className="eyebrow">Scope</div>
          <h2 className="mt-5 text-3xl font-semibold text-white">What Hypertian manages</h2>
          <div className="mt-6 grid gap-4">
            {READINESS_ITEMS.map((item) => (
              <div className="flex items-start gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-4" key={item}>
                <Activity className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" />
                <p className="text-sm leading-6 text-[var(--color-copy-soft)]">{item}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <article className="panel rounded-[32px] p-6">
          <div className="text-xs uppercase tracking-[0.3em] text-[var(--color-accent)]">Media workflow</div>
          <h2 className="mt-4 text-2xl font-semibold text-white">Creative review before launch.</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--color-copy-soft)]">
            Banner media needs creator approval before it reaches a live audience.
          </p>
        </article>
        <article className="panel rounded-[32px] p-6">
          <div className="text-xs uppercase tracking-[0.3em] text-[var(--color-accent-alt)]">Shared engine</div>
          <h2 className="mt-4 text-2xl font-semibold text-white">Charts and media in one surface.</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--color-copy-soft)]">
            X Ads and PumpAds share a reliable live placement system.
          </p>
        </article>
        <article className="panel rounded-[32px] p-6">
          <div className="text-xs uppercase tracking-[0.3em] text-[var(--color-copy)]">Streamer growth</div>
          <h2 className="mt-4 text-2xl font-semibold text-white">PumpAds grows with creators.</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--color-copy-soft)]">
            The Pump lane gives streamers a cleaner way to package sponsor demand.
          </p>
        </article>
      </section>
    </div>
  );
}
