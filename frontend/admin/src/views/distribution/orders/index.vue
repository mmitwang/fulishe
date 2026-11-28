<template>
  <div class="promotion-orders-page">
    <template v-if="isDistributor">
      <el-row :gutter="12" class="stat-row" v-loading="summaryLoading">
        <el-col v-for="item in statCards" :key="item.label" :xs="12" :sm="8" :lg="item.span">
          <el-card shadow="never" class="stat-card">
            <div class="stat-label">{{ item.label }}</div>
            <div class="stat-value" :class="item.tone">{{ item.value }}</div>
          </el-card>
        </el-col>
      </el-row>
    </template>

    <el-card class="table-card">
      <el-form :inline="true" :model="query" class="query-form">
        <el-form-item label="订单号">
          <el-input v-model="query.orderNo" placeholder="请输入订单号" clearable style="width: 220px" @keyup.enter="search" />
        </el-form-item>
        <el-form-item label="结算状态">
          <el-select v-model="query.status" placeholder="全部状态" clearable style="width: 140px">
            <el-option label="待结算" value="PENDING" />
            <el-option label="可结算" value="SETTLEABLE" />
            <el-option label="已结算" value="SETTLED" />
            <el-option label="已失效" value="INVALID" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="rows" v-loading="loading" border stripe>
        <el-table-column prop="promotionNo" label="推广单号" min-width="160" />
        <el-table-column prop="orderNo" label="订单号" min-width="175" />
        <el-table-column v-if="!isDistributor" prop="merchantName" label="经营商户" min-width="150" />
        <el-table-column v-if="!isDistributor" prop="distributorName" label="分销商" min-width="130" />
        <el-table-column prop="spuName" label="推广商品" min-width="180" show-overflow-tooltip />
        <el-table-column label="计佣基数" width="130" align="right">
          <template #default="{ row }">¥{{ formatCents(row.commissionBase) }}</template>
        </el-table-column>
        <el-table-column label="佣金率" width="100" align="center">
          <template #default="{ row }">{{ formatRateBp(row.commissionRateBp) }}</template>
        </el-table-column>
        <el-table-column label="结算周期" width="100" align="center">
          <template #default="{ row }">T+{{ Number(row.settleDays || 0) }}</template>
        </el-table-column>
        <el-table-column label="佣金金额" width="130" align="right">
          <template #default="{ row }"><span class="amount">¥{{ formatCents(row.commissionAmount) }}</span></template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusMeta(row.status).type" size="small">{{ getStatusMeta(row.status).text }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="paidTime" label="支付时间" min-width="165">
          <template #default="{ row }">{{ row.paidTime || '-' }}</template>
        </el-table-column>
        <el-table-column prop="settleableTime" label="可结算时间" min-width="185">
          <template #default="{ row }">
            <div>{{ row.settleableTime || '-' }}</div>
            <el-tag v-if="row.status === 'PENDING' && row.settleableTime" size="small" type="warning">T+N 未到期</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="settledTime" label="结算时间" min-width="165">
          <template #default="{ row }">{{ row.settledTime || '-' }}</template>
        </el-table-column>
        <el-table-column prop="invalidReason" label="失效原因" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ row.invalidReason || '-' }}</template>
        </el-table-column>
        <el-table-column v-if="authStore.isPlatformAdmin" label="操作" width="105" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'SETTLEABLE'"
              link
              type="primary"
              :loading="settlingId === row.id"
              :disabled="settlingId !== null && settlingId !== row.id"
              @click="settle(row as PromotionOrder)"
            >确认结算</el-button>
            <span v-else class="no-action">-</span>
          </template>
        </el-table-column>
        <template #empty><el-empty description="暂无推广订单" :image-size="90" /></template>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.current"
        v-model:page-size="pagination.size"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        class="pagination"
        @size-change="handleSizeChange"
        @current-change="fetchData"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'
import { useAuthStore } from '@/stores/auth'

type OrderStatus = 'PENDING' | 'SETTLEABLE' | 'SETTLED' | 'INVALID'
type TagType = 'primary' | 'success' | 'warning' | 'info' | 'danger'

interface PromotionOrder {
  id: number
  promotionNo: string
  orderNo: string
  merchantName: string
  distributorName: string
  spuName: string
  commissionBase: number
  commissionRateBp: number
  commissionAmount: number
  settleDays: number
  status: OrderStatus
  paidTime: string
  settleableTime: string
  settledTime: string
  invalidReason: string
}

interface DistributionSummary {
  selectionCount: number
  shareCount: number
  orderCount: number
  pendingCommissionCents: number
  settleableCommissionCents: number
  settledCommissionCents: number
  totalCommissionCents: number
}

interface PageResult<T> {
  records: T[]
  total: number
}

const authStore = useAuthStore()
const isDistributor = computed(() => Boolean(
  authStore.userInfo?.roleCodes?.includes('distributor') && !authStore.isPlatformAdmin
))
const loading = ref(false)
const summaryLoading = ref(false)
const settlingId = ref<number | null>(null)
const rows = ref<PromotionOrder[]>([])
const summary = ref<DistributionSummary | null>(null)
const query = reactive<{ orderNo: string; status: '' | OrderStatus }>({ orderNo: '', status: '' })
const pagination = reactive({ current: 1, size: 10, total: 0 })

