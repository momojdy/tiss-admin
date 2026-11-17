/** Keeps asynchronous reads within their owning screen/account and applies only the newest response. */
export function createGoodiesRefresh<T>(options: {
  current: () => boolean;
  read: () => Promise<T>;
  commit: (value: T) => void;
  state: (status: 'loading' | 'ready' | 'error') => void;
}) {
  let active = true, generation = 0;
  return {
    async refresh() {
      const request = ++generation;
      const current = () => active && request === generation && options.current();
      if (!current()) return;
      options.state('loading');
      try {
        const value = await options.read();
        if (!current()) return;
        options.commit(value);
        options.state('ready');
      } catch {
        if (current()) options.state('error');
      }
    },
    stop() { active = false; generation++; },
  };
}
