<template>
  <div class="pay-record">
    <el-card>
      <div class="search-bar">
        <el-form :inline="true" :model="searchForm" class="search-form">
          <el-form-item label="支付单号">
            <el-input v-model="searchForm.payNo" placeholder="请输入支付单号" clearable style="width: 200px" />
          </el-form-item>
          <el-form-item label="订单单号">
            <el-input v-model="searchForm.orderNo" placeholder="请输入订单单号" clearable style="width: 200px" />
          </el-form-item>
          <el-form-item label="支付方式">
            <el-select v-model="searchForm.payMethod" placeholder="请选择支付方式" clearable style="width: 150px">
              <el-option :value="1" label="微信支付" />
              <el-option :value="2" label="支付宝" />
              <el-option :value="3" label="其他支付" />
            </el-select>
          </el-form-item>
          <el-form-item label="支付状态">
            <el-select v-model="searchForm.payStatus" placeholder="请选择支付状态" clearable style="width: 150px">
              <el-option :value="0" label="待支付" />
              <el-option :value="1" label="处理中" />
              <el-option :value="2" label="支付成功" />
              <el-option :value="3" label="支付失败" />
              <el-option :value="4" label="已退款" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-table v-loading="loading" :data="tableData" style="width: 100%" border stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="payNo" label="支付单号" min-width="180" />
        <el-table-column prop="orderNo" label="订单单号" min-width="180" />
        <el-table-column label="经营商户" min-width="180">
          <template #default="{ row }">
            <span>{{ (row.merchantNames || []).join('、') || '-' }}</span>
            <el-tag v-if="row.multiMerchant" type="warning" size="small" class="multi-tag">多商户</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="payMethod" label="支付方式" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="payMethodType(row.payMethod)">{{ payMethodText(row.payMethod) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="payAmount" label="支付金额" width="130" align="right">
          <template #default="{ row }">
            <span class="amount">¥{{ formatMoney(row.payAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="payStatus" label="支付状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="payStatusType(row.payStatus)">{{ payStatusText(row.payStatus) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="thirdPayNo" label="第三方单号" min-width="180" />
        <el-table-column prop="payTime" label="支付时间" min-width="165">
          <template #default="{ row }">{{ row.payTime || '-' }}</template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" min-width="165" />
        <el-table-column label="操作" width="90" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleView(row as any)">详情</el-button>
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

    <el-dialog v-model="showDetail" title="支付详情" width="680px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="支付单号">{{ detailData.payNo }}</el-descriptions-item>
        <el-descriptions-item label="订单单号">{{ detailData.orderNo }}</el-descriptions-item>
        <el-descriptions-item label="用户ID">{{ detailData.userId }}</el-descriptions-item>
        <el-descriptions-item label="经营商户">
          {{ (detailData.merchantNames || []).join('、') || '-' }}
          <el-tag v-if="detailData.multiMerchant" type="warning" size="small">多商户</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="支付方式">
          <el-tag :type="payMethodType(detailData.payMethod)">{{ payMethodText(detailData.payMethod) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="支付金额">
          <span class="amount">¥{{ formatMoney(detailData.payAmount) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="支付状态">
          <el-tag :type="payStatusType(detailData.payStatus)">{{ payStatusText(detailData.payStatus) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="第三方单号">{{ detailData.thirdPayNo || '-' }}</el-descriptions-item>
        <el-descriptions-item label="支付时间">{{ detailData.payTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="回调次数">{{ detailData.notifyCount || 0 }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ detailData.createTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="备注">{{ detailData.remark || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import request from '@/utils/request'

interface PayRecord {
  id: number
  payNo: string
  orderNo: string
  userId: number
  payMethod: number
  payAmount: number
  payStatus: number
  thirdPayNo: string
  payTime: string
  notifyCount: number
  createTime: string
  remark: string
  merchantNames?: string[]
  multiMerchant?: boolean
}

const loading = ref(false)
const searchForm = reactive({
  payNo: '',
  orderNo: '',
  payMethod: null as number | null,
  payStatus: null as number | null
})
const tableData = ref<PayRecord[]>([])
const pagination = reactive({ pageNum: 1, pageSize: 10, total: 0 })
const showDetail = ref(false)
const detailData = ref<PayRecord>({} as PayRecord)

type TagType = 'primary' | 'success' | 'warning' | 'danger' | 'info'

const formatMoney = (value: unknown) => Number(value || 0).toFixed(2)
const payMethodTexts: Record<number, string> = { 1: '微信支付', 2: '支付宝', 3: '其他支付' }
const payMethodTypes: Record<number, TagType> = { 1: 'success', 2: 'primary', 3: 'warning' }
const payStatusTexts: Record<number, string> = { 0: '待支付', 1: '处理中', 2: '支付成功', 3: '支付失败', 4: '已退款' }
const payStatusTypes: Record<number, TagType> = { 0: 'info', 1: 'warning', 2: 'success', 3: 'danger', 4: 'warning' }
const payMethodText = (method: number) => payMethodTexts[Number(method)] || '未知'
const payMethodType = (method: number): TagType => payMethodTypes[Number(method)] || 'info'
const payStatusText = (status: number) => payStatusTexts[Number(status)] || '未知'
const payStatusType = (status: number): TagType => payStatusTypes[Number(status)] || 'info'

const loadData = async () => {
  loading.value = true
  try {
    const data = await request.get('/admin/pay/record', {
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
  searchForm.payNo = ''
  searchForm.orderNo = ''
  searchForm.payMethod = null
  searchForm.payStatus = null
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

const handleView = (row: PayRecord) => {
  detailData.value = { ...row }
  showDetail.value = true
}

onMounted(loadData)
</script>

<style scoped lang="scss">
.pay-record {
  .search-bar {
    margin-bottom: 20px;
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
