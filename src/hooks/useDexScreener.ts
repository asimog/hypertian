'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface DexPairSnapshot {
  priceUsd?: number;
  volume?: { h24?: number };
  liquidity?: { usd?: number };
  priceChange?: { h24?: number };
  fdv?: number;
  marketCap?: number;
  pairAddress?: string;
  baseToken?: {
    name?: string;
    symbol?: string;
    address?: string;
  };
  quoteToken?: {
    name?: string;
    symbol?: string;
    address?: string;
  };
}

export interface DexScreenerState {
  data: DexPairSnapshot | null;
  history: Array<{ time: number; value: number }>;
  loading: boolean;
  error: string | null;
}

export function useDexScreener(tokenAddress: string, chain = 'solana') {
  const [state, setState] = useState<DexScreenerState>({
    data: null,
    history: [],
    loading: true,
    error: null,
  });
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const appendPoint = useCallback((price: number) => {
    setState((current) => ({
      ...current,
      history: [
        ...current.history.slice(-119),
        {
          time: Math.floor(Date.now() / 1000),
          value: price,
        },
      ],
    }));
  }, []);

  const fetchInitial = useCallback(async () => {
    if (!tokenAddress) {
      setState((current) => ({ ...current, loading: false, error: 'Missing token address.' }));
      return;
    }

    try {
      setState((current) => ({ ...current, loading: true, error: null }));
      const response = await fetch(`/api/dex/pair?chain=${encodeURIComponent(chain)}&token=${encodeURIComponent(tokenAddress)}`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error('Pair lookup failed.');
      }
      const json = (await response.json()) as { pair?: DexPairSnapshot };
      const pair = json.pair ?? null;

      setState((current) => ({
        ...current,
        data: pair,
        loading: false,
        error: null,
      }));

      if (pair?.priceUsd) {
        appendPoint(Number(pair.priceUsd));
      }
    } catch {
      setState((current) => ({
        ...current,
        loading: false,
        error: 'Failed to fetch token data.',
      }));
    }
  }, [appendPoint, chain, tokenAddress]);

  useEffect(() => {
    let active = true;

    const connect = () => {
      if (!active || !tokenAddress) {
        return;
      }

      try {
        const ws = new WebSocket('wss://api.dexscreener.com/token-profiles/latest/v1');
        wsRef.current = ws;

        ws.onmessage = (event) => {
          try {
            const update = JSON.parse(event.data) as {
              token?: { address?: string };
              priceUsd?: number;
              volume?: { h24?: number };
              liquidity?: { usd?: number };
              priceChange?: { h24?: number };
            };

            if (update?.token?.address?.toLowerCase() !== tokenAddress.toLowerCase()) {
              return;
            }

            setState((current) => ({
              ...current,
              data: {
                ...current.data,
                ...update,
              },
              error: null,
            }));

            if (update.priceUsd) {
              appendPoint(Number(update.priceUsd));
            }
          } catch {
            // Ignore malformed frames and keep the connection alive.
          }
        };

        ws.onerror = () => {
          if (active) {
            setState((current) => ({ ...current, error: 'DexScreener WebSocket error.' }));
          }
        };

        ws.onclose = () => {
          if (!active) {
            return;
          }
          reconnectTimerRef.current = setTimeout(connect, 3000);
        };
      } catch {
        reconnectTimerRef.current = setTimeout(connect, 3000);
      }
    };

    void fetchInitial();
    connect();

    return () => {
      active = false;
      wsRef.current?.close();
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [appendPoint, fetchInitial, tokenAddress]);

  return useMemo(() => state, [state]);
}
