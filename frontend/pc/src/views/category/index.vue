<template>
  <div class="category-page">
    <!-- 面包屑 -->
    <div class="breadcrumb">
      <span @click="router.push('/home')">首页</span>
      <el-icon><ArrowRight /></el-icon>
      <span>商品分类</span>
      <el-icon><ArrowRight /></el-icon>
      <span class="current">{{ currentCategoryName }}</span>
    </div>

    <!-- 搜索 -->
    <div class="search-row">
      <el-input
        v-model="keyword"
        placeholder="搜索礼盒 / 礼品卡 / 数码"
        clearable
        size="large"
        class="search-input"
        @keyup.enter="onSearch"
        @clear="onSearch"
      >
        <template #append><el-button :icon="Search" @click="onSearch" /></template>
      </el-input>
    </div>

    <div class="layout">
      <aside class="side">
        <div class="side-head">商品分类</div>
        <div class="side-item" :class="{ active: activeCategory === 0 }" @click="selectCategory(0)">
          <span>全部商品</span>
          <el-icon v-if="activeCategory === 0"><ArrowRight /></el-icon>
        </div>
        <div
          v-for="c in categories"
          :key="c.id"
          class="side-item"
          :class="{ active: activeCategory === c.id }"
          @click="selectCategory(c.id)"
        >
          <span>{{ c.name }}</span>
          <el-icon v-if="activeCategory === c.id"><ArrowRight /></el-icon>
        </div>
      </aside>

      <div class="main">
        <!-- 排序条 -->
        <div class="sort-bar">
          <div class="sort-left">共 <b>{{ total }}</b> 件商品</div>
          <div class="sort-right">
            <span :class="{ active: sortBy === 'default' }" @click="setSort('default')">综合</span>
            <span :class="{ active: sortBy === 'sales' }" @click="setSort('sales')">销量</span>
            <span :class="{ active: sortBy === 'price-asc' || sortBy === 'price-desc' }" @click="togglePrice">
              价格
              <span class="price-arrows">
                <i :class="{ on: sortBy === 'price-asc' }">▲</i>
                <i :class="{ on: sortBy === 'price-desc' }">▼</i>
              </span>
            </span>
            <span :class="{ active: sortBy === 'new' }" @click="setSort('new')">新品</span>
          </div>
        </div>

        <div class="product-area" v-loading="loading">
          <template v-if="sortedProducts.length">
            <div class="grid">
              <div class="p-card" v-for="p in sortedProducts" :key="p.id">
                <div class="p-img-wrap" @click="goDetail(p.id)">
                  <el-image :src="p.image" fit="cover" lazy class="p-img">
                    <template #error><div class="p-fallback">福礼社</div></template>
                  </el-image>
                  <span v-if="p.isNew" class="p-badge">新品</span>
                </div>
                <div class="p-body">
                  <div class="p-name" @click="goDetail(p.id)">{{ p.spuName }}</div>
                  <div class="p-tags">
                    <span class="tag" v-if="p.brandName">{{ p.brandName }}</span>
                    <span class="tag" v-if="p.categoryName">{{ p.categoryName }}</span>
                  </div>
                  <div class="p-bottom">
                    <div class="p-price">
                      <PriceText :value="p.sellPrice" :size="20" />
                      <span class="p-original">¥{{ formatMoney(p.originalPrice) }}</span>
                    </div>
                    <el-button type="primary" circle size="small" :icon="Plus" class="p-add" @click.stop="addCart(p)" />
                  </div>
                  <div class="p-sales">已售 {{ p.sales }} · 库存 {{ p.stock }}</div>
                </div>
              </div>
            </div>
            <div class="pager">
              <el-pagination
                background
                layout="total, prev, pager, next"
                :total="total"
                :current-page="current"
                :page-size="size"
                @current-change="onPage"
              />
            </div>
          </template>
          <el-empty v-else-if="!loading" description="暂无商品" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Plus, ArrowRight } from '@element-plus/icons-vue'
import PriceText from '@/components/PriceText.vue'
import { formatMoney } from '@/utils/format'
import { getHome } from '@/api/home'
import { getSpuPage, getProductDetail } from '@/api/product'
import { addCart as apiAddCart } from '@/api/cart'
import { useUserStore } from '@/store/user'
import { useCartStore } from '@/store/cart'
import type { Product } from '@/api/types'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()

const categories = ref<{ id: number; name: string }[]>([])
const products = ref<Product[]>([])
const activeCategory = ref(0)
const keyword = ref('')
const total = ref(0)
const current = ref(1)
const size = ref(12)
const loading = ref(false)
const sortBy = ref('default')

const currentCategoryName = computed(() => {
  if (!activeCategory.value) return '全部商品'
  return categories.value.find(c => c.id === activeCategory.value)?.name || '全部商品'
})

const sortedProducts = computed(() => {
  const list = [...products.value]
  switch (sortBy.value) {
    case 'sales': return list.sort((a, b) => Number(b.sales || 0) - Number(a.sales || 0))
    case 'price-asc': return list.sort((a, b) => Number(a.sellPrice || 0) - Number(b.sellPrice || 0))
    case 'price-desc': return list.sort((a, b) => Number(b.sellPrice || 0) - Number(a.sellPrice || 0))
    case 'new': return list.sort((a, b) => String(b.createTime || '').localeCompare(String(a.createTime || '')))
    default: return list
  }
})

const fetchProducts = async () => {
  loading.value = true
  try {
    const params: any = { current: current.value, size: size.value }
    if (activeCategory.value) params.categoryId = activeCategory.value
    if (keyword.value) params.spuName = keyword.value
    const data = await getSpuPage(params)
    products.value = data.records || []
    total.value = data.total || 0
  } finally {
    loading.value = false
  }
}

