import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// simple theme store persisted in localStorage
export const useThemeStore = create(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
    }),
    {
      name: 'theme-storage',
      getStorage: () => localStorage,
    }
  )
)