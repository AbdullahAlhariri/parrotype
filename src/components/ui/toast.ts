import { create } from 'zustand'

export interface ToastItem {
  id: number
  message: string
  tone: 'info' | 'good' | 'bad'
}

interface ToastStore {
  items: ToastItem[]
  push: (message: string, tone?: ToastItem['tone']) => void
  dismiss: (id: number) => void
}

let next = 1

export const useToasts = create<ToastStore>()((set) => ({
  items: [],
  push: (message, tone = 'info') => {
    const id = next++
    set((s) => ({ items: [...s.items, { id, message, tone }].slice(-3) }))
    // problems stay up longer: they usually ask you to do something
    setTimeout(() => set((s) => ({ items: s.items.filter((t) => t.id !== id) })), tone === 'bad' ? 6500 : 3200)
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}))

/** Fire-and-forget toast from anywhere. */
export const toast = (message: string, tone?: ToastItem['tone']) => useToasts.getState().push(message, tone)
