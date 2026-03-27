import Image from 'next/image';
import Link from 'next/link';
import { TopNav } from '@/components/top-nav';

const CAMIUP_LINK = 'https://pump.fun/coin/AAvaTKQwJCoNxLK6zFts7MqvMK9F2DG13wZdExs8pump';
const CAMIUP_CONTRACT = 'AAvaTKQwJCoNxLK6zFts7MqvMK9F2DG13wZdExs8pump';
const GITHUB_ORG_LINK = 'https://github.com/InterloperProtocol';

export default function HomePage() {
  return (
    <main className="shell">
      <TopNav />

      <section className="hero hero-home">
        <div className="card panel stack hero-copy">
          <div className="eyebrow">CAMIKey</div>
          <h1 className="title">Creator Attention Marketplace Interface</h1>
          <p className="subtitle">
            Live buyer flow for token callers, stream overlays, and creator-side ad slots. Find live
            streams, verify they are actually active, and jump into a buy panel without guessing.
          </p>
          <div className="hero-actions">
            <Link className="button" href="/marketplace">
              Marketplace
            </Link>
            <Link className="button secondary" href="/start">
              Streamer
            </Link>
            <Link className="button secondary" href="/live">
              Pump.funAds
            </Link>
            <Link className="button camiup-button" href={CAMIUP_LINK} rel="noreferrer" target="_blank">
              $CAMIUP
            </Link>
          </div>
          <div className="hero-notes">
            <div className="detail">
              <dt>Best place to start</dt>
              <dd>Open Pump.funAds to scan live tokens, viewer counts, verification status, and jump straight into the stream buy flow.</dd>
            </div>
            <div className="detail">
              <dt>Contract address</dt>
              <dd className="mono">{CAMIUP_CONTRACT}</dd>
            </div>
          </div>
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
              CamiKey helps buyers sponsor live creator chart slots and helps streamers prove their overlay is
              really running before money gets routed into a campaign.
            </p>
          </article>
          <article className="faq-item">
            <h3 className="faq-question">What should a buyer do first?</h3>
            <p className="faq-answer">
              Start on Pump.funAds or the marketplace, pick a stream that is live and verified, then open its
              stream page to create a purchase intent for the token you want promoted.
            </p>
          </article>
          <article className="faq-item">
            <h3 className="faq-question">How do streamers get approved?</h3>
            <p className="faq-answer">
              A streamer has to register the correct Pump.fun deployer wallet and token mint, then keep the OBS
              overlay alive so heartbeat and verification stay fresh.
            </p>
          </article>
          <article className="faq-item">
            <h3 className="faq-question">Why would a buy button ever be blocked?</h3>
            <p className="faq-answer">
              If Pump.fun no longer shows the stream as live, the overlay heartbeat goes stale, or verification
              expires, purchases pause automatically to protect the buyer and the streamer slot.
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
            href={GITHUB_ORG_LINK}
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
