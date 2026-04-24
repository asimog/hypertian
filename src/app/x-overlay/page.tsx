'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import OverlaySurface from '@/components/OverlaySurface';

export default function XOverlayPage() {
  return (
    <Suspense fallback={null}>
      <XOverlayContent />
    </Suspense>
  );
}

function XOverlayContent() {
  const searchParams = useSearchParams();
  return <OverlaySurface platform="x" searchParams={new URLSearchParams(searchParams.toString())} />;
}
