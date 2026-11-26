<template>
  <div class="refund-record">
    <el-card>
      <div class="search-bar">
        <el-form :inline="true" :model="searchForm" class="search-form">
          <el-form-item label="退款单号">
            <el-input v-model="searchForm.refundNo" placeholder="请输入退款单号" clearable style="width: 200px" />
          </el-form-item>
          <el-form-item label="支付单号">
            <el-input v-model="searchForm.payNo" placeholder="请输入支付单号" clearable style="width: 200px" />
          </el-form-item>
          <el-form-item label="订单单号">
            <el-input v-model="searchForm.orderNo" placeholder="请输入订单单号" clearable style="width: 200px" />
          </el-form-item>
          <el-form-item label="退款状态">
            <el-select v-model="searchForm.refundStatus" placeholder="请选择退款状态" clearable style="width: 150px">
              <el-option :value="0" label="待处理" />
              <el-option :value="1" label="处理中" />
              <el-option :value="2" label="退款成功" />
              <el-option :value="3" label="退款失败" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-alert
        title="售后审核仅保存 Mock 审核结果，不会变更退款状态或执行真实退款。"
        type="info"
        :closable="false"
        class="mock-alert"
      />

      <el-table v-loading="loading" :data="tableData" style="width: 100%" border stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="refundNo" label="退款单号" min-width="170" />
        <el-table-column prop="orderNo" label="订单单号" min-width="170" />
        <el-table-column label="经营商户" min-width="170">
          <template #default="{ row }">
            <span>{{ (row.merchantNames || []).join('、') || '-' }}</span>
            <el-tag v-if="row.multiMerchant" type="warning" size="small" class="multi-tag">多商户</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="refundAmount" label="退款金额" width="120" align="right">
          <template #default="{ row }">
            <span class="amount">¥{{ formatMoney(row.refundAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="refundStatus" label="退款状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="refundStatusType(row.refundStatus)">{{ refundStatusText(row.refundStatus) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="审核结果" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="auditResultType(row)" effect="plain">{{ auditResultText(row) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="审核意见" min-width="180">
          <template #default="{ row }">{{ row.auditOpinion || '-' }}</template>
        </el-table-column>
        <el-table-column label="审核人" width="110">
          <template #default="{ row }">{{ row.auditBy || row.auditor || '-' }}</template>
        </el-table-column>
        <el-table-column prop="auditTime" label="审核时间" min-width="165">
          <template #default="{ row }">{{ row.auditTime || '-' }}</template>
        </el-table-column>
        <el-table-column prop="createTime" label="申请时间" min-width="165" />
        <el-table-column label="操作" width="130" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleView(row as any)">详情</el-button>
            <el-button v-if="Number(row.refundStatus) < 2" link type="warning" @click="handleAudit(row as any)">审核</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-bar">
        <el-pagination
          v-model:current-page="pagination.pageNum"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <el-dialog v-model="showDetail" title="退款详情" width="720px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="退款单号">{{ detailData.refundNo }}</el-descriptions-item>
        <el-descriptions-item label="支付单号">{{ detailData.payNo }}</el-descriptions-item>
        <el-descriptions-item label="订单单号">{{ detailData.orderNo }}</el-descriptions-item>
        <el-descriptions-item label="经营商户">
          {{ (detailData.merchantNames || []).join('、') || '-' }}
          <el-tag v-if="detailData.multiMerchant" type="warning" size="small">多商户</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="退款金额">
          <span class="amount">¥{{ formatMoney(detailData.refundAmount) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="原支付金额">¥{{ formatMoney(detailData.payAmount) }}</el-descriptions-item>
        <el-descriptions-item label="退款状态">
          <el-tag :type="refundStatusType(detailData.refundStatus)">{{ refundStatusText(detailData.refundStatus) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="第三方退款单号">{{ detailData.thirdRefundNo || '-' }}</el-descriptions-item>
        <el-descriptions-item label="退款原因" :span="2">{{ detailData.refundReason || '-' }}</el-descriptions-item>
        <el-descriptions-item label="审核结果">
          <el-tag :type="auditResultType(detailData)" effect="plain">{{ auditResultText(detailData) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="审核人">{{ detailData.auditBy || detailData.auditor || '-' }}</el-descriptions-item>
        <el-descriptions-item label="审核意见" :span="2">{{ detailData.auditOpinion || '-' }}</el-descriptions-item>
        <el-descriptions-item label="审核时间">{{ detailData.auditTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="退款时间">{{ detailData.refundTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="申请时间">{{ detailData.createTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="备注">{{ detailData.remark || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <el-dialog v-model="showAudit" title="售后审核（Mock）" width="480px">
      <el-alert title="这里只保存审核记录，不会执行实际退款。" type="warning" :closable="false" class="audit-alert" />
      <el-form :model="auditForm" label-width="90px">
        <el-form-item label="退款单号">
          <el-input :model-value="currentRefund?.refundNo" disabled />
        </el-form-item>
        <el-form-item label="审核结果" required>
          <el-radio-group v-model="auditForm.auditResult">
            <el-radio :value="1">通过</el-radio>
            <el-radio :value="0">拒绝</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="审核意见" required>
          <el-input v-model="auditForm.auditOpinion" type="textarea" :rows="4" placeholder="请输入审核意见" maxlength="300" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="auditing" @click="showAudit = false">取消</el-button>
        <el-button type="primary" :loading="auditing" @click="handleConfirmAudit">保存审核结果</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'

interface RefundRecord {
  id: number
  refundNo: string
  payNo: string
  orderNo: string
  refundAmount: number
  payAmount: number
  refundStatus: number
  refundReason: string
  thirdRefundNo: string
  refundTime: string
  createTime: string
  remark?: string
  merchantNames?: string[]
  multiMerchant?: boolean
  auditResult?: number
  auditStatus?: number
  auditOpinion?: string
  auditBy?: string
  auditor?: string
  auditTime?: string
}

const loading = ref(false)
const auditing = ref(false)
const searchForm = reactive({
  refundNo: '',
  payNo: '',
  orderNo: '',
  refundStatus: null as number | null
})

const tableData = ref<RefundRecord[]>([])
const pagination = reactive({ pageNum: 1, pageSize: 10, total: 0 })
const showDetail = ref(false)
const detailData = ref<RefundRecord>({} as RefundRecord)
const showAudit = ref(false)
const currentRefund = ref<RefundRecord | null>(null)
const auditForm = reactive({ auditResult: 1, auditOpinion: '' })

type TagType = 'primary' | 'success' | 'warning' | 'danger' | 'info'

const formatMoney = (value: unknown) => Number(value || 0).toFixed(2)
const refundStatusTexts: Record<number, string> = { 0: '待处理', 1: '处理中', 2: '退款成功', 3: '退款失败' }
const refundStatusTypes: Record<number, TagType> = { 0: 'info', 1: 'warning', 2: 'success', 3: 'danger' }
const refundStatusText = (status: number) => refundStatusTexts[Number(status)] || '未知'
const refundStatusType = (status: number): TagType => refundStatusTypes[Number(status)] || 'info'
const auditValue = (row: Partial<RefundRecord>) => row.auditResult ?? row.auditStatus
const auditResultText = (row: Partial<RefundRecord>) => {
  const value = auditValue(row)
  if (value === undefined || value === null || String(value) === '') return '未审核'
  return Number(value) === 1 ? '通过' : Number(value) === 0 ? '拒绝' : String(value)
}
const auditResultType = (row: Partial<RefundRecord>): TagType => {
  const value = auditValue(row)
  if (value === undefined || value === null || String(value) === '') return 'info'
  return Number(value) === 1 ? 'success' : Number(value) === 0 ? 'danger' : 'info'
}

const loadData = async () => {
  loading.value = true
  try {
    const data = await request.get('/admin/pay/refund', {
      params: {
        ...searchForm,
        current: pagination.pageNum,
        size: pagination.pageSize
      }
    })
    tableData.value = data.records || []
    pagination.total = data.total || 0
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.pageNum = 1
  loadData()
}

const handleReset = () => {
  searchForm.refundNo = ''
  searchForm.payNo = ''
  searchForm.orderNo = ''
  searchForm.refundStatus = null
  handleSearch()
}

const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  pagination.pageNum = 1
  loadData()
}

const handleCurrentChange = (page: number) => {
  pagination.pageNum = page
  loadData()
}

const handleView = (row: RefundRecord) => {
  detailData.value = { ...row }
  showDetail.value = true
}

const handleAudit = (row: RefundRecord) => {
  currentRefund.value = row
  auditForm.auditResult = 1
  auditForm.auditOpinion = ''
  showAudit.value = true
}

const handleConfirmAudit = async () => {
  if (!currentRefund.value) return
  if (!auditForm.auditOpinion.trim()) {
    ElMessage.warning('请填写审核意见')
    return
  }

  const message = auditForm.auditResult === 1
    ? '确认保存“审核通过”结果？此操作不会执行实际退款。'
    : '确认保存“审核拒绝”结果？此操作不会执行实际退款。'
  try {
    await ElMessageBox.confirm(message, '确认 Mock 审核', {
      confirmButtonText: '确认保存',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }

  auditing.value = true
  try {
    await request.put(`/admin/pay/refund/${currentRefund.value.id}/audit`, {
      auditResult: auditForm.auditResult,
      auditOpinion: auditForm.auditOpinion.trim()
    })
    ElMessage.success('Mock 售后审核结果已保存，未执行实际退款')
    showAudit.value = false
    await loadData()
  } finally {
    auditing.value = false
  }
}

onMounted(loadData)
</script>

<style scoped lang="scss">
.refund-record {
  .search-bar {
    margin-bottom: 12px;
  }

  .mock-alert,
  .audit-alert {
    margin-bottom: 16px;
  }

  .amount {
    color: #f56c6c;
    font-weight: 600;
  }

  .multi-tag {
    margin-left: 6px;
  }

  .pagination-bar {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
    overflow-x: auto;
  }
}
</style>
