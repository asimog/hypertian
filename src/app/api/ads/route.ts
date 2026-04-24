import { getPairsByTokenAddress } from '@/lib/dexscreener';
import { fail, ok } from '@/lib/http';
import { adTypeSchema, assertHttpsUrl } from '@/lib/platform';
import { createAdWithDirectPayment, getStreamById, listActiveAdsForStream } from '@/lib/supabase/queries';
import { AdRecord, OverlayActiveAd } from '@/lib/types';
import { z } from 'zod';

const schema = z.object({
  streamId: z.string().min(1),
  adType: adTypeSchema.default('chart'),
  tokenAddress: z.string().optional().nullable(),
  chain: z.enum(['solana', 'ethereum', 'base', 'bsc', 'arbitrum', 'polygon']).default('solana'),
  bannerUrl: z.string().optional().nullable(),
  position: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'full']),
  size: z.enum(['small', 'medium', 'large']),
  advertiserContact: z.string().max(160).optional().nullable(),
  advertiserNote: z.string().max(500).optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const streamId = url.searchParams.get('stream') || url.searchParams.get('streamId');
    if (!streamId) {
      return fail('Missing stream parameter.');
    }

    const [stream, ads] = await Promise.all([getStreamById(streamId), listActiveAdsForStream(streamId)]);
    const overlayAds: OverlayActiveAd[] = ads.map((ad: AdRecord) => ({
      ...ad,
      media_src: ad.ad_type === 'banner' ? ad.banner_url ?? null : null,
      media_type: ad.ad_type === 'banner' ? 'image' : null,
    }));

    return ok({ stream, ads: overlayAds });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to load active ads.');
  }
}

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    let dexPairAddress: string | null = null;
    let tokenAddress = body.tokenAddress ?? null;
    let bannerUrl = body.bannerUrl ?? null;

    if (body.adType === 'chart') {
      if (!tokenAddress || tokenAddress.length < 16) {
        return fail('Token address is required for chart ads.');
      }
      const pairs = await getPairsByTokenAddress(body.chain, tokenAddress);
      const primaryPair = pairs[0];
      if (!primaryPair) {
        return fail('No DexScreener pair found for that token.');
      }
      dexPairAddress = primaryPair.pairAddress;
    } else {
      if (!bannerUrl) {
        return fail('Banner URL is required for banner ads.');
      }
      bannerUrl = assertHttpsUrl(bannerUrl, 'Banner URL');
      tokenAddress = '';
    }

    const { ad, payment, amount, durationMinutes, paymentRoute } = await createAdWithDirectPayment({
      streamId: body.streamId,
      adType: body.adType,
      tokenAddress,
      chain: body.chain,
      dexPairAddress,
      bannerUrl,
      position: body.position,
      size: body.size,
      advertiserContact: body.advertiserContact ?? null,
      advertiserNote: body.advertiserNote ?? null,
    });

    return ok({
      ad,
      paymentId: payment.id,
      amount,
      currency: payment.currency,
      durationMinutes,
      recipientAddress: payment.deposit_address,
      depositAddress: payment.deposit_address,
      paymentRecipientKind: paymentRoute.recipientKind,
      paidToWallet: paymentRoute.paidToWallet,
      commissionBps: paymentRoute.commissionBps,
      platformFeeAmount: paymentRoute.platformFeeAmount,
      streamerAmount: paymentRoute.streamerAmount,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to create ad campaign.', 400);
  }
}
