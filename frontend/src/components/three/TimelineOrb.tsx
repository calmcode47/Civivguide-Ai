import { useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { animated, useSpring } from '@react-spring/three';
import * as THREE from 'three';

interface TimelineOrbProps {
  index: number;
  phase: string;
  title: string;
  isActive: boolean;
  onClick: () => void;
  onHover?: () => void;
}

/**
 * TimelineOrb
 * Interactive 3D orb for the right-panel planet chain.
 * Labels render only on hover/active to prevent overlap.
 * On hover the label appears to the LEFT of the orb, pointing toward the cards.
 */
export default function TimelineOrb({ index, phase, title, isActive, onClick, onHover }: TimelineOrbProps) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);

  const { scale, emissiveIntensity } = useSpring({
    scale: isActive ? 1.35 : hovered ? 1.22 : 1,
    emissiveIntensity: isActive ? 1.1 : hovered ? 0.6 : 0.18,
    config: { mass: 1, tension: 320, friction: 50 },
  });

  // Subtle floating animation unique per orb
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    meshRef.current.position.y = Math.sin(t * 0.8 + index * 0.9) * 0.05;
  });

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  const showLabel = isActive || hovered;

  return (
    <group>
      {/* ── Label (left on desktop, top on mobile) ──────────────────────── */}
      {showLabel && (
        <Html
          position={isMobile ? [0, 1.2, 0] : [-1.8, 0, 0]}
          center={isMobile}
          distanceFactor={10}
          zIndexRange={[300, 200]}
          pointerEvents="none"
          style={{ pointerEvents: 'none' }}
        >
          <div
            style={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: isMobile ? '1rem' : '1.4rem',
              color: '#ffffff',
              fontWeight: 800,
              whiteSpace: 'nowrap',
              maxWidth: '260px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              textAlign: isMobile ? 'center' : 'right',
              background: 'rgba(5, 7, 12, 0.98)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              padding: isMobile ? '6px 12px' : '8px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(212, 160, 23, 0.6)',
              boxShadow: '0 12px 32px rgba(0,0,0,0.9)',
              pointerEvents: 'none',
              userSelect: 'none',
              transform: isMobile ? 'translateY(-20px)' : 'translateX(-100%)',
            }}
          >
            <div
              style={{
                color: '#d4a017',
                fontSize: isMobile ? '0.7rem' : '0.9rem',
                marginBottom: '4px',
                fontWeight: 900,
                opacity: 1.0,
                letterSpacing: '0.15em',
              }}
            >
              {phase}
            </div>
            {title}
          </div>
        </Html>
      )}

      {/* ── Orb ────────────────────────────────────────────────────── */}
      <animated.mesh
        ref={meshRef}
        scale={scale as any}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
          if (onHover) onHover();
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[0.5, 48, 48]} />
        <animated.meshStandardMaterial
          color={isActive ? '#d4a017' : '#1a1f3a'}
          emissive="#d4a017"
          emissiveIntensity={emissiveIntensity as any}
          roughness={0.25}
          metalness={0.6}
        />
      </animated.mesh>

      {/* ── Accent ring (equatorial) ────────────────────────────────── */}
      <animated.mesh rotation={[Math.PI / 2, 0, 0]} scale={scale as any}>
        <torusGeometry args={[0.5, 0.016, 16, 100]} />
        <meshBasicMaterial
          color={isActive ? '#d4a017' : '#3a4070'}
          transparent
          opacity={isActive ? 1.0 : 0.35}
        />
      </animated.mesh>

      {/* ── Active glow ring ────────────────────────────────────────── */}
      {isActive && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.65, 0.03, 12, 80]} />
          <meshBasicMaterial color="#d4a017" transparent opacity={0.28} />
        </mesh>
      )}
    </group>
  );
}
