'use client';

import { useEffect } from 'react';
import { usePulseStore } from '@/lib/store';

/**
 * PulseProvider
 * Mounts once at the app root. Kicks off the 5-second polling loop
 * that keeps the entire dashboard up-to-date.
 */
export function PulseProvider({ children }: { children: React.ReactNode }) {
    const startPolling = usePulseStore((s) => s.startPolling);

    useEffect(() => {
        const stopPolling = startPolling();
        return () => stopPolling();
    }, [startPolling]);

    return <>{children}</>;
}
