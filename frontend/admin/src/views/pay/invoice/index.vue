<template>
  <div class="invoice-manage">
    <el-row :gutter="12" class="summary-row">
      <el-col :span="6"><el-card shadow="never"><div class="stat"><div class="label">申请总数</div><div class="value">{{ summary.totalCount }}</div></div></el-card></el-col>
      <el-col :span="6"><el-card shadow="never"><div class="stat"><div class="label">待开票</div><div class="value warn">{{ summary.pendingCount }}</div></div></el-card></el-col>
      <el-col :span="6"><el-card shadow="never"><div class="stat"><div class="label">已开票金额</div><div class="value">¥{{ formatMoney(summary.issuedAmount) }}</div></div></el-card></el-col>
      <el-col :span="6"><el-card shadow="never"><div class="stat"><div class="label">已红冲</div><div class="value danger">{{ summary.redFlushedCount }}</div></div></el-card></el-col>
    </el-row>

    <el-card>
      <div class="search-bar">
        <el-form :inline="true" :model="searchForm" class="search-form">
          <el-form-item label="订单单号">
            <el-input v-model="searchForm.orderNo" placeholder="请输入订单单号" clearable style="width: 220px" />
          </el-form-item>
          <el-form-item label="开票状态">
            <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 150px">
              <el-option :value="0" label="待开票" />
              <el-option :value="1" label="已开票" />
              <el-option :value="2" label="已红冲" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-alert
        title="发票与订单金额勾稽：仅已支付且未取消的订单可申请；开具后生成发票号，红冲需填写原因并保留原票记录（Mock 演示，无真实税务系统对接）。"
        type="info"
        :closable="false"
        class="mock-alert"
      />

      <el-table v-loading="loading" :data="tableData" style="width: 100%" border stripe>
        <el-table-column prop="invoiceNo" label="发票号" min-width="170">
          <template #default="{ row }">{{ row.invoiceNo || '-' }}</template>
        </el-table-column>
        <el-table-column prop="orderNo" label="订单单号" min-width="170" />
        <el-table-column prop="merchantName" label="经营商户" min-width="160" />
        <el-table-column prop="buyerName" label="发票抬头" min-width="160" />
        <el-table-column label="发票类型" width="140">
          <template #default="{ row }">{{ row.invoiceTypeLabel }}</template>
        </el-table-column>
        <el-table-column label="金额 / 税额" width="150" align="right">
          <template #default="{ row }">
            <div>¥{{ formatMoney(row.amount) }}</div>
            <div class="tax">税 ¥{{ formatMoney(row.taxAmount) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">{{ row.statusLabel }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="applyTime" label="申请时间" min-width="165" />
        <el-table-column prop="issueTime" label="开票时间" min-width="165">
          <template #default="{ row }">{{ row.issueTime || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-if="row.status === 0" link type="primary" @click="handleIssue(row)">开具</el-button>
            <el-button v-if="row.status === 1" link type="danger" @click="handleRedFlush(row)">红冲</el-button>
            <span v-if="row.status === 2" class="muted">{{ row.redFlushNo || '已红冲' }}</span>
          </template>
        </el-table-column>
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
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'

interface InvoiceRow {
  id: number
  invoiceNo: string
  orderNo: string
  merchantName: string
  buyerName: string
  invoiceTypeLabel: string
  amount: number
  taxAmount: number
  status: number
  statusLabel: string
  applyTime: string
  issueTime: string
  redFlushNo: string
}

type TagType = 'primary' | 'success' | 'warning' | 'danger' | 'info'

const loading = ref(false)
const searchForm = reactive({ orderNo: '', status: null as number | null })
const tableData = ref<InvoiceRow[]>([])
const pagination = reactive({ pageNum: 1, pageSize: 10, total: 0 })
const summary = reactive({ totalCount: 0, pendingCount: 0, issuedAmount: 0, redFlushedCount: 0 })

const formatMoney = (value: unknown) => Number(value || 0).toFixed(2)
const statusType = (status: number): TagType => (Number(status) === 1 ? 'success' : Number(status) === 2 ? 'danger' : 'warning')

const loadSummary = async () => {
  const data = await request.get('/admin/invoice/summary')
  Object.assign(summary, data || {})
}

const loadData = async () => {
  loading.value = true
  try {
    const params: Record<string, unknown> = { current: pagination.pageNum, size: pagination.pageSize }
    if (searchForm.orderNo) params.orderNo = searchForm.orderNo
    if (searchForm.status !== null && searchForm.status !== undefined) params.status = searchForm.status
    const data = await request.get('/admin/invoice/page', { params })
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
  searchForm.status = null
  handleSearch()
}

const handleIssue = async (row: any) => {
  await ElMessageBox.confirm(`确认开具订单 ${row.orderNo} 的发票？`, '开具发票', { type: 'warning' })
  await request.put(`/admin/invoice/${row.id}/issue`)
  ElMessage.success('发票已开具')
  await Promise.all([loadData(), loadSummary()])
}

const handleRedFlush = async (row: any) => {
  const { value } = await ElMessageBox.prompt('请填写红冲原因', '红冲发票', {
    inputPlaceholder: '如：开票信息有误，需重新开具',
    inputValidator: value => (value && value.trim() ? true : '红冲原因不能为空')
  })
  await request.put(`/admin/invoice/${row.id}/red-flush`, { reason: value })
  ElMessage.success('发票已红冲')
  await Promise.all([loadData(), loadSummary()])
}

onMounted(async () => {
  await Promise.all([loadData(), loadSummary()])
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
.stat .value.warn {
  color: #e6a23c;
}
.stat .value.danger {
  color: #f56c6c;
}
.mock-alert {
  margin-bottom: 12px;
}
.tax {
  color: #909399;
  font-size: 12px;
}
.muted {
  color: #909399;
  font-size: 12px;
}
.pagination-bar {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
