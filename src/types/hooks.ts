// Custom hook types
export interface UseLocalStorageResult<T> {
  value: T;
  setValue: (value: T) => void;
  removeValue: () => void;
}

export interface UseDebounceResult<T> {
  debouncedValue: T;
  isDebouncing: boolean;
}

export interface UseToggleResult {
  value: boolean;
  toggle: () => void;
  setTrue: () => void;
  setFalse: () => void;
}

export interface UseCounterResult {
  count: number;
  increment: (value?: number) => void;
  decrement: (value?: number) => void;
  reset: () => void;
  set: (value: number) => void;
}

export interface UseAsyncResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: () => Promise<T>;
  reset: () => void;
}

export interface UseFormResult<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isDirty: boolean;
  setValue: <K extends keyof T>(key: K, value: T[K]) => void;
  setError: <K extends keyof T>(key: K, error: string) => void;
  setTouched: <K extends keyof T>(key: K) => void;
  setValues: (values: Partial<T>) => void;
  reset: () => void;
  handleSubmit: (onSubmit: (values: T) => void) => (e: React.FormEvent) => void;
}

export interface UseTableResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  page: number;
  limit: number;
  total: number;
  sort: {
    field: keyof T;
    direction: 'asc' | 'desc';
  } | null;
  filters: Partial<Record<keyof T, any>>;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSort: (field: keyof T, direction: 'asc' | 'desc') => void;
  setFilter: <K extends keyof T>(key: K, value: any) => void;
  clearFilters: () => void;
  refresh: () => Promise<void>;
}

export interface UseModalResult {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export interface UseNotificationResult {
  notifications: Notification[];
  add: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  remove: (id: number) => void;
  clear: () => void;
}

export interface UseWebSocketResult<T = any> {
  data: T | null;
  send: (data: any) => void;
  connect: () => void;
  disconnect: () => void;
  isConnected: boolean;
  error: string | null;
}

export interface UseInfiniteScrollResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  reset: () => void;
}

export interface UseGeolocationResult {
  position: GeolocationPosition | null;
  error: GeolocationPositionError | null;
  loading: boolean;
  requestLocation: () => void;
}

export interface UseMediaQueryResult {
  matches: boolean;
  mediaQuery: string;
}

export interface UseOnlineStatusResult {
  isOnline: boolean;
}

export interface UsePermissionResult {
  status: PermissionState;
  request: () => Promise<PermissionState>;
}

export interface UseClipboardResult {
  value: string;
  copy: (text: string) => Promise<void>;
  isSupported: boolean;
}

export interface UseIdleResult {
  isIdle: boolean;
  timeout: number;
}

export interface UseKeyPressResult {
  keyPressed: string | null;
  isPressed: boolean;
}

export interface UseDragResult<T = any> {
  isDragging: boolean;
  dragData: T | null;
  dragStart: (data: T) => void;
  dragEnd: () => void;
}

export interface UseDropResult<T = any> {
  isDragOver: boolean;
  dropData: T | null;
  drop: (data: T) => void;
}

export interface UseTimerResult {
  time: number;
  isRunning: boolean;
  start: () => void;
  pause: () => void;
  reset: () => void;
}

export interface UseCountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isCompleted: boolean;
  start: () => void;
  pause: () => void;
  reset: () => void;
}

// Hook configuration types
export interface UseLocalStorageOptions<T> {
  serializer?: {
    stringify: (value: T) => string;
    parse: (value: string) => T;
  };
}

export interface UseDebounceOptions {
  delay?: number;
}

export interface UseAsyncOptions<T> {
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
}

export interface UseFormOptions<T> {
  initialValues: T;
  validation?: Partial<Record<keyof T, (value: any) => string | undefined>>;
  onSubmit?: (values: T) => void | Promise<void>;
}

export interface UseTableOptions<T> {
  initialPage?: number;
  initialLimit?: number;
  initialSort?: {
    field: keyof T;
    direction: 'asc' | 'desc';
  };
  initialFilters?: Partial<Record<keyof T, any>>;
  fetchData: (params: {
    page: number;
    limit: number;
    sort: {
      field: keyof T;
      direction: 'asc' | 'desc';
    } | null;
    filters: Partial<Record<keyof T, any>>;
  }) => Promise<{
    data: T[];
    total: number;
  }>;
}

export interface UseWebSocketOptions {
  url: string;
  protocols?: string[];
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface UseInfiniteScrollOptions<T> {
  fetchData: (page: number) => Promise<{
    data: T[];
    hasMore: boolean;
  }>;
  threshold?: number;
}

export interface UseMediaQueryOptions {
  defaultValue?: boolean;
}

export interface UseIdleOptions {
  timeout?: number;
  events?: string[];
}

export interface UseTimerOptions {
  interval?: number;
  direction?: 'forward' | 'backward';
  endTime?: number;
}

export interface UseCountdownOptions {
  targetDate: Date;
  interval?: number;
}

// Notification type
export interface Notification {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  createdAt: Date;
}
