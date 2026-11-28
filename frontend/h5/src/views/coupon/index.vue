<template>
  <div class="coupon-page">
    <van-nav-bar title="我的卡券" fixed left-arrow @click-left="router.back()" />
    <van-tabs v-model:active="tab" sticky offset-top="46" color="#c8102e">
      <van-tab title="未使用" :name="0" />
      <van-tab title="已使用" :name="1" />
      <van-tab title="已过期" :name="2" />
    </van-tabs>

    <div class="content">
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
            <van-button v-if="c.status === 0" size="mini" round type="danger" @click="redeem(c)">立即使用</van-button>
            <van-button v-if="c.status === 0" size="mini" round plain @click="transfer(c)">转赠</van-button>
            <van-button size="mini" round plain @click="router.push(`/trace?code=${c.couponCode}`)">链上验真</van-button>
            <van-tag v-if="c.status !== 0" plain type="default">{{ c.status === 1 ? '已核销' : '已过期' }}</van-tag>
          </div>
        </div>
      </div>
      <van-empty v-if="!filtered.length" description="暂无卡券" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import request from '@/utils/request'

const router = useRouter()
const tab = ref(0)
const coupons = ref<any[]>([])
const userId = () => Number(localStorage.getItem('userId') || 2)

const filtered = computed(() => coupons.value.filter(c => {
  if (tab.value === 0) return c.status === 0
  if (tab.value === 1) return c.status === 1 || c.status === 3
  return c.status === 2
}))

const fetchData = async () => {
  coupons.value = await request.get('/coupon/my', { params: { userId: userId() } })
}

const redeem = (c: any) => {
  showConfirmDialog({ title: '确认核销', message: `确认使用「${c.templateName}」吗？核销记录将实时上链。` }).then(async () => {
    await request.post('/coupon/redeem', { couponCode: c.couponCode, orderNo: `ORD${Date.now()}` })
    showToast('核销成功，已上链')
    fetchData()
  })
}

const transfer = (c: any) => {
  showConfirmDialog({ title: '转赠卡券', message: '将把该卡券转赠给「李静」，转赠记录将上链存证。' }).then(async () => {
    await request.post('/coupon/transfer', { couponCode: c.couponCode, toUserId: 4 })
    showToast('转赠成功')
    fetchData()
  })
}

onMounted(fetchData)
</script>

<style lang="scss" scoped>
.coupon-page {
  min-height: 100vh;
  background: #f5f6fa;
}
.content {
  padding: 12px;
}
.coupon {
  display: flex;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 12px;
  box-shadow: 0 2px 10px rgba(122, 12, 30, 0.05);
  &.used {
    opacity: 0.6;
  }
  .coupon-left {
    width: 110px;
    background: linear-gradient(135deg, #ff6a6a, #ee0a24);
    color: #fff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 16px 0;
    .value {
      font-size: 26px;
      font-weight: 800;
      span {
        font-size: 13px;
      }
    }
    .cond {
      font-size: 10px;
      opacity: 0.85;
      margin-top: 4px;
    }
  }
  .coupon-right {
    flex: 1;
    padding: 12px;
    .name {
      font-size: 14px;
      font-weight: 600;
      color: #7a0c1e;
    }
    .code {
      font-size: 11px;
      color: #9aa0ad;
      margin-top: 5px;
      font-family: Consolas, monospace;
    }
    .expire {
      font-size: 10px;
      color: #b0b3b8;
      margin-top: 3px;
    }
    .actions {
      display: flex;
      gap: 8px;
      margin-top: 10px;
      align-items: center;
      flex-wrap: wrap;
    }
  }
}
</style>
