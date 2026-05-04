import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Line } from '@react-three/drei';

import { TimelineOrb, ThreeErrorBoundary, WebGLCheck } from '@/components/three';

import type { ElectionPhase, ElectionStep } from '@/types';

function getOrbPosition(index: number, total: number, isMobile: boolean): [number, number, number] {
  const spread = Math.max(total - 1, 1);
  if (isMobile) {
    const x = (index - spread / 2) * 1.8;
    const y = Math.sin(index * 1.2) * 0.3;
    const z = Math.cos(index * 1.2) * 0.2;
    return [x, y, z];
  }

  const x = Math.sin(index * 0.8) * 1.2;
  const y = (spread / 2 - index) * 1.4;
  const z = Math.cos(index * 0.8) * 0.4;
  return [x, y, z];
}

interface TimelineOrbPanel3DProps {
  steps: ElectionStep[];
  phases: ElectionPhase[];
  activeStepId: string | null;
  onOrbClick: (id: string) => void;
  onOrbHover?: (id: string) => void;
}

export default function TimelineOrbPanel3D({
  steps,
  phases,
  activeStepId,
  onOrbClick,
  onOrbHover,
}: TimelineOrbPanel3DProps) {
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 1024 : false;
  const spread = Math.max(steps.length - 1, 1) * (isMobile ? 1.8 : 1.4);
  const fov = isMobile ? 45 : 54;

  const { camPos, lineWidth } = useMemo(() => {
    const camDist = spread / 2 / Math.tan((fov * Math.PI) / 360) + (isMobile ? 2.5 : 3.0);
    const camZ = isMobile ? camDist : Math.max(7, Math.min(camDist, 20));
    return {
      camPos: (isMobile ? [0, 0, camZ] : [0.4, 0, camZ]) as [number, number, number],
      lineWidth: isMobile ? 12 : 8,
    };
  }, [fov, isMobile, spread]);

  return (
    <div className={`relative flex h-full w-full ${isMobile ? 'flex-row' : 'flex-col'}`} aria-hidden="true">
      {!isMobile ? (
        <div className="flex flex-col gap-2 border-b border-border/30 px-6 pt-4 pb-3">
          {phases.map((phase) => (
            <div key={phase.id} className="flex items-center gap-2.5">
              <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: phase.color }} />
              <span
                className="text-[11px] font-medium uppercase tracking-wide"
                style={{ color: phase.color, opacity: 0.9 }}
              >
                {phase.name}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="relative flex-1" style={{ minHeight: 0 }}>
        <WebGLCheck>
          <ThreeErrorBoundary componentName="TimelineOrbPanel3D">
            <Canvas
              camera={{ position: camPos, fov }}
              style={{ background: 'transparent', touchAction: 'none' }}
              gl={{ antialias: true }}
              dpr={[1, 1.75]}
            >
              <Suspense fallback={null}>
                <ambientLight intensity={0.65} />
                <pointLight position={[3, 5, 5]} intensity={1.2} color="#d4a017" />
                <pointLight position={[-3, -3, 4]} intensity={0.45} color="#7b8db0" />

                {steps.length > 1 ? (
                  <Line
                    points={steps.map((_, index) => getOrbPosition(index, steps.length, isMobile))}
                    color="#d4a017"
                    lineWidth={lineWidth}
                    transparent
                    opacity={0.68}
                  />
                ) : null}

                {steps.map((step, index) => (
                  <group key={step.id} position={getOrbPosition(index, steps.length, isMobile)}>
                    <TimelineOrb
                      index={index}
                      phase={step.phase}
                      title={step.title}
                      isActive={activeStepId === step.id}
                      onClick={() => onOrbClick(step.id)}
                      onHover={() => {
                        if (!isMobile && onOrbHover) {
                          onOrbHover(step.id);
                        }
                      }}
                    />
                  </group>
                ))}
              </Suspense>
            </Canvas>
          </ThreeErrorBoundary>
        </WebGLCheck>

        <div
          className="pointer-events-none absolute bottom-2 left-0 right-0 flex flex-col items-center gap-0.5"
          style={{ zIndex: 5 }}
        >
          <span className="text-[11px] font-bold uppercase tracking-widest text-gold">
            {steps.length} steps
          </span>
          <span className="text-[9px] uppercase tracking-wider text-text-secondary/60">
            tap orb to navigate
          </span>
        </div>
      </div>
    </div>
  );
}
