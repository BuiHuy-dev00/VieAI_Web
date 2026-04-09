// TypeScript
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useMemo } from 'react';

type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export default function useBreakpoints() {
    const theme = useTheme();

    // one `useMediaQuery` per MUI breakpoint range
    const xs = useMediaQuery(theme.breakpoints.only('xs'));
    const sm = useMediaQuery(theme.breakpoints.only('sm'));
    const md = useMediaQuery(theme.breakpoints.only('md'));
    const lg = useMediaQuery(theme.breakpoints.only('lg'));
    const xl = useMediaQuery(theme.breakpoints.only('xl'));

    // determine current breakpoint (xl -> lg -> md -> sm -> xs)
    const current = useMemo<Breakpoint>(() => {
        if (xl) return 'xl';
        if (lg) return 'lg';
        if (md) return 'md';
        if (sm) return 'sm';
        return 'xs';
    }, [xs, sm, md, lg, xl]);

    const order: Record<Breakpoint, number> = { xs: 0, sm: 1, md: 2, lg: 3, xl: 4 };

    // helpers that compare the current breakpoint
    const atLeast = (bp: Breakpoint) => order[current] >= order[bp];
    const atMost = (bp: Breakpoint) => order[current] <= order[bp];
    const between = (min: Breakpoint, max: Breakpoint) => order[current] >= order[min] && order[current] <= order[max];

    return { xs, sm, md, lg, xl, current, atLeast, atMost, between };
}
