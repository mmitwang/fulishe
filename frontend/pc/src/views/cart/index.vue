<template>
  <div class="cart-page">
    <div class="page-title">购物车</div>

    <el-card shadow="never" class="cart-card" v-loading="loading">
      <template v-if="items.length">
        <el-table :data="items" class="cart-table">
          <el-table-column width="50" align="center">
            <template #header>
              <el-checkbox :model-value="allChecked" @change="toggleAll" />
            </template>
            <template #default="{ row }">
              <el-checkbox v-model="row.selected" @change="toggle(row)" />
            </template>
          </el-table-column>
          <el-table-column label="商品" min-width="320">
            <template #default="{ row }">
              <div class="p-info">
                <el-image :src="row.image" fit="cover" class="p-img" @click="goDetail(row.spuId)">
                  <template #error><div class="p-fallback">福礼社</div></template>
                </el-image>
                <div>
                  <div class="p-name" @click="goDetail(row.spuId)">{{ row.spuName }}</div>
                  <div class="p-sku">{{ row.skuName }}</div>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="单价" width="120" align="center">
            <template #default="{ row }"><PriceText :value="row.price" :size="15" /></template>
          </el-table-column>
          <el-table-column label="数量" width="160" align="center">
            <template #default="{ row }">
              <el-input-number v-model="row.quantity" :min="1" :max="99" size="small" @change="updateItem(row)" />
            </template>
          </el-table-column>
          <el-table-column label="小计" width="120" align="center">
            <template #default="{ row }"><PriceText :value="row.price * row.quantity" :size="15" /></template>
          </el-table-column>
          <el-table-column label="操作" width="90" align="center">
            <template #default="{ row }">
              <el-button link type="danger" @click="remove(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="summary-bar">
          <el-checkbox :model-value="allChecked" @change="toggleAll">全选</el-checkbox>
          <span class="selected-count">已选 {{ selectedItems.length }} 件</span>
          <div class="total">
            合计：<PriceText :value="selectedAmount" :size="22" />
          </div>
          <el-button type="danger" size="large" round :disabled="!selectedItems.length" @click="checkout">
            去结算
          </el-button>
        </div>
      </template>

      <el-empty v-else description="购物车还是空的">
        <el-button type="primary" round @click="router.push('/home')">去逛逛</el-button>
      </el-empty>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import PriceText from '@/components/PriceText.vue'
import { getCart, updateCart, removeCart } from '@/api/cart'
import { useUserStore } from '@/store/user'
import { useCartStore } from '@/store/cart'
import type { CartItem, CheckoutItem } from '@/api/types'

const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()
const items = ref<CartItem[]>([])
const loading = ref(false)

const selectedItems = computed(() => items.value.filter(i => i.selected))
const selectedAmount = computed(() => selectedItems.value.reduce((s, i) => s + i.price * i.quantity, 0))
const allChecked = computed(() => items.value.length > 0 && items.value.every(i => i.selected))

const fetchData = async () => {
  loading.value = true
  try {
    items.value = await getCart(userStore.effectiveUserId)
  } finally {
    loading.value = false
  }
}

const toggle = async (item: any) => {
  await updateCart({ id: item.id, selected: item.selected })
}

const toggleAll = async (val: boolean | string | number) => {
  const checked = !!val
  items.value.forEach(i => { i.selected = checked })
  await Promise.all(items.value.map(i => updateCart({ id: i.id, selected: checked })))
}

const updateItem = async (item: any) => {
  await updateCart({ id: item.id, quantity: item.quantity })
  cartStore.refreshCount()
}

const remove = async (item: any) => {
  await ElMessageBox.confirm(`确认删除「${item.spuName}」吗？`, '提示', { type: 'warning' })
  await removeCart(item.id)
  ElMessage.success('已删除')
  fetchData()
  cartStore.refreshCount()
}

const checkout = () => {
  if (!selectedItems.value.length) return ElMessage.warning('请选择商品')
  // 必须带 spuId，供下单分销归因使用
  const payload: CheckoutItem[] = selectedItems.value.map(i => ({
    skuId: i.skuId,
    spuId: i.spuId,
    quantity: i.quantity,
    image: i.image,
    name: i.spuName,
    skuName: i.skuName,
    price: i.price
  }))
  sessionStorage.setItem('checkoutItems', JSON.stringify(payload))
  router.push('/order/confirm')
}

const goDetail = (id: number) => router.push(`/product/${id}`)

onMounted(fetchData)
</script>

<style lang="scss" scoped>
.page-title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 16px;
}
.cart-card {
  border-radius: 12px;
}
.p-info {
  display: flex;
  align-items: center;
  gap: 12px;
  .p-img {
    width: 72px;
    height: 72px;
    border-radius: 8px;
    flex-shrink: 0;
    cursor: pointer;
    background: #f5f6fa;
  }
  .p-fallback {
    width: 72px;
    height: 72px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #c0c4cc;
    font-size: 12px;
  }
  .p-name {
    font-size: 14px;
    color: var(--text-main);
    cursor: pointer;
    &:hover {
      color: var(--brand-primary);
    }
  }
  .p-sku {
    font-size: 12px;
    color: var(--text-sub);
    margin-top: 4px;
  }
}
.summary-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f1f5;
  .selected-count {
    font-size: 13px;
    color: var(--text-sub);
  }
  .total {
    margin-left: auto;
    display: flex;
    align-items: baseline;
    gap: 4px;
    font-size: 14px;
  }
}
</style>
