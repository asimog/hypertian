'use client';

import { useSearchParams } from 'next/navigation';
import OverlaySurface from '@/components/OverlaySurface';

export default function YouTubeOverlayPage() {
  const searchParams = useSearchParams();
  return <OverlaySurface platform="youtube" searchParams={new URLSearchParams(searchParams.toString())} />;
}
