<template>
  <div class="category-page">
    <van-nav-bar title="商品分类" fixed />
    <div class="content">
      <van-search v-model="keyword" placeholder="搜索礼盒 / 礼品卡 / 数码" background="#fff" @search="search" @clear="search" />

      <div class="layout">
        <div class="side">
          <div
            v-for="c in categories"
            :key="c.id"
            class="side-item"
            :class="{ active: activeCategory === c.id }"
            @click="selectCategory(c.id)"
          >
            {{ c.name }}
          </div>
        </div>

        <div class="main">
          <van-loading v-if="loading" class="loading" />
          <div v-else class="product-list">
            <div class="product-card" v-for="p in products" :key="p.id" @click="goDetail(p.id)">
              <img :src="p.image" alt="" class="cover" loading="lazy" />
              <div class="info">
                <div class="name">{{ p.spuName }}</div>
                <div class="tags">
                  <span class="tag">{{ p.brandName }}</span>
                  <span class="tag">{{ p.categoryName }}</span>
                </div>
                <div class="bottom">
                  <div class="price"><span>¥</span>{{ p.sellPrice }}</div>
                  <van-icon name="plus" class="add" @click.stop="addCart(p)" />
                </div>
                <div class="sales">已售 {{ p.sales }} · 库存 {{ p.stock }}</div>
              </div>
            </div>
            <van-empty v-if="!products.length" description="暂无商品" />
          </div>
        </div>
      </div>
    </div>
    <TabBar />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import TabBar from '@/components/TabBar.vue'
import request from '@/utils/request'

const router = useRouter()
const categories = ref<any[]>([])
const products = ref<any[]>([])
const activeCategory = ref(0)
const keyword = ref('')
const loading = ref(false)

const fetchProducts = async () => {
  loading.value = true
  try {
    const params: any = { current: 1, size: 50 }
    if (activeCategory.value) params.categoryId = activeCategory.value
    if (keyword.value) params.spuName = keyword.value
    const data = await request.get('/product/spu/page', { params })
    products.value = data.records
  } finally {
    loading.value = false
  }
}

const selectCategory = (id: number) => {
  activeCategory.value = activeCategory.value === id ? 0 : id
  fetchProducts()
}

const search = () => fetchProducts()
const goDetail = (id: number) => router.push(`/product/${id}`)

const addCart = async (p: any) => {
  const skuData = await request.get('/h5/product/' + p.id)
  const sku = skuData.skus?.[0]
  if (!sku) return showToast('商品暂无可售规格')
  await request.post('/cart/add', { userId: Number(localStorage.getItem('userId') || 2), skuId: sku.id, quantity: 1 })
  showToast('已加入购物车')
}

onMounted(async () => {
  const home = await request.get('/h5/home')
  categories.value = home.categories
  fetchProducts()
})
</script>

<style lang="scss" scoped>
.category-page {
  min-height: 100vh;
  padding-bottom: 60px;
  background: #f5f6fa;
}
.content {
  padding-top: 46px;
}
.layout {
  display: flex;
  height: calc(100vh - 46px - 54px - 60px);
}
.side {
  width: 88px;
  background: #f7f8fc;
  overflow-y: auto;
  .side-item {
    padding: 15px 8px;
    font-size: 12px;
    color: #4b5563;
    text-align: center;
    position: relative;
    &.active {
      background: #fff;
      color: #c8102e;
      font-weight: 600;
      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 12px;
        bottom: 12px;
        width: 3px;
        border-radius: 2px;
        background: #c8102e;
      }
    }
  }
}
.main {
  flex: 1;
  background: #fff;
  overflow-y: auto;
  padding: 10px;
  .loading {
    display: flex;
    justify-content: center;
    margin-top: 40px;
  }
}
.product-card {
  display: flex;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #f2f3f7;
  .cover {
    width: 92px;
    height: 92px;
    border-radius: 10px;
    object-fit: cover;
    flex-shrink: 0;
  }
  .info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    .name {
      font-size: 13px;
      color: #303133;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .tags {
      display: flex;
      gap: 4px;
      margin-top: 5px;
      .tag {
        font-size: 9px;
        color: #c8102e;
        background: #fdeef0;
        padding: 1px 5px;
        border-radius: 4px;
      }
    }
    .bottom {
      margin-top: auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      .price {
        color: #ee0a24;
        font-size: 17px;
        font-weight: 700;
        span {
          font-size: 11px;
        }
      }
      .add {
        background: #c8102e;
        color: #fff;
        border-radius: 50%;
        padding: 5px;
        font-size: 14px;
      }
    }
    .sales {
      font-size: 10px;
      color: #b0b3b8;
      margin-top: 3px;
    }
  }
}
</style>
