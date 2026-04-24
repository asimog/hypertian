import Link from 'next/link';
import { ArrowRight, BadgeCheck, RadioTower, Sparkles, WalletCards } from 'lucide-react';

export default function PumpLanePage() {
  return (
    <div className="grid gap-8">
      <section className="hero-panel overflow-hidden rounded-[40px] p-8 md:p-10">
        <div className="hero-grid">
          <div>
            <div className="eyebrow">
              <Sparkles className="h-3.5 w-3.5" />
              PumpAds
            </div>
            <h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-[-0.07em] text-white md:text-7xl">
              Turn Pump streams into sponsor-ready inventory.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--color-copy-soft)]">
              PumpAds gives Pump streamers a clean way to join Hypertian, carry approved sponsor media, and keep live token placements looking sharp on stream.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="primary-button" href="/dashboard/streamer">
                Join PumpAds
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link className="secondary-button" href="/dashboard/sponsor">
                Sponsor Pump streams
              </Link>
            </div>
          </div>

          <div className="panel rounded-[34px] p-6">
            <div className="text-xs uppercase tracking-[0.28em] text-[var(--color-accent)]">Creator network</div>
            <h2 className="mt-3 text-2xl font-semibold text-white">Built for fast-moving live token audiences.</h2>
            <div className="mt-6 grid gap-4">
              {[
                ['Streamer signups', 'Pump creators can connect their live surface and become eligible for sponsor placements.'],
                ['Approved creative', 'Campaign media is reviewed before it appears beside the live chart.'],
                ['Verified payments', 'Sponsor placements activate after payment confirmation.'],
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

      <section className="grid gap-6 md:grid-cols-3">
        <article className="panel rounded-[32px] p-6">
          <RadioTower className="h-6 w-6 text-[var(--color-accent)]" />
          <h2 className="mt-4 text-2xl font-semibold text-white">Live placement</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--color-copy-soft)]">
            Sponsor media and token charts sit inside a stream-safe presentation built for rapid discovery.
          </p>
        </article>
        <article className="panel rounded-[32px] p-6">
          <BadgeCheck className="h-6 w-6 text-[var(--color-accent-alt)]" />
          <h2 className="mt-4 text-2xl font-semibold text-white">Quality control</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--color-copy-soft)]">
            Creative approval keeps streamer audiences protected and sponsor placements polished.
          </p>
        </article>
        <article className="panel rounded-[32px] p-6">
          <WalletCards className="h-6 w-6 text-[var(--color-accent)]" />
          <h2 className="mt-4 text-2xl font-semibold text-white">Clear economics</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--color-copy-soft)]">
            On-chain verification gives sponsors and creators a reliable signal before campaigns run.
          </p>
        </article>
      </section>
    </div>
  );
}
