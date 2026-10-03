import { create } from 'zustand'

interface PaletteStore {
  open: boolean
  /** text to prefill, e.g. 'theme ' when opened from the footer */
  query: string
  show: (query?: string) => void
  hide: () => void
}

export const usePalette = create<PaletteStore>()((set) => ({
  open: false,
  query: '',
  show: (query = '') => set({ open: true, query }),
  hide: () => set({ open: false }),
}))

/** Open the command palette from anywhere, optionally filtered: openCommandPalette('theme '). */
export const openCommandPalette = (query?: string) => usePalette.getState().show(query)
