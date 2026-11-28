<template>
  <div class="product-detail">
    <!-- 骨架屏 -->
    <div v-if="loading" class="skeleton-wrap">
      <el-skeleton :rows="0" animated>
        <template #template>
          <div class="sk-top">
            <el-skeleton-item variant="image" class="sk-stage" />
            <div class="sk-info">
              <el-skeleton-item variant="rect" class="sk-price" />
              <el-skeleton-item variant="rect" class="sk-title" />
              <el-skeleton-item variant="rect" class="sk-line" />
              <el-skeleton-item variant="rect" class="sk-line short" />
              <el-skeleton-item variant="rect" class="sk-actions" />
            </div>
          </div>
          <el-skeleton-item variant="rect" class="sk-card" />
          <el-skeleton-item variant="rect" class="sk-card tall" />
        </template>
      </el-skeleton>
    </div>

    <template v-else-if="product.id">
      <el-breadcrumb class="crumb" separator="/">
        <el-breadcrumb-item @click="router.push('/home')">首页</el-breadcrumb-item>
        <el-breadcrumb-item @click="router.push('/category')">商品分类</el-breadcrumb-item>
        <el-breadcrumb-item v-if="product.categoryName" @click="goCategory">{{ product.categoryName }}</el-breadcrumb-item>
        <el-breadcrumb-item>{{ product.spuName }}</el-breadcrumb-item>
      </el-breadcrumb>

      <div v-if="shareNotice" class="share-notice"><el-icon><Share /></el-icon>{{ shareNotice }}</div>

      <div class="top">
        <!-- 图集：视频 + 图片 + 缩略图 -->
        <div class="gallery">
          <div class="stage">
            <video
              v-if="activeMedia?.type === 'video'"
              :key="activeMedia.src"
              :src="activeMedia.src"
              class="stage-video"
              controls
              playsinline
            />
            <el-image
              v-else-if="activeMedia"
              :src="activeMedia.src"
              fit="cover"
              class="stage-img"
              :preview-src-list="imageList"
              :initial-index="activeImagePreviewIndex"
              preview-teleported
              hide-on-click-modal
            >
              <template #error><div class="stage-fallback"><el-icon :size="34"><Picture /></el-icon>福礼社</div></template>
            </el-image>
            <span v-if="discountRate" class="discount-badge">{{ discountRate }}折</span>
          </div>

          <div class="thumbs" v-if="mediaList.length > 1">
            <div
              v-for="(m, i) in mediaList"
              :key="m.src + i"
              class="thumb"
              :class="{ active: i === activeIndex }"
              @mouseenter="activeIndex = i"
              @click="activeIndex = i"
            >
              <video v-if="m.type === 'video'" :src="m.src" class="thumb-media" muted />
              <el-image v-else :src="m.src" fit="cover" class="thumb-media">
                <template #error><div class="thumb-fallback">福礼社</div></template>
              </el-image>
              <span v-if="m.type === 'video'" class="play-mask"><el-icon><VideoPlay /></el-icon></span>
            </div>
          </div>
        </div>

        <!-- 信息 -->
        <div class="info">
          <div class="price-box">
            <div class="price-main">
              <PriceText :value="currentPrice" :size="34" />
              <span v-if="saveAmount > 0" class="save-tag">立省 ¥{{ formatMoney(saveAmount) }}</span>
            </div>
            <div class="price-sub">
              <span class="original" v-if="currentOriginal > currentPrice">原价 ¥{{ formatMoney(currentOriginal) }}</span>
              <span class="sales">已售 {{ product.sales }} {{ product.unit || '件' }}</span>
            </div>
          </div>

          <!-- 满减促销条：接 /h5/promotions/full-reduction，实时凑单 -->
          <div class="promo-bar" v-if="promoRules.length" @mouseenter="promoHover = true" @mouseleave="promoHover = false">
            <div class="promo-main">
              <span class="promo-tag"><el-icon><Present /></el-icon>{{ promotion.name }}</span>
              <span class="promo-text">
                <template v-if="matchedRule">已减 ¥{{ formatMoney(matchedRule.discountAmount) }}</template>
                <template v-if="nextRule">，再加 <b>¥{{ formatMoney(amountToNext) }}</b> 可减 ¥{{ formatMoney(nextRule.discountAmount) }}</template>
                <template v-if="!matchedRule && !nextRule">暂无可用档位</template>
              </span>
            </div>
            <el-progress
              :percentage="promoProgress"
              :show-text="false"
              :stroke-width="4"
              class="promo-bar-progress"
              color="#ff7a00"
            />
            <div class="promo-pop" v-if="promoHover">
              <div class="promo-pop-title">{{ promotion.name }} · 全部档位</div>
              <div
                class="promo-tier"
                v-for="r in promoRules"
                :key="r.id"
                :class="{ reached: currentAmount >= r.thresholdAmount }"
              >
                <span>满 ¥{{ formatMoney(r.thresholdAmount) }}</span>
                <b>减 ¥{{ formatMoney(r.discountAmount) }}</b>
                <span class="promo-tier-state">{{ currentAmount >= r.thresholdAmount ? '已享' : '未达' }}</span>
              </div>
            </div>
          </div>

          <h1 class="name">{{ product.spuName }}</h1>

          <div class="tags">
            <el-tag v-if="product.brandName" size="small" effect="dark">{{ product.brandName }}</el-tag>
            <el-tag v-if="product.categoryName" size="small" effect="plain" type="info">{{ product.categoryName }}</el-tag>
            <el-tag v-for="t in product.tags || []" :key="t" size="small" effect="plain" type="warning">{{ t }}</el-tag>
          </div>

          <div class="row">
            <span class="label">规格</span>
            <div class="sku-list">
              <div
                v-for="s in product.skus"
                :key="s.id"
                class="sku-item"
                :class="{ active: currentSku?.id === s.id, disabled: !s.stock }"
                @click="chooseSku(s)"
              >
                <span class="sku-name">{{ s.skuName }}</span>
                <span class="sku-price">¥{{ formatMoney(s.price) }}</span>
                <span v-if="!s.stock" class="sku-sold">缺货</span>
              </div>
            </div>
          </div>

          <div class="row">
            <span class="label">数量</span>
            <el-input-number v-model="quantity" :min="1" :max="maxQty" :disabled="!canBuy" />
            <span class="stock" :class="{ low: lowStock }">
              {{ canBuy ? (lowStock ? `仅剩 ${maxQty} 件` : `库存 ${maxQty} 件`) : '暂时缺货' }}
            </span>
          </div>

          <!-- 配送服务行：接 /h5/addresses 默认地址 -->
          <div class="row">
            <span class="label">配送</span>
            <div class="delivery">
              <span class="deliver-to"><el-icon><Location /></el-icon>送至 {{ defaultRegion || '请选择收货地址' }}</span>
              <span class="deliver-dot">·</span>
              <span>48 小时出库</span>
              <span class="deliver-dot">·</span>
              <span>免运费</span>
              <span class="deliver-dot">·</span>
              <span>7 天无理由</span>
            </div>
          </div>

          <div class="row service-row" v-if="product.serviceTags?.length">
            <span class="label">保障</span>
            <div class="service-list">
              <span v-for="s in product.serviceTags" :key="s" class="service-item">
                <el-icon><Select /></el-icon>{{ s }}
              </span>
              <span class="service-item"><el-icon><Select /></el-icon>自营仓直发 · 48 小时出库</span>
            </div>
          </div>

          <div class="row" v-if="currentSku?.skuCode">
            <span class="label">编码</span>
            <span class="sku-code">{{ currentSku.skuCode }}</span>
          </div>

          <div class="buy-actions">
            <el-button type="warning" size="large" :icon="ShoppingCart" :disabled="!canBuy" @click="addCart">加入购物车</el-button>
            <el-button type="danger" size="large" :disabled="!canBuy" @click="buyNow">立即购买</el-button>
          </div>
        </div>
      </div>

      <!-- 溯源条 -->
      <div class="trace-card" v-if="product.trace" @click="goTrace(product.trace.traceCode)">
        <div class="trace-left">
          <div class="trace-head">
            <el-icon><Lock /></el-icon>
            <span>区块链溯源 · 已上链</span>
            <el-tag type="success" size="small" effect="dark">可验真</el-tag>
          </div>
          <div class="trace-steps">
            <div class="tstep" v-for="(s, i) in (product.trace.steps || []).slice(0, 5)" :key="i">
              <span class="dot" />
              <div>
                <div class="tstep-name">{{ s.name }}</div>
                <div class="tstep-time">{{ (s.time || '').slice(5, 16) }}</div>
              </div>
            </div>
          </div>
          <div class="trace-foot">
            <span>批号 {{ product.trace.batchNo }}</span>
            <span>质检 {{ product.trace.qualityReport }}</span>
            <span>产地 {{ (product.trace.origin || '').slice(0, 12) }}</span>
          </div>
        </div>
        <div class="trace-right">
          <div class="hash">存证 {{ (product.trace.chainTxHash || '').slice(0, 10) }}…</div>
          <el-button type="primary" plain round size="small">查看完整溯源</el-button>
        </div>
      </div>

      <!-- 吸顶锚点导航 -->
      <div class="anchor-bar">
        <div class="anchor-inner">
          <a
            v-for="a in anchors"
            :key="a.id"
            class="anchor-item"
            :class="{ active: activeAnchor === a.id }"
            @click.prevent="scrollTo(a.id)"
          >{{ a.label }}</a>
        </div>
      </div>

      <!-- 商品介绍 -->
      <section class="detail-section" id="intro" :ref="collectSection">
        <div class="section-title">商品介绍</div>
        <p class="desc">{{ product.description }}</p>
        <div class="section-list">
          <div class="section-block" v-for="d in product.detailSections || []" :key="d.title">
            <div class="block-title">{{ d.title }}</div>
            <p class="desc">{{ d.content }}</p>
          </div>
        </div>
        <div class="basic-grid">
          <div class="basic-item"><span>商品编码</span><b>{{ product.spuCode || '-' }}</b></div>
          <div class="basic-item"><span>品牌</span><b>{{ product.brandName || '-' }}</b></div>
          <div class="basic-item"><span>分类</span><b>{{ product.categoryName || '-' }}</b></div>
          <div class="basic-item"><span>单位</span><b>{{ product.unit || '-' }}</b></div>
          <div class="basic-item"><span>毛重</span><b>{{ product.weight || '-' }}</b></div>
          <div class="basic-item"><span>供应商</span><b>{{ product.merchantName || '-' }}</b></div>
        </div>
      </section>

      <!-- 规格参数 -->
      <section class="detail-section" id="spec" :ref="collectSection">
        <div class="section-title">规格参数</div>
        <div class="spec-row" v-for="s in product.specs || []" :key="s.name">
          <span class="spec-name">{{ s.name }}</span>
          <span class="spec-value">{{ s.value }}</span>
        </div>
        <div class="empty-sub" v-if="!(product.specs || []).length">暂无规格参数</div>
        <el-table :data="product.skus || []" size="small" class="sku-table" border>
          <el-table-column prop="skuName" label="规格名称" min-width="180" />
          <el-table-column prop="skuCode" label="SKU 编码" width="140" />
          <el-table-column label="售价" width="110">
            <template #default="{ row }"><span class="price-cell">¥{{ formatMoney(row.price) }}</span></template>
          </el-table-column>
          <el-table-column label="库存" width="90">
            <template #default="{ row }">
              <span :class="{ 'stock-zero': !row.stock }">{{ row.stock || 0 }}</span>
            </template>
          </el-table-column>
        </el-table>
      </section>

      <!-- 图文详情 -->
      <section class="detail-section" id="detail" :ref="collectSection">
        <div class="section-title">图文详情</div>
        <div class="detail-gallery">
          <el-image
            v-for="img in (product.images || [])"
            :key="img"
            :src="img"
            fit="cover"
            lazy
            class="dg-img"
            :preview-src-list="product.images || []"
            preview-teleported
          >
            <template #error><div class="dg-fallback">福礼社</div></template>
          </el-image>
        </div>
        <div class="empty-sub" v-if="!(product.images || []).length">暂无图文详情</div>
        <div class="detail-video" v-if="product.videoUrl">
          <div class="block-title">商品视频</div>
          <video :src="product.videoUrl" controls playsinline class="dv-player" />
        </div>
      </section>

      <!-- 用户评价 -->
      <section class="detail-section" id="review" :ref="collectSection">
        <div class="section-title">用户评价 <span class="title-count">（{{ reviewList.length }}）</span></div>
        <div class="review-summary" v-if="reviewList.length">
          <div class="avg">
            <div class="avg-score">{{ avgScore.toFixed(1) }}</div>
            <el-rate :model-value="avgScore" disabled size="small" />
            <div class="avg-count">{{ reviewList.length }} 条评价 · 好评率 {{ goodRate }}%</div>
          </div>
          <div class="review-tags">
            <span class="rtag" v-for="t in reviewTags" :key="t.label" :class="{ active: t.count > 0 }">
              {{ t.label }} {{ t.count }}
            </span>
          </div>
          <div class="dist">
            <div class="dist-row" v-for="d in scoreDist" :key="d.n">
              <span class="dist-label">{{ d.n }} 星</span>
              <el-progress
                :percentage="reviewList.length ? Math.round((d.count / reviewList.length) * 100) : 0"
                :show-text="false"
                :stroke-width="8"
                class="dist-bar"
              />
              <span class="dist-count">{{ d.count }}</span>
            </div>
          </div>
        </div>
        <div class="review" v-for="r in reviewList" :key="r.id">
          <div class="review-avatar">{{ avatarChar(r.user) }}</div>
          <div class="review-body">
            <div class="review-head">
              <span class="user">{{ r.user }}</span>
              <el-rate :model-value="r.score" disabled size="small" />
              <span class="time">{{ r.time }}</span>
            </div>
            <div class="review-content">{{ r.content }}</div>
          </div>
        </div>
        <el-empty v-if="!reviewList.length" description="暂无评价" />
      </section>

      <!-- 相关推荐 -->
      <section class="detail-section related-section" id="related" :ref="collectSection">
        <div class="section-title">相关推荐</div>
        <div class="related-grid" v-if="product.related?.length">
          <ProductCard v-for="p in product.related" :key="p.id" :product="p" />
        </div>
        <el-empty v-else description="暂无相关推荐" />
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Share, Lock, ShoppingCart, Picture, VideoPlay, Select, Location, Present } from '@element-plus/icons-vue'
import PriceText from '@/components/PriceText.vue'
import ProductCard from '@/components/ProductCard.vue'
import { formatMoney } from '@/utils/format'
import { getProductDetail } from '@/api/product'
import { addCart as apiAddCart } from '@/api/cart'
import { getFullReduction } from '@/api/promotion'
import { getAddresses } from '@/api/address'
import { getAttribution } from '@/api/distribution'
import { useUserStore } from '@/store/user'
import { useCartStore } from '@/store/cart'
import type { ProductDetail, Sku, PromotionRule } from '@/api/types'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()

