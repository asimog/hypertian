'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import OverlaySurface from '@/components/OverlaySurface';

export default function PumpOverlayPage() {
  return (
    <Suspense fallback={null}>
      <PumpOverlayContent />
    </Suspense>
  );
}

function PumpOverlayContent() {
  const searchParams = useSearchParams();
  return <OverlaySurface platform="pump" searchParams={new URLSearchParams(searchParams.toString())} />;
}
