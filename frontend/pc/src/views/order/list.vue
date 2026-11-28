<template>
  <div class="order-list-page">
    <div class="page-title">我的订单</div>

    <el-tabs v-model="activeTab" class="tabs" @tab-change="fetchData">
      <el-tab-pane v-for="t in ORDER_TABS" :key="t.key" :label="t.label" :name="t.key" />
    </el-tabs>

    <div v-loading="loading">
      <template v-if="orders.length">
        <el-card shadow="never" class="order-card" v-for="order in orders" :key="order.id">
          <div class="order-head">
            <span class="no">订单号：{{ order.orderNo }}</span>
            <el-tag :type="orderStatusTag(order.orderStatus)" size="small">{{ orderStatusText(order.orderStatus) }}</el-tag>
          </div>

          <div class="item" v-for="item in order.items" :key="item.id" @click="router.push(`/product/${item.spuId}`)">
            <el-image :src="item.image" fit="cover" class="cover">
              <template #error><div class="cover-fallback">福礼社</div></template>
            </el-image>
            <div class="info">
              <div class="name">{{ item.spuName }}</div>
              <div class="sku">{{ item.skuName }}</div>
            </div>
            <div class="price-wrap">
              <div class="price">¥{{ formatMoney(item.unitPrice) }}</div>
              <div class="qty">x{{ item.quantity }}</div>
            </div>
          </div>

          <div class="order-foot">
            <div class="meta">
              <span>{{ order.source }}</span>
              <span>{{ order.createTime }}</span>
              <span v-if="order.refundStatus !== null && order.refundStatus !== undefined" class="refund-tag">
                退款{{ refundStatusText(order.refundStatus) }}
              </span>
              <span v-if="order.invoiceStatus !== null && order.invoiceStatus !== undefined" class="invoice-tag">
                发票{{ invoiceStatusText(order.invoiceStatus) }}
              </span>
            </div>
            <div class="amount">实付 <PriceText :value="order.payAmount" :size="18" /></div>
          </div>

          <div class="actions">
            <el-button v-if="order.orderStatus === 0" size="small" type="danger" round @click="goPay(order)">去支付</el-button>
            <el-button v-if="order.orderStatus === 2" size="small" type="primary" round @click="complete(order)">确认收货</el-button>
            <el-button
              v-if="order.payStatus === 1 && (order.refundStatus === null || order.refundStatus === undefined || order.refundStatus === 3)"
              size="small" round plain @click="refund(order)"
            >申请退款</el-button>
            <el-button
              v-if="order.payStatus === 1 && [1, 2, 3].includes(order.orderStatus) && (order.invoiceStatus === null || order.invoiceStatus === undefined || order.invoiceStatus === 2)"
              size="small" round plain type="primary" @click="openInvoice(order)"
            >申请开票</el-button>
            <el-button size="small" round plain @click="viewTrace(order)">溯源查询</el-button>
          </div>
        </el-card>
      </template>
      <el-empty v-else-if="!loading" description="暂无订单" />
    </div>

    <!-- 申请开票 -->
    <el-dialog v-model="showInvoice" title="申请开票" width="480px">
      <el-form :model="invoiceForm" label-width="100px">
        <el-form-item label="发票抬头" required>
          <el-input v-model="invoiceForm.buyerName" placeholder="请输入个人姓名或企业名称" />
        </el-form-item>
        <el-form-item label="抬头类型">
          <el-radio-group v-model="invoiceForm.titleType">
            <el-radio :value="1">个人</el-radio>
            <el-radio :value="2">企业</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="发票类型">
          <el-radio-group v-model="invoiceForm.invoiceType">
            <el-radio :value="1">电子普票</el-radio>
            <el-radio :value="2">增值税专票</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="invoiceForm.titleType === 2 || invoiceForm.invoiceType === 2" label="纳税人识别号" required>
          <el-input v-model="invoiceForm.taxNo" placeholder="请输入纳税人识别号" />
        </el-form-item>
        <el-form-item label="接收邮箱">
          <el-input v-model="invoiceForm.email" placeholder="用于接收电子发票" />
        </el-form-item>
        <el-form-item label="开票金额">
          <el-input :model-value="`¥${formatMoney(invoiceForm.amount)}`" readonly />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showInvoice = false">取消</el-button>
        <el-button type="primary" :loading="invoiceSubmitting" @click="submitInvoice">提交申请</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import PriceText from '@/components/PriceText.vue'
