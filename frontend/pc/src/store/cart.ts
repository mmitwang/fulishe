import { defineStore } from 'pinia'
import request from '@/utils/request'
import { useUserStore } from './user'

export const useCartStore = defineStore('cart', {
  state: () => ({
    count: 0
  }),
  actions: {
    async refreshCount() {
      try {
        const userStore = useUserStore()
        const list = await request.get('/cart', { params: { userId: userStore.effectiveUserId } })
        this.count = (list || []).reduce((s: number, c: any) => s + (c.quantity || 0), 0)
      } catch {
        this.count = 0
      }
    },
    clearLocalState() {
      this.count = 0
    }
  }
})