const product = ref<Partial<ProductDetail>>({})
const currentSku = ref<Sku | null>(null)
const quantity = ref(1)
const loading = ref(false)
const shareNotice = ref('')
const activeIndex = ref(0)

// 满减促销
const promotion = ref<{ name: string; rules: PromotionRule[] }>({ name: '', rules: [] })
const promoHover = ref(false)
// 配送
const defaultRegion = ref('')

/* ------- 图集 ------- */
const mediaList = computed(() => {
  const list: { type: 'video' | 'image'; src: string }[] = []
  if (product.value.videoUrl) list.push({ type: 'video', src: product.value.videoUrl })
  const imgs = product.value.images?.length ? product.value.images : (product.value.image ? [product.value.image] : [])
  imgs.forEach(src => list.push({ type: 'image', src }))
  return list
})
const activeMedia = computed(() => mediaList.value[activeIndex.value] || mediaList.value[0] || null)
const imageList = computed(() => mediaList.value.filter(m => m.type === 'image').map(m => m.src))
const activeImagePreviewIndex = computed(() => {
  const media = activeMedia.value
  if (!media || media.type !== 'image') return 0
  return Math.max(0, imageList.value.indexOf(media.src))
})

/* ------- 价格 ------- */
const currentPrice = computed(() => Number(currentSku.value?.price ?? product.value.sellPrice ?? 0))
const currentOriginal = computed(() => Number(currentSku.value?.originalPrice ?? product.value.originalPrice ?? 0))
const saveAmount = computed(() =>
  currentOriginal.value > currentPrice.value ? Number((currentOriginal.value - currentPrice.value).toFixed(2)) : 0
)
const discountRate = computed(() => {
  if (currentOriginal.value <= 0 || currentOriginal.value <= currentPrice.value) return ''
  return (currentPrice.value / currentOriginal.value * 10).toFixed(1)
})

