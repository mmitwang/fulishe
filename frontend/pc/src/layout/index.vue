<template>
  <div class="pc-layout">
    <AppHeader />
    <main class="pc-main">
      <div class="pc-container">
        <router-view />
      </div>
    </main>
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import AppHeader from './AppHeader.vue'
import AppFooter from './AppFooter.vue'
import { useCartStore } from '@/store/cart'

const cartStore = useCartStore()
onMounted(() => cartStore.refreshCount())
</script>

<style lang="scss" scoped>
.pc-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.pc-main {
  flex: 1;
  padding: 12px 0;
}
.pc-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}
</style>
