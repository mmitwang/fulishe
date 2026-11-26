import Taro from '@tarojs/taro'
import { create } from 'zustand'
import type { CartItem, Product, Sku } from '@/types'

interface CartState {
  items: CartItem[]
  add: (product: Product, sku: Sku, quantity?: number) => void
  remove: (skuId: number) => void
  setQuantity: (skuId: number, quantity: number) => void
  toggle: (skuId: number) => void
  toggleAll: (selected: boolean) => void
  clear: () => void
}

const loadItems = (): CartItem[] => {
  try {
    return Taro.getStorageSync('cartItems') || []
  } catch (error) {
    console.error('[Cart] 本地购物车读取失败', error)
    return []
  }
}

export const useCartStore = create<CartState>((set, get) => ({
  items: loadItems(),
  add: (product, sku, quantity = 1) => {
    const items = [...get().items]
    const index = items.findIndex(item => item.skuId === sku.id)
    if (index >= 0) {
      items[index] = { ...items[index], quantity: Math.min(sku.stock, items[index].quantity + quantity), selected: true }
    } else {
      items.unshift({
        skuId: sku.id,
        spuId: product.id,
        spuName: product.spuName,
        skuName: sku.skuName,
        image: sku.image || product.image,
        price: sku.price,
        quantity: Math.min(quantity, sku.stock),
        stock: sku.stock,
        selected: true
      })
    }
    set({ items })
  },
  remove: skuId => set({ items: get().items.filter(item => item.skuId !== skuId) }),
  setQuantity: (skuId, quantity) => set({
    items: get().items.map(item => item.skuId === skuId ? { ...item, quantity: Math.max(1, Math.min(item.stock, quantity)) } : item)
  }),
  toggle: skuId => set({ items: get().items.map(item => item.skuId === skuId ? { ...item, selected: !item.selected } : item) }),
  toggleAll: selected => set({ items: get().items.map(item => ({ ...item, selected })) }),
  clear: () => set({ items: [] })
}))

useCartStore.subscribe(state => {
  try {
    Taro.setStorageSync('cartItems', state.items)
  } catch (error) {
    console.error('[Cart] 本地购物车保存失败', error)
  }
})

export const selectedCartItems = (items: CartItem[]): CartItem[] => items.filter(item => item.selected)
export const cartAmount = (items: CartItem[]): number => Number(items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2))
