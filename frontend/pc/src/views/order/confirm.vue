<template>
  <div class="order-confirm">
    <div class="page-title">确认订单</div>

    <el-row :gutter="16">
      <el-col :span="16">
        <!-- 收货信息 -->
        <el-card shadow="never" class="block">
          <div class="block-title">收货信息</div>
          <el-form :model="form" label-width="80px">
            <el-form-item label="收货人" required>
              <el-input v-model="form.receiver" placeholder="请输入收货人" />
            </el-form-item>
            <el-form-item label="手机号" required>
              <el-input v-model="form.mobile" placeholder="请输入手机号" />
            </el-form-item>
            <el-form-item label="收货地址" required>
              <el-input v-model="form.address" type="textarea" :rows="2" placeholder="请输入详细收货地址" />
            </el-form-item>
            <el-form-item label="订单备注">
              <el-input v-model="form.remark" placeholder="选填，如发票、包装要求" />
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 商品清单 -->
        <el-card shadow="never" class="block">
          <div class="block-title">商品清单</div>
          <div class="p-item" v-for="(item, idx) in items" :key="idx">
            <el-image :src="item.image" fit="cover" class="p-img">
              <template #error><div class="p-fallback">福礼社</div></template>
            </el-image>
            <div class="p-info">
              <div class="p-name">{{ item.name }}</div>
              <div class="p-sku">{{ item.skuName }}</div>
            </div>
            <div class="p-price">¥{{ formatMoney(item.price) }} × {{ item.quantity }}</div>
            <div class="p-sub">¥{{ formatMoney(item.price * item.quantity) }}</div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <!-- 优惠 -->
        <el-card shadow="never" class="block">
          <div class="block-title">优惠</div>
          <div class="opt-row">
            <span class="opt-label">优惠券</span>
            <el-select v-model="selectedCouponId" placeholder="选择优惠券" clearable style="width: 100%">
              <el-option label="不使用优惠券" :value="0" />
              <el-option
                v-for="c in usableCoupons"
                :key="c.id"
                :label="`${c.templateName}（-${couponLabel(c)}）`"
                :value="c.id"
              />
            </el-select>
          </div>
          <div class="opt-row">
            <span class="opt-label">配送方式</span>
            <span>顺丰包邮</span>
          </div>
          <div class="opt-row" v-if="promotion">
            <span class="opt-label">满减优惠</span>
            <span class="discount">{{ promotion.name || `满 ${promotion.thresholdAmount} 减 ${promotion.discountAmount}` }}</span>
          </div>
        </el-card>

        <!-- 金额 -->
        <el-card shadow="never" class="block">
          <div class="sum-row"><span>商品金额</span><span>¥{{ formatMoney(totalAmount) }}</span></div>
          <div class="sum-row"><span>运费</span><span class="free">免运费</span></div>
          <div class="sum-row"><span>优惠合计</span><span class="discount">-¥{{ formatMoney(discountAmount) }}</span></div>
          <el-divider />
          <div class="sum-row total"><span>实付金额</span><PriceText :value="payAmount" :size="24" /></div>
          <el-button type="danger" size="large" class="submit-btn" :loading="submitting" @click="submit">
            提交订单
          </el-button>
          <div class="tip">金额以服务端下单结果为准</div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import PriceText from '@/components/PriceText.vue'
import { formatMoney } from '@/utils/format'
import { createOrder } from '@/api/order'
import { getMyCoupons } from '@/api/coupon'
import { getFullReduction } from '@/api/promotion'
import { useUserStore } from '@/store/user'
import { useCartStore } from '@/store/cart'
import type { CheckoutItem, Coupon, PromotionRule } from '@/api/types'

const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()

const items = ref<CheckoutItem[]>([])
const coupons = ref<Coupon[]>([])
const promotionRules = ref<PromotionRule[]>([])
const selectedCouponId = ref(0)
const submitting = ref(false)

const form = reactive({
  receiver: userStore.userInfo?.realName || '张三',
  mobile: userStore.userInfo?.mobile || '13800138005',
  address: '浙江省杭州市西湖区文三路 90 号东部软件园 3 号楼',
  remark: ''
})

const totalAmount = computed(() => Number(items.value.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)))
const promotion = computed(() => [...promotionRules.value]
  .sort((a, b) => a.thresholdAmount - b.thresholdAmount)
  .filter(rule => totalAmount.value >= rule.thresholdAmount)
  .pop() || null)
