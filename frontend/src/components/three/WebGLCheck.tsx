/**
 * Detects WebGL support before rendering any Three.js canvas.
 * Renders children if WebGL is available; renders null otherwise.
 * Use this to wrap any Canvas component.
 */
import { useState, useEffect, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

export function WebGLCheck({ children, fallback = null }: Props) {
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    setSupported(isWebGLAvailable());
  }, []);

  if (supported === null) return null; // SSR / initial render
  if (!supported) return <>{fallback}</>;
  return <>{children}</>;
}
