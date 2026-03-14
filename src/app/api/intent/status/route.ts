import { badRequest, notFound, ok, serverError } from '@/lib/http';
import { pollIntentStatus } from '@/lib/intents';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const intentId = url.searchParams.get('intentId');
    if (!intentId) {
      return badRequest('Missing intentId.');
    }

    const status = await pollIntentStatus(intentId);
    if (!status) {
      return notFound('Intent not found.');
    }

    return ok({
      intentId: status.intent.intentId,
      streamId: status.intent.streamId,
      slug: status.intent.slug,
      tier: status.intent.tier,
      amountSol: status.intent.amountSol,
      amountLamports: status.intent.amountLamports,
      buyerMint: status.intent.buyerMint,
      depositAddress: status.intent.depositAddress,
      status: status.intent.status,
      payoutStatus: status.intent.payoutStatus,
      expiresAt: status.intent.expiresAt.toISOString(),
      paidAt: status.intent.paidAt?.toISOString() ?? null,
      paymentConfirmedAt: status.intent.paymentConfirmedAt?.toISOString() ?? null,
      leaseId: status.intent.leaseId,
      leaseStatus: status.lease?.status ?? null,
      leaseEndsAt: status.lease?.endsAt?.toISOString() ?? null,
      forwardTxSignature: status.intent.forwardTxSignature,
      payoutFailureReason: status.intent.payoutFailureReason,
    });
  } catch (error) {
    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError('Failed to poll purchase intent.');
  }
}
