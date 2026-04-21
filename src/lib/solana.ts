import 'server-only';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getSolanaRpcUrl } from '@/lib/env';
import { AssetKind } from '@/lib/types';

const LAMPORTS_PER_SOL = 1_000_000_000;

export function createSolanaConnection() {
  return new Connection(getSolanaRpcUrl(), 'confirmed');
}

export function generateSolanaDepositAccount() {
  const keypair = Keypair.generate();

  return {
    address: keypair.publicKey.toBase58(),
    secret: JSON.stringify(Array.from(keypair.secretKey)),
  };
}

export async function getSolanaDepositPaymentStatus(input: {
  depositAddress: string;
  amount: number;
  currency: AssetKind;
}) {
  if (input.currency !== 'SOL') {
    throw new Error('Generated deposit addresses currently support SOL payments only.');
  }

  const connection = createSolanaConnection();
  const address = new PublicKey(input.depositAddress);
  const [lamports, signatures] = await Promise.all([
    connection.getBalance(address, 'confirmed'),
    connection.getSignaturesForAddress(address, { limit: 10 }, 'confirmed'),
  ]);

  const amountReceived = lamports / LAMPORTS_PER_SOL;
  const matchingSignature = signatures.find((entry) => !entry.err)?.signature || null;

  return {
    verified: amountReceived + 0.000001 >= input.amount,
    amountReceived,
    txHash: matchingSignature,
  };
}
