<template>
  <div class="pay-page">
    <van-nav-bar title="收银台" fixed left-arrow @click-left="router.back()" />
    <div class="content">
      <template v-if="!paid">
        <div class="amount-card">
          <div class="label">支付金额</div>
          <div class="amount"><span>¥</span>{{ amount }}</div>
          <div class="order-no">订单号：{{ orderNo }}</div>
        </div>

        <div class="methods">
          <div class="methods-title">选择支付方式</div>
          <div
            v-for="m in methods"
            :key="m.value"
            class="method-item"
            :class="{ active: payMethod === m.value }"
            @click="payMethod = m.value"
          >
            <van-icon :name="m.icon" :color="m.color" size="24" />
            <span class="name">{{ m.name }}</span>
            <van-icon v-if="payMethod === m.value" name="success" color="#07c160" />
          </div>
        </div>

        <div class="safety">
          <van-icon name="shield-o" />
          交易由福礼链存证，支付记录实时上链，安全可追溯
        </div>

        <div class="pay-btn-wrap">
          <van-button type="danger" block round :loading="loading" @click="pay">确认支付 ¥{{ amount }}</van-button>
        </div>
      </template>

      <div v-else class="success">
        <van-icon name="checked" class="success-icon" />
        <div class="success-title">支付成功</div>
        <div class="success-amount">¥{{ amount }}</div>
        <div class="success-chain">
          <van-icon name="shield-o" />
          本笔交易已上链存证
        </div>
        <div class="success-actions">
          <van-button round block @click="router.push('/order/list')">查看订单</van-button>
          <van-button round block type="primary" @click="router.push('/home')">返回首页</van-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import request from '@/utils/request'

const route = useRoute()
const router = useRouter()
const orderNo = ref(String(route.query.orderNo || ''))
const amount = ref(Number(route.query.amount || 0))
const payMethod = ref(1)
const loading = ref(false)
const paid = ref(false)

const methods = [
  { name: '微信支付', value: 1, icon: 'wechat-pay', color: '#07c160' },
  { name: '支付宝', value: 2, icon: 'alipay', color: '#1677ff' },
  { name: '余额支付', value: 3, icon: 'balance-o', color: '#f5a623' }
]

const pay = async () => {
  loading.value = true
  try {
    const res = await request.post('/pay/create', { orderNo: orderNo.value, payMethod: payMethod.value })
    if (res.payStatus === 2) {
      paid.value = true
      showToast('支付成功')
    }
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (orderNo.value) {
    const detail = await request.get(`/order/detail/${orderNo.value}`)
    amount.value = detail.payAmount
  }
})
</script>

<style lang="scss" scoped>
.pay-page {
  min-height: 100vh;
  background: #f5f6fa;
}
.content {
  padding: 60px 14px 20px;
}
.amount-card {
  text-align: center;
  padding: 26px 0 20px;
  background: #fff;
  border-radius: 14px;
  .label {
    font-size: 13px;
    color: #9aa0ad;
  }
  .amount {
    font-size: 40px;
    font-weight: 800;
    color: #7a0c1e;
    margin: 6px 0;
    span {
      font-size: 20px;
    }
  }
  .order-no {
    font-size: 11px;
    color: #b0b3b8;
  }
}
.methods {
  background: #fff;
  border-radius: 14px;
  margin-top: 12px;
  padding: 4px 16px;
  .methods-title {
    font-size: 13px;
    font-weight: 600;
    color: #7a0c1e;
    padding: 12px 0 4px;
  }
  .method-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 0;
    border-top: 1px solid #f5f6fa;
    .name {
      flex: 1;
      font-size: 13px;
      color: #303133;
    }
    &.active .name {
      color: #c8102e;
      font-weight: 600;
    }
  }
}
.safety {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #9aa0ad;
  padding: 14px 6px;
}
.pay-btn-wrap {
  margin-top: 10px;
}
.success {
  text-align: center;
  padding-top: 60px;
  .success-icon {
    font-size: 64px;
    color: #07c160;
  }
  .success-title {
    font-size: 18px;
    font-weight: 700;
    color: #7a0c1e;
    margin-top: 12px;
  }
  .success-amount {
    font-size: 30px;
    font-weight: 800;
    color: #ee0a24;
    margin-top: 6px;
  }
  .success-chain {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #c8102e;
    background: #fdeef0;
    padding: 6px 12px;
    border-radius: 20px;
    margin-top: 14px;
  }
  .success-actions {
    margin-top: 34px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
}
</style>
