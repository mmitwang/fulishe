<template>
  <footer class="app-footer">
    <div class="jd-container">
      <!-- 服务保障 -->
      <div class="promise-row">
        <div class="promise" v-for="p in promises" :key="p.title">
          <el-icon :size="20"><component :is="p.icon" /></el-icon>
          <div class="promise-text">
            <b>{{ p.title }}</b>
            <span>{{ p.desc }}</span>
          </div>
        </div>
      </div>

      <div class="footer-inner">
        <div class="footer-brand">
          <span class="name">福礼社</span>
          <span class="slogan">企业福利数智平台 · 区块链溯源</span>
        </div>
        <div class="footer-links">
          <span @click="router.push('/home')">首页</span>
          <span @click="router.push('/category')">商品分类</span>
          <span @click="router.push('/trace')">溯源验真</span>
          <span @click="router.push('/order/list')">我的订单</span>
          <span @click="router.push('/coupon')">我的卡券</span>
        </div>
        <div class="copyright">© 2026 福礼社 南樾星数字科技 · 客服热线 400-888-6688</div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { CircleCheck, Van, Wallet, Headset } from '@element-plus/icons-vue'
const router = useRouter()
const promises = [
  { title: '正品保障', desc: '自营直供 · 假一赔十', icon: CircleCheck },
  { title: '极速配送', desc: '48 小时出库 · 全国送达', icon: Van },
  { title: '无忧售后', desc: '7 天无理由 · 极速退款', icon: Wallet },
  { title: '企业专享', desc: '对公结算 · 开具发票', icon: Headset }
]
</script>

<style lang="scss" scoped>
.app-footer {
  background: #fff;
  border-top: 1px solid #f0f1f5;
  margin-top: 48px;
}
.promise-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 24px 0;
  border-bottom: 1px solid #f0f1f5;
  .promise {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: var(--brand-primary);
    .promise-text {
      display: flex;
      flex-direction: column;
      b { font-size: 14px; color: var(--text-main); }
      span { font-size: 11px; color: var(--text-sub); margin-top: 2px; }
    }
  }
}
.footer-inner {
  padding: 26px 0 30px;
  text-align: center;
}
.footer-brand {
  .name { font-size: 18px; font-weight: 700; color: var(--brand-primary); letter-spacing: 2px; margin-right: 10px; }
  .slogan { font-size: 12px; color: var(--text-sub); }
}
.footer-links {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin: 14px 0;
  span {
    font-size: 13px;
    color: #6b7280;
    cursor: pointer;
    &:hover { color: var(--brand-primary); }
  }
}
.copyright {
  font-size: 12px;
  color: #b0b3b8;
}
</style>
