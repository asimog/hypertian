import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getPairsByTokenAddress: vi.fn(),
  createAdWithDirectPayment: vi.fn(),
  getStreamById: vi.fn(),
  listActiveAdsForStream: vi.fn(),
}));

vi.mock('@/lib/dexscreener', () => ({
  getPairsByTokenAddress: mocks.getPairsByTokenAddress,
}));

vi.mock('@/lib/supabase/queries', () => ({
  createAdWithDirectPayment: mocks.createAdWithDirectPayment,
  getStreamById: mocks.getStreamById,
  listActiveAdsForStream: mocks.listActiveAdsForStream,
}));

const { POST, GET } = await import('../src/app/api/ads/route');

function jsonRequest(body: unknown) {
  return new Request('http://localhost/api/ads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/ads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates public chart checkouts without advertiser auth', async () => {
    mocks.getPairsByTokenAddress.mockResolvedValue([{ pairAddress: 'pair-1' }]);
    mocks.createAdWithDirectPayment.mockResolvedValue({
      ad: { id: 'ad-1', ad_type: 'chart' },
      payment: { id: 'payment-1', currency: 'SOL', deposit_address: 'streamer-wallet' },
      stream: { payout_wallet: 'streamer-wallet' },
      amount: 0.001,
      durationMinutes: 5,
      paymentRoute: {
        recipientKind: 'streamer_direct',
        paidToWallet: 'streamer-wallet',
        commissionBps: 0,
        platformFeeAmount: 0,
        streamerAmount: 0.001,
        platformTreasuryWallet: null,
      },
    });

    const response = await POST(
      jsonRequest({
        streamId: 'stream-1',
        adType: 'chart',
        tokenAddress: 'So11111111111111111111111111111111111111112',
        chain: 'solana',
        position: 'bottom-right',
        size: 'medium',
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.getPairsByTokenAddress).toHaveBeenCalledWith('solana', 'So11111111111111111111111111111111111111112');
    expect(mocks.createAdWithDirectPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        adType: 'chart',
        dexPairAddress: 'pair-1',
        streamId: 'stream-1',
      }),
    );
    expect(json).toMatchObject({
      paymentId: 'payment-1',
      amount: 0.001,
      recipientAddress: 'streamer-wallet',
      paymentRecipientKind: 'streamer_direct',
      commissionBps: 0,
      durationMinutes: 5,
    });
  });

  it('rejects chart ads before checkout when DexScreener has no pair', async () => {
    mocks.getPairsByTokenAddress.mockResolvedValue([]);

    const response = await POST(
      jsonRequest({
        streamId: 'stream-1',
        adType: 'chart',
        tokenAddress: 'So11111111111111111111111111111111111111112',
        chain: 'solana',
        position: 'bottom-right',
        size: 'medium',
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('No DexScreener pair');
    expect(mocks.createAdWithDirectPayment).not.toHaveBeenCalled();
  });

  it('rejects non-HTTPS banner URLs before checkout', async () => {
    const response = await POST(
      jsonRequest({
        streamId: 'stream-1',
        adType: 'banner',
        bannerUrl: 'http://example.com/banner.png',
        position: 'bottom-right',
        size: 'medium',
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('https://');
    expect(mocks.createAdWithDirectPayment).not.toHaveBeenCalled();
  });

  it('returns escrow deposit details for banner ad checkouts', async () => {
    mocks.createAdWithDirectPayment.mockResolvedValue({
      ad: { id: 'ad-1', ad_type: 'banner' },
      payment: { id: 'payment-1', currency: 'SOL', deposit_address: 'escrow-wallet' },
      stream: { payout_wallet: 'streamer-wallet' },
      amount: 0.001,
      durationMinutes: 5,
      paymentRoute: {
        recipientKind: 'escrow',
        paidToWallet: 'streamer-wallet',
        commissionBps: 0,
        platformFeeAmount: 0,
        streamerAmount: 0.001,
        platformTreasuryWallet: null,
      },
    });

    const response = await POST(
      jsonRequest({
        streamId: 'stream-1',
        adType: 'banner',
        bannerUrl: 'https://example.com/banner.png',
        position: 'bottom-right',
        size: 'medium',
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.createAdWithDirectPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        adType: 'banner',
        bannerUrl: 'https://example.com/banner.png',
      }),
    );
    expect(json).toMatchObject({
      paymentId: 'payment-1',
      recipientAddress: 'escrow-wallet',
      depositAddress: 'escrow-wallet',
      paymentRecipientKind: 'escrow',
      paidToWallet: 'streamer-wallet',
      commissionBps: 0,
    });
  });

  it('maps approved banner ads to overlay media URLs', async () => {
    mocks.getStreamById.mockResolvedValue({ id: 'stream-1', default_banner_url: 'https://example.com/default.png' });
    mocks.listActiveAdsForStream.mockResolvedValue([
      {
        id: 'ad-1',
        ad_type: 'banner',
        banner_url: 'https://example.com/ad.png',
        status: 'active',
      },
      {
        id: 'ad-2',
        ad_type: 'chart',
        token_address: 'So11111111111111111111111111111111111111112',
        status: 'active',
      },
    ]);

    const response = await GET(new Request('http://localhost/api/ads?stream=stream-1'));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ads).toEqual([
      expect.objectContaining({
        id: 'ad-1',
        media_src: 'https://example.com/ad.png',
        media_type: 'image',
      }),
      expect.objectContaining({
        id: 'ad-2',
        media_src: null,
        media_type: null,
      }),
    ]);
  });
});
