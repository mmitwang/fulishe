<template>
  <div class="order-list-page">
    <van-nav-bar title="我的订单" fixed left-arrow @click-left="router.back()" />
    <van-tabs v-model:active="activeTab" sticky offset-top="46" color="#2f5fd0" @change="fetchData">
      <van-tab title="全部" :name="''" />
      <van-tab title="待支付" :name="0" />
      <van-tab title="已支付" :name="1" />
      <van-tab title="已发货" :name="2" />
      <van-tab title="已完成" :name="3" />
    </van-tabs>

    <div class="content">
      <van-loading v-if="loading" class="loading" />
      <template v-else>
        <div class="order-card" v-for="order in orders" :key="order.id">
          <div class="order-head">
            <span class="no">{{ order.orderNo }}</span>
            <span class="status" :class="`s-${order.orderStatus}`">{{ statusText(order.orderStatus) }}</span>
          </div>
          <div class="item" v-for="item in order.items" :key="item.id" @click="router.push(`/product/${item.spuId}`)">
            <img :src="item.image" alt="" class="cover" />
            <div class="info">
              <div class="name">{{ item.spuName }}</div>
              <div class="sku">{{ item.skuName }}</div>
            </div>
            <div class="price-wrap">
              <div class="price">¥{{ item.unitPrice }}</div>
              <div class="qty">x{{ item.quantity }}</div>
            </div>
          </div>
          <div class="order-foot">
            <div class="meta">
              <span>{{ order.source }}</span>
              <span>{{ order.createTime }}</span>
            </div>
            <div class="amount">实付 <span>¥{{ order.payAmount }}</span></div>
          </div>
          <div class="actions">
            <van-button v-if="order.orderStatus === 0" size="small" round type="danger" @click="router.push(`/pay?orderNo=${order.orderNo}&amount=${order.payAmount}`)">去支付</van-button>
            <van-button v-if="order.payStatus === 1" size="small" round plain @click="refund(order)">申请退款</van-button>
            <van-button size="small" round plain @click="viewTrace(order)">溯源查询</van-button>
          </div>
        </div>
        <van-empty v-if="!orders.length" description="暂无订单" />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import request from '@/utils/request'

const router = useRouter()
const activeTab = ref<any>('')
const orders = ref<any[]>([])
const loading = ref(false)

const statusText = (s: number) => ({ 0: '待支付', 1: '已支付', 2: '已发货', 3: '已完成', 4: '已取消' }[s] || '未知')

const fetchData = async () => {
  loading.value = true
  try {
    const params: any = { userId: Number(localStorage.getItem('userId') || 2) }
    if (activeTab.value !== '') params.orderStatus = activeTab.value
    orders.value = await request.get('/order/list', { params })
  } finally {
    loading.value = false
  }
}

const refund = (order: any) => {
  showConfirmDialog({ title: '申请退款', message: `确认对订单 ${order.orderNo} 申请退款吗？` }).then(async () => {
    await request.post('/pay/refund', { payNo: order.payNo, reason: '用户申请退款' })
    showToast('退款已原路退回')
    fetchData()
  })
}

const viewTrace = (order: any) => {
  const code = order.items?.[0]?.spuId
  router.push(`/trace?code=TRC2026${String(30000 + (code || 1))}`)
}

onMounted(fetchData)
</script>

<style lang="scss" scoped>
.order-list-page {
  min-height: 100vh;
  background: #f5f6fa;
}
.content {
  padding: 10px 12px 20px;
}
.loading {
  display: flex;
  justify-content: center;
  margin-top: 40px;
}
.order-card {
  background: #fff;
  border-radius: 12px;
  padding: 12px 14px;
  margin-bottom: 10px;
  .order-head {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #9aa0ad;
    padding-bottom: 10px;
    border-bottom: 1px solid #f5f6fa;
    .status {
      font-weight: 600;
      &.s-0 {
        color: #ff976a;
      }
      &.s-1,
      &.s-2 {
        color: #2f5fd0;
      }
      &.s-3 {
        color: #07c160;
      }
      &.s-4 {
        color: #9aa0ad;
      }
    }
  }
  .item {
    display: flex;
    gap: 10px;
    padding: 10px 0;
    .cover {
      width: 68px;
      height: 68px;
      border-radius: 8px;
      object-fit: cover;
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
        margin-top: 5px;
      }
    }
    .price-wrap {
      text-align: right;
      .price {
        font-size: 13px;
        color: #303133;
      }
      .qty {
        font-size: 11px;
        color: #9aa0ad;
        margin-top: 5px;
      }
    }
  }
  .order-foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 8px;
    border-top: 1px solid #f5f6fa;
    .meta {
      display: flex;
      gap: 10px;
      font-size: 10px;
      color: #b0b3b8;
    }
    .amount {
      font-size: 12px;
      color: #606266;
      span {
        color: #ee0a24;
        font-size: 16px;
        font-weight: 700;
      }
    }
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 10px;
  }
}
</style>