const statusMeta: Record<OrderStatus, { text: string; type: TagType }> = {
  PENDING: { text: '待结算', type: 'warning' },
  SETTLEABLE: { text: '可结算', type: 'primary' },
  SETTLED: { text: '已结算', type: 'success' },
  INVALID: { text: '已失效', type: 'info' }
}

const formatCents = (value: number) => (Number(value || 0) / 100).toLocaleString('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})
const formatRateBp = (value: number) => `${Number((Number(value || 0) / 100).toFixed(2))}%`
const getStatusMeta = (status: OrderStatus) => statusMeta[status] || { text: '未知', type: 'info' as TagType }

const statCards = computed(() => {
  const data = summary.value
  const countValue = (value?: number) => data ? String(Number(value || 0)) : '—'
  const moneyValue = (value?: number) => data ? `¥${formatCents(value || 0)}` : '—'
  return [
    { label: '已选商品', value: countValue(data?.selectionCount), tone: '', span: 8 },
    { label: '分享数量', value: countValue(data?.shareCount), tone: '', span: 8 },
    { label: '推广订单', value: countValue(data?.orderCount), tone: '', span: 8 },
    { label: '待结算佣金', value: moneyValue(data?.pendingCommissionCents), tone: 'warning', span: 6 },
    { label: '可结算佣金', value: moneyValue(data?.settleableCommissionCents), tone: 'primary', span: 6 },
    { label: '已结算佣金', value: moneyValue(data?.settledCommissionCents), tone: 'success', span: 6 },
    { label: '累计佣金', value: moneyValue(data?.totalCommissionCents), tone: 'danger', span: 6 }
  ]
})

const fetchData = async () => {
  loading.value = true
  try {
    const data = await request.get<PageResult<PromotionOrder>>('/distribution/orders/page', {
      params: { ...query, current: pagination.current, size: pagination.size }
    })
    rows.value = data.records || []
    pagination.total = Number(data.total || 0)
  } finally {
    loading.value = false
  }
}

const fetchSummary = async () => {
  if (!isDistributor.value) return
  summaryLoading.value = true
  try {
    summary.value = await request.get<DistributionSummary>('/distribution/summary')
  } finally {
    summaryLoading.value = false
  }
}

const search = () => {
  pagination.current = 1
  fetchData()
}

const reset = () => {
  query.orderNo = ''
  query.status = ''
  search()
}

const handleSizeChange = () => {
  pagination.current = 1
  fetchData()
}

const settle = async (row: PromotionOrder) => {
  if (!authStore.isPlatformAdmin || row.status !== 'SETTLEABLE' || settlingId.value !== null) return
  try {
    await ElMessageBox.confirm(
      `确认将订单 ${row.orderNo} 的佣金 ¥${formatCents(row.commissionAmount)} 标记为已结算？该佣金适用 T+${Number(row.settleDays || 0)} 结算周期。此操作仅更新 Mock 状态，不发生真实资金划转。`,
      '确认 Mock 结算',
      { confirmButtonText: '确认结算', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }

  settlingId.value = row.id
  try {
    await request.put(`/distribution/orders/${row.id}/settle`)
    ElMessage.success('结算状态已更新（Mock，未发生真实资金划转）')
    await fetchData()
  } finally {
    settlingId.value = null
  }
}

onMounted(() => {
  fetchSummary()
  fetchData()
})
</script>

<style scoped lang="scss">
.promotion-orders-page {
  .stat-row {
    margin-bottom: 4px;

    .el-col {
      margin-bottom: 12px;
    }
  }

  .stat-card {
    height: 100%;
    border-radius: 12px;
  }

  .stat-label {
    color: #909399;
    font-size: 13px;
  }

  .stat-value {
    margin-top: 7px;
    color: #303133;
    font-size: 23px;
    font-weight: 700;
    line-height: 1.35;
    word-break: break-all;

    &.warning { color: #e6a23c; }
    &.primary { color: #c8102e; }
    &.success { color: #67c23a; }
    &.danger { color: #f56c6c; }
  }

  .table-card {
    border-radius: 14px;
  }

  .query-form {
    margin-bottom: 4px;
  }

  .amount {
    color: #f56c6c;
    font-weight: 600;
  }

  .no-action {
    color: #c0c4cc;
  }

  .pagination {
    margin-top: 18px;
    display: flex;
    justify-content: flex-end;
    overflow-x: auto;
  }
}

@media (max-width: 640px) {
  .promotion-orders-page {
    .stat-value {
      font-size: 19px;
    }

    .query-form :deep(.el-form-item) {
      margin-right: 0;
    }

    .query-form :deep(.el-input),
    .query-form :deep(.el-select) {
      width: min(220px, calc(100vw - 150px)) !important;
    }
  }
}
</style>
