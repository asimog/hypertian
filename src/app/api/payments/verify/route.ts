import { fail, ok } from '@/lib/http';
import { verifyDirectPaymentForAd } from '@/lib/supabase/queries';
import { z } from 'zod';

const schema = z.object({
  paymentId: z.string().min(1).optional(),
  adId: z.string().min(1).optional(),
  txSignature: z.string().min(32),
}).refine((value) => value.paymentId || value.adId, {
  message: 'paymentId or adId is required.',
});

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const result = await verifyDirectPaymentForAd(body);

    return ok({
      payment: result.payment,
      ad: result.ad,
      status: result.status,
      amountReceived: result.amountReceived,
      reason: 'reason' in result ? result.reason : null,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to verify payment.', 400);
  }
}
