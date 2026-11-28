<template>
  <span class="price-text" :style="{ fontSize: size + 'px' }">
    <span class="symbol">¥</span>{{ formatMoney(value) }}
  </span>
</template>

<script setup lang="ts">
import { formatMoney } from '@/utils/format'

withDefaults(defineProps<{ value: number | string | undefined | null; size?: number }>(), { size: 18 })
</script>

<style lang="scss" scoped>
.price-text {
  color: var(--price-red);
  font-weight: 700;
  .symbol {
    font-size: 0.7em;
    margin-right: 1px;
  }
}
</style>
