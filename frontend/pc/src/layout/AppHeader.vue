<template>
  <div class="jd-header-wrap">
    <!-- 顶部工具条 -->
    <div class="jd-topbar">
      <div class="jd-container topbar-inner">
        <div class="loc">
          <el-icon><Location /></el-icon>
          <span>配送至：浙江 杭州</span>
        </div>
        <div class="top-links">
          <template v-if="userStore.isLoggedIn">
            <span class="hello">你好，{{ userStore.userInfo?.nickname || userStore.userInfo?.realName || '会员' }}</span>
            <span class="sep">|</span>
            <span @click="router.push('/order/list')">我的订单</span>
            <span @click="router.push('/coupon')">我的卡券</span>
            <span @click="router.push('/user')">个人中心</span>
            <span class="sep">|</span>
            <span @click="logout">退出</span>
          </template>
          <template v-else>
            <span class="link-accent" @click="router.push('/login')">登录</span>
            <span class="link-accent" @click="router.push('/login')">注册</span>
            <span class="sep">|</span>
            <span @click="router.push('/order/list')">我的订单</span>
            <span @click="router.push('/coupon')">我的卡券</span>
          </template>
          <span class="sep">|</span>
          <span @click="router.push('/trace')">溯源验真</span>
          <span class="sep">|</span>
          <span>客户服务 400-888-6688</span>
        </div>
      </div>
    </div>

    <!-- 主头部：Logo + 搜索 + 购物车 -->
    <header class="jd-header">
      <div class="jd-container header-inner">
        <div class="logo" @click="router.push('/home')">
          <div class="logo-mark">福</div>
          <div class="logo-text">
            <b>福礼社</b>
            <span>企业福利数智平台</span>
          </div>
        </div>

        <div class="search-area">
          <div class="search-box">
            <el-input
              v-model="keyword"
              class="search-input"
              placeholder="搜索礼品卡 / 礼盒 / 数码家电"
              clearable
              @keyup.enter="doSearch"
              @clear="doSearch"
            />
            <button class="search-btn" @click="doSearch">
              <el-icon :size="18"><Search /></el-icon>
              搜索
            </button>
          </div>
          <div class="hot-words">
            <span class="hot-label">热搜：</span>
            <span v-for="w in hotWords" :key="w" @click="quickSearch(w)">{{ w }}</span>
          </div>
        </div>

        <div class="cart-entry" @click="router.push('/cart')">
          <el-badge :value="cartStore.count" :hidden="!cartStore.count" :max="99">
            <div class="cart-icon"><el-icon :size="22"><ShoppingCart /></el-icon></div>
          </el-badge>
          <span class="cart-text">我的购物车</span>
        </div>
      </div>
    </header>

    <!-- 分类导航 -->
    <nav class="jd-nav">
      <div class="jd-container nav-inner">
        <div
          class="all-cats"
          @mouseenter="showCats = true"
          @mouseleave="showCats = false"
        >
          <span class="all-cats-label"><el-icon><Menu /></el-icon> 全部商品分类</span>
          <transition name="fade">
            <div class="cat-panel" v-show="showCats">
              <div
                v-for="c in categories"
                :key="c.id"
                class="cat-item"
                @click="goCategory(c.id)"
              >
                <span>{{ c.name }}</span>
                <el-icon class="arrow"><ArrowRight /></el-icon>
              </div>
              <div class="cat-item all" @click="router.push('/category')">
                <span>查看全部商品</span>
                <el-icon class="arrow"><ArrowRight /></el-icon>
              </div>
            </div>
          </transition>
        </div>
        <div class="nav-links">
          <span :class="{ active: isActive('/home') }" @click="router.push('/home')">首页</span>
          <span @click="router.push('/category')">企业年货节</span>
          <span @click="goCategory(1)">礼品卡券</span>
          <span @click="goCategory(2)">节庆礼盒</span>
          <span @click="goCategory(3)">食品礼盒</span>
          <span @click="router.push('/trace')">区块链溯源</span>
          <span @click="router.push('/user')">企业集采</span>
        </div>
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, ShoppingCart, Location, Menu, ArrowRight } from '@element-plus/icons-vue'
import { getHome } from '@/api/home'
import { useUserStore } from '@/store/user'
import { useCartStore } from '@/store/cart'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const cartStore = useCartStore()

const keyword = ref(String(route.query.keyword || ''))
const categories = ref<{ id: number; name: string }[]>([])
const showCats = ref(false)
const hotWords = ['企业年货节', '礼品卡', '坚果礼盒', '茶酒饮品', '数码家电']

const isActive = (path: string) => route.path === path

const doSearch = () => {
  router.push({ path: '/category', query: keyword.value ? { keyword: keyword.value } : {} })
}
const quickSearch = (w: string) => {
  keyword.value = w
  doSearch()
}
const goCategory = (id: number) => {
  showCats.value = false
  router.push({ path: '/category', query: { categoryId: String(id) } })
}
const logout = () => {
  userStore.logout()
  cartStore.clearLocalState()
  ElMessage.success('已退出登录')
  router.push('/home')
}

