import Image from 'next/image';
import Link from 'next/link';
import { TopNav } from '@/components/top-nav';

const REVENUE_WALLET = 'D1CRgh1Ty3yjDwN9CkwtsRWKmsmKQ2BbRbtKvCTfAN8Z';

export default function HomePage() {
  return (
    <main className="shell">
      <TopNav />

      <section className="hero hero-home">
        <div className="card panel stack hero-copy">
          <div className="eyebrow">Social Futures</div>
          <h1 className="title">Creator Attention Marketplace Interface</h1>
          <p className="subtitle">
            A live operating surface for pricing attention, routing demand, and activating creator-side
            distribution.
          </p>

          <div className="hero-actions">
            <Link className="button" href="/marketplace">
              Open Marketplace
            </Link>
            <Link className="button secondary" href="/start">
              Streamer Registration
            </Link>
            <Link className="button secondary" href="/advertisers">
              Advertisers
            </Link>
          </div>

          <dl className="detail-list">
            <div className="detail wallet-card">
              <dt>Revenue wallet</dt>
              <dd className="mono">{REVENUE_WALLET}</dd>
            </div>
          </dl>
        </div>

        <div className="hero-visual">
          <Image
            alt="Social Futures animation"
            className="hero-gif"
            height={768}
            priority
            src="/social-futures.gif"
            width={768}
          />
        </div>
      </section>

      <section className="faq-section card panel">
        <div className="faq-intro">
          <div className="eyebrow">FAQ</div>
          <h2 className="section-title faq-title">What People Usually Want To Know</h2>
        </div>
        <div className="faq-grid">
          <article className="faq-item">
            <h3 className="faq-question">What is CamiKey actually for?</h3>
            <p className="faq-answer">
              CamiKey is a marketplace interface for pricing creator attention, coordinating campaigns, and routing
              demand into live distribution surfaces.
            </p>
          </article>
          <article className="faq-item">
            <h3 className="faq-question">Who uses the platform?</h3>
            <p className="faq-answer">
              Streamers, advertisers, and operators use it to activate placements, track access, and manage campaign
              flow from a shared operating layer.
            </p>
          </article>
          <article className="faq-item">
            <h3 className="faq-question">How does capital allocation fit into this?</h3>
            <p className="faq-answer">
              The capital layer helps frame attention as an allocatable resource, making it easier to underwrite,
              monitor, and scale creator-side distribution.
            </p>
          </article>
          <article className="faq-item">
            <h3 className="faq-question">Can I explore before fully onboarding?</h3>
            <p className="faq-answer">
              Yes. You can open the marketplace, review the advertiser flow, and inspect the documentation before
              committing to a full registration or campaign setup.
            </p>
          </article>
        </div>
      </section>

      <section className="hero hero-secondary">
        <div className="card panel stack hero-copy hero-copy-secondary">
          <div className="eyebrow">Capital Layer</div>
          <h2 className="section-title">Underwriting Social Capital</h2>
          <p className="section-subtitle">Capital Allocation Management Interface</p>
          <div className="hero-actions hero-actions-centered">
            <Link
              className="button"
              href="https://github.com/InterloperProtocol/docs"
              rel="noreferrer"
              target="_blank"
            >
              Read Docs
            </Link>
          </div>
        </div>
      </section>

      <footer className="site-footer card panel">
        <div className="footer-copy">
          <div className="eyebrow">Links</div>
          <p className="subtitle">Follow the network and inspect the codebase.</p>
        </div>
        <div className="footer-links">
          <Link className="button secondary" href="https://x.com/soboltoshi" rel="noreferrer" target="_blank">
            X
          </Link>
          <Link
            className="button secondary"
            href="https://t.me/parastratemint"
            rel="noreferrer"
            target="_blank"
          >
            Telegram
          </Link>
          <Link
            className="button secondary"
            href="https://github.com/InterloperProtocol/CamiKey"
            rel="noreferrer"
            target="_blank"
          >
            GitHub
          </Link>
          <Link className="button secondary" href="https://hashart.fun" rel="noreferrer" target="_blank">
            hashart.fun
          </Link>
        </div>
      </footer>
    </main>
  );
}
