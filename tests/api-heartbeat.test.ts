import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  verifyOverlayHeartbeatKey: vi.fn(),
}));

vi.mock('@/lib/overlay-auth', () => ({
  verifyOverlayHeartbeatKey: mocks.verifyOverlayHeartbeatKey,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}));

const { POST } = await import('../src/app/api/streams/heartbeat/route');

function jsonRequest(body: unknown) {
  return new Request('http://localhost/api/streams/heartbeat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/streams/heartbeat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects heartbeat calls with an invalid overlay key', async () => {
    mocks.verifyOverlayHeartbeatKey.mockReturnValue(false);

    const response = await POST(jsonRequest({ streamId: 'stream-1', key: 'a'.repeat(32) }));
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toContain('Unauthorized');
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it('updates liveness without mutating verification status', async () => {
    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'stream-1' }, error: null }),
        }),
      }),
    });

    mocks.verifyOverlayHeartbeatKey.mockReturnValue(true);
    mocks.createAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        update,
      }),
    });

    const response = await POST(jsonRequest({ streamId: 'stream-1', key: 'b'.repeat(32) }));

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_live: true,
      }),
    );
    expect(update.mock.calls[0][0]).not.toHaveProperty('verification_status');
  });
});