watch(() => route.query.keyword, (v) => {
  keyword.value = String(v || '')
})

onMounted(async () => {
  try {
    const home = await getHome()
    categories.value = home.categories || []
  } catch {
    categories.value = []
  }
  cartStore.refreshCount()
})
</script>

<style lang="scss" scoped>
.jd-header-wrap {
  position: sticky;
  top: 0;
  z-index: 200;
  background: #fff;
  box-shadow: 0 2px 10px rgba(122, 12, 30, 0.06);
}
/* 顶部工具条 */
.jd-topbar {
  background: #f1f2f6;
  border-bottom: 1px solid #e6e8ee;
  color: #6b7280;
  font-size: 12px;
  .topbar-inner {
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .loc {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #8a8f99;
  }
  .top-links {
    display: flex;
    align-items: center;
    gap: 12px;
    span {
      cursor: pointer;
      &:hover { color: var(--brand-primary); }
      &.hello { color: #303133; cursor: default; }
    }
    .sep { color: #d7dae1; cursor: default; }
    .link-accent { color: var(--brand-primary); }
  }
}
/* 主头部 */
.jd-header {
  background: #fff;
  .header-inner {
    height: 96px;
    display: flex;
    align-items: center;
    gap: 32px;
  }
  .logo {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    flex-shrink: 0;
    .logo-mark {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #c8102e, #f0556b);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      font-weight: 700;
      font-family: 'STKaiti', 'KaiTi', 'Songti SC', 'SimSun', serif;
      box-shadow: 0 6px 16px rgba(200, 16, 46, 0.3);
    }
    .logo-text {
      display: flex;
      flex-direction: column;
      b {
        font-size: 26px;
        letter-spacing: 3px;
        color: var(--brand-primary);
        line-height: 1.1;
      }
      span {
        font-size: 11px;
        color: var(--text-sub);
        letter-spacing: 1px;
      }
    }
  }
  .search-area {
    flex: 1;
    max-width: 620px;
    .search-box {
      display: flex;
      height: 42px;
      border: 2px solid var(--brand-primary);
      border-radius: 6px;
      overflow: hidden;
      background: #fff;
      .search-input {
        flex: 1;
        :deep(.el-input__wrapper) {
          box-shadow: none;
          border-radius: 0;
          height: 38px;
        }
      }
      .search-btn {
        width: 100px;
        border: none;
        background: var(--brand-primary);
        color: #fff;
        font-size: 15px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        cursor: pointer;
        transition: background 0.2s;
        &:hover { background: #2450b8; }
      }
    }
    .hot-words {
      margin-top: 8px;
      font-size: 12px;
      color: #9aa0ad;
      display: flex;
      gap: 12px;
      .hot-label { color: #b0b3b8; }
      span:not(.hot-label) {
        cursor: pointer;
        &:hover { color: var(--price-red); }
      }
    }
  }
  .cart-entry {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 42px;
    padding: 0 18px;
    border: 1px solid #e6e8ee;
    border-radius: 6px;
    color: var(--brand-primary);
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.2s;
    .cart-icon {
      display: flex;
      align-items: center;
    }
    .cart-text {
      font-size: 14px;
      font-weight: 600;
    }
    &:hover {
      border-color: var(--brand-primary);
      background: #fdf3f4;
    }
  }
}
/* 分类导航 */
.jd-nav {
  border-top: 1px solid #f0f1f5;
  border-bottom: 2px solid var(--brand-primary);
  .nav-inner {
    height: 42px;
    display: flex;
    align-items: stretch;
  }
  .all-cats {
    width: 220px;
    flex-shrink: 0;
    background: var(--brand-primary);
    color: #fff;
    display: flex;
    align-items: center;
    position: relative;
    cursor: pointer;
    .all-cats-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 15px;
      font-weight: 600;
      padding-left: 16px;
    }
    .cat-panel {
      position: absolute;
      top: 42px;
      left: 0;
      width: 220px;
      background: #fff;
      border: 1px solid #e6e8ee;
      border-top: none;
      box-shadow: 0 10px 24px rgba(122, 12, 30, 0.12);
      padding: 6px 0;
      z-index: 30;
      .cat-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 11px 16px;
        font-size: 14px;
        color: var(--text-main);
        transition: all 0.15s;
        .arrow { color: #c0c4cc; }
        &:hover {
          background: #fdf3f4;
          color: var(--brand-primary);
          .arrow { color: var(--brand-primary); }
        }
        &.all {
          border-top: 1px solid #f0f1f5;
          color: var(--brand-primary);
          font-weight: 600;
        }
      }
    }
  }
  .nav-links {
    display: flex;
    align-items: center;
    gap: 28px;
    padding-left: 28px;
    overflow: hidden;
    span {
      font-size: 15px;
      color: var(--text-main);
      cursor: pointer;
      height: 100%;
      display: flex;
      align-items: center;
      border-bottom: 2px solid transparent;
      transition: color 0.2s;
      &:hover { color: var(--brand-primary); }
      &.active {
        color: var(--brand-primary);
        font-weight: 600;
        border-bottom-color: var(--brand-primary);
      }
    }
  }
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
