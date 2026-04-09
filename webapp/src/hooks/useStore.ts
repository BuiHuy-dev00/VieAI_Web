import {persist} from 'zustand/middleware';
import {create} from "zustand/react";

type User = {
    id: string;
    name: string;
    email?: string;
};

type Theme = 'light' | 'dark';

/** Gói VieGPT đang chọn (Go / Plus / Pro) — hiển thị ở sidebar, đồng bộ khi mở thanh toán */
export type VieGptPlanId = 'go' | 'plus' | 'pro';

interface AppState {
    authenticated: boolean;
    user: User | null;
    refreshToken?: string | null;
    /** Gói hiển thị dạng CHATGPT VIEAI - GO; mặc định go */
    vieGptPlan: VieGptPlanId;
    settings: {
        theme: Theme;
    };
    setAuthenticated: (auth: boolean) => void;
    setUser: (user: any | null) => void;
    setVieGptPlan: (plan: VieGptPlanId) => void;
    updateSettings: (patch: Partial<AppState['settings']>) => void;
    reset: () => void;
}

const DEFAULT_STATE: Pick<AppState, 'user' | 'settings' | 'authenticated' | 'refreshToken' | 'vieGptPlan'> = {
    authenticated: false,
    user: null,
    vieGptPlan: 'go',
    settings: {theme: 'light'},
};

export const useStore = create<AppState>()(
    persist(
        (set) => ({
            ...DEFAULT_STATE,
            setAuthenticated: (authenticated) => set(() => ({authenticated})),
            setUser: (user) => set(() => ({user})),
            setVieGptPlan: (vieGptPlan) => set(() => ({vieGptPlan})),
            updateSettings: (patch) =>
                set((state) => ({settings: {...state.settings, ...patch}})),
            reset: () => set(() => ({...DEFAULT_STATE})),
        }),
        {
            name: 'app-store', // localStorage key
            partialize: (state) => ({
                user: state.user,
                settings: state.settings,
                vieGptPlan: state.vieGptPlan,
            }),
        }
    )
);
