import { DEFAULT_AD_DURATION_HOURS, DEFAULT_AD_PRICE_SOL } from '@/lib/constants';
import { getPairsByTokenAddress } from '@/lib/dexscreener';
import { isPrivyEnabled } from '@/lib/env';
import { fail, ok } from '@/lib/http';
import { requirePrivyUser } from '@/lib/privy';
import { createAdWithPayment, getUserByPrivyId } from '@/lib/supabase/queries';
import { z } from 'zod';

const schema = z.object({
  streamId: z.string().min(1),
  tokenAddress: z.string().min(16),
  chain: z.enum(['solana', 'ethereum', 'base']),
  position: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'full']),
  size: z.enum(['small', 'medium', 'large']),
  asset: z.enum(['SOL']).default('SOL'),
});

export async function POST(request: Request) {
  try {
    const claims = isPrivyEnabled() ? await requirePrivyUser() : null;
    const sponsor = claims ? await getUserByPrivyId(claims.user_id) : null;

    if (isPrivyEnabled() && !sponsor) {
      return fail('User must be synced before creating a campaign.', 403);
    }

    const body = schema.parse(await request.json());
    const pairs = await getPairsByTokenAddress(body.chain, body.tokenAddress);
    const primaryPair = pairs[0];
    if (!primaryPair) {
      return fail('No DexScreener pair found for that token.');
    }

    const expiresAt = new Date(Date.now() + DEFAULT_AD_DURATION_HOURS * 60 * 60 * 1000).toISOString();
    const amount = DEFAULT_AD_PRICE_SOL;

    const { ad, payment } = await createAdWithPayment({
      streamId: body.streamId,
      sponsorId: sponsor?.id ?? null,
      sponsorWallet: sponsor?.wallet_address ?? null,
      tokenAddress: body.tokenAddress,
      chain: body.chain,
      position: body.position,
      size: body.size,
      expiresAt,
      amount,
      currency: body.asset,
    });

    return ok({
      ad,
      paymentId: payment.id,
      amount,
      currency: payment.currency,
      depositAddress: payment.deposit_address,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to create ad campaign.', 400);
  }
}
