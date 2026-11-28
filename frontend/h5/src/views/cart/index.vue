<template>
  <div class="cart-page">
    <van-nav-bar title="购物车" fixed>
      <template #right>
        <span class="edit" @click="editing = !editing">{{ editing ? '完成' : '管理' }}</span>
      </template>
    </van-nav-bar>

    <div class="content">
      <template v-if="items.length">
        <div class="tip">
          <van-icon name="info-o" />
          已选 {{ selectedItems.length }} 件，合计 ¥{{ selectedAmount }}
        </div>
        <van-swipe-cell v-for="item in items" :key="item.id">
          <div class="cart-item">
            <van-checkbox v-model="item.selected" class="check" @change="toggle(item)" />
            <img :src="item.image" alt="" class="cover" @click="router.push(`/product/${item.spuId}`)" />
            <div class="info">
              <div class="name">{{ item.spuName }}</div>
              <div class="sku">{{ item.skuName }}</div>
              <div class="bottom">
                <div class="price">¥{{ item.price }}</div>
                <van-stepper v-model="item.quantity" :min="1" :max="99" @change="updateItem(item)" />
              </div>
            </div>
          </div>
          <template #right>
            <van-button square type="danger" text="删除" class="delete-btn" @click="remove(item)" />
          </template>
        </van-swipe-cell>
      </template>
      <van-empty v-else description="购物车还是空的">
        <van-button round type="primary" size="small" @click="router.push('/home')">去逛逛</van-button>
      </van-empty>
    </div>

    <div class="submit-bar" v-if="items.length">
      <van-checkbox v-model="allChecked" @change="toggleAll">全选</van-checkbox>
      <div class="total">
        <span>合计：</span>
        <span class="amount">¥{{ selectedAmount }}</span>
      </div>
      <van-button type="danger" round :disabled="!selectedItems.length" @click="checkout">去结算</van-button>
    </div>

    <TabBar />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import TabBar from '@/components/TabBar.vue'
import request from '@/utils/request'

const router = useRouter()
const items = ref<any[]>([])
const editing = ref(false)
const userId = () => Number(localStorage.getItem('userId') || 2)

const selectedItems = computed(() => items.value.filter(i => i.selected))
const selectedAmount = computed(() => selectedItems.value.reduce((s, i) => s + i.price * i.quantity, 0))
const allChecked = computed({
  get: () => items.value.length > 0 && items.value.every(i => i.selected),
  set: (v: boolean) => {
    items.value.forEach(i => { i.selected = v })
  }
})

const fetchData = async () => {
  items.value = await request.get('/cart', { params: { userId: userId() } })
}

const toggle = async (item: any) => {
  await request.put('/cart/update', { id: item.id, selected: item.selected })
}

const updateItem = async (item: any) => {
  await request.put('/cart/update', { id: item.id, quantity: item.quantity })
}

const toggleAll = async () => {
  await Promise.all(items.value.map(i => request.put('/cart/update', { id: i.id, selected: i.selected })))
  showToast(allChecked.value ? '已全选' : '已取消全选')
}

const remove = async (item: any) => {
  await request.delete(`/cart/${item.id}`)
  showToast('已删除')
  fetchData()
}

const checkout = () => {
  if (!selectedItems.value.length) return showToast('请选择商品')
  sessionStorage.setItem('checkoutItems', JSON.stringify(selectedItems.value.map(i => ({
    skuId: i.skuId,
    quantity: i.quantity,
    image: i.image,
    name: i.spuName,
    skuName: i.skuName,
    price: i.price
  }))))
  router.push('/order/confirm')
}

onMounted(fetchData)
</script>

<style lang="scss" scoped>
.cart-page {
  min-height: 100vh;
  padding-bottom: 118px;
  background: #f5f6fa;
}
.content {
  padding-top: 46px;
}
.edit {
  font-size: 13px;
  color: #c8102e;
}
.tip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #9aa0ad;
  padding: 10px 14px;
  background: #fff;
}
.cart-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: #fff;
  border-bottom: 1px solid #f5f6fa;
  .check {
    flex-shrink: 0;
  }
  .cover {
    width: 84px;
    height: 84px;
    border-radius: 10px;
    object-fit: cover;
    flex-shrink: 0;
  }
  .info {
    flex: 1;
    min-width: 0;
    .name {
      font-size: 13px;
      color: #303133;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .sku {
      font-size: 11px;
      color: #9aa0ad;
      margin-top: 4px;
    }
    .bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 10px;
      .price {
        color: #ee0a24;
        font-weight: 700;
        font-size: 16px;
      }
    }
  }
}
.delete-btn {
  height: 100%;
}
.submit-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 50px;
  height: 58px;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 14px;
  box-shadow: 0 -2px 10px rgba(122, 12, 30, 0.06);
  .total {
    flex: 1;
    text-align: right;
    font-size: 12px;
    color: #606266;
    .amount {
      color: #ee0a24;
      font-size: 18px;
      font-weight: 700;
    }
  }
}
</style>
