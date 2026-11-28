<template>
  <div class="home-page" v-loading="loading">
    <!-- 首屏：左侧分类 + 轮播 + 右侧信息 -->
    <div class="hero">
      <aside class="cat-menu">
        <div class="cat-menu-head">全部商品分类</div>
        <ul class="cat-list">
          <li v-for="c in data.categories" :key="c.id" @click="goCategory(c.id)">
            <span>{{ c.name }}</span>
            <el-icon class="arrow"><ArrowRight /></el-icon>
          </li>
        </ul>
      </aside>

      <div class="hero-center">
        <el-carousel v-if="data.banners?.length" height="360px" :interval="4500" class="banner">
          <el-carousel-item v-for="item in data.banners" :key="item.id" @click="goBanner(item)">
            <div class="banner-item">
              <el-image v-if="item.image" :src="item.image" fit="cover" class="banner-img">
                <template #placeholder><div class="banner-placeholder" /></template>
                <template #error><div class="banner-error">{{ item.title || '福礼社' }}</div></template>
              </el-image>
              <div v-else class="banner-error">{{ item.title || '福礼社' }}</div>
              <div class="banner-mask">
                <div class="banner-tag">福礼甄选</div>
                <div class="banner-title">{{ item.title }}</div>
                <div class="banner-sub">企业福利 · 一站集采 · 区块链溯源</div>
              </div>
            </div>
          </el-carousel-item>
        </el-carousel>
        <div class="banner-fallback" v-else>福礼社企业福利数智平台</div>

        <!-- 快捷服务条 -->
        <div class="quick-bar">
          <div class="quick" v-for="q in quickServices" :key="q.text" @click="router.push(q.path)">
            <div class="quick-icon"><el-icon :size="18"><component :is="q.icon" /></el-icon></div>
            <span>{{ q.text }}</span>
          </div>
        </div>
      </div>

      <div class="hero-side">
        <div class="side-card notice-card">
          <div class="side-head">
            <span class="side-title">平台公告</span>
            <span class="side-more" @click="router.push('/category')">更多</span>
          </div>
          <ul class="notice-list">
            <li v-for="(n, idx) in (data.notices || []).slice(0, 5)" :key="idx">
              <span class="dot" />
              <span class="notice-text">{{ noticeText(n) }}</span>
            </li>
          </ul>
        </div>

        <div class="side-card trace-mini" @click="router.push('/trace')">
          <div class="trace-mini-head"><el-icon><Lock /></el-icon> 区块链溯源</div>
          <div class="trace-mini-desc">扫码验真，全链路存证可追溯</div>
          <div class="trace-mini-btn">立即验真 →</div>
        </div>
      </div>
    </div>

    <!-- 优惠券条 -->
    <div class="coupon-strip" v-if="data.coupons?.length">
      <div class="coupon-item" v-for="c in data.coupons" :key="c.id" @click="router.push('/coupon')">
        <div class="coupon-value">
          <template v-if="c.couponType === 2">{{ ((c.discount || 0) * 10).toFixed(1) }}<span>折</span></template>
          <template v-else><span>¥</span>{{ c.faceValue }}</template>
        </div>
        <div class="coupon-info">
          <div class="coupon-name">{{ c.templateName }}</div>
          <div class="coupon-cond">满 {{ c.minAmount }} 可用</div>
        </div>
        <div class="coupon-go">去使用</div>
      </div>
    </div>

    <!-- 新品上架 -->
    <section class="section" v-if="data.newProducts?.length">
      <div class="section-head">
        <div class="section-title"><span class="accent" />新品上架</div>
        <span class="more" @click="router.push('/category')">查看更多 <el-icon><ArrowRight /></el-icon></span>
      </div>
      <div class="product-grid">
        <ProductCard v-for="item in data.newProducts" :key="item.id" :product="item" />
      </div>
    </section>

    <!-- 精选好物 -->
    <section class="section" v-if="data.hotProducts?.length">
      <div class="section-head">
        <div class="section-title"><span class="accent" />精选好物</div>
        <span class="more" @click="router.push('/category')">查看更多 <el-icon><ArrowRight /></el-icon></span>
      </div>
      <div class="product-grid">
        <ProductCard v-for="item in data.hotProducts" :key="item.id" :product="item" />
      </div>
    </section>

    <!-- 为你推荐 -->
    <section class="section" v-if="data.recommend?.length">
      <div class="section-head">
        <div class="section-title"><span class="accent" />为你推荐</div>
        <span class="more" @click="router.push('/category')">查看更多 <el-icon><ArrowRight /></el-icon></span>
      </div>
      <div class="product-grid">
        <ProductCard v-for="item in data.recommend" :key="item.id" :product="item" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, Lock, Ticket, Document, ShoppingCart, Service } from '@element-plus/icons-vue'
