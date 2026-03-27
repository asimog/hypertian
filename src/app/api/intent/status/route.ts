import { badRequest, notFound, ok, serverError } from '@/lib/http';
import { getIntentStatusSnapshot } from '@/lib/intent-status';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const intentId = url.searchParams.get('intentId');
    if (!intentId) {
      return badRequest('Missing intentId.');
    }

    const status = await getIntentStatusSnapshot(intentId);
    if (!status) {
      return notFound('Intent not found.');
    }

    return ok(status);
  } catch (error) {
    return serverError(error instanceof Error ? error.message : 'Failed to poll purchase intent.');
  }
}
