import { lazy, Suspense, ReactNode } from 'react';

interface Props {
  loader: () => Promise<{ default: React.ComponentType<any> }>;
  props?: Record<string, any>;
  fallback?: ReactNode;
}

/**
 * LazyThreeScene
 * A wrapper that uses React.lazy to load Three.js components only when needed.
 */
export function LazyThreeScene({ loader, props = {}, fallback }: Props) {
  const Component = lazy(loader);

  return (
    <Suspense fallback={fallback ?? <div className="w-full h-full bg-void/50 animate-pulse" />}>
      <Component {...props} />
    </Suspense>
  );
}
