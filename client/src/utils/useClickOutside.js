import { useEffect } from 'react';

/**
 * Fires `handler` when a mousedown occurs outside the given ref element.
 * Only attaches the listener when `enabled` is true.
 */
const useClickOutside = (ref, handler, enabled = true) => {
  useEffect(() => {
    if (!enabled) return;
    const listener = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        handler(e);
      }
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler, enabled]);
};

export default useClickOutside;