/* ------- 库存 / 数量 ------- */
const maxQty = computed(() => Math.max(1, Number(currentSku.value?.stock ?? product.value.stock ?? 0)))
const canBuy = computed(() => !!currentSku.value && Number(currentSku.value.stock ?? 0) > 0)
const lowStock = computed(() => canBuy.value && maxQty.value <= 10)

/* ------- 满减凑单 ------- */
const promoRules = computed(() => promotion.value.rules || [])
const currentAmount = computed(() => Number((currentPrice.value * quantity.value).toFixed(2)))
const matchedRule = computed(() => {
  const list = promoRules.value.filter(r => currentAmount.value >= r.thresholdAmount)
  return list.length ? list[list.length - 1] : null
})
const nextRule = computed(() => promoRules.value.find(r => currentAmount.value < r.thresholdAmount) || null)
const amountToNext = computed(() =>
  nextRule.value ? Number((nextRule.value.thresholdAmount - currentAmount.value).toFixed(2)) : 0
)
const promoProgress = computed(() => {
  if (!promoRules.value.length) return 0
  if (nextRule.value) return Math.min(100, Math.round((currentAmount.value / nextRule.value.thresholdAmount) * 100))
  return 100
})

/* ------- 评价 ------- */
const reviewList = computed(() => product.value.reviews || [])
const avgScore = computed(() =>
  reviewList.value.length ? reviewList.value.reduce((s, r) => s + r.score, 0) / reviewList.value.length : 0
)
const scoreDist = computed(() =>
  [5, 4, 3, 2, 1].map(n => ({ n, count: reviewList.value.filter(r => r.score === n).length }))
)
const goodRate = computed(() =>
  reviewList.value.length ? Math.round((reviewList.value.filter(r => r.score >= 4).length / reviewList.value.length) * 100) : 0
)
const reviewTags = computed(() => [
  { label: '好评', count: reviewList.value.filter(r => r.score >= 4).length },
  { label: '中评', count: reviewList.value.filter(r => r.score === 3).length },
  { label: '差评', count: reviewList.value.filter(r => r.score <= 2).length }
])
const avatarChar = (user: string) => (user || '?').trim().charAt(0).toUpperCase()

