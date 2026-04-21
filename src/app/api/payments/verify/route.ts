import { fail, ok } from '@/lib/http';
import { getSolanaDepositPaymentStatus } from '@/lib/solana';
import { getPaymentWithAd, verifyPayment } from '@/lib/supabase/queries';
import { z } from 'zod';

const schema = z.object({
  paymentId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const payment = await getPaymentWithAd(body.paymentId);
    if (!payment) {
      return fail('Payment not found.', 404);
    }

    if (payment.status === 'verified') {
      return ok({
        payment,
        status: 'verified',
      });
    }

    if (!payment.deposit_address) {
      return fail('Payment is missing a deposit address.', 400);
    }

    const status = await getSolanaDepositPaymentStatus({
      depositAddress: payment.deposit_address,
      amount: Number(payment.amount),
      currency: payment.currency,
    });

    if (!status.verified) {
      return ok({
        payment,
        status: 'pending',
        amountReceived: status.amountReceived,
      });
    }

    const verified = await verifyPayment({
      paymentId: body.paymentId,
      txHash: status.txHash || payment.tx_hash || payment.deposit_address,
    });

    return ok({
      payment: verified,
      status: 'verified',
      amountReceived: status.amountReceived,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Failed to verify payment.', 400);
  }
}
