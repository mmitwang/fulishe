<template>
  <div class="user-page">
    <div class="header">
      <div class="avatar">{{ (user.nickname || user.realName || '福')[0] }}</div>
      <div class="info">
        <div class="name">{{ user.nickname || user.realName || '未登录' }}</div>
        <div class="mobile">{{ user.mobile || '登录后享专属企业福利' }}</div>
      </div>
      <van-button v-if="!logged" size="small" round plain class="login-btn" @click="router.push('/login')">去登录</van-button>
      <van-tag v-else type="success" plain round>企业会员</van-tag>
    </div>

    <div class="stats">
      <div class="stat" @click="router.push('/order/list')">
        <div class="num">{{ stats.orders }}</div>
        <div class="label">全部订单</div>
      </div>
      <div class="stat" @click="router.push('/coupon')">
        <div class="num">{{ stats.coupons }}</div>
        <div class="label">可用卡券</div>
      </div>
      <div class="stat" @click="router.push('/trace')">
        <div class="num">{{ stats.traces }}</div>
        <div class="label">溯源验真</div>
      </div>
    </div>

    <van-cell-group inset class="menu-group">
      <van-cell title="我的订单" icon="orders-o" is-link @click="router.push('/order/list')" />
      <van-cell title="我的卡券" icon="coupon-o" is-link @click="router.push('/coupon')" />
      <van-cell title="区块链验真" icon="shield-o" is-link @click="router.push('/trace')" />
      <van-cell title="收货地址" icon="location-o" is-link />
      <van-cell title="企业发票" icon="bill-o" is-link />
      <van-cell title="联系客服" icon="service-o" is-link value="400-888-6688" />
    </van-cell-group>

    <van-cell-group inset class="menu-group">
      <van-cell title="关于福礼社" icon="info-o" is-link value="v2.0.0" />
    </van-cell-group>

    <div class="logout" v-if="logged">
      <van-button block round @click="logout">退出登录</van-button>
    </div>

    <TabBar />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import TabBar from '@/components/TabBar.vue'
import request from '@/utils/request'

const router = useRouter()
const user = ref<any>(JSON.parse(localStorage.getItem('userInfo') || '{}'))
const logged = computed(() => !!localStorage.getItem('token'))
const stats = ref({ orders: 0, coupons: 0, traces: 16 })
const userId = () => Number(localStorage.getItem('userId') || 2)

const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('userInfo')
  localStorage.removeItem('userId')
  user.value = {}
  router.push('/login')
}

onMounted(async () => {
  const [orders, coupons] = await Promise.all([
    request.get('/order/list', { params: { userId: userId() } }),
    request.get('/coupon/my', { params: { userId: userId() } })
  ])
  stats.value.orders = orders.length
  stats.value.coupons = coupons.filter((c: any) => c.status === 0).length
})
</script>

<style lang="scss" scoped>
.user-page {
  min-height: 100vh;
  padding-bottom: 60px;
  background: #f5f6fa;
}
.header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 54px 18px 24px;
  background: linear-gradient(120deg, #7a0c1e, #c8102e 65%, #f0556b);
  color: #fff;
  .avatar {
    width: 58px;
    height: 58px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: 700;
    border: 2px solid rgba(255, 255, 255, 0.5);
  }
  .info {
    flex: 1;
    .name {
      font-size: 18px;
      font-weight: 700;
    }
    .mobile {
      font-size: 11px;
      opacity: 0.8;
      margin-top: 4px;
    }
  }
  .login-btn {
    border-color: rgba(255, 255, 255, 0.6);
    color: #fff;
    background: rgba(255, 255, 255, 0.12);
  }
}
.stats {
  display: flex;
  background: #fff;
  margin: -14px 14px 0;
  border-radius: 14px;
  padding: 16px 0;
  box-shadow: 0 6px 18px rgba(122, 12, 30, 0.08);
  position: relative;
  .stat {
    flex: 1;
    text-align: center;
    .num {
      font-size: 20px;
      font-weight: 800;
      color: #7a0c1e;
    }
    .label {
      font-size: 11px;
      color: #9aa0ad;
      margin-top: 3px;
    }
  }
}
.menu-group {
  margin-top: 14px;
  :deep(.van-cell__left-icon) {
    color: #c8102e;
  }
}
.logout {
  padding: 24px 16px;
}
</style>
