<template>
  <div class="home-page">
    <van-nav-bar fixed class="nav-bar">
      <template #title>
        <div class="nav-title">
          <div class="title-row"><span class="logo-mark">福</span><span class="brand">福礼社</span></div>
          <span class="slogan">企业福利数智平台</span>
        </div>
      </template>
      <template #right>
        <van-icon name="qr" size="20" @click="goTrace()" />
      </template>
    </van-nav-bar>

    <div class="content">
      <van-swipe class="banner" :autoplay="3500" indicator-color="#fff">
        <van-swipe-item v-for="item in data.banners" :key="item.id" @click="router.push(item.link || '/category')">
          <img :src="item.image" alt="" loading="lazy" />
          <div class="banner-title">{{ item.title }}</div>
        </van-swipe-item>
      </van-swipe>

      <van-notice-bar left-icon="volume-o" :text="noticesText" background="#fff7e6" color="#ad6800" />

      <div class="quick-entry">
        <div class="entry-item" v-for="item in data.quickEntries" :key="item.id" @click="router.push(item.path)">
          <img :src="item.icon" alt="" class="entry-icon" loading="lazy" />
          <span class="entry-text">{{ item.name }}</span>
        </div>
      </div>

      <div class="trace-card" @click="goTrace()">
        <div class="trace-left">
          <div class="trace-title"><van-icon name="shield-o" /> 区块链溯源验真</div>
          <div class="trace-desc">扫码或输入卡券码，查看从原料到签收的全链路存证</div>
        </div>
        <van-button size="small" round type="primary" plain>去验真</van-button>
      </div>

      <div class="coupon-strip" v-if="data.coupons?.length">
        <div class="coupon-item" v-for="c in data.coupons" :key="c.id">
          <div class="coupon-value">
            <template v-if="c.couponType === 2">{{ (c.discount * 10).toFixed(1) }}折</template>
            <template v-else>¥{{ c.faceValue }}</template>
          </div>
          <div class="coupon-name">{{ c.templateName }}</div>
          <div class="coupon-cond">满 {{ c.minAmount }} 可用</div>
        </div>
      </div>

      <div class="section" v-if="data.newProducts?.length">
        <div class="section-title">
          <span class="title-text">新品上架</span>
          <span class="more" @click="router.push('/category')">查看更多 <van-icon name="arrow" /></span>
        </div>
        <div class="product-grid">
          <div class="product-item" v-for="item in data.newProducts" :key="item.id" @click="goDetail(item.id)">
            <div class="image-wrap">
              <img :src="item.image" alt="" class="product-image" loading="lazy" />
              <span class="new-tag">新品</span>
            </div>
            <div class="product-name">{{ item.spuName }}</div>
            <div class="product-tags">
              <span v-for="t in (item.tags || []).slice(0, 2)" :key="t" class="tag">{{ t }}</span>
            </div>
            <div class="product-price">
              <span class="price-symbol">¥</span>
              <span class="price-value">{{ item.sellPrice }}</span>
              <span class="original">¥{{ item.originalPrice }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">
          <span class="title-text">精选好物</span>
          <span class="more" @click="router.push('/category')">查看更多 <van-icon name="arrow" /></span>
        </div>
        <div class="product-grid">
          <div class="product-item" v-for="item in data.hotProducts" :key="item.id" @click="goDetail(item.id)">
            <div class="image-wrap">
              <img :src="item.image" alt="" class="product-image" loading="lazy" />
              <span class="sales">已售 {{ item.sales }}</span>
            </div>
            <div class="product-name">{{ item.spuName }}</div>
            <div class="product-tags">
              <span v-for="t in (item.tags || []).slice(0, 2)" :key="t" class="tag">{{ t }}</span>
            </div>
            <div class="product-price">
              <span class="price-symbol">¥</span>
              <span class="price-value">{{ item.sellPrice }}</span>
              <span class="original">¥{{ item.originalPrice }}</span>
            </div>
          </div>
        </div>
      </div>
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
const data = ref<any>({ banners: [], quickEntries: [], notices: [], hotProducts: [], coupons: [] })
const noticesText = computed(() => (data.value.notices || []).join('　｜　'))

onMounted(async () => {
  data.value = await request.get('/h5/home')
})

const goDetail = (id: number) => router.push(`/product/${id}`)
const goTrace = () => router.push('/trace')
</script>

<style lang="scss" scoped>
.home-page {
  min-height: 100vh;
  padding-bottom: 60px;
  background: #f5f6fa;
}

.nav-bar {
  :deep(.van-nav-bar__title) {
    max-width: 100%;
  }
  .nav-title {
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1.1;
    .title-row {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .logo-mark {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: linear-gradient(135deg, #c8102e, #f0556b);
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      font-family: 'STKaiti', 'KaiTi', 'Songti SC', 'SimSun', serif;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .brand {
      font-size: 18px;
      font-weight: 800;
      color: #7a0c1e;
      letter-spacing: 2px;
    }
    .slogan {
      font-size: 10px;
      color: #9aa0ad;
      margin-top: 2px;
    }
  }
}

.content {
  padding-top: 46px;
}

.banner {
  height: 168px;
  position: relative;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .banner-title {
    position: absolute;
    left: 14px;
    bottom: 14px;
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
  }
}

.quick-entry {
  display: flex;
  padding: 14px 6px;
  background: #fff;
  margin-top: 8px;
  .entry-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    .entry-icon {
      width: 42px;
      height: 42px;
      border-radius: 12px;
    }
    .entry-text {
      font-size: 11px;
      color: #4b5563;
      margin-top: 6px;
    }
  }
}

.trace-card {
  margin: 10px 12px;
  padding: 14px;
  border-radius: 12px;
  background: linear-gradient(120deg, #7a0c1e, #c8102e);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  .trace-title {
    font-size: 15px;
    font-weight: 600;
  }
  .trace-desc {
    font-size: 11px;
    opacity: 0.8;
    margin-top: 5px;
  }
  :deep(.van-button) {
    background: rgba(255, 255, 255, 0.14);
    border-color: rgba(255, 255, 255, 0.4);
    color: #fff;
  }
}

.coupon-strip {
  display: flex;
  gap: 8px;
  padding: 0 12px 4px;
  overflow-x: auto;
  .coupon-item {
    min-width: 104px;
    background: #fff;
    border-radius: 10px;
    padding: 10px;
    text-align: center;
    border: 1px dashed #ffb3b3;
    .coupon-value {
      color: #ee0a24;
      font-weight: 700;
      font-size: 17px;
    }
    .coupon-name {
      font-size: 11px;
      color: #4b5563;
      margin-top: 3px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .coupon-cond {
      font-size: 10px;
      color: #9aa0ad;
      margin-top: 2px;
    }
  }
}

.section {
  margin-top: 10px;
  background: #fff;
  padding: 14px 12px;
  .section-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    .title-text {
      font-size: 16px;
      font-weight: 700;
      color: #7a0c1e;
    }
    .more {
      font-size: 11px;
      color: #9aa0ad;
    }
  }
  .product-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    .product-item {
      width: calc(50% - 5px);
      background: #fff;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(122, 12, 30, 0.06);
      .image-wrap {
        position: relative;
        .product-image {
          width: 100%;
          height: 168px;
          object-fit: cover;
          display: block;
        }
        .sales {
          position: absolute;
          left: 8px;
          bottom: 8px;
          font-size: 10px;
          color: #fff;
          background: rgba(0, 0, 0, 0.42);
          padding: 2px 6px;
          border-radius: 8px;
        }
        .new-tag {
          position: absolute;
          left: 8px;
          top: 8px;
          font-size: 10px;
          color: #fff;
          background: linear-gradient(135deg, #ff6034, #ee0a24);
          padding: 2px 8px;
          border-radius: 8px;
          font-weight: 600;
        }
      }
      .product-name {
        font-size: 13px;
        color: #303133;
        padding: 8px 8px 4px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        line-height: 1.4;
        min-height: 36px;
      }
      .product-tags {
        padding: 0 8px;
        display: flex;
        gap: 4px;
        .tag {
          font-size: 9px;
          color: #c8102e;
          background: #fdeef0;
          padding: 1px 5px;
          border-radius: 4px;
        }
      }
      .product-price {
        padding: 6px 8px 10px;
        color: #ee0a24;
        display: flex;
        align-items: baseline;
        gap: 5px;
        .price-symbol {
          font-size: 11px;
        }
        .price-value {
          font-size: 18px;
          font-weight: 700;
        }
        .original {
          font-size: 10px;
          color: #b0b3b8;
          text-decoration: line-through;
        }
      }
    }
  }
}
</style>
