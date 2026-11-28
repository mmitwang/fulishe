<template>
  <div class="pay-page">
    <el-card shadow="never" class="pay-card" v-loading="loading">
      <template v-if="!paid">
        <div class="amount-block">
          <div class="label">支付金额</div>
          <div class="amount"><span>¥</span>{{ formatMoney(amount) }}</div>
          <div class="order-no">订单号：{{ orderNo }}</div>
        </div>

        <div class="methods">
          <div class="methods-title">选择支付方式</div>
          <div
            v-for="m in PAY_METHODS"
            :key="m.value"
            class="method-item"
            :class="{ active: payMethod === m.value }"
            @click="payMethod = m.value"
          >
            <span class="name">{{ m.label }}</span>
            <el-icon v-if="payMethod === m.value" color="#07c160"><CircleCheck /></el-icon>
          </div>
        </div>

        <div class="safety">
          <el-icon><Lock /></el-icon>
          交易由福礼链存证，支付记录实时上链，安全可追溯
        </div>

        <el-button type="danger" size="large" class="pay-btn" :loading="paying" @click="pay">
          确认支付 ¥{{ formatMoney(amount) }}
        </el-button>
      </template>

      <div v-else class="success">
        <el-icon class="success-icon"><CircleCheck /></el-icon>
        <div class="success-title">支付成功</div>
        <div class="success-amount">¥{{ formatMoney(amount) }}</div>
        <div class="success-chain"><el-icon><Lock /></el-icon> 本笔交易已上链存证</div>
        <div class="success-actions">
          <el-button round @click="router.push('/order/list')">查看订单</el-button>
          <el-button round type="primary" @click="router.push('/home')">返回首页</el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { CircleCheck, Lock } from '@element-plus/icons-vue'
import { formatMoney } from '@/utils/format'
import { PAY_METHODS } from '@/constants/business'
import { createPay } from '@/api/pay'
import { getOrderDetail } from '@/api/order'

const route = useRoute()
const router = useRouter()
const orderNo = ref(String(route.query.orderNo || ''))
const amount = ref(Number(route.query.amount || 0))
const payMethod = ref(1)
const loading = ref(false)
const paying = ref(false)
const paid = ref(false)

const pay = async () => {
  paying.value = true
  try {
    const res = await createPay({ orderNo: orderNo.value, payMethod: payMethod.value })
    if (res.payStatus === 2) {
      paid.value = true
      ElMessage.success('支付成功')
    }
  } finally {
    paying.value = false
  }
}

onMounted(async () => {
  if (!orderNo.value) {
    ElMessage.warning('缺少订单号')
    router.replace('/order/list')
    return
  }
  loading.value = true
  try {
    const detail = await getOrderDetail(orderNo.value)
    amount.value = detail.payAmount
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
.pay-card {
  max-width: 560px;
  margin: 24px auto;
  border-radius: 14px;
  padding: 12px 24px 28px;
}
.amount-block {
  text-align: center;
  padding: 20px 0;
  .label {
    font-size: 13px;
    color: var(--text-sub);
  }
  .amount {
    font-size: 42px;
    font-weight: 800;
    color: var(--brand-dark);
    margin: 8px 0;
    span {
      font-size: 22px;
    }
  }
  .order-no {
    font-size: 12px;
    color: var(--text-sub);
  }
}
.methods {
  .methods-title {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 10px;
  }
  .method-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border: 1px solid #ebeef5;
    border-radius: 8px;
    margin-bottom: 10px;
    cursor: pointer;
    &.active {
      border-color: var(--brand-primary);
      background: #fdf3f4;
    }
    .name {
      font-size: 14px;
    }
  }
}
.safety {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-sub);
  margin: 14px 0;
}
.pay-btn {
  width: 100%;
}
.success {
  text-align: center;
  padding: 30px 0;
  .success-icon {
    font-size: 64px;
    color: #07c160;
  }
  .success-title {
    font-size: 20px;
    font-weight: 700;
    margin-top: 12px;
  }
  .success-amount {
    font-size: 30px;
    font-weight: 800;
    color: var(--price-red);
    margin-top: 6px;
  }
  .success-chain {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--brand-primary);
    background: #fdeef0;
    padding: 6px 14px;
    border-radius: 20px;
    margin-top: 14px;
  }
  .success-actions {
    margin-top: 28px;
    display: flex;
    justify-content: center;
    gap: 12px;
  }
}
</style>
