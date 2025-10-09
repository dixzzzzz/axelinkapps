import { useCallback, useMemo, useRef, useState } from 'react';

export type ActionPhase = 'idle' | 'requesting' | 'processing' | 'success' | 'error';

export interface ActionFlowOptions {
  minRequestMs?: number;
  minProcessingMs?: number;
  processingLabel?: string;
}

export interface ActionFlowState<T = unknown> {
  phase: ActionPhase;
  processingLabel?: string;
  error?: string | null;
  result?: T;
}

export interface ActionFlow<T = unknown> {
  state: ActionFlowState<T>;
  start: (operation: () => Promise<T>, options?: ActionFlowOptions) => Promise<T>;
  reset: () => void;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useActionFlow<T = unknown>(): ActionFlow<T> {
  const [state, setState] = useState<ActionFlowState<T>>({ phase: 'idle' });
  const isRunningRef = useRef(false);

  const reset = useCallback(() => {
    setState({ phase: 'idle' });
    isRunningRef.current = false;
  }, []);

  const start = useCallback(async (operation: () => Promise<T>, options?: ActionFlowOptions) => {
    if (isRunningRef.current) {
      
      return Promise.reject(new Error('Another action is in progress'));
    }
    isRunningRef.current = true;

    const minRequestMs = options?.minRequestMs ?? 600;
    const minProcessingMs = options?.minProcessingMs ?? 900;

    try {
      setState({ phase: 'requesting' });

      const [result] = await Promise.all([
        operation(),
        delay(minRequestMs)
      ]);

      setState({ phase: 'processing', processingLabel: options?.processingLabel });

      await delay(minProcessingMs);

      setState({ phase: 'success', result });

      isRunningRef.current = false;
      return result;
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Action failed';
      setState({ phase: 'error', error: message });
      isRunningRef.current = false;
      throw err;
    }
  }, []);

  return useMemo(() => ({ state, start, reset }), [state, start, reset]);
}
