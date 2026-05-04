import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { ThreeErrorBoundary } from './ThreeErrorBoundary';
import { WebGLCheck } from './WebGLCheck';

// =============================================================================
// Globe Component
// =============================================================================

function Globe() {
  const globeRef = useRef<THREE.Group>(null);
  const wireframeRef = useRef<THREE.LineSegments>(null);

  // Keep the decorative scene lighter than the original always-on version.
  const rings = useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      radius: 2.8 + Math.random() * 0.8,
      tube: 0.005,
      rotation: [
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      ] as [number, number, number],
      opacity: 0.1 + Math.random() * 0.2,
      speed: (Math.random() - 0.5) * 0.01,
    }));
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    if (globeRef.current) {
      // Steady rotation
      globeRef.current.rotation.y += 0.003;

      // Breathing scale effect
      const scale = Math.sin(time) * 0.02 + 1;
      globeRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group ref={globeRef}>
      {/* 1. Wireframe Globe */}
      <lineSegments ref={wireframeRef}>
        <wireframeGeometry args={[new THREE.SphereGeometry(2.5, 22, 22)]} />
        <lineBasicMaterial color="#d4a017" transparent opacity={0.25} />
      </lineSegments>

      {/* 2. Inner occlusion sphere (to hide back-facing lines) */}
      <mesh>
        <sphereGeometry args={[2.48, 22, 22]} />
        <meshBasicMaterial color="#0d0f1a" />
      </mesh>

      {/* 3. Orbit Rings */}
      {rings.map((ring) => (
        <mesh key={ring.id} rotation={ring.rotation}>
          <torusGeometry args={[ring.radius, ring.tube, 12, 72]} />
          <meshBasicMaterial color="#d4a017" transparent opacity={ring.opacity} />
        </mesh>
      ))}
    </group>
  );
}

// =============================================================================
// GlobeScene Export
// =============================================================================

export default function GlobeScene() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <WebGLCheck>
        <ThreeErrorBoundary componentName="GlobeScene">
          <Canvas gl={{ antialias: true, alpha: true }} dpr={[1, 1.75]}>
            <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={45} />

            <ambientLight intensity={0.5} />
            <pointLight position={[5, 5, 5]} color="#d4a017" intensity={1.5} />

            <Globe />

            <OrbitControls
              enableZoom={false}
              enablePan={false}
              autoRotate={false}
              dampingFactor={0.05}
            />
          </Canvas>
        </ThreeErrorBoundary>
      </WebGLCheck>
    </div>
  );
}
