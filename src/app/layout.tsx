import '@/app/globals.css';
import type { Metadata, Viewport } from 'next';
import { AppShell } from '@/components/app-shell';
import { Providers } from '@/components/providers';
import { SiteBackground } from '@/components/site-background';
import { getSiteUrl } from '@/lib/env';

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: 'Hypertian',
    template: '%s | Hypertian',
  },
  description: 'Operational ad rails for X and Pump livestreams, with creator approval, on-chain payment verification, and OBS-ready overlays.',
  applicationName: 'Hypertian',
  keywords: ['livestream ads', 'PumpAds', 'X livestream ads', 'crypto ads', 'DexScreener', 'Solana', 'OBS overlays'],
  openGraph: {
    title: 'Hypertian',
    description: 'Operational ad rails for X and Pump livestreams.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hypertian',
    description: 'Operational ad rails for X and Pump livestreams.',
  },
};

export const viewport: Viewport = {
  themeColor: '#091216',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <SiteBackground />
          <a className="skip-link" href="#main-content">
            Skip to content
          </a>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
