import Link from 'next/link';
import { Activity, Music2, RadioTower, TvMinimalPlay } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="home-outer">
      <header className="home-brand" aria-labelledby="home-title">
        <div className="home-kicker">Hypertian</div>
        <h1 className="home-display-title" id="home-title">
          Livestream ad rails
        </h1>
        <p className="home-subtitle">
          Creator-owned inventory, transparent job cards, live overlays, and an audio-reactive workspace.
        </p>
      </header>

      <nav aria-label="Primary routes" className="home-grid-wrap">
        <div className="home-grid">
          {boxes.map((box) => (
            <Link className="home-box" href={box.href} key={box.href}>
              <span className="home-box-num">{box.num}</span>
              <box.Icon aria-hidden className="home-box-icon" />
              <span className="home-box-eyebrow">{box.eyebrow}</span>
              <h2 className="home-box-title">{box.title}</h2>
              <p className="home-box-desc">{box.desc}</p>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

const boxes = [
  {
    href: '/streamer',
    num: '01',
    eyebrow: 'Creator',
    title: 'Streamer',
    desc: 'Create an anonymous stream profile, copy your OBS overlay, and approve banner requests.',
    Icon: RadioTower,
  },
  {
    href: '/directory',
    num: '02',
    eyebrow: 'Live',
    title: 'Directory',
    desc: 'Browse fresh heartbeat streams and request chart or media placements.',
    Icon: TvMinimalPlay,
  },
  {
    href: '/feed',
    num: '03',
    eyebrow: 'Ledger',
    title: 'Feed',
    desc: 'Track every ad job and payment with public status cards and receipts.',
    Icon: Activity,
  },
  {
    href: '/music',
    num: '04',
    eyebrow: 'Audio',
    title: 'Music',
    desc: 'Play music across the site while the global orb and particles react to sound.',
    Icon: Music2,
  },
] as const;
