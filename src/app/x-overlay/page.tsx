'use client';

import { useSearchParams } from 'next/navigation';
import OverlaySurface from '@/components/OverlaySurface';

export default function XOverlayPage() {
  const searchParams = useSearchParams();
  return <OverlaySurface platform="x" searchParams={new URLSearchParams(searchParams.toString())} />;
}
