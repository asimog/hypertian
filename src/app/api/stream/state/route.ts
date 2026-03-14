import { z } from 'zod';
import { badRequest, notFound, ok } from '@/lib/http';
import { processStreamKernel, needsKernelTick } from '@/lib/kernel';
import { clearExpiredVerifyNonceIfNeeded, isOverlayKeyValid } from '@/lib/overlay';
import { getStreamById } from '@/lib/streams';

const querySchema = z.object({
  streamId: z.string().min(1),
  k: z.string().min(1),
  sinceNonce: z.coerce.number().optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    streamId: url.searchParams.get('streamId'),
    k: url.searchParams.get('k'),
    sinceNonce: url.searchParams.get('sinceNonce') ?? undefined,
  });

  if (!parsed.success) {
    return badRequest('Invalid overlay state query.', parsed.error.flatten());
  }

  const stream = await getStreamById(parsed.data.streamId);
  if (!stream) {
    return notFound('Stream not found.');
  }

  if (!isOverlayKeyValid(stream, parsed.data.k)) {
    return badRequest('Overlay access denied.');
  }

  let currentStream = await clearExpiredVerifyNonceIfNeeded(stream);
  if (needsKernelTick(currentStream)) {
    await processStreamKernel(currentStream.streamId);
    const refreshedStream = await getStreamById(currentStream.streamId);
    if (refreshedStream) {
      currentStream = refreshedStream;
    }
  }

  const changed = parsed.data.sinceNonce == null || parsed.data.sinceNonce !== currentStream.overlay.stateNonce;

  return ok({
    changed,
    stateNonce: currentStream.overlay.stateNonce,
    chartUrl: changed ? currentStream.kernel.currentDexscreenerUrl : undefined,
    activeMint: changed ? currentStream.kernel.currentMint : undefined,
    verifyNonce: currentStream.overlay.verifyNonce,
    verifyNonceExpiresAt: currentStream.overlay.verifyNonceExpiresAt?.toISOString() ?? null,
    verifiedAt: currentStream.overlay.verifiedAt?.toISOString() ?? null,
    recommendedSize: changed
      ? {
          width: 640,
          height: 360,
        }
      : undefined,
  });
}