const syncQuery = () => {
  const query: any = {}
  if (keyword.value) query.keyword = keyword.value
  if (activeCategory.value) query.categoryId = String(activeCategory.value)
  if (current.value > 1) query.current = String(current.value)
  router.replace({ path: '/category', query })
}

const selectCategory = (id: number) => {
  activeCategory.value = id
  current.value = 1
  syncQuery()
  fetchProducts()
}

const onSearch = () => {
  current.value = 1
  syncQuery()
  fetchProducts()
}

const onPage = (p: number) => {
  current.value = p
  syncQuery()
  fetchProducts()
}

const setSort = (key: string) => { sortBy.value = key }
const togglePrice = () => { sortBy.value = sortBy.value === 'price-asc' ? 'price-desc' : 'price-asc' }

const goDetail = (id: number) => router.push(`/product/${id}`)

const addCart = async (p: Product) => {
  const detail = await getProductDetail(p.id)
  const sku = detail.skus?.find(s => s.stock > 0)
  if (!sku) return ElMessage.warning('商品暂时缺货')
  await apiAddCart({ userId: userStore.effectiveUserId, skuId: sku.id, quantity: 1 })
  ElMessage.success('已加入购物车')
  cartStore.refreshCount()
}

// 从 Header 全局搜索进入时同步 keyword
watch(() => route.query.keyword, (val) => {
  const v = String(val || '')
  if (v !== keyword.value) {
    keyword.value = v
    current.value = 1
    fetchProducts()
  }
})

// 顶部导航切换分类时同步：同一路由仅 query 变化，onMounted 不会重跑
watch(() => route.query.categoryId, (val) => {
  const id = Number(val || 0)
  if (id !== activeCategory.value) {
    activeCategory.value = id
    current.value = 1
    fetchProducts()
  }
})

onMounted(async () => {
  keyword.value = String(route.query.keyword || '')
  activeCategory.value = Number(route.query.categoryId || 0)
  current.value = Number(route.query.current || 1)
  const home = await getHome()
  categories.value = home.categories || []
  fetchProducts()
})
</script>

<style lang="scss" scoped>
.category-page { padding-top: 16px; }
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-sub);
  margin-bottom: 14px;
  span { cursor: pointer; &:hover { color: var(--brand-primary); } }
  .current { color: var(--text-main); cursor: default; }
  .el-icon { font-size: 12px; }
}
.search-row {
  margin-bottom: 16px;
  .search-input { max-width: 520px; }
}
.layout {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}
.side {
  width: 200px;
  flex-shrink: 0;
  background: #fff;
  border-radius: 8px;
  padding-bottom: 8px;
  overflow: hidden;
  .side-head {
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
  .side-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 18px;
    font-size: 14px;
    color: var(--text-main);
    cursor: pointer;
    position: relative;
    transition: all 0.15s;
    &:hover { background: #fdf3f4; color: var(--brand-primary); }
    &.active {
      color: var(--brand-primary);
      font-weight: 600;
      background: #fdf3f4;
      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 10px;
        bottom: 10px;
        width: 3px;
        border-radius: 2px;
        background: var(--brand-primary);
      }
    }
  }
}
.main { flex: 1; min-width: 0; }
.sort-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-radius: 8px;
  padding: 0 16px;
  height: 44px;
  margin-bottom: 14px;
  .sort-left { font-size: 13px; color: var(--text-sub); b { color: var(--price-red); } }
  .sort-right {
    display: flex;
    align-items: center;
    gap: 4px;
    span {
      font-size: 13px;
      color: var(--text-main);
      padding: 5px 14px;
      border-radius: 4px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 2px;
      &:hover { color: var(--brand-primary); }
      &.active { background: var(--brand-primary); color: #fff; }
    }
    .price-arrows {
      display: inline-flex;
      flex-direction: column;
      line-height: 0.7;
      font-size: 8px;
      i { font-style: normal; color: inherit; opacity: 0.5; &.on { opacity: 1; } }
    }
  }
}
.product-area { min-height: 320px; }
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
.p-card {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid transparent;
  transition: all 0.2s;
  &:hover {
    border-color: #f5cdd4;
    box-shadow: 0 8px 22px rgba(122, 12, 30, 0.1);
    transform: translateY(-2px);
  }
  .p-img-wrap {
    position: relative;
    aspect-ratio: 1 / 1;
    background: #f5f6fa;
    cursor: pointer;
    .p-img { width: 100%; height: 100%; display: block; }
    .p-badge {
      position: absolute;
      left: 8px;
      top: 8px;
      font-size: 11px;
      color: #fff;
      background: var(--brand-primary);
      padding: 2px 7px;
      border-radius: 4px;
    }
  }
  .p-fallback {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #c0c4cc;
  }
  .p-body { padding: 10px 12px 12px; }
  .p-name {
    font-size: 13px;
    line-height: 1.4;
    height: 38px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    cursor: pointer;
    &:hover { color: var(--brand-primary); }
  }
  .p-tags {
    display: flex;
    gap: 4px;
    margin-top: 6px;
    height: 18px;
    overflow: hidden;
    .tag {
      font-size: 10px;
      color: var(--brand-primary);
      background: #fdeef0;
      padding: 1px 6px;
      border-radius: 4px;
      white-space: nowrap;
    }
  }
  .p-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 8px;
    .p-price { display: flex; align-items: baseline; gap: 6px; }
    .p-original {
      font-size: 11px;
      color: #b0b3b8;
      text-decoration: line-through;
    }
    .p-add { flex-shrink: 0; }
  }
  .p-sales { margin-top: 6px; font-size: 11px; color: #b0b3b8; }
}
.pager {
  display: flex;
  justify-content: center;
  margin-top: 22px;
}
</style>
