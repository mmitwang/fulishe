<template>
  <div class="settlement-page">
    <el-alert
      :title="authStore.isPlatformAdmin ? '确认结算仅更新 Mock 状态，不发生真实资金划转。' : isSupplier ? '供应商仅可核对本人结算单，不能确认结算。' : '商户可查看本商户结算单，结算确认由平台管理员办理。'"
      :type="authStore.isPlatformAdmin ? 'info' : 'warning'"
      :closable="false"
      class="scope-alert"
    />

    <el-row :gutter="16" class="stat-row" v-loading="statsLoading">
      <el-col v-for="item in statCards" :key="item.label" :xs="12" :md="6">
        <el-card shadow="never" class="stat-card">
          <div class="label">{{ item.label }}</div>
          <div class="value" :class="item.className">{{ item.value }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="table-card">
      <el-form :inline="true" :model="query" class="query-form">
        <el-form-item label="结算单号">
          <el-input v-model="query.settlementNo" placeholder="请输入结算单号" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 130px">
            <el-option label="待结算" :value="0" />
            <el-option label="结算中" :value="1" />
            <el-option label="已结算" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="rows" v-loading="loading" stripe>
        <el-table-column prop="settlementNo" label="结算单号" min-width="165" />
        <el-table-column prop="merchantName" label="经营商户" min-width="170" />
        <el-table-column prop="supplierName" label="合作供应商" min-width="190" />
        <el-table-column prop="period" label="结算周期" width="110" />
        <el-table-column label="应付金额" width="140" align="right">
          <template #default="{ row }"><span class="amount">¥{{ formatMoney(row.payableAmount) }}</span></template>
        </el-table-column>
        <el-table-column label="已付金额" width="140" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.paidAmount) }}</template>
        </el-table-column>
        <el-table-column label="结算进度" width="180">
          <template #default="{ row }">
            <el-progress :percentage="settlementPercentage(row)" :stroke-width="8" />
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusMeta[Number(row.status)]?.type || 'info'" size="small">
              {{ statusMeta[Number(row.status)]?.text || '未知' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="invoiceNo" label="发票号" width="130" />
        <el-table-column prop="settleTime" label="结算时间" min-width="165">
          <template #default="{ row }">{{ row.settleTime || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              v-if="authStore.isPlatformAdmin && Number(row.status) !== 2"
              link
              type="primary"
              :loading="settlingId === row.id"
              @click="settle(row)"
            >确认结算</el-button>
            <span v-else-if="Number(row.status) === 2" class="done">已完成</span>
            <span v-else class="readonly">{{ isSupplier ? '供应商只读' : '商户只读' }}</span>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.current"
        v-model:page-size="pagination.size"
        :total="pagination.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
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

const authStore = useAuthStore()
const isSupplier = computed(() => Boolean(authStore.userInfo?.roleCodes?.includes('supplier') && !authStore.isPlatformAdmin))
const statusMeta: Record<number, { text: string; type: 'primary' | 'success' | 'warning' | 'info' | 'danger' }> = {
  0: { text: '待结算', type: 'warning' },
  1: { text: '结算中', type: 'primary' },
  2: { text: '已结算', type: 'success' }
}
const loading = ref(false)
const statsLoading = ref(false)
const settlingId = ref<number | null>(null)
const rows = ref<any[]>([])
const statsData = ref<any>(null)
const query = reactive({ settlementNo: '', status: '' })
const pagination = reactive({ current: 1, size: 10, total: 0 })

const formatMoney = (value: unknown) => Number(value || 0).toLocaleString('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

const summary = computed(() => {
  if (!statsData.value) return null
  const records: any[] = statsData.value.records || []
  return {
    pendingAmount: records
      .filter(item => Number(item.status) !== 2)
      .reduce((sum, item) => sum + Math.max(0, Number(item.payableAmount || 0) - Number(item.paidAmount || 0)), 0),
    settledAmount: records
      .filter(item => Number(item.status) === 2)
      .reduce((sum, item) => sum + Number(item.paidAmount || 0), 0),
    total: Number(statsData.value.total || 0),
    merchantCount: new Set(records.map(item => Number(item.merchantId)).filter(Boolean)).size
  }
})

const statCards = computed(() => {
  const value = summary.value
  return [
    { label: '待结算金额', value: value ? `¥${formatMoney(value.pendingAmount)}` : '—', className: 'danger' },
    { label: '已结算金额', value: value ? `¥${formatMoney(value.settledAmount)}` : '—', className: 'success' },
    { label: '结算单数量', value: value ? value.total : '—', className: '' },
    { label: '经营商户数', value: value ? value.merchantCount : '—', className: '' }
  ]
})

const settlementPercentage = (row: any) => {
  const payable = Number(row.payableAmount || 0)
  if (payable <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((Number(row.paidAmount || 0) / payable) * 100)))
}

const fetchData = async () => {
  loading.value = true
  try {
    const data = await request.get('/admin/settlement/page', {
      params: { ...query, current: pagination.current, size: pagination.size }
    })
    rows.value = data.records || []
    pagination.total = data.total || 0
  } finally {
    loading.value = false
  }
}

const fetchStats = async () => {
  statsLoading.value = true
  try {
    statsData.value = await request.get('/admin/settlement/page', { params: { current: 1, size: 100 } })
  } finally {
    statsLoading.value = false
  }
}

const search = () => {
  pagination.current = 1
  fetchData()
}

const reset = () => {
  query.settlementNo = ''
  query.status = ''
  search()
}

const handleSizeChange = () => {
  pagination.current = 1
  fetchData()
}

const settle = async (row: any) => {
  if (!authStore.isPlatformAdmin) return
  try {
    await ElMessageBox.confirm(
      `确认将「${row.merchantName}」的结算单 ${row.settlementNo} 标记为已结算？此操作仅更新 Mock 状态，不发生真实资金划转。`,
      '确认 Mock 结算',
      { confirmButtonText: '确认状态', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }

  settlingId.value = row.id
  try {
    await request.put(`/admin/settlement/${row.id}/confirm`)
    ElMessage.success('Mock 结算状态已确认，未执行真实资金划转')
    await Promise.all([fetchData(), fetchStats()])
  } finally {
    settlingId.value = null
  }
}

onMounted(() => {
  fetchStats()
  fetchData()
})
</script>

<style scoped lang="scss">
.scope-alert {
  margin-bottom: 16px;
}

.stat-row {
  margin-bottom: 4px;

  .el-col {
    margin-bottom: 12px;
  }
}

.stat-card {
  height: 100%;
  border-radius: 12px;

  .label {
    color: #909399;
    font-size: 13px;
  }

  .value {
    margin-top: 8px;
    font-size: 23px;
    font-weight: 700;
    line-height: 1.35;
    word-break: break-all;

    &.danger {
      color: #f56c6c;
    }

    &.success {
      color: #67c23a;
    }
  }
}

.table-card {
  border-radius: 14px;
}

.amount {
  color: #f56c6c;
  font-weight: 600;
}

.done,
.readonly {
  color: #909399;
  font-size: 12px;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  overflow-x: auto;
}
</style>