const selectedCoupon = computed(() => coupons.value.find(c => c.id === selectedCouponId.value) || null)
const couponDiscountAmount = computed(() => {
  const c = selectedCoupon.value
  if (!c) return 0
  if (c.couponType === 2) return Math.round(totalAmount.value * (1 - c.faceValue / 100))
  return c.faceValue
})
const discountAmount = computed(() => Number(((promotion.value?.discountAmount || 0) + couponDiscountAmount.value).toFixed(2)))
const payAmount = computed(() => Math.max(1, Number((totalAmount.value - discountAmount.value).toFixed(2))))
const usableCoupons = computed(() => coupons.value.filter(c => c.status === 0 && totalAmount.value >= c.minAmount))

const couponLabel = (c: Coupon) => c.couponType === 2 ? `${(c.faceValue / 10).toFixed(1)}折` : `¥${c.faceValue}`

const shareIdFor = (spuId: number) => {
  if (!spuId) return undefined
  const key = `distributionShare:${spuId}`
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null')
    const expireAt = new Date(String(saved?.expireTime || '').replace(' ', 'T')).getTime()
    if (saved?.shareId && expireAt >= Date.now()) return saved.shareId
  } catch {
    // 本地归因损坏时仅忽略分享，不影响正常下单
  }
  localStorage.removeItem(key)
  return undefined
}

const submit = async () => {
  if (!form.receiver || !form.mobile || !form.address) return ElMessage.warning('请完善收货信息')
  submitting.value = true
  try {
    const res = await createOrder({
      userId: userStore.effectiveUserId,
      items: items.value.map(i => ({ skuId: i.skuId, quantity: i.quantity, shareId: shareIdFor(Number(i.spuId)) })),
      receiver: form.receiver,
      mobile: form.mobile,
      address: form.address,
      remark: form.remark,
      couponId: selectedCouponId.value || undefined,
      promotionId: promotion.value?.id ?? 0
    })
    sessionStorage.removeItem('checkoutItems')
    cartStore.refreshCount()
    ElMessage.success('下单成功')
    router.replace(`/pay?orderNo=${res.orderNo}`)
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  items.value = JSON.parse(sessionStorage.getItem('checkoutItems') || '[]')
  if (!items.value.length) {
    ElMessage.warning('请先选择商品')
    router.replace('/cart')
    return
  }
  const [couponData, promotionData] = await Promise.all([
    getMyCoupons(userStore.effectiveUserId),
    getFullReduction()
  ])
  coupons.value = couponData || []
  promotionRules.value = promotionData.rules || []
})
</script>

<style lang="scss" scoped>
.page-title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 16px;
}
.block {
  border-radius: 12px;
  margin-bottom: 16px;
  .block-title {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 16px;
  }
}
.p-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f5f6fa;
  &:last-child {
    border-bottom: none;
  }
  .p-img {
    width: 64px;
    height: 64px;
    border-radius: 8px;
    flex-shrink: 0;
    background: #f5f6fa;
  }
  .p-fallback {
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #c0c4cc;
    font-size: 12px;
  }
  .p-info {
    flex: 1;
    min-width: 0;
    .p-name {
      font-size: 14px;
    }
    .p-sku {
      font-size: 12px;
      color: var(--text-sub);
      margin-top: 4px;
    }
  }
  .p-price {
    font-size: 13px;
    color: var(--text-sub);
  }
  .p-sub {
    width: 90px;
    text-align: right;
    color: var(--price-red);
    font-weight: 600;
  }
}
.opt-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  font-size: 13px;
  .opt-label {
    width: 64px;
    flex-shrink: 0;
    color: var(--text-sub);
  }
  .discount {
    color: var(--price-red);
  }
}
.sum-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #606266;
  padding: 6px 0;
  &.total {
    align-items: center;
    font-weight: 600;
    color: var(--text-main);
  }
  .free {
    color: #07c160;
  }
  .discount {
    color: var(--price-red);
  }
}
.submit-btn {
  width: 100%;
  margin-top: 16px;
}
.tip {
  text-align: center;
  font-size: 11px;
  color: var(--text-sub);
  margin-top: 10px;
}
</style>