import { formatMoney } from '@/utils/format'
import { ORDER_TABS, orderStatusText, orderStatusTag, refundStatusText, invoiceStatusText } from '@/constants/business'
import { getOrderList, completeOrder, applyRefund } from '@/api/order'
import { applyInvoice } from '@/api/invoice'
import { useUserStore } from '@/store/user'
import type { Order } from '@/api/types'

const router = useRouter()
const userStore = useUserStore()
const activeTab = ref('')
const orders = ref<Order[]>([])
const loading = ref(false)
const showInvoice = ref(false)
const invoiceSubmitting = ref(false)
const invoiceOrder = ref<Order | null>(null)
const invoiceForm = ref<any>({ buyerName: '', titleType: 1, invoiceType: 1, taxNo: '', email: '', amount: 0 })

const fetchData = async () => {
  loading.value = true
  try {
    const params: any = { userId: userStore.effectiveUserId }
    if (activeTab.value !== '') params.orderStatus = activeTab.value
    orders.value = await getOrderList(params)
  } finally {
    loading.value = false
  }
}

const goPay = (order: Order) => router.push(`/pay?orderNo=${order.orderNo}`)

const refund = (order: Order) => {
  ElMessageBox.confirm(
    `确认对订单 ${order.orderNo} 申请退款吗？提交后需商户审核，审核通过后原路退回。`,
    '申请退款',
    { type: 'warning', confirmButtonText: '确认申请', cancelButtonText: '取消' }
  ).then(async () => {
    await applyRefund({ orderNo: order.orderNo, reason: '用户申请退款' })
    ElMessage.success('退款申请已提交，等待审核')
    fetchData()
  }).catch(() => {})
}

const complete = async (order: Order) => {
  await completeOrder(order.id)
  ElMessage.success('已确认收货，订单完成')
  fetchData()
}

const openInvoice = (order: Order) => {
  invoiceOrder.value = order
  invoiceForm.value = { buyerName: '', titleType: 1, invoiceType: 1, taxNo: '', email: '', amount: Number(order.payAmount || 0) }
  showInvoice.value = true
}

const submitInvoice = async () => {
  if (!invoiceForm.value.buyerName.trim()) return ElMessage.warning('请填写发票抬头')
  if ((invoiceForm.value.titleType === 2 || invoiceForm.value.invoiceType === 2) && !invoiceForm.value.taxNo.trim()) {
    return ElMessage.warning('请填写纳税人识别号')
  }
  invoiceSubmitting.value = true
  try {
    await applyInvoice({
      userId: userStore.effectiveUserId,
      orderNo: invoiceOrder.value!.orderNo,
      ...invoiceForm.value
    })
    ElMessage.success('开票申请已提交')
    showInvoice.value = false
    fetchData()
  } finally {
    invoiceSubmitting.value = false
  }
}

const viewTrace = (order: Order) => {
  const spuId = order.items?.[0]?.spuId
  router.push(`/trace?code=TRC2026${String(30000 + (spuId || 1))}`)
}

onMounted(fetchData)
</script>

<style lang="scss" scoped>
.page-title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 8px;
}
.tabs {
  background: #fff;
  border-radius: 10px;
  padding: 0 16px;
  margin-bottom: 16px;
}
.order-card {
  border-radius: 12px;
  margin-bottom: 14px;
  .order-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 12px;
    border-bottom: 1px solid #f5f6fa;
    .no {
      font-size: 13px;
      color: var(--text-sub);
    }
  }
  .item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    cursor: pointer;
    .cover {
      width: 64px;
      height: 64px;
      border-radius: 8px;
      flex-shrink: 0;
      background: #f5f6fa;
    }
    .cover-fallback {
      width: 64px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #c0c4cc;
      font-size: 12px;
    }
    .info {
      flex: 1;
      min-width: 0;
      .name {
        font-size: 14px;
      }
      .sku {
        font-size: 12px;
        color: var(--text-sub);
        margin-top: 4px;
      }
    }
    .price-wrap {
      text-align: right;
      .price {
        font-size: 14px;
      }
      .qty {
        font-size: 12px;
        color: var(--text-sub);
        margin-top: 4px;
      }
    }
  }
  .order-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 12px;
    border-top: 1px solid #f5f6fa;
    .meta {
      display: flex;
      gap: 12px;
      font-size: 12px;
      color: var(--text-sub);
      .refund-tag {
        color: var(--price-red);
      }
      .invoice-tag {
        color: var(--brand-primary);
      }
    }
    .amount {
      display: flex;
      align-items: baseline;
      gap: 4px;
      font-size: 13px;
    }
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 12px;
  }
}
</style>
