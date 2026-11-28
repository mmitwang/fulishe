<template>
  <div class="product-detail" v-if="product.id">
    <van-nav-bar title="商品详情" fixed left-arrow @click-left="router.back()" />
    <div class="content">
      <van-swipe :autoplay="4000" :circular="true" indicator-color="#fff" class="gallery">
        <van-swipe-item v-for="img in product.images?.length ? product.images : [product.image]" :key="img">
          <img :src="img" alt="" loading="lazy" />
        </van-swipe-item>
      </van-swipe>

      <div v-if="shareNotice" class="share-notice"><van-icon name="share-o" />{{ shareNotice }}</div>
      <div class="info-card">
        <div class="price-row">
          <div class="price"><span>¥</span>{{ currentSku?.price || product.sellPrice }}</div>
          <div class="original">¥{{ currentSku?.originalPrice || product.originalPrice }}</div>
          <div class="sales">已售 {{ product.sales }}</div>
        </div>
        <div class="name">{{ product.spuName }}</div>
        <div class="tags">
          <span class="tag">{{ product.brandName }}</span>
          <span class="tag">{{ product.categoryName }}</span>
          <span class="tag" v-for="t in product.serviceTags || []" :key="t">{{ t }}</span>
        </div>
        <div class="sku-row" @click="showSku = true">
          <span class="label">规格</span>
          <span class="value">{{ currentSku?.skuName || '请选择规格' }}</span>
          <van-icon name="arrow" />
        </div>
      </div>

      <div class="trace-card" v-if="product.trace" @click="goTrace(product.trace.traceCode)">
        <div class="trace-head">
          <van-icon name="shield-o" />
          <span>区块链溯源 · 已验证</span>
          <van-tag type="success" plain>已上链</van-tag>
        </div>
        <div class="trace-body">
          <div class="step" v-for="(s, i) in product.trace.steps.slice(0, 4)" :key="i">
            <span class="dot"></span>
            <div>
              <div class="step-name">{{ s.name }}</div>
              <div class="step-time">{{ s.time.slice(5, 16) }}</div>
            </div>
          </div>
        </div>
        <div class="trace-foot">批号 {{ product.trace.batchNo }} · {{ product.trace.qualityReport }} <van-icon name="arrow" /></div>
      </div>

      <div class="section">
        <div class="section-title">商品介绍</div>
        <div class="desc">{{ product.description }}</div>
        <div class="meta">
          <span>品牌：{{ product.brandName }}</span>
          <span>单位：{{ product.unit }}</span>
          <span>库存：{{ product.stock }}</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">规格参数</div>
        <div class="spec-row" v-for="s in product.specs || []" :key="s.name">
          <span class="spec-name">{{ s.name }}</span>
          <span class="spec-value">{{ s.value }}</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">图文详情</div>
        <div class="detail-block" v-for="d in product.detailSections || []" :key="d.title">
          <div class="detail-sub">{{ d.title }}</div>
          <div class="desc">{{ d.content }}</div>
        </div>
        <div class="detail-gallery">
          <img v-for="img in (product.images || []).slice(1, 5)" :key="img" :src="img" alt="" loading="lazy" />
        </div>
      </div>

      <div class="section">
        <div class="section-title">用户评价（{{ product.reviews?.length || 0 }}）</div>
        <div class="review" v-for="r in product.reviews" :key="r.id">
          <div class="review-head">
            <span class="user">{{ r.user }}</span>
            <van-rate v-model="r.score" readonly size="10" />
            <span class="time">{{ r.time }}</span>
          </div>
          <div class="review-content">{{ r.content }}</div>
        </div>
      </div>

      <div class="section" v-if="product.related?.length">
        <div class="section-title">相关推荐</div>
        <div class="related">
          <div class="related-item" v-for="p in product.related" :key="p.id" @click="router.push(`/product/${p.id}`)">
            <img :src="p.image" alt="" loading="lazy" />
            <div class="related-name">{{ p.spuName }}</div>
            <div class="related-price">¥{{ p.sellPrice }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="bottom-bar">
      <div class="bar-left">
        <div class="bar-item" @click="router.push('/cart')">
          <van-icon name="shopping-cart-o" size="20" />
          <span>购物车</span>
        </div>
        <div class="bar-item" @click="router.push('/trace')">
          <van-icon name="shield-o" size="20" />
          <span>验真</span>
        </div>
      </div>
      <div class="bar-right">
        <van-button type="warning" block @click="addCart">加入购物车</van-button>
        <van-button type="danger" block @click="buyNow">立即购买</van-button>
      </div>
    </div>

    <van-action-sheet v-model:show="showSku" title="选择规格">
      <div class="sku-panel">
        <div
          v-for="s in product.skus"
          :key="s.id"
          class="sku-item"
          :class="{ active: currentSku?.id === s.id }"
          @click="currentSku = s"
        >
          <span>{{ s.skuName }}</span>
          <span class="sku-price">¥{{ s.price }}</span>
        </div>
        <van-button type="primary" block round @click="addCart">确认加入购物车</van-button>
      </div>
    </van-action-sheet>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import request from '@/utils/request'

const route = useRoute()
const router = useRouter()
const product = ref<any>({})
const currentSku = ref<any>(null)
const showSku = ref(false)
const shareNotice = ref('')

const userId = () => Number(localStorage.getItem('userId') || 2)

const addCart = async () => {
  if (!currentSku.value) return showToast('请选择规格')
  await request.post('/cart/add', { userId: userId(), skuId: currentSku.value.id, quantity: 1 })
  showToast('已加入购物车')
  showSku.value = false
}

const buyNow = () => {
  if (!currentSku.value) {
    showSku.value = true
    return showToast('请选择规格')
  }
  sessionStorage.setItem('checkoutItems', JSON.stringify([{ skuId: currentSku.value.id, spuId: product.value.id, quantity: 1, image: product.value.image, name: product.value.spuName, skuName: currentSku.value.skuName, price: currentSku.value.price }]))
  router.push('/order/confirm')
}

const goTrace = (code: string) => router.push(`/trace?code=${code}`)

onMounted(async () => {
  product.value = await request.get(`/h5/product/${route.params.id}`)
  currentSku.value = product.value.skus?.[0] || null
  const shareId = String(route.query.shareId || '')
  if (!shareId) return
  const key = `distributionShare:${product.value.id}`
  try {
    const result = await request.get('/distribution/attribution', {
      params: { shareId, spuId: product.value.id, userId: userId() }
    })
    if (result.valid) {
      localStorage.setItem(key, JSON.stringify({ shareId: result.shareId, expireTime: result.expireTime }))
      shareNotice.value = '已记录本次推广分享，下单时将自动关联'
    } else {
      localStorage.removeItem(key)
      shareNotice.value = result.reason || '分享链接已失效'
    }
  } catch {
    localStorage.removeItem(key)
    shareNotice.value = '分享校验暂不可用，仍可正常购买'
  }
})
</script>

<style lang="scss" scoped>
.product-detail {
  min-height: 100vh;
  padding-bottom: 70px;
  background: #f5f6fa;
}
.content {
  padding-top: 46px;
}
.gallery {
  height: 375px;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
.share-notice {
  margin: 10px 12px 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: #fdeef0;
  color: #c8102e;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.info-card {
  background: #fff;
  padding: 14px;
  .price-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    .price {
      color: #ee0a24;
      font-size: 26px;
      font-weight: 800;
      span {
        font-size: 14px;
      }
    }
    .original {
      color: #b0b3b8;
      text-decoration: line-through;
      font-size: 12px;
    }
    .sales {
      margin-left: auto;
      font-size: 11px;
      color: #9aa0ad;
    }
  }
  .name {
    font-size: 16px;
    font-weight: 600;
    color: #7a0c1e;
    margin-top: 8px;
    line-height: 1.4;
  }
  .tags {
    display: flex;
    gap: 6px;
    margin-top: 8px;
    .tag {
      font-size: 10px;
      color: #c8102e;
      background: #fdeef0;
      padding: 2px 6px;
      border-radius: 4px;
    }
  }
  .sku-row {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #f2f3f7;
    display: flex;
    align-items: center;
    font-size: 13px;
    .label {
      color: #9aa0ad;
      width: 50px;
    }
    .value {
      flex: 1;
      color: #303133;
    }
  }
}
.trace-card {
  margin: 10px 12px;
  border-radius: 12px;
  background: linear-gradient(135deg, #7a0c1e, #c8102e);
  color: #fff;
  padding: 14px;
  .trace-head {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 600;
    :deep(.van-tag) {
      color: #c8f7c5;
      border-color: rgba(255, 255, 255, 0.5);
    }
  }
  .trace-body {
    display: flex;
    justify-content: space-between;
    margin-top: 14px;
    .step {
      display: flex;
      gap: 6px;
      font-size: 10px;
      opacity: 0.9;
      .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #7ef0ff;
        margin-top: 4px;
      }
      .step-time {
        opacity: 0.65;
        font-size: 9px;
        margin-top: 2px;
      }
    }
  }
  .trace-foot {
    margin-top: 12px;
    font-size: 11px;
    opacity: 0.8;
    display: flex;
    align-items: center;
    gap: 4px;
  }
}
.section {
  background: #fff;
  margin-top: 10px;
  padding: 14px;
  .section-title {
    font-size: 15px;
    font-weight: 600;
    color: #7a0c1e;
    margin-bottom: 10px;
  }
  .desc {
    font-size: 13px;
    color: #606266;
    line-height: 1.7;
  }
  .meta {
    display: flex;
    gap: 18px;
    margin-top: 10px;
    font-size: 11px;
    color: #9aa0ad;
  }
  .spec-row {
    display: flex;
    padding: 9px 0;
    border-bottom: 1px dashed #f0f1f5;
    font-size: 12px;
    &:last-child {
      border-bottom: none;
    }
    .spec-name {
      width: 86px;
      color: #9aa0ad;
      flex-shrink: 0;
    }
    .spec-value {
      color: #303133;
      flex: 1;
    }
  }
  .detail-block {
    margin-bottom: 12px;
    .detail-sub {
      font-size: 13px;
      font-weight: 600;
      color: #c8102e;
      margin-bottom: 4px;
    }
  }
  .detail-gallery {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 6px;
    img {
      width: 100%;
      height: 150px;
      object-fit: cover;
      border-radius: 8px;
      background: #f5f6fa;
    }
  }
  .review {
    padding: 10px 0;
    border-bottom: 1px solid #f2f3f7;
    .review-head {
      display: flex;
      align-items: center;
      gap: 8px;
      .user {
        font-size: 12px;
        color: #4b5563;
      }
      .time {
        margin-left: auto;
        font-size: 10px;
        color: #b0b3b8;
      }
    }
    .review-content {
      font-size: 12px;
      color: #606266;
      margin-top: 6px;
      line-height: 1.6;
    }
  }
  .related {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    .related-item {
      width: 100px;
      flex-shrink: 0;
      img {
        width: 100px;
        height: 100px;
        border-radius: 8px;
        object-fit: cover;
      }
      .related-name {
        font-size: 11px;
        color: #303133;
        margin-top: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .related-price {
        font-size: 12px;
        color: #ee0a24;
        font-weight: 600;
      }
    }
  }
}
.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 60px;
  background: #fff;
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 12px;
  box-shadow: 0 -2px 10px rgba(122, 12, 30, 0.06);
  .bar-left {
    display: flex;
    gap: 16px;
    .bar-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      font-size: 10px;
      color: #4b5563;
      gap: 2px;
    }
  }
  .bar-right {
    flex: 1;
    display: flex;
    gap: 8px;
  }
}
.sku-panel {
  padding: 16px;
  .sku-item {
    display: flex;
    justify-content: space-between;
    padding: 12px;
    border: 1px solid #ebeef5;
    border-radius: 10px;
    margin-bottom: 10px;
    font-size: 13px;
    &.active {
      border-color: #c8102e;
      background: #fdf3f4;
      color: #c8102e;
    }
    .sku-price {
      color: #ee0a24;
      font-weight: 600;
    }
  }
}
</style>
