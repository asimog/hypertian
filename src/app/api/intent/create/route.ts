import { z } from 'zod';
import { createIntent } from '@/lib/intents';
import { badRequest, ok, serverError } from '@/lib/http';

const bodySchema = z.object({
  streamId: z.string().trim().min(1),
  tier: z.enum(['BASE', 'PRIORITY']),
  buyerMint: z.string().trim().min(32),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const result = await createIntent(body);
    return ok(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest('Invalid intent payload.', error.flatten());
    }

    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError('Failed to create purchase intent.');
  }
}