import ProductCard from '@/components/ProductCard.vue'
import { getHome } from '@/api/home'
import type { HomeData } from '@/api/types'

const router = useRouter()
const loading = ref(false)
const data = ref<Partial<HomeData>>({})

const quickServices = [
  { text: '我的订单', path: '/order/list', icon: Document },
  { text: '我的卡券', path: '/coupon', icon: Ticket },
  { text: '购物车', path: '/cart', icon: ShoppingCart },
  { text: '溯源验真', path: '/trace', icon: Lock },
  { text: '企业集采', path: '/user', icon: Service }
]

const goBanner = (item: any) => {
  if (item.link) router.push(item.link)
  else router.push('/category')
}
const goCategory = (id: number) => router.push({ path: '/category', query: { categoryId: String(id) } })

// notices 接口返回字符串数组，兼容对象结构
const noticeText = (n: any) => (typeof n === 'string' ? n : (n?.content || n?.title || ''))

onMounted(async () => {
  loading.value = true
  try {
    data.value = await getHome()
  } catch {
    // 请求拦截器已统一提示错误，此处保留空态并结束 loading
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
.home-page {
  padding-top: 16px;
  min-height: 680px;
}
/* ---------- 首屏 ---------- */
.hero {
  display: flex;
  gap: 12px;
  align-items: stretch;
}
.cat-menu {
  width: 220px;
  flex-shrink: 0;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  .cat-menu-head {
    height: 42px;
    display: flex;
    align-items: center;
    padding-left: 18px;
    font-size: 15px;
    font-weight: 700;
    color: var(--brand-primary);
    border-bottom: 1px solid #f0f1f5;
    background: #f7f9ff;
  }
  .cat-list {
    flex: 1;
    padding: 6px 0;
    li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 18px;
      font-size: 14px;
      color: var(--text-main);
      cursor: pointer;
      transition: all 0.15s;
      .arrow { color: #c0c4cc; }
      &:hover {
        background: #fdf3f4;
        color: var(--brand-primary);
        .arrow { color: var(--brand-primary); }
      }
    }
  }
}
.hero-center {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  .banner {
    border-radius: 8px;
    overflow: hidden;
  }
  .banner-item {
    position: relative;
    height: 100%;
    cursor: pointer;
    .banner-img { width: 100%; height: 100%; }
    .banner-mask {
      position: absolute;
      left: 0;
      bottom: 0;
      right: 0;
      padding: 24px 28px;
      background: linear-gradient(to top, rgba(15, 24, 48, 0.72), transparent);
      color: #fff;
      .banner-tag {
        display: inline-block;
        font-size: 11px;
        background: rgba(255, 255, 255, 0.22);
        border: 1px solid rgba(255, 255, 255, 0.45);
        border-radius: 20px;
        padding: 2px 10px;
        margin-bottom: 8px;
      }
      .banner-title { font-size: 24px; font-weight: 800; text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4); }
      .banner-sub { font-size: 12px; opacity: 0.85; margin-top: 6px; }
    }
  }
  .banner-fallback {
    height: 360px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #7a0c1e, #c8102e 60%, #f0556b);
    color: #fff;
    font-size: 22px;
    font-weight: 700;
  }
  /* 轮播图片：加载占位 + 失败兜底，均铺满 360 高度 */
  .banner-placeholder,
  .banner-error {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 0 24px;
    color: #fff;
    font-size: 20px;
    font-weight: 700;
  }
  .banner-error {
    background: linear-gradient(135deg, #7a0c1e, #c8102e 60%, #f0556b);
  }
  .banner-placeholder {
    background: linear-gradient(100deg, #fdeef0 30%, #fbdde1 50%, #fdeef0 70%);
    background-size: 200% 100%;
    animation: banner-shine 1.2s linear infinite;
  }
  .quick-bar {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 10px;
    .quick {
      background: #fff;
      border-radius: 8px;
      height: 52px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 13px;
      color: var(--text-main);
      cursor: pointer;
      transition: all 0.2s;
      .quick-icon {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: #fdeef0;
        color: var(--brand-primary);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      &:hover {
        color: var(--brand-primary);
        box-shadow: 0 6px 16px rgba(122, 12, 30, 0.1);
        transform: translateY(-1px);
      }
    }
  }
}
.hero-side {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  .side-card {
    background: #fff;
    border-radius: 8px;
    padding: 14px 16px;
  }
  .side-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
    .side-title { font-size: 14px; font-weight: 700; color: var(--text-main); }
    .side-more { font-size: 12px; color: var(--text-sub); cursor: pointer; &:hover { color: var(--brand-primary); } }
  }
  .notice-list {
    flex: 1;
    li {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 7px 0;
      font-size: 12px;
      color: #6b7280;
      cursor: pointer;
      .dot {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: var(--brand-primary);
        margin-top: 6px;
        flex-shrink: 0;
      }
      .notice-text {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      &:hover { color: var(--brand-primary); }
    }
  }
  .notice-card { flex: 1; display: flex; flex-direction: column; }
  .trace-mini {
    background: linear-gradient(135deg, #7a0c1e, #c8102e);
    color: #fff;
    cursor: pointer;
    .trace-mini-head {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      font-weight: 700;
    }
    .trace-mini-desc { font-size: 11px; opacity: 0.8; margin-top: 6px; }
    .trace-mini-btn {
      margin-top: 12px;
      font-size: 12px;
      background: rgba(255, 255, 255, 0.18);
      border-radius: 20px;
      text-align: center;
      padding: 5px 0;
    }
  }
}
/* ---------- 优惠券条 ---------- */
.coupon-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 16px;
  .coupon-item {
    display: flex;
    align-items: center;
    background: #fff;
    border: 1px solid #ffe1e1;
    border-radius: 8px;
    padding: 12px 14px;
    cursor: pointer;
    transition: all 0.2s;
    &:hover { box-shadow: 0 6px 16px rgba(238, 10, 36, 0.12); transform: translateY(-1px); }
    .coupon-value {
      color: var(--price-red);
      font-size: 26px;
      font-weight: 800;
      line-height: 1;
      min-width: 74px;
      span { font-size: 14px; }
    }
    .coupon-info { flex: 1; }
    .coupon-name { font-size: 13px; color: var(--text-main); font-weight: 600; }
    .coupon-cond { font-size: 11px; color: var(--text-sub); margin-top: 4px; }
    .coupon-go {
      font-size: 12px;
      color: var(--price-red);
      border: 1px solid var(--price-red);
      border-radius: 20px;
      padding: 3px 10px;
    }
  }
}
/* ---------- 楼层 ---------- */
.section {
  margin-top: 28px;
  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
    .section-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 22px;
      font-weight: 800;
      color: var(--text-main);
      .accent {
        width: 5px;
        height: 22px;
        border-radius: 3px;
        background: linear-gradient(180deg, var(--brand-primary), var(--brand-bright));
      }
    }
    .more {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: 13px;
      color: var(--text-sub);
      cursor: pointer;
      &:hover { color: var(--brand-primary); }
    }
  }
}
.product-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;
}
@keyframes banner-shine {
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
}
</style>
