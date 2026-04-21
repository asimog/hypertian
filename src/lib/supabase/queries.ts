import 'server-only';
import { generateSolanaDepositAccount } from '@/lib/solana';
import { createAdminClient } from '@/lib/supabase/admin';
import { AdRecord, AppUser, PaymentRecord, StreamRecord, UserRole } from '@/lib/types';

export async function upsertUser(input: {
  privyId: string;
  walletAddress: string | null;
  role: UserRole;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('users')
    .upsert(
      {
        privy_id: input.privyId,
        wallet_address: input.walletAddress,
        role: input.role,
      },
      { onConflict: 'privy_id' },
    )
    .select()
    .single<AppUser>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getUserByPrivyId(privyId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('users').select('*').eq('privy_id', privyId).maybeSingle<AppUser>();
  if (error) {
    throw error;
  }
  return data;
}

export async function listUserStreams(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('streams')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .returns<StreamRecord[]>();
  if (error) {
    throw error;
  }
  return data;
}

export async function createStream(input: {
  userId: string;
  platform: string;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('streams')
    .insert({
      user_id: input.userId,
      platform: input.platform,
    })
    .select()
    .single<StreamRecord>();
  if (error) {
    throw error;
  }
  return data;
}

export async function listActiveAdsForStream(streamId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('ads')
    .select('*')
    .eq('stream_id', streamId)
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .returns<AdRecord[]>();
  if (error) {
    throw error;
  }
  return data;
}

export async function listAdsForSponsor(walletAddress: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('ads')
    .select('*')
    .eq('sponsor_wallet', walletAddress)
    .order('created_at', { ascending: false })
    .returns<AdRecord[]>();
  if (error) {
    throw error;
  }
  return data;
}

export async function createAdWithPayment(input: {
  streamId: string;
  tokenAddress: string;
  chain: string;
  position: string;
  size: string;
  expiresAt: string;
  amount: number;
  currency: string;
}) {
  const supabase = createAdminClient();
  const depositAccount = generateSolanaDepositAccount();
  const { data: ad, error: adError } = await supabase
    .from('ads')
    .insert({
      stream_id: input.streamId,
      token_address: input.tokenAddress,
      chain: input.chain,
      position: input.position,
      size: input.size,
      is_active: false,
      expires_at: input.expiresAt,
    })
    .select()
    .single<AdRecord>();
  if (adError) {
    throw adError;
  }

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      ad_id: ad.id,
      amount: input.amount,
      currency: input.currency,
      deposit_address: depositAccount.address,
      deposit_secret: depositAccount.secret,
      status: 'pending',
    })
    .select()
    .single<PaymentRecord>();

  if (paymentError) {
    throw paymentError;
  }

  return { ad, payment };
}

export async function getPaymentWithAd(paymentId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('payments')
    .select('*, ads(*)')
    .eq('id', paymentId)
    .single();
  if (error) {
    throw error;
  }
  return data;
}

export async function getPayment(paymentId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('payments').select('*').eq('id', paymentId).single<PaymentRecord>();
  if (error) {
    throw error;
  }
  return data;
}

export async function verifyPayment(input: { paymentId: string; txHash: string }) {
  const supabase = createAdminClient();
  const verifiedAt = new Date().toISOString();
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .update({
      tx_hash: input.txHash,
      status: 'verified',
      verified_at: verifiedAt,
    })
    .eq('id', input.paymentId)
    .select()
    .single<PaymentRecord>();
  if (paymentError) {
    throw paymentError;
  }

  const { error: adError } = await supabase
    .from('ads')
    .update({ is_active: true })
    .eq('id', payment.ad_id);
  if (adError) {
    throw adError;
  }

  return payment;
}
