import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

interface DeferredThreeMountProps {
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
  style?: CSSProperties;
  rootMargin?: string;
  idleDelayMs?: number;
}

type BrowserWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (callback: IdleRequestCallback) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

export default function DeferredThreeMount({
  children,
  fallback = null,
  className,
  style,
  rootMargin = '200px',
  idleDelayMs = 150,
}: DeferredThreeMountProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isIdle, setIsIdle] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const browserWindow = window as BrowserWindow;
    let cancelled = false;
    let timeoutId: number | null = null;

    if (
      typeof browserWindow.requestIdleCallback === 'function' &&
      typeof browserWindow.cancelIdleCallback === 'function'
    ) {
      const idleId = browserWindow.requestIdleCallback(() => {
        if (!cancelled) {
          setIsIdle(true);
        }
      });

      return () => {
        cancelled = true;
        browserWindow.cancelIdleCallback?.(idleId);
      };
    }

    timeoutId = browserWindow.setTimeout(() => {
      if (!cancelled) {
        setIsIdle(true);
      }
    }, idleDelayMs);

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        browserWindow.clearTimeout(timeoutId);
      }
    };
  }, [idleDelayMs]);

  useEffect(() => {
    if (!isIdle || !containerRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isIdle, rootMargin]);

  return (
    <div ref={containerRef} className={className} style={style}>
      {isIdle && isVisible ? children : fallback}
    </div>
  );
}
