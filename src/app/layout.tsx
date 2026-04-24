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
  description: 'Livestream ad rails for PumpFun, X, and Kick creators, with crypto overlays and payment verification.',
  applicationName: 'Hypertian',
  keywords: ['livestream ads', 'PumpFun', 'X livestream ads', 'Kick livestream ads', 'crypto ads', 'DexScreener', 'Solana'],
  openGraph: {
    title: 'Hypertian',
    description: 'Open ad rails for PumpFun, X, and Kick streamers.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hypertian',
    description: 'Livestream ad rails for PumpFun, X, and Kick creators.',
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
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