/* ------- 锚点导航 ------- */
const anchors = computed(() => [
  { id: 'intro', label: '商品介绍' },
  { id: 'spec', label: '规格参数' },
  { id: 'detail', label: '图文详情' },
  { id: 'review', label: `用户评价(${reviewList.value.length})` },
  { id: 'related', label: '相关推荐' }
])
const activeAnchor = ref('intro')
const sectionRefs = ref<HTMLElement[]>([])
let observer: IntersectionObserver | null = null
const collectSection = (el: Element | ComponentPublicInstance | null) => {
  if (el instanceof HTMLElement && !sectionRefs.value.includes(el)) sectionRefs.value.push(el)
}
const setupObserver = () => {
  observer?.disconnect()
  if (!sectionRefs.value.length) return
  observer = new IntersectionObserver((entries) => {
    const map = new Map(entries.map(e => [e.target.id, e.isIntersecting]))
    const hit = sectionRefs.value.find(el => map.get(el.id))
    if (hit) activeAnchor.value = hit.id
  }, { rootMargin: '-120px 0px -70% 0px', threshold: 0 })
  sectionRefs.value.forEach(el => observer!.observe(el))
}
const scrollTo = (id: string) => {
  activeAnchor.value = id
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const chooseSku = (s: Sku) => {
  if (!s.stock) return ElMessage.warning('该规格暂时缺货')
  currentSku.value = s
  if (quantity.value > s.stock) quantity.value = s.stock
}

const loadPromotion = async () => {
  try {
    const data = await getFullReduction()
    promotion.value = { name: data.name || '全场满减', rules: data.rules || [] }
  } catch {
    promotion.value = { name: '', rules: [] }
  }
}

const loadDefaultRegion = async () => {
  try {
    const list = await getAddresses(userStore.effectiveUserId)
    const def = list.find(a => a.isDefault) || list[0]
    defaultRegion.value = def?.region || ''
  } catch {
    defaultRegion.value = ''
  }
}

const load = async (id: string | number) => {
  loading.value = true
  sectionRefs.value = []
  try {
    const data = await getProductDetail(id)
    product.value = data
    currentSku.value = data.skus?.find(s => s.stock > 0) || data.skus?.[0] || null
    quantity.value = 1
    activeIndex.value = 0
    activeAnchor.value = 'intro'
    document.title = `${data.spuName} · 福礼社商城`
    handleAttribution(data.id)
    await nextTick()
    setupObserver()
  } finally {
    loading.value = false
  }
}

const handleAttribution = async (spuId?: number) => {
  shareNotice.value = ''
  const shareId = String(route.query.shareId || '')
  if (!shareId || !spuId) return
  const key = `distributionShare:${spuId}`
  try {
    const result = await getAttribution({ shareId, spuId, userId: userStore.effectiveUserId })
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
}

const assertBuyable = () => {
  if (!currentSku.value) {
    ElMessage.warning('请选择规格')
    return false
  }
  if (!currentSku.value.stock) {
    ElMessage.warning('该规格暂时缺货')
    return false
  }
  if (quantity.value > currentSku.value.stock) {
    ElMessage.warning(`库存仅剩 ${currentSku.value.stock} 件`)
    return false
  }
  return true
}

const addCart = async () => {
  if (!assertBuyable()) return
  await apiAddCart({ userId: userStore.effectiveUserId, skuId: currentSku.value!.id, quantity: quantity.value })
  ElMessage.success(`已加入购物车（${quantity.value} 件）`)
  cartStore.refreshCount()
}

const buyNow = () => {
  if (!assertBuyable()) return
  const item = {
    skuId: currentSku.value!.id,
    spuId: product.value.id,
    quantity: quantity.value,
    image: product.value.image,
    name: product.value.spuName,
    skuName: currentSku.value!.skuName,
    price: currentSku.value!.price
  }
  sessionStorage.setItem('checkoutItems', JSON.stringify([item]))
  router.push('/order/confirm')
}

const goTrace = (code?: string) => router.push(code ? `/trace?code=${code}` : '/trace')
const goCategory = () => {
  if (product.value.categoryId) router.push({ path: '/category', query: { categoryId: String(product.value.categoryId) } })
  else router.push('/category')
}

watch(() => route.params.id, (id) => {
  if (id && route.name === 'ProductDetail') load(id as string)
})

onMounted(() => {
  loadPromotion()
  loadDefaultRegion()
  load(route.params.id as string)
})
onUnmounted(() => observer?.disconnect())
</script>

<style lang="scss" scoped>
.product-detail {
  padding-bottom: 40px;
}
.crumb {
  margin-bottom: 14px;
  :deep(.el-breadcrumb__item) {
    cursor: pointer;
  }
}
.share-notice {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fdeef0;
  color: var(--brand-primary);
  font-size: 13px;
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 14px;
}

/* 骨架屏 */
.skeleton-wrap {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  .sk-top {
    display: flex;
    gap: 28px;
  }
  .sk-stage {
    width: 440px;
    height: 440px;
    border-radius: 10px;
    flex-shrink: 0;
  }
  .sk-info {
    flex: 1;
  }
  .sk-price {
    height: 60px;
    width: 60%;
    border-radius: 8px;
    margin-bottom: 16px;
  }
  .sk-title {
    height: 22px;
    width: 80%;
    border-radius: 4px;
    margin-bottom: 14px;
  }
  .sk-line {
    height: 16px;
    border-radius: 4px;
    margin-bottom: 12px;
    &.short {
      width: 50%;
    }
  }
  .sk-actions {
    height: 40px;
    width: 70%;
    border-radius: 8px;
    margin-top: 20px;
  }
  .sk-card {
    height: 120px;
    border-radius: 10px;
    margin-top: 16px;
    &.tall {
      height: 260px;
    }
  }
}

.top {
  display: flex;
  gap: 28px;
  background: #fff;
  border-radius: 12px;
  padding: 24px;
}

/* 图集 */
.gallery {
  width: 440px;
  flex-shrink: 0;
}
.stage {
  position: relative;
  width: 440px;
  height: 440px;
  border-radius: 10px;
  overflow: hidden;
  background: #f5f6fa;
}
.stage-img,
.stage-video {
  width: 440px;
  height: 440px;
  display: block;
  object-fit: cover;
}
.stage-video {
  background: #000;
}
.stage-fallback {
  width: 440px;
  height: 440px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #c0c4cc;
}
.discount-badge {
  position: absolute;
  left: 0;
  top: 0;
  background: var(--price-red);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
  border-bottom-right-radius: 10px;
}
.thumbs {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
}
.thumb {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 6px;
  overflow: hidden;
  border: 2px solid transparent;
  cursor: pointer;
  background: #f5f6fa;
  &.active {
    border-color: var(--brand-primary);
  }
}
.thumb-media {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}
.thumb-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #c0c4cc;
}
.play-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  font-size: 22px;
}

