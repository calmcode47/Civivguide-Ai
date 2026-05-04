import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import ParticleField from './ParticleField';
import FloatingRings from './FloatingRings';
import { ThreeErrorBoundary } from './ThreeErrorBoundary';
import { WebGLCheck } from './WebGLCheck';

/**
 * HeroCanvas
 * The root 3D background component used on the LandingPage.
 * Combines particles and floating rings in a fixed, full-screen overlay.
 */
export default function HeroCanvas() {
  return (
    <div
      id="hero-background-canvas"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        background: 'var(--color-void)', // Fallback if WebGL fails
      }}
    >
      <WebGLCheck>
        <ThreeErrorBoundary componentName="HeroCanvas">
          <Canvas
            shadows={false}
            dpr={[1, 1.75]} // Performance optimization for high-density displays
            gl={{ antialias: true, alpha: true }}
          >
            <Suspense fallback={null}>
              {/* Global Fog for depth */}
              <fog attach="fog" args={['#07080d', 15, 40]} />

              <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={60} />

              {/* Core Scene Components */}
              <ParticleField />
              <FloatingRings />

              {/* Basic Lighting for the rings */}
              <ambientLight intensity={0.4} />
              <pointLight position={[10, 10, 10]} intensity={1} color="#d4a017" />
            </Suspense>
          </Canvas>
        </ThreeErrorBoundary>
      </WebGLCheck>
    </div>
  );
}
