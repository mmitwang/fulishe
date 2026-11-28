<template>
  <div class="user-page">
    <!-- 用户卡片 -->
    <div class="user-card">
      <div class="avatar">{{ avatarChar }}</div>
      <div class="info">
        <div class="name">{{ displayName }}</div>
        <div class="mobile">{{ userStore.userInfo?.mobile || '登录后享专属企业福利' }}</div>
      </div>
      <el-button v-if="!userStore.isLoggedIn" round @click="router.push('/login')">去登录</el-button>
      <el-tag v-else type="success" effect="dark" round>企业会员</el-tag>
    </div>

    <!-- 统计 -->
    <el-row :gutter="16" class="stats">
      <el-col :span="8">
        <div class="stat" @click="router.push('/order/list')">
          <div class="num">{{ stats.orders }}</div>
          <div class="label">全部订单</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat" @click="router.push('/coupon')">
          <div class="num">{{ stats.coupons }}</div>
          <div class="label">可用卡券</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat" @click="router.push('/trace')">
          <div class="num">{{ stats.traces }}</div>
          <div class="label">溯源验真</div>
        </div>
      </el-col>
    </el-row>

    <!-- 菜单 -->
    <el-card shadow="never" class="menu-card">
      <div class="menu-item" @click="router.push('/order/list')">
        <el-icon><Document /></el-icon><span>我的订单</span><el-icon class="arrow"><ArrowRight /></el-icon>
      </div>
      <div class="menu-item" @click="router.push('/coupon')">
        <el-icon><Ticket /></el-icon><span>我的卡券</span><el-icon class="arrow"><ArrowRight /></el-icon>
      </div>
      <div class="menu-item" @click="router.push('/trace')">
        <el-icon><Lock /></el-icon><span>区块链验真</span><el-icon class="arrow"><ArrowRight /></el-icon>
      </div>
      <div class="menu-item">
        <el-icon><Service /></el-icon><span>联系客服</span><span class="value">400-888-6688</span>
      </div>
      <div class="menu-item">
        <el-icon><InfoFilled /></el-icon><span>关于福礼社</span><span class="value">v2.0.0</span>
      </div>
    </el-card>

    <div class="logout" v-if="userStore.isLoggedIn">
      <el-button round @click="logout">退出登录</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Document, Ticket, Lock, Service, InfoFilled, ArrowRight } from '@element-plus/icons-vue'
import { getOrderList } from '@/api/order'
import { getMyCoupons } from '@/api/coupon'
import { useUserStore } from '@/store/user'
import { useCartStore } from '@/store/cart'

const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()
const stats = ref({ orders: 0, coupons: 0, traces: 16 })

const displayName = computed(() => userStore.userInfo?.nickname || userStore.userInfo?.realName || '未登录')
const avatarChar = computed(() => (userStore.isLoggedIn ? (displayName.value[0] || '福') : '福'))

const logout = () => {
  userStore.logout()
  cartStore.clearLocalState()
  ElMessage.success('已退出登录')
  router.push('/home')
}

onMounted(async () => {
  try {
    const [orders, coupons] = await Promise.all([
      getOrderList({ userId: userStore.effectiveUserId }),
      getMyCoupons(userStore.effectiveUserId)
    ])
    stats.value.orders = (orders || []).length
    stats.value.coupons = (coupons || []).filter((c: any) => c.status === 0).length
  } catch {
    // 统计失败不影响页面展示
  }
})
</script>

<style lang="scss" scoped>
.user-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: linear-gradient(120deg, #7a0c1e, #c8102e 65%, #f0556b);
  color: #fff;
  border-radius: 14px;
  padding: 28px 24px;
  .avatar {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    border: 2px solid rgba(255, 255, 255, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    font-weight: 700;
  }
  .info {
    flex: 1;
    .name {
      font-size: 20px;
      font-weight: 700;
    }
    .mobile {
      font-size: 12px;
      opacity: 0.8;
      margin-top: 4px;
    }
  }
}
.stats {
  margin-top: 16px;
  .stat {
    background: #fff;
    border-radius: 12px;
    padding: 20px 0;
    text-align: center;
    cursor: pointer;
    &:hover {
      box-shadow: 0 6px 18px rgba(122, 12, 30, 0.08);
    }
    .num {
      font-size: 24px;
      font-weight: 800;
      color: var(--brand-dark);
    }
    .label {
      font-size: 12px;
      color: var(--text-sub);
      margin-top: 4px;
    }
  }
}
.menu-card {
  margin-top: 16px;
  border-radius: 12px;
  .menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 4px;
    border-bottom: 1px solid #f5f6fa;
    font-size: 14px;
    cursor: pointer;
    &:last-child {
      border-bottom: none;
    }
    .el-icon {
      color: var(--brand-primary);
    }
    .arrow {
      margin-left: auto;
      color: var(--text-sub);
    }
    .value {
      margin-left: auto;
      font-size: 13px;
      color: var(--text-sub);
    }
  }
}
.logout {
  text-align: center;
  margin-top: 24px;
}
</style>
