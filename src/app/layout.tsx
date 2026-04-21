import '@/app/globals.css';
import { AppShell } from '@/components/app-shell';
import { Providers } from '@/components/providers';
import { SiteBackground } from '@/components/site-background';

export const metadata = {
  title: 'Hypertian',
  description: 'Run your own advertising channel with crypto chart overlays for X, OBS, and RTMP workflows.',
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
