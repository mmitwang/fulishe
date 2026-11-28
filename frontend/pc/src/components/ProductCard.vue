<template>
  <div class="product-card" @click="goDetail">
    <div class="image-wrap">
      <el-image :src="product.image" fit="cover" lazy class="product-image">
        <template #placeholder><div class="img-placeholder" /></template>
        <template #error><div class="img-error">福礼社</div></template>
      </el-image>
      <span v-if="product.isNew" class="badge new">新品</span>
      <span class="badge self">自营</span>
    </div>
    <div class="name">{{ product.spuName }}</div>
    <div class="tags" v-if="product.tags?.length">
      <span v-for="t in product.tags.slice(0, 2)" :key="t" class="tag">{{ t }}</span>
    </div>
    <div class="price-row">
      <div class="price-left">
        <span class="price"><span class="symbol">¥</span><b>{{ formatMoney(product.sellPrice) }}</b></span>
        <span class="original">¥{{ formatMoney(product.originalPrice) }}</span>
      </div>
      <span class="sales">已售 {{ product.sales || 0 }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { formatMoney } from '@/utils/format'
import type { Product } from '@/api/types'

const props = defineProps<{ product: Product }>()
const router = useRouter()
const goDetail = () => router.push(`/product/${props.product.id}`)
</script>

<style lang="scss" scoped>
.product-card {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid transparent;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s;
  &:hover {
    border-color: #f5cdd4;
    box-shadow: 0 8px 22px rgba(122, 12, 30, 0.12);
    transform: translateY(-3px);
    .product-image { transform: scale(1.04); }
  }
  .image-wrap {
    position: relative;
    aspect-ratio: 1 / 1;
    background: #f5f6fa;
    overflow: hidden;
    .product-image {
      width: 100%;
      height: 100%;
      display: block;
      transition: transform 0.35s;
    }
    .img-error {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #c0c4cc;
      font-size: 14px;
    }
    .img-placeholder {
      width: 100%;
      height: 100%;
      background: linear-gradient(100deg, #f2f4f8 30%, #e6ebf5 50%, #f2f4f8 70%);
      background-size: 200% 100%;
      animation: pc-shine 1.2s linear infinite;
    }
    .badge {
      position: absolute;
      top: 8px;
      font-size: 11px;
      padding: 2px 7px;
      border-radius: 4px;
      color: #fff;
      &.new {
        left: 8px;
        background: var(--price-red);
      }
      &.self {
        right: 8px;
        background: var(--brand-primary);
      }
    }
  }
  .name {
    padding: 10px 12px 0;
    font-size: 13px;
    color: var(--text-main);
    line-height: 1.4;
    height: 38px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .tags {
    display: flex;
    gap: 4px;
    padding: 6px 12px 0;
    height: 22px;
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
  .price-row {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding: 8px 12px 12px;
    .price-left { display: flex; align-items: baseline; gap: 6px; }
    .price {
      color: var(--price-red);
      font-weight: 800;
      .symbol { font-size: 12px; }
      b { font-size: 20px; }
    }
    .original {
      font-size: 11px;
      color: #b0b3b8;
      text-decoration: line-through;
    }
    .sales { font-size: 11px; color: #b0b3b8; }
  }
}
@keyframes pc-shine {
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
}
</style>
