'use client';

import { AreaSeries, createChart, IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import { useEffect, useMemo, useRef } from 'react';
import { useDexScreener } from '@/hooks/useDexScreener';

interface DexChartProps {
  tokenAddress: string;
  chain?: string;
  width?: number;
  height?: number;
  theme?: 'dark' | 'light';
}

export default function DexChart({
  tokenAddress,
  chain = 'solana',
  width = 420,
  height = 240,
  theme = 'dark',
}: DexChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const { history } = useDexScreener(tokenAddress, chain);

  const colors = useMemo(
    () =>
      theme === 'dark'
        ? {
            background: '#09090b',
            text: '#d4d4d8',
            grid: '#18181b',
          }
        : {
            background: '#ffffff',
            text: '#334155',
            grid: '#e2e8f0',
          },
    [theme],
  );

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const chart = createChart(containerRef.current, {
      width,
      height,
      layout: {
        background: { color: colors.background },
        textColor: colors.text,
      },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 0,
      },
      rightPriceScale: {
        borderVisible: false,
      },
      leftPriceScale: {
        visible: false,
      },
    });

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: '#22d3ee',
      topColor: 'rgba(34, 211, 238, 0.35)',
      bottomColor: 'rgba(34, 211, 238, 0)',
      lineWidth: 2,
    });

    chartRef.current = chart;
    seriesRef.current = areaSeries;

    return () => chart.remove();
  }, [colors.background, colors.grid, colors.text, height, width]);

  useEffect(() => {
    if (!seriesRef.current || history.length === 0) {
      return;
    }

    seriesRef.current.setData(
      history.map((point) => ({
        time: point.time as Time,
        value: point.value,
      })),
    );
  }, [history]);

  return <div ref={containerRef} className="overflow-hidden rounded-xl" />;
}
