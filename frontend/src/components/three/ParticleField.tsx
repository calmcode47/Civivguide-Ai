import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * ParticleField
 * A visual background layer consisting of two groups of particles:
 * 1. A dense gold field (2000 particles)
 * 2. A sparse teal field (500 particles)
 * Both rotate slowly at different speeds.
 */
export default function ParticleField() {
  const goldRef = useRef<THREE.Points>(null);
  const tealRef = useRef<THREE.Points>(null);

  // ---------------------------------------------------------------------------
  // Data Generation
  // ---------------------------------------------------------------------------
  const goldParticles = useMemo(() => {
    const count = 2000;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, []);

  const tealParticles = useMemo(() => {
    const count = 500;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60; // Slightly wider spread
      positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, []);

  // ---------------------------------------------------------------------------
  // Animation
  // ---------------------------------------------------------------------------
  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    if (goldRef.current) {
      goldRef.current.rotation.y += 0.0002;
      goldRef.current.rotation.x += 0.0001;
      // Add a very subtle oscillation
      goldRef.current.position.y = Math.sin(time * 0.1) * 0.2;
    }

    if (tealRef.current) {
      tealRef.current.rotation.y -= 0.00015;
      tealRef.current.rotation.z += 0.0001;
      tealRef.current.position.y = Math.cos(time * 0.15) * 0.15;
    }
  });

  return (
    <group>
      {/* Primary Gold Field */}
      <points ref={goldRef} geometry={goldParticles}>
        <pointsMaterial
          size={0.05}
          color="#d4a017"
          transparent
          opacity={0.6}
          sizeAttenuation={true}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Secondary Teal Field */}
      <points ref={tealRef} geometry={tealParticles}>
        <pointsMaterial
          size={0.12}
          color="#00c9a7"
          transparent
          opacity={0.3}
          sizeAttenuation={true}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