/* 信息区 */
.info {
  flex: 1;
  min-width: 0;
  .price-box {
    background: linear-gradient(90deg, #fff5f5, #fff);
    padding: 16px;
    border-radius: 8px;
    .price-main {
      display: flex;
      align-items: baseline;
      gap: 10px;
    }
    .save-tag {
      background: var(--price-red);
      color: #fff;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 600;
    }
    .price-sub {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-top: 6px;
      .original {
        color: #b0b3b8;
        text-decoration: line-through;
        font-size: 13px;
      }
      .sales {
        margin-left: auto;
        font-size: 12px;
        color: var(--text-sub);
      }
    }
  }
  .name {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-main);
    margin: 16px 0 10px;
    line-height: 1.4;
  }
  .tags {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 18px;
  }
  .row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 18px;
    .label {
      width: 48px;
      flex-shrink: 0;
      color: var(--text-sub);
      font-size: 13px;
      line-height: 32px;
    }
    .stock {
      font-size: 12px;
      color: var(--text-sub);
      line-height: 32px;
      &.low {
        color: var(--price-red);
        font-weight: 600;
      }
    }
    .sku-code {
      font-size: 12px;
      color: var(--text-sub);
      line-height: 32px;
      font-family: Consolas, monospace;
    }
  }
  .sku-list {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    .sku-item {
      position: relative;
      padding: 7px 14px;
      border: 1px solid #dcdfe6;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      line-height: 1.3;
      &:hover {
        border-color: var(--brand-primary);
      }
      .sku-name {
        font-size: 13px;
      }
      .sku-price {
        font-size: 11px;
        color: var(--text-sub);
        margin-top: 2px;
      }
      &.active {
        border-color: var(--brand-primary);
        color: var(--brand-primary);
        background: #fdf3f4;
        .sku-price {
          color: var(--brand-primary);
        }
      }
      &.disabled {
        color: #c0c4cc;
        background: #f5f6fa;
        cursor: not-allowed;
        border-style: dashed;
        .sku-price {
          color: #c0c4cc;
          text-decoration: line-through;
        }
        .sku-sold {
          font-size: 10px;
          color: #c0c4cc;
        }
      }
    }
  }
  .delivery {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    line-height: 32px;
    font-size: 13px;
    color: #606266;
    .deliver-to {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--brand-primary);
      font-weight: 600;
    }
    .deliver-dot {
      color: #dcdfe6;
    }
  }
  .service-row {
    .service-list {
      display: flex;
      gap: 18px;
      flex-wrap: wrap;
      line-height: 32px;
      .service-item {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        color: #606266;
        .el-icon {
          color: #07c160;
        }
      }
    }
  }
  .buy-actions {
    margin-top: 26px;
    display: flex;
    gap: 14px;
  }
}

