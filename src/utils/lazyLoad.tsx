import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

type ComponentModule = {
  default: React.ComponentType<any>;
  [key: string]: any;
};

type ImportFunc = () => Promise<ComponentModule>;

export function lazyLoad(
  importFunc: ImportFunc,
  exportName?: string
) {
  const LazyComponent = lazy(async () => {
    const module = await importFunc();
    return {
      default: exportName ? module[exportName] : module.default || module
    };
  });
  
  return (props: any) => (
    <Suspense fallback={<LoadingSpinner size="lg" className="min-h-[60vh]" />}>
      <LazyComponent {...props} />
    </Suspense>
  );
}
