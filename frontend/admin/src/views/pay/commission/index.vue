<template>
  <div class="commission-manage">
    <el-row :gutter="12" class="summary-row">
      <el-col :span="6"><el-card shadow="never"><div class="stat"><div class="label">分账订单数</div><div class="value">{{ summary.splitCount }}</div></div></el-card></el-col>
      <el-col :span="6"><el-card shadow="never"><div class="stat"><div class="label">平台服务费</div><div class="value">¥{{ formatMoney(summary.platformFee) }}</div></div></el-card></el-col>
      <el-col :span="6"><el-card shadow="never"><div class="stat"><div class="label">商户应结</div><div class="value">¥{{ formatMoney(summary.merchantNet) }}</div></div></el-card></el-col>
      <el-col :span="6"><el-card shadow="never"><div class="stat"><div class="label">已退款分账</div><div class="value danger">{{ summary.refundedCount }}</div></div></el-card></el-col>
    </el-row>

    <el-card class="config-card">
      <template #header>
        <div class="card-header">
          <span>平台抽佣配置</span>
          <el-tag type="info" effect="plain">支付成功自动分账</el-tag>
        </div>
      </template>
      <el-form :model="configForm" label-width="140px" class="config-form">
        <el-form-item label="启用平台抽佣">
          <el-switch v-model="configForm.enabled" />
        </el-form-item>
        <el-form-item label="技术服务费率">
          <el-input-number v-model="configForm.ratePercent" :min="0" :max="20" :step="0.1" :precision="2" />
          <span class="hint">按订单实付金额计提，计入平台收入</span>
        </el-form-item>
        <el-form-item label="结算周期 T+N">
          <el-input-number v-model="configForm.settleDays" :min="0" :max="90" />
          <span class="hint">天</span>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="handleSave">保存配置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card>
      <div class="search-bar">
        <el-form :inline="true" :model="searchForm">
          <el-form-item label="订单单号">
            <el-input v-model="searchForm.orderNo" placeholder="请输入订单单号" clearable style="width: 220px" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-table v-loading="loading" :data="tableData" style="width: 100%" border stripe>
        <el-table-column prop="splitNo" label="分账单号" min-width="170" />
        <el-table-column prop="orderNo" label="订单单号" min-width="170" />
        <el-table-column prop="merchantName" label="商户" min-width="160">
          <template #default="{ row }">{{ row.merchantName || '-' }}</template>
        </el-table-column>
        <el-table-column label="实付金额" width="120" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.payAmount) }}</template>
        </el-table-column>
        <el-table-column label="平台服务费" width="130" align="right">
          <template #default="{ row }">
            <span class="fee">¥{{ formatMoney(row.platformFee) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="商户应结" width="130" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.merchantNet) }}</template>
        </el-table-column>
        <el-table-column label="供应商成本" width="130" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.supplierCost) }}</template>
        </el-table-column>
        <el-table-column label="分销佣金" width="120" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.commissionAmount) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '已分账' : '已退款' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="分账时间" min-width="165" />
      </el-table>

      <div class="pagination-bar">
        <el-pagination
          v-model:current-page="pagination.pageNum"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

interface SplitRow {
  id: number
  splitNo: string
  orderNo: string
  merchantName: string
  payAmount: number
  platformFee: number
  merchantNet: number
  supplierCost: number
  commissionAmount: number
  status: number
  createTime: string
}

const loading = ref(false)
const saving = ref(false)
const configForm = reactive({ enabled: true, ratePercent: 5, settleDays: 7 })
const searchForm = reactive({ orderNo: '' })
const tableData = ref<SplitRow[]>([])
const pagination = reactive({ pageNum: 1, pageSize: 10, total: 0 })
const summary = reactive({ splitCount: 0, platformFee: 0, merchantNet: 0, refundedCount: 0 })

const formatMoney = (value: unknown) => Number(value || 0).toFixed(2)

const loadConfig = async () => {
  const data = await request.get('/admin/finance/config')
  if (data) {
    configForm.enabled = Boolean(data.enabled)
    configForm.ratePercent = Number(data.ratePercent ?? 5)
    configForm.settleDays = Number(data.settleDays ?? 7)
  }
}

const loadSummary = async () => {
  const data = await request.get('/admin/finance/split/summary')
  Object.assign(summary, data || {})
}

const loadData = async () => {
  loading.value = true
  try {
    const params: Record<string, unknown> = { current: pagination.pageNum, size: pagination.pageSize }
    if (searchForm.orderNo) params.orderNo = searchForm.orderNo
    const data = await request.get('/admin/finance/split/page', { params })
    tableData.value = data?.records || []
    pagination.total = data?.total || 0
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.pageNum = 1
  loadData()
}
const handleReset = () => {
  searchForm.orderNo = ''
  handleSearch()
}

const handleSave = async () => {
  saving.value = true
  try {
    await request.put('/admin/finance/config', {
      enabled: configForm.enabled ? 1 : 0,
      ratePercent: configForm.ratePercent,
      settleDays: configForm.settleDays
    })
    ElMessage.success('配置已保存，新支付订单按新费率分账')
    await loadConfig()
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadConfig(), loadSummary(), loadData()])
})
</script>

<style scoped>
.summary-row {
  margin-bottom: 12px;
}
.stat .label {
  color: #909399;
  font-size: 13px;
}
.stat .value {
  font-size: 22px;
  font-weight: 700;
  margin-top: 6px;
  color: #303133;
}
.stat .value.danger {
  color: #f56c6c;
}
.config-card {
  margin-bottom: 12px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.hint {
  margin-left: 10px;
  color: #909399;
  font-size: 12px;
}
.fee {
  color: #e6a23c;
  font-weight: 600;
}
.pagination-bar {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