/* 满减促销条 */
.promo-bar {
  position: relative;
  margin-top: 14px;
  background: linear-gradient(90deg, #fff7ed, #fff);
  border: 1px solid #ffe0b8;
  border-radius: 8px;
  padding: 10px 14px;
  cursor: default;
  .promo-main {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: #b45309;
  }
  .promo-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: #ff7a00;
    color: #fff;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 4px;
  }
  .promo-text b {
    color: #ff7a00;
    font-weight: 700;
  }
  .promo-bar-progress {
    margin-top: 8px;
    :deep(.el-progress-bar__outer) {
      background: #ffe8cc;
    }
  }
  .promo-pop {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    right: 0;
    background: #fff;
    border: 1px solid #ffe0b8;
    border-radius: 8px;
    padding: 12px 14px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
    z-index: 5;
    .promo-pop-title {
      font-size: 12px;
      font-weight: 600;
      color: #b45309;
      margin-bottom: 8px;
    }
    .promo-tier {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      padding: 4px 0;
      color: #606266;
      b {
        color: var(--price-red);
      }
      &.reached {
        color: #07c160;
        b {
          color: #07c160;
        }
      }
      .promo-tier-state {
        margin-left: auto;
        font-size: 11px;
      }
    }
  }
}

/* 溯源 */
.trace-card {
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  background: linear-gradient(135deg, #7a0c1e, #c8102e);
  color: #fff;
  border-radius: 12px;
  padding: 18px 22px;
  cursor: pointer;
  .trace-head {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
  }
  .trace-steps {
    display: flex;
    gap: 26px;
    margin-top: 14px;
    .tstep {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      .dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #f0556b;
        margin-top: 5px;
      }
      .tstep-name {
        font-size: 13px;
      }
      .tstep-time {
        font-size: 11px;
        opacity: 0.7;
        margin-top: 2px;
      }
    }
  }
  .trace-foot {
    display: flex;
    gap: 18px;
    margin-top: 12px;
    font-size: 12px;
    opacity: 0.85;
  }
  .trace-right {
    text-align: right;
    flex-shrink: 0;
    .hash {
      font-size: 11px;
      opacity: 0.7;
      font-family: Consolas, monospace;
      margin-bottom: 10px;
    }
  }
}

