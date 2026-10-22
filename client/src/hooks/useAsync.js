import { useCallback, useEffect, useState } from 'react';

// Small helper so every page gets the same loading / error / data shape
// without pulling in a data-fetching library.
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });

  const run = useCallback(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    fn()
      .then((data) => !cancelled && setState({ data, error: null, loading: false }))
      .catch((error) => !cancelled && setState({ data: null, error, loading: false }));

    return () => {
      cancelled = true;
    };
    // Callers pass their own dependency list for this closure.
  }, deps);

  useEffect(run, [run]);

  return { ...state, reload: run };
}
