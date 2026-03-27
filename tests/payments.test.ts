import { describe, expect, it } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import {
  getParsedTransactionsIndividually,
  getIncomingLamportsForAddress,
  selectObservedDepositPayment,
} from '../src/lib/payments';

describe('deposit payment observation', () => {
  it('treats cumulative inbound transfers as a full payment', () => {
    const observation = selectObservedDepositPayment({
      minimumLamports: 40_000_000,
      transfers: [
        {
          signature: 'sig_two',
          lamports: 15_000_000,
        },
        {
          signature: 'sig_one',
          lamports: 25_000_000,
        },
      ],
    });

    expect(observation.paid).toBe(true);
    expect(observation.observedLamports).toBe(40_000_000);
    expect(observation.signature).toBe('sig_two');
  });

  it('reads only the positive lamport delta for the deposit account', () => {
    const depositAddress = new PublicKey('11111111111111111111111111111111').toBase58();
    const transaction = {
      meta: {
        preBalances: [1_000, 2_000],
        postBalances: [41_000, 2_000],
      },
      transaction: {
        message: {
          accountKeys: [
            {
              pubkey: new PublicKey(depositAddress),
            },
            {
              pubkey: new PublicKey('Vote111111111111111111111111111111111111111'),
            },
          ],
        },
      },
    } as never;

    expect(getIncomingLamportsForAddress(transaction, depositAddress)).toBe(40_000);
  });

  it('loads parsed transactions one signature at a time for RPC providers that reject batch parsing', async () => {
    const calls: Array<{ signature: string; options: Record<string, unknown> }> = [];
    const connection = {
      async getParsedTransaction(signature: string, options: Record<string, unknown>) {
        calls.push({ signature, options });
        return null;
      },
    };

    await getParsedTransactionsIndividually(connection as never, ['sig_one', 'sig_two']);

    expect(calls.map((call) => call.signature)).toEqual(['sig_one', 'sig_two']);
    expect(calls.every((call) => call.options.commitment === 'confirmed')).toBe(true);
    expect(calls.every((call) => call.options.maxSupportedTransactionVersion === 0)).toBe(true);
  });
});
