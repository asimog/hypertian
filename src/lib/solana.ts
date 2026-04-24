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

export async function verifyDirectSolPayment(input: {
  signature: string;
  recipient: string;
  amount: number;
  minBlockTime?: number | null;
}) {
  const connection = createSolanaConnection();
  const recipient = new PublicKey(input.recipient);
  const transaction = await connection.getParsedTransaction(input.signature, {
    commitment: 'confirmed',
    maxSupportedTransactionVersion: 0,
  });

  if (!transaction) {
    return {
      verified: false,
      amountReceived: 0,
      reason: 'Transaction was not found or is not confirmed.',
    };
  }

  if (transaction.meta?.err) {
    return {
      verified: false,
      amountReceived: 0,
      reason: 'Transaction failed on-chain.',
    };
  }

  if (input.minBlockTime && transaction.blockTime && transaction.blockTime < input.minBlockTime) {
    return {
      verified: false,
      amountReceived: 0,
      reason: 'Transaction is older than the ad checkout.',
    };
  }

  const accountKeys = transaction.transaction.message.accountKeys;
  const recipientIndex = accountKeys.findIndex((account) => account.pubkey.equals(recipient));
  if (recipientIndex < 0) {
    return {
      verified: false,
      amountReceived: 0,
      reason: 'Transaction does not include the payout wallet.',
    };
  }

  const preBalance = transaction.meta?.preBalances?.[recipientIndex] ?? 0;
  const postBalance = transaction.meta?.postBalances?.[recipientIndex] ?? 0;
  const amountReceived = Math.max(0, postBalance - preBalance) / LAMPORTS_PER_SOL;

  return {
    verified: amountReceived + 0.000001 >= input.amount,
    amountReceived,
    reason:
      amountReceived + 0.000001 >= input.amount
        ? null
        : `Payment amount is too low. Received ${amountReceived.toFixed(9)} SOL.`,
  };
}
