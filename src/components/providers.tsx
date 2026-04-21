'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';
import { ReactNode } from 'react';
import { getPublicEnv, isPrivyEnabled } from '@/lib/env';
import { SupabaseProvider } from '@/components/SupabaseProvider';
import { createClient } from '@/lib/supabase/client';

export function Providers({ children }: { children: ReactNode }) {
  const env = getPublicEnv();
  const supabaseClient = createClient();

  if (!isPrivyEnabled() || !env.NEXT_PUBLIC_PRIVY_APP_ID) {
    return <SupabaseProvider supabaseClient={supabaseClient}>{children}</SupabaseProvider>;
  }

  return (
    <PrivyProvider
      appId={env.NEXT_PUBLIC_PRIVY_APP_ID}
      config={{
        loginMethods: ['email', 'wallet'],
        appearance: {
          accentColor: '#22c55e',
          walletChainType: 'ethereum-and-solana',
          theme: 'dark',
          landingHeader: 'Hypertian',
        },
        embeddedWallets: {
          solana: {
            createOnLogin: 'users-without-wallets',
          },
        },
        externalWallets: {
          solana: {
            connectors: toSolanaWalletConnectors(),
          },
        },
      }}
    >
      <SupabaseProvider supabaseClient={supabaseClient}>{children}</SupabaseProvider>
    </PrivyProvider>
  );
}
