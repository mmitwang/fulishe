<template>
  <div class="coupon-page">
    <div class="page-title">我的卡券</div>

    <el-tabs v-model="tab" class="tabs">
      <el-tab-pane label="未使用" :name="0" />
      <el-tab-pane label="已使用" :name="1" />
      <el-tab-pane label="已过期" :name="2" />
    </el-tabs>

    <div v-loading="loading">
      <div class="coupon-grid" v-if="filtered.length">
        <div class="coupon" v-for="c in filtered" :key="c.id" :class="{ used: c.status !== 0 }">
          <div class="coupon-left">
            <div class="value">
              <template v-if="c.couponType === 2">{{ (c.faceValue / 10).toFixed(1) }}<span>折</span></template>
              <template v-else><span>¥</span>{{ c.faceValue }}</template>
            </div>
            <div class="cond">满 {{ c.minAmount }} 可用</div>
          </div>
          <div class="coupon-right">
            <div class="name">{{ c.templateName }}</div>
            <div class="code">券码 {{ c.couponCode }}</div>
            <div class="expire">有效期至 {{ (c.expireTime || '').slice(0, 10) }}</div>
            <div class="actions">
              <template v-if="c.status === 0">
                <el-button size="small" type="danger" round @click="redeem(c)">立即使用</el-button>
                <el-button size="small" round plain @click="openTransfer(c)">转赠</el-button>
              </template>
              <el-button size="small" round plain @click="router.push(`/trace?code=${c.couponCode}`)">链上验真</el-button>
              <el-tag v-if="c.status !== 0" size="small" type="info">{{ c.status === 1 ? '已核销' : c.status === 3 ? '已转赠' : '已过期' }}</el-tag>
            </div>
          </div>
        </div>
      </div>
      <el-empty v-else-if="!loading" description="暂无卡券" />
    </div>

    <!-- 转赠 -->
    <el-dialog v-model="showTransfer" title="转赠卡券" width="420px">
      <el-form label-width="100px">
        <el-form-item label="卡券">
          <span>{{ transferCouponItem?.templateName }}</span>
        </el-form-item>
        <el-form-item label="对方用户ID">
          <el-input-number v-model="transferTo" :min="1" />
          <div class="transfer-tip">演示：4 = 李静</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showTransfer = false">取消</el-button>
        <el-button type="primary" :loading="transferring" @click="doTransfer">确认转赠</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getMyCoupons, redeemCoupon, transferCoupon } from '@/api/coupon'
import { useUserStore } from '@/store/user'
import type { Coupon } from '@/api/types'

const router = useRouter()
const userStore = useUserStore()
const tab = ref(0)
const coupons = ref<Coupon[]>([])
const loading = ref(false)
const showTransfer = ref(false)
const transferCouponItem = ref<Coupon | null>(null)
const transferTo = ref(4)
const transferring = ref(false)

const filtered = computed(() => coupons.value.filter(c => {
  if (tab.value === 0) return c.status === 0
  if (tab.value === 1) return c.status === 1 || c.status === 3
  return c.status === 2
}))

const fetchData = async () => {
  loading.value = true
  try {
    coupons.value = await getMyCoupons(userStore.effectiveUserId)
  } finally {
    loading.value = false
  }
}

const redeem = (c: Coupon) => {
  ElMessageBox.confirm(`确认使用「${c.templateName}」吗？核销记录将实时上链。`, '确认核销', { type: 'warning' })
    .then(async () => {
      await redeemCoupon({ couponCode: c.couponCode, orderNo: `ORD${Date.now()}` })
      ElMessage.success('核销成功，已上链')
      fetchData()
    }).catch(() => {})
}

const openTransfer = (c: Coupon) => {
  transferCouponItem.value = c
  transferTo.value = 4
  showTransfer.value = true
}

const doTransfer = async () => {
  if (!transferCouponItem.value) return
  transferring.value = true
  try {
    await transferCoupon({ couponCode: transferCouponItem.value.couponCode, toUserId: transferTo.value })
    ElMessage.success('转赠成功')
    showTransfer.value = false
    fetchData()
  } finally {
    transferring.value = false
  }
}

onMounted(fetchData)
</script>

<style lang="scss" scoped>
.page-title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 8px;
}
.tabs {
  background: #fff;
  border-radius: 10px;
  padding: 0 16px;
  margin-bottom: 16px;
}
.coupon-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.coupon {
  display: flex;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(122, 12, 30, 0.05);
  &.used {
    opacity: 0.65;
  }
  .coupon-left {
    width: 130px;
    flex-shrink: 0;
    background: linear-gradient(135deg, #ff6a6a, #ee0a24);
    color: #fff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px 0;
    .value {
      font-size: 30px;
      font-weight: 800;
      span {
        font-size: 15px;
      }
    }
    .cond {
      font-size: 11px;
      opacity: 0.85;
      margin-top: 6px;
    }
  }
  .coupon-right {
    flex: 1;
    padding: 16px;
    .name {
      font-size: 15px;
      font-weight: 600;
    }
    .code {
      font-size: 12px;
      color: var(--text-sub);
      margin-top: 6px;
      font-family: Consolas, monospace;
    }
    .expire {
      font-size: 11px;
      color: #b0b3b8;
      margin-top: 4px;
    }
    .actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
      align-items: center;
      flex-wrap: wrap;
    }
  }
}
.transfer-tip {
  font-size: 11px;
  color: var(--text-sub);
  margin-top: 4px;
}
</style>
