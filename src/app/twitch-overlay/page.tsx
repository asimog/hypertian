'use client';

import { useSearchParams } from 'next/navigation';
import OverlaySurface from '@/components/OverlaySurface';

export default function TwitchOverlayPage() {
  const searchParams = useSearchParams();
  return <OverlaySurface platform="twitch" searchParams={new URLSearchParams(searchParams.toString())} />;
}