/* 吸顶锚点 */
.anchor-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  margin-top: 16px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(122, 12, 30, 0.06);
  .anchor-inner {
    display: flex;
    gap: 8px;
    padding: 0 12px;
  }
  .anchor-item {
    padding: 14px 18px;
    font-size: 14px;
    color: #606266;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: color 0.2s, border-color 0.2s;
    &:hover {
      color: var(--brand-primary);
    }
    &.active {
      color: var(--brand-primary);
      font-weight: 600;
      border-bottom-color: var(--brand-primary);
    }
  }
}

/* 内容区块 */
.detail-section {
  scroll-margin-top: 64px;
  margin-top: 16px;
  background: #fff;
  border-radius: 12px;
  padding: 22px 24px;
  .section-title {
    font-size: 17px;
    font-weight: 700;
    color: var(--text-main);
    margin-bottom: 16px;
    padding-left: 10px;
    border-left: 3px solid var(--brand-primary);
    .title-count {
      font-size: 13px;
      color: var(--text-sub);
      font-weight: 400;
    }
  }
  .desc {
    font-size: 14px;
    color: #606266;
    line-height: 1.8;
  }
  .empty-sub {
    font-size: 13px;
    color: #c0c4cc;
    padding: 16px 0;
  }
  .section-list {
    margin-top: 16px;
    .section-block {
      margin-bottom: 16px;
    }
    .block-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--brand-primary);
      margin-bottom: 6px;
    }
  }
  .basic-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1px;
    background: #f0f1f5;
    border: 1px solid #f0f1f5;
    border-radius: 8px;
    overflow: hidden;
    margin-top: 8px;
    .basic-item {
      background: #fff;
      padding: 12px 16px;
      display: flex;
      gap: 10px;
      font-size: 13px;
      span {
        color: var(--text-sub);
        width: 64px;
        flex-shrink: 0;
      }
      b {
        color: var(--text-main);
        font-weight: 500;
      }
    }
  }
  .spec-row {
    display: flex;
    padding: 10px 0;
    border-bottom: 1px dashed #f0f1f5;
    font-size: 13px;
    .spec-name {
      width: 120px;
      color: var(--text-sub);
    }
    .spec-value {
      color: var(--text-main);
    }
  }
  .sku-table {
    margin-top: 16px;
    .price-cell {
      color: var(--price-red);
      font-weight: 600;
    }
    .stock-zero {
      color: var(--price-red);
    }
  }
  .detail-gallery {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    .dg-img {
      width: 100%;
      height: 180px;
      border-radius: 8px;
      background: #f5f6fa;
    }
    .dg-fallback {
      width: 100%;
      height: 180px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #c0c4cc;
    }
  }
  .detail-video {
    margin-top: 18px;
    .block-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--brand-primary);
      margin-bottom: 8px;
    }
    .dv-player {
      width: 100%;
      max-height: 460px;
      border-radius: 10px;
      background: #000;
    }
  }
}

