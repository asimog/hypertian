import Image from 'next/image';
import Link from 'next/link';

const GITHUB_ORG_LINK = 'https://github.com/InterloperProtocol';

export function TopNav() {
  return (
    <header className="topnav">
      <Link aria-label="CAMIKey home" className="brand-lockup" href="/">
        <span className="brand-mark">
          <Image alt="CAMIKey" className="brand-mark-image" height={56} priority src="/social-futures.gif" width={56} />
        </span>
        <span className="brand-copy">
          <span className="brand-name">CAMIKey</span>
          <span className="brand-tagline">Creator Attention Marketplace</span>
        </span>
      </Link>
      <nav aria-label="Primary" className="nav-links nav-links-primary">
        <Link className="nav-link nav-link-text" href="/marketplace">
          Marketplace
        </Link>
        <Link className="nav-link nav-link-text" href="/start">
          Streamer
        </Link>
        <Link className="nav-link nav-link-text" href="/live">
          Pump.funAds
        </Link>
      </nav>
      <div className="nav-links nav-links-compact">
        <Link aria-label="X" className="nav-link nav-link-icon" href="https://x.com/soboltoshi" rel="noreferrer" target="_blank">
          <Image alt="" aria-hidden className="nav-icon" height={18} src="/icons/x-logo.svg" width={18} />
        </Link>
        <Link
          aria-label="GitHub"
          className="nav-link nav-link-icon"
          href={GITHUB_ORG_LINK}
          rel="noreferrer"
          target="_blank"
        >
          <Image alt="" aria-hidden className="nav-icon" height={18} src="/icons/github.svg" width={18} />
        </Link>
        <Link
          aria-label="Telegram"
          className="nav-link nav-link-icon"
          href="https://t.me/parastratemint"
          rel="noreferrer"
          target="_blank"
        >
          <Image alt="" aria-hidden className="nav-icon" height={18} src="/icons/telegram.svg" width={18} />
        </Link>
      </div>
    </header>
  );
}
