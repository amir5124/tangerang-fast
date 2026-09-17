// hooks/useRefreshOnForeground.ts
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

/**
 * Panggil `onRefresh` setiap kali app kembali ke foreground
 * (mirip efek pull-to-refresh, tapi triggernya otomatis).
 *
 * @param onRefresh  fungsi fetch data yang sama dengan yang dipakai RefreshControl
 * @param minBackgroundMs  minimal durasi di background sebelum refresh dianggap perlu (default 0 = selalu refresh)
 */
export function useRefreshOnForeground(
    onRefresh: () => void,
    minBackgroundMs: number = 0
) {
    const appState = useRef<AppStateStatus>(AppState.currentState);
    const backgroundedAt = useRef<number | null>(null);
    const onRefreshRef = useRef(onRefresh);
    onRefreshRef.current = onRefresh; // selalu pakai versi terbaru tanpa perlu re-subscribe

    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextState => {
            console.log('[Foreground] appState.current:', appState.current, '-> nextState:', nextState);

            const isComingToForeground =
                appState.current.match(/inactive|background/) && nextState === 'active';

            if (isComingToForeground) {
                console.log('[Foreground] Triggering onRefresh...');
                const elapsed = backgroundedAt.current
                    ? Date.now() - backgroundedAt.current
                    : Infinity;

                if (elapsed >= minBackgroundMs) {
                    onRefreshRef.current();
                }
            }

            if (nextState === 'background' || nextState === 'inactive') {
                backgroundedAt.current = Date.now();
            }

            appState.current = nextState;
        });

        return () => subscription.remove();
    }, [minBackgroundMs]);
}