import {
  Connection,
  Keypair,
  PublicKey,
} from '@solana/web3.js';
import { decryptSecret, encryptSecret } from '@/lib/crypto';
import { getSolanaRpcUrl } from '@/lib/env';

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
