'use client';

import { useSearchParams } from 'next/navigation';
import OverlaySurface from '@/components/OverlaySurface';

export default function PumpOverlayPage() {
  const searchParams = useSearchParams();
  return <OverlaySurface platform="pump" searchParams={new URLSearchParams(searchParams.toString())} />;
}