/* 评价 */
.review-summary {
  display: flex;
  gap: 40px;
  align-items: flex-start;
  background: #fafbfe;
  border-radius: 10px;
  padding: 16px 20px;
  margin-bottom: 10px;
  .avg {
    text-align: center;
    min-width: 150px;
    .avg-score {
      font-size: 34px;
      font-weight: 800;
      color: var(--price-red);
      line-height: 1.1;
    }
    .avg-count {
      font-size: 12px;
      color: var(--text-sub);
      margin-top: 4px;
    }
  }
  .review-tags {
    display: flex;
    gap: 10px;
    padding-top: 8px;
    .rtag {
      font-size: 12px;
      color: #c0c4cc;
      background: #f0f1f5;
      padding: 3px 10px;
      border-radius: 12px;
      &.active {
        color: var(--brand-primary);
        background: #fdeef0;
      }
    }
  }
  .dist {
    flex: 1;
    .dist-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
      .dist-label {
        width: 36px;
        font-size: 12px;
        color: var(--text-sub);
      }
      .dist-bar {
        flex: 1;
      }
      .dist-count {
        width: 24px;
        text-align: right;
        font-size: 12px;
        color: var(--text-sub);
      }
    }
  }
}
.review {
  display: flex;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid #f2f3f7;
  .review-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: linear-gradient(135deg, #c8102e, #f0556b);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 600;
    flex-shrink: 0;
  }
  .review-body {
    flex: 1;
    min-width: 0;
  }
  .review-head {
    display: flex;
    align-items: center;
    gap: 10px;
    .user {
      font-size: 13px;
      color: var(--text-main);
    }
    .time {
      margin-left: auto;
      font-size: 12px;
      color: var(--text-sub);
    }
  }
  .review-content {
    font-size: 13px;
    color: #606266;
    margin-top: 8px;
    line-height: 1.6;
  }
}

/* 相关推荐 */
.related-section {
  .related-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
}
</style>
