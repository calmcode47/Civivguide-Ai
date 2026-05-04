import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';

import { FloatingRings, ParticleField, ThreeErrorBoundary, WebGLCheck } from '@/components/three';

export default function TimelineHeroBackground3D() {
  return (
    <WebGLCheck>
      <ThreeErrorBoundary componentName="TimelineHeroBackground3D">
        <Canvas>
          <Suspense fallback={null}>
            <FloatingRings />
            <ParticleField />
            <ambientLight intensity={0.4} />
          </Suspense>
        </Canvas>
      </ThreeErrorBoundary>
    </WebGLCheck>
  );
}
