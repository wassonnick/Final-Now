import { useMemo } from 'react';

export function useNetworkState() {
  return useMemo(() => ({ isOnline: true, label: 'Online' }), []);
}
