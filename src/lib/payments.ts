import {
  Connection,
  Keypair,
  ParsedTransactionWithMeta,
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

export interface ObservedDepositTransfer {
  signature: string;
  lamports: number;
}

export interface ForwardDepositResult {
  forwardTxSignature: string;
  streamerPayoutLamports: number;
  treasuryPayoutLamports: number;
  feeLamports: number;
}

let sharedConnection: Connection | null = null;
const PARSED_TRANSACTION_OPTIONS = {
  commitment: 'confirmed' as const,
  maxSupportedTransactionVersion: 0 as const,
};

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

function getTransactionAccountAddress(accountKey: ParsedTransactionWithMeta['transaction']['message']['accountKeys'][number]) {
  return typeof accountKey === 'string' ? accountKey : accountKey.pubkey.toBase58();
}

export function getIncomingLamportsForAddress(
  transaction: ParsedTransactionWithMeta | null,
  depositAddress: string,
): number {
  if (!transaction?.meta) {
    return 0;
  }

  const index = transaction.transaction.message.accountKeys.findIndex(
    (accountKey) => getTransactionAccountAddress(accountKey) === depositAddress,
  );
  if (index < 0) {
    return 0;
  }

  const preBalance = transaction.meta.preBalances[index] ?? 0;
  const postBalance = transaction.meta.postBalances[index] ?? 0;
  return Math.max(postBalance - preBalance, 0);
}

export function selectObservedDepositPayment(input: {
  minimumLamports: number;
  transfers: ObservedDepositTransfer[];
}): DepositPaymentObservation {
  const observedLamports = input.transfers.reduce((sum, transfer) => sum + transfer.lamports, 0);

  return {
    paid: observedLamports >= input.minimumLamports,
    observedLamports,
    signature: input.transfers[0]?.signature ?? null,
  };
}

export async function getParsedTransactionsIndividually(
  connection: Pick<Connection, 'getParsedTransaction'>,
  signatures: string[],
) {
  return Promise.all(
    signatures.map((signature) => connection.getParsedTransaction(signature, PARSED_TRANSACTION_OPTIONS)),
  );
}

export async function observeDepositPayment(
  depositAddress: string,
  minimumLamports: number,
): Promise<DepositPaymentObservation> {
  const connection = getSolanaConnection();
  const publicKey = new PublicKey(depositAddress);
  const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 25 }, 'confirmed');
  const confirmedSignatures = signatures
    .filter((entry) => entry.confirmationStatus === 'confirmed' || entry.confirmationStatus === 'finalized')
    .map((entry) => entry.signature);

  if (confirmedSignatures.length === 0) {
    return {
      paid: false,
      observedLamports: 0,
      signature: null,
    };
  }

  const parsedTransactions = await getParsedTransactionsIndividually(connection, confirmedSignatures);
  const transfers = confirmedSignatures
    .map((signature, index) => ({
      signature,
      lamports: getIncomingLamportsForAddress(parsedTransactions[index] || null, depositAddress),
    }))
    .filter((transfer) => transfer.lamports > 0);

  return selectObservedDepositPayment({
    minimumLamports,
    transfers,
  });
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
