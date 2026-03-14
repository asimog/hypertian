import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { decryptSecret, encryptSecret } from '@/lib/crypto';
import { getPlatformTreasury, getSolanaRpcUrl } from '@/lib/env';

export const INTENT_TTL_MS = 15 * 60 * 1000;

export interface DepositWalletRecord {
  depositAddress: string;
  depositSecretCiphertext: string;
}

export interface DepositPaymentObservation {
  paid: boolean;
  observedLamports: number;
  signature: string | null;
}

export interface ForwardDepositResult {
  forwardTxSignature: string;
  streamerPayoutLamports: number;
  treasuryPayoutLamports: number;
  feeLamports: number;
}

let sharedConnection: Connection | null = null;

export function getSolanaConnection() {
  if (sharedConnection) {
    return sharedConnection;
  }

  sharedConnection = new Connection(getSolanaRpcUrl(), 'confirmed');
  return sharedConnection;
}

export function createDepositWallet(): DepositWalletRecord {
  const keypair = Keypair.generate();

  return {
    depositAddress: keypair.publicKey.toBase58(),
    depositSecretCiphertext: encryptSecret(Buffer.from(keypair.secretKey).toString('base64')),
  };
}

export function decryptDepositWallet(ciphertext: string) {
  const secretKey = decryptSecret(ciphertext);
  return Keypair.fromSecretKey(Uint8Array.from(Buffer.from(secretKey, 'base64')));
}

export async function observeDepositPayment(
  depositAddress: string,
  minimumLamports: number,
): Promise<DepositPaymentObservation> {
  const connection = getSolanaConnection();
  const publicKey = new PublicKey(depositAddress);
  const [observedLamports, signatures] = await Promise.all([
    connection.getBalance(publicKey, 'confirmed'),
    connection.getSignaturesForAddress(publicKey, { limit: 10 }, 'confirmed'),
  ]);

  const signature =
    signatures.find((entry) => entry.confirmationStatus === 'confirmed' || entry.confirmationStatus === 'finalized')
      ?.signature || null;

  return {
    paid: observedLamports >= minimumLamports,
    observedLamports,
    signature,
  };
}

async function estimateTransferFeeLamports(
  payer: PublicKey,
  streamerWallet: PublicKey,
  treasuryWallet: PublicKey,
) {
  const connection = getSolanaConnection();
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  const message = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions: [
      SystemProgram.transfer({
        fromPubkey: payer,
        toPubkey: streamerWallet,
        lamports: 1,
      }),
      SystemProgram.transfer({
        fromPubkey: payer,
        toPubkey: treasuryWallet,
        lamports: 1,
      }),
    ],
  }).compileToV0Message();

  const feeResponse = await connection.getFeeForMessage(message, 'confirmed');
  return feeResponse.value ?? 5_000;
}

export async function forwardDepositToRecipients(input: {
  depositSecretCiphertext: string;
  grossLamports: number;
  streamerWallet: string;
}): Promise<ForwardDepositResult> {
  const connection = getSolanaConnection();
  const payer = decryptDepositWallet(input.depositSecretCiphertext);
  const streamerWallet = new PublicKey(input.streamerWallet);
  const treasuryWallet = new PublicKey(getPlatformTreasury());
  const currentBalance = await connection.getBalance(payer.publicKey, 'confirmed');
  const grossLamports = Math.min(currentBalance, input.grossLamports);

  if (grossLamports <= 0) {
    throw new Error('Deposit wallet has no balance to forward.');
  }

  const feeLamports = await estimateTransferFeeLamports(payer.publicKey, streamerWallet, treasuryWallet);
  const streamerPayoutLamports = Math.floor(grossLamports * 0.9);
  const treasuryPayoutLamports = Math.max(grossLamports - streamerPayoutLamports - feeLamports, 0);

  if (streamerPayoutLamports <= 0) {
    throw new Error('Streamer payout would be empty.');
  }

  const instructions = [
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: streamerWallet,
      lamports: streamerPayoutLamports,
    }),
  ];

  if (treasuryPayoutLamports > 0) {
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: treasuryWallet,
        lamports: treasuryPayoutLamports,
      }),
    );
  }

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  const message = new TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();
  const transaction = new VersionedTransaction(message);
  transaction.sign([payer]);

  const forwardTxSignature = await connection.sendTransaction(transaction, {
    preflightCommitment: 'confirmed',
    maxRetries: 3,
  });

  await connection.confirmTransaction(
    {
      signature: forwardTxSignature,
      blockhash,
      lastValidBlockHeight,
    },
    'confirmed',
  );

  return {
    forwardTxSignature,
    streamerPayoutLamports,
    treasuryPayoutLamports,
    feeLamports,
  };
}
