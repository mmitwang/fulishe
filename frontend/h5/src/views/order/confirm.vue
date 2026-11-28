<template>
  <div class="order-confirm">
    <van-nav-bar title="确认订单" fixed left-arrow @click-left="router.back()" />
    <div class="content">
      <div class="address-card">
        <div class="address-head">
          <van-icon name="location-o" />
          <span>收货信息</span>
        </div>
        <van-field v-model="form.receiver" label="收货人" placeholder="请输入收货人" />
        <van-field v-model="form.mobile" label="手机号" placeholder="请输入手机号" />
        <van-field v-model="form.address" label="地址" type="textarea" rows="2" placeholder="请输入详细收货地址" />
      </div>

      <div class="card">
        <div class="card-title">商品清单</div>
        <div class="product-item" v-for="(item, idx) in items" :key="idx">
          <img :src="item.image" alt="" class="cover" />
          <div class="info">
            <div class="name">{{ item.name }}</div>
            <div class="sku">{{ item.skuName }}</div>
            <div class="bottom">
              <span class="price">¥{{ item.price }}</span>
              <span class="qty">x{{ item.quantity }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <van-cell title="优惠券" is-link :value="couponText" @click="showCoupon = true" />
        <van-cell title="配送方式" value="顺丰包邮" />
        <van-field v-model="form.remark" label="订单备注" placeholder="选填，如发票、包装要求" />
      </div>

      <div class="card summary">
        <div class="row"><span>商品金额</span><span>¥{{ totalAmount }}</span></div>
        <div class="row"><span>运费</span><span class="free">免运费</span></div>
        <div class="row" v-if="promotion"><span>{{ promotion.name || '全场满减' }}</span><span class="discount">满 {{ promotion.thresholdAmount }} 减 {{ promotion.discountAmount }}</span></div>
        <div class="row"><span>优惠合计</span><span class="discount">-¥{{ discountAmount }}</span></div>
        <div class="row total"><span>实付金额</span><span class="amount">¥{{ payAmount }}</span></div>
      </div>
    </div>

    <div class="bottom-bar">
      <div class="total">实付 <span class="amount">¥{{ payAmount }}</span></div>
      <van-button type="danger" round :loading="submitting" @click="submit">提交订单</van-button>
    </div>

    <van-popup v-model:show="showCoupon" position="bottom" round>
      <div class="coupon-popup">
        <div class="popup-title">选择优惠券</div>
        <div class="coupon-option" :class="{ active: !selectedCoupon }" @click="choose(null)">
          <span>不使用优惠券</span>
        </div>
        <div
          v-for="c in usableCoupons"
          :key="c.id"
          class="coupon-option"
          :class="{ active: selectedCoupon?.id === c.id }"
          @click="choose(c)"
        >
          <div>
            <div class="coupon-name">{{ c.templateName }}</div>
            <div class="coupon-cond">满 {{ c.minAmount }} 可用 · 有效期至 {{ c.expireTime?.slice(0, 10) }}</div>
          </div>
          <span class="coupon-value">-¥{{ c.faceValue }}</span>
        </div>
        <van-empty v-if="!usableCoupons.length" description="暂无可用优惠券" :image-size="60" />
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import request from '@/utils/request'

const router = useRouter()
const items = ref<any[]>([])
const coupons = ref<any[]>([])
const promotionRules = ref<any[]>([])
const selectedCoupon = ref<any>(null)
const showCoupon = ref(false)
const submitting = ref(false)
const user = JSON.parse(localStorage.getItem('userInfo') || '{}')
const form = reactive({
  receiver: user.realName || '张三',
  mobile: user.mobile || '13800138005',
  address: '浙江省杭州市西湖区文三路 90 号东部软件园 3 号楼',
  remark: ''
})

const totalAmount = computed(() => Number(items.value.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)))
const promotion = computed(() => [...promotionRules.value]
  .sort((a, b) => a.thresholdAmount - b.thresholdAmount)
  .filter(rule => totalAmount.value >= rule.thresholdAmount)
  .pop() || null)
const couponDiscountAmount = computed(() => {
  if (!selectedCoupon.value) return 0
  const c = selectedCoupon.value
  if (c.couponType === 2) return Math.round(totalAmount.value * (1 - c.faceValue / 100))
  return c.faceValue
})
const discountAmount = computed(() => Number(((promotion.value?.discountAmount || 0) + couponDiscountAmount.value).toFixed(2)))
const payAmount = computed(() => Math.max(1, Number((totalAmount.value - discountAmount.value).toFixed(2))))
const usableCoupons = computed(() => coupons.value.filter(c => c.status === 0 && totalAmount.value >= c.minAmount))
const couponText = computed(() => selectedCoupon.value ? `-¥${couponDiscountAmount.value}` : (usableCoupons.value.length ? `${usableCoupons.value.length} 张可用` : '暂无可用'))

