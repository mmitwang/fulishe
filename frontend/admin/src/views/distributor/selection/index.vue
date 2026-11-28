<template>
  <div class="selection-page">
    <el-row :gutter="12" class="stat-row" v-loading="summaryLoading">
      <el-col v-for="item in statCards" :key="item.label" :xs="12" :md="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">{{ item.label }}</div>
          <div class="stat-value" :class="item.tone">{{ item.value }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="table-card">
      <div class="table-intro">
        <div>
          <div class="intro-title">可推广商品</div>
          <div class="intro-description">加入选品后可生成专属分享，推广订单与佣金将归入当前账号。</div>
        </div>
        <el-button @click="refresh"><el-icon><Refresh /></el-icon>刷新</el-button>
      </div>

      <el-table :data="rows" v-loading="loading" border stripe>
        <el-table-column label="商品" min-width="250">
          <template #default="{ row }">
            <div class="product-cell">
              <el-image
                v-if="row.spuImage"
                :src="row.spuImage"
                fit="cover"
                class="product-image"
                :preview-src-list="[row.spuImage]"
                preview-teleported
              />
              <div v-else class="image-placeholder">无图</div>
              <div class="product-info">
                <span class="product-name">{{ row.spuName }}</span>
                <span class="product-id">商品 ID：{{ row.spuId }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="merchantName" label="经营商户" min-width="150" />
        <el-table-column label="售价" width="120" align="right">
          <template #default="{ row }"><span class="price">¥{{ formatAmount(row.sellPrice) }}</span></template>
        </el-table-column>
        <el-table-column prop="stock" label="库存" width="90" align="right" />
        <el-table-column label="佣金率" width="100" align="center">
          <template #default="{ row }"><span class="commission">{{ formatRate(row.commissionRate) }}</span></template>
        </el-table-column>
        <el-table-column prop="validEndTime" label="规则截止" min-width="165">
          <template #default="{ row }">{{ row.validEndTime || '-' }}</template>
        </el-table-column>
        <el-table-column label="选品状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.selected" type="success" size="small">已选</el-tag>
            <el-tag v-else-if="row.selectable" type="primary" size="small">可加入</el-tag>
            <el-tag v-else type="info" size="small">暂不可选</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="205" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              v-if="!row.selected"
              link
              type="primary"
              :disabled="!row.selectable || operatingSpuId !== null"
              :loading="operatingSpuId === row.spuId && actionType === 'select'"
              @click="addSelection(row as SelectionItem)"
            >加入选品</el-button>
            <template v-else>
              <el-button
                link
                type="primary"
                :disabled="operatingSpuId !== null"
                :loading="operatingSpuId === row.spuId && actionType === 'share'"
                @click="createShare(row as SelectionItem)"
              >生成分享</el-button>
              <el-button
                link
                type="danger"
                :disabled="operatingSpuId !== null"
                :loading="operatingSpuId === row.spuId && actionType === 'remove'"
                @click="removeSelection(row as SelectionItem)"
              >撤销</el-button>
            </template>
          </template>
        </el-table-column>
        <template #empty><el-empty description="暂无可推广商品" :image-size="90" /></template>
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
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'

interface SelectionItem {
  id: number | null
  spuId: number
  spuName: string
  spuImage: string
  sellPrice: number | string
  stock: number
  merchantName: string
  commissionRate: number
  validEndTime: string
  selected: boolean
  selectable: boolean
}

interface DistributionSummary {
  selectionCount: number
  shareCount: number
  orderCount: number
  totalCommissionCents: number
}

interface PageResult<T> {
  records: T[]
  total: number
}

type ActionType = 'select' | 'remove' | 'share'

const router = useRouter()
const loading = ref(false)
const summaryLoading = ref(false)
const rows = ref<SelectionItem[]>([])
const summary = ref<DistributionSummary | null>(null)
const operatingSpuId = ref<number | null>(null)
const actionType = ref<ActionType | null>(null)
const pagination = reactive({ current: 1, size: 10, total: 0 })

const formatAmount = (value: number | string) => Number(value || 0).toLocaleString('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})
const formatCents = (value: number) => (Number(value || 0) / 100).toLocaleString('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})
const formatRate = (value: number) => `${Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}%`

const statCards = computed(() => [
  { label: '已选商品', value: summary.value ? Number(summary.value.selectionCount || 0) : '—', tone: '' },
  { label: '分享数量', value: summary.value ? Number(summary.value.shareCount || 0) : '—', tone: '' },
  { label: '推广订单', value: summary.value ? Number(summary.value.orderCount || 0) : '—', tone: '' },
  {
    label: '累计佣金',
    value: summary.value ? `¥${formatCents(summary.value.totalCommissionCents)}` : '—',
    tone: 'danger'
  }
])

const fetchData = async () => {
  loading.value = true
  try {
    const data = await request.get<PageResult<SelectionItem>>('/distribution/selections/page', {
      params: { current: pagination.current, size: pagination.size }
    })
    rows.value = data.records || []
    pagination.total = Number(data.total || 0)
  } finally {
    loading.value = false
  }
}

const fetchSummary = async () => {
  summaryLoading.value = true
  try {
    summary.value = await request.get<DistributionSummary>('/distribution/summary')
  } finally {
    summaryLoading.value = false
  }
}

const refresh = () => {
  if (loading.value || operatingSpuId.value !== null) return
  fetchData()
  fetchSummary()
}

const handleSizeChange = () => {
  pagination.current = 1
  fetchData()
}

const addSelection = async (row: SelectionItem) => {
  if (!row.selectable || row.selected || operatingSpuId.value !== null) return
  operatingSpuId.value = row.spuId
  actionType.value = 'select'
  try {
    await request.post('/distribution/selections', { spuId: row.spuId })
    ElMessage.success('已加入选品')
    await Promise.all([fetchData(), fetchSummary()])
  } finally {
    operatingSpuId.value = null
    actionType.value = null
  }
}

const removeSelection = async (row: SelectionItem) => {
  if (!row.selected || row.id == null || operatingSpuId.value !== null) return
  try {
    await ElMessageBox.confirm(`确定要撤销商品「${row.spuName}」的选品吗？`, '撤销选品', {
      confirmButtonText: '确定撤销',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }

  operatingSpuId.value = row.spuId
  actionType.value = 'remove'
  try {
    await request.delete(`/distribution/selections/${row.id}`)
    ElMessage.success('已撤销选品')
    if (rows.value.length === 1 && pagination.current > 1) pagination.current -= 1
    await Promise.all([fetchData(), fetchSummary()])
  } finally {
    operatingSpuId.value = null
    actionType.value = null
  }
}

const createShare = async (row: SelectionItem) => {
  if (!row.selected || operatingSpuId.value !== null) return
  operatingSpuId.value = row.spuId
  actionType.value = 'share'
  try {
    await request.post('/distribution/shares', { spuId: row.spuId })
    ElMessage.success('分享已生成')
    await router.push('/distributor/shares')
  } finally {
    operatingSpuId.value = null
    actionType.value = null
  }
}

onMounted(() => {
  fetchData()
  fetchSummary()
})
</script>

<style scoped lang="scss">
.selection-page {
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
    font-size: 24px;
    font-weight: 700;
    line-height: 1.35;
    word-break: break-all;

    &.danger { color: #f56c6c; }
  }

  .table-card {
    border-radius: 14px;
  }

  .table-intro {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
  }

  .intro-title {
    color: #303133;
    font-size: 16px;
    font-weight: 600;
  }

  .intro-description {
    margin-top: 5px;
    color: #909399;
    font-size: 13px;
    line-height: 1.5;
  }

  .product-cell {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .product-image,
  .image-placeholder {
    width: 48px;
    height: 48px;
    border-radius: 8px;
    flex-shrink: 0;
  }

  .image-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f4f6fb;
    color: #a8abb2;
    font-size: 12px;
  }

  .product-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .product-name {
    overflow: hidden;
    color: #303133;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .product-id {
    color: #909399;
    font-size: 12px;
  }

  .price,
  .commission {
    color: #f56c6c;
    font-weight: 600;
  }

  .pagination {
    margin-top: 18px;
    display: flex;
    justify-content: flex-end;
    overflow-x: auto;
  }
}

@media (max-width: 640px) {
  .selection-page {
    .stat-value {
      font-size: 19px;
    }

    .table-intro {
      align-items: flex-start;
    }
  }
}
</style>