const choose = (c: any) => {
  selectedCoupon.value = c
  showCoupon.value = false
}

const shareIdFor = (spuId: number) => {
  if (!spuId) return undefined
  const key = `distributionShare:${spuId}`
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null')
    const expireAt = new Date(String(saved?.expireTime || '').replace(' ', 'T')).getTime()
    if (saved?.shareId && expireAt >= Date.now()) return saved.shareId
  } catch {
    // 本地归因损坏时仅忽略分享，不影响正常下单。
  }
  localStorage.removeItem(key)
  return undefined
}

const submit = async () => {
  if (!form.receiver || !form.mobile || !form.address) return showToast('请完善收货信息')
  submitting.value = true
  try {
    const res = await request.post('/order/create', {
      userId: Number(localStorage.getItem('userId') || 2),
      items: items.value.map(i => ({ skuId: i.skuId, quantity: i.quantity, shareId: shareIdFor(Number(i.spuId)) })),
      receiver: form.receiver,
      mobile: form.mobile,
      address: form.address,
      remark: form.remark,
      couponId: selectedCoupon.value?.id,
      promotionId: promotion.value?.id ?? 0
    })
    sessionStorage.removeItem('checkoutItems')
    router.replace(`/pay?orderNo=${res.orderNo}&amount=${res.payAmount}`)
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  items.value = JSON.parse(sessionStorage.getItem('checkoutItems') || '[]')
  if (!items.value.length) {
    showToast('请先选择商品')
    router.replace('/cart')
    return
  }
  const [couponData, promotionData] = await Promise.all([
    request.get('/coupon/my', { params: { userId: Number(localStorage.getItem('userId') || 2) } }),
    request.get('/h5/promotions/full-reduction')
  ])
  coupons.value = couponData
  promotionRules.value = promotionData.rules || []
})
</script>

<style lang="scss" scoped>
.order-confirm {
  min-height: 100vh;
  padding-bottom: 80px;
  background: #f5f6fa;
}
.content {
  padding-top: 46px;
}
.address-card,
.card {
  background: #fff;
  margin: 10px 12px;
  border-radius: 12px;
  padding: 4px 0;
  overflow: hidden;
}
.address-card {
  .address-head {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    color: #7a0c1e;
    padding: 12px 16px 4px;
  }
}
.card-title {
  font-weight: 600;
  color: #7a0c1e;
  padding: 12px 16px 4px;
}
.product-item {
  display: flex;
  gap: 10px;
  padding: 10px 16px;
  .cover {
    width: 70px;
    height: 70px;
    border-radius: 8px;
    object-fit: cover;
  }
  .info {
    flex: 1;
    min-width: 0;
    .name {
      font-size: 13px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .sku {
      font-size: 11px;
      color: #9aa0ad;
      margin-top: 4px;
    }
    .bottom {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      .price {
        color: #ee0a24;
        font-weight: 700;
      }
      .qty {
        font-size: 12px;
        color: #9aa0ad;
      }
    }
  }
}
.summary {
  padding: 12px 16px;
  .row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: #606266;
    padding: 5px 0;
    &.total {
      border-top: 1px solid #f2f3f7;
      margin-top: 6px;
      padding-top: 10px;
      font-weight: 600;
      color: #303133;
    }
    .amount {
      color: #ee0a24;
      font-size: 18px;
    }
    .discount {
      color: #ee0a24;
    }
    .free {
      color: #07c160;
    }
  }
}
.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 62px;
  background: #fff;
  display: flex;
  align-items: center;
  padding: 0 14px;
  gap: 12px;
  box-shadow: 0 -2px 10px rgba(122, 12, 30, 0.06);
  .total {
    flex: 1;
    font-size: 13px;
    color: #606266;
    .amount {
      color: #ee0a24;
      font-size: 20px;
      font-weight: 700;
    }
  }
}
.coupon-popup {
  padding: 16px;
  max-height: 60vh;
  overflow-y: auto;
  .popup-title {
    font-weight: 600;
    text-align: center;
    margin-bottom: 12px;
  }
  .coupon-option {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 1px solid #ebeef5;
    border-radius: 10px;
    padding: 12px;
    margin-bottom: 10px;
    &.active {
      border-color: #ee0a24;
      background: #fff7f7;
    }
    .coupon-name {
      font-size: 13px;
      color: #303133;
    }
    .coupon-cond {
      font-size: 10px;
      color: #9aa0ad;
      margin-top: 4px;
    }
    .coupon-value {
      color: #ee0a24;
      font-weight: 700;
    }
  }
}
</style>
