<template>
  <div class="inventory-page">
    <el-row :gutter="16" class="stat-row">
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="label">库存总货值</div>
          <div class="value">¥{{ ((overview.stats.inventoryValue || 0) / 10000).toFixed(1) }} <span class="unit">万</span></div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="label">库存 SKU</div>
          <div class="value">{{ pagination.total }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="label">库存预警</div>
          <div class="value danger">{{ overview.stats.lowStock || 0 }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="label">在途发货</div>
          <div class="value warning">{{ overview.stats.inTransit || 0 }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="table-card">
      <div class="stock-toolbar">
        <el-button type="primary" plain @click="openReservations">库存预占明细</el-button>
        <el-button type="warning" plain :loading="releasing" @click="releaseExpired">释放超时预占</el-button>
        <span class="toolbar-tip">下单锁定（30 分钟）→ 支付扣减 → 取消/超时释放 → 退款回补</span>
      </div>
      <el-form :inline="true" :model="query" class="query-form">
        <el-form-item label="商品">
          <el-input v-model="query.keyword" placeholder="商品名称 / SKU 编码" clearable style="width: 240px" />
        </el-form-item>
        <el-form-item label="仓库">
          <el-select v-model="query.warehouse" placeholder="全部仓库" clearable style="width: 150px">
            <el-option v-for="w in warehouses" :key="w" :label="w" :value="w" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 130px">
            <el-option label="正常" value="normal" />
            <el-option label="偏低" value="warning" />
            <el-option label="告急" value="danger" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="rows" v-loading="loading" stripe>
        <el-table-column label="商品" min-width="260">
          <template #default="{ row }">
            <div class="product-cell">
              <el-image :src="row.image" fit="cover" class="thumb" />
              <div>
                <div class="name">{{ row.spuName }}</div>
                <div class="sub">{{ row.skuCode }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="warehouse" label="仓库" width="130" />
        <el-table-column prop="stock" label="总库存" width="100" align="right" />
        <el-table-column prop="lockedStock" label="锁定库存" width="100" align="right" />
        <el-table-column prop="availableStock" label="可用库存" width="100" align="right" />
        <el-table-column label="库存水位" width="180">
          <template #default="{ row }">
            <el-progress
              :percentage="Math.min(100, Math.round((row.availableStock / Math.max(row.warningLine * 4, 1)) * 100))"
              :status="row.status === 'danger' ? 'exception' : row.status === 'warning' ? 'warning' : 'success'"
              :stroke-width="8"
            />
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusMeta[row.status].type" size="small">{{ statusMeta[row.status].text }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updateTime" label="更新时间" width="170" />
        <el-table-column label="操作" width="110" align="center">
          <template #default="{ row }"><el-button link type="primary" @click="openAdjust(row)">调整库存</el-button></template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.current"
        v-model:page-size="pagination.size"
        :total="pagination.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        class="pagination"
        @size-change="fetchData"
        @current-change="fetchData"
      />
    </el-card>

    <el-dialog v-model="reservationVisible" title="库存预占明细" width="900px">
      <div class="reserve-summary">
        <span>锁定中 {{ reserveSummary.lockedReservationCount }} 笔</span>
        <span>锁定数量 {{ reserveSummary.lockedQuantity }}</span>
        <span>已扣减 {{ reserveSummary.committedCount }} 笔</span>
        <span>已释放 {{ reserveSummary.releasedCount }} 笔</span>
        <span>锁定时长 {{ reserveSummary.lockMinutes }} 分钟</span>
      </div>
      <el-table v-loading="reserveLoading" :data="reservations" border stripe size="small" max-height="420">
        <el-table-column prop="reservationNo" label="预占单号" min-width="170" />
        <el-table-column prop="orderNo" label="订单号" min-width="170" />
        <el-table-column prop="spuName" label="商品" min-width="200" />
        <el-table-column prop="quantity" label="数量" width="80" align="right" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'LOCKED' ? 'warning' : row.status === 'COMMITTED' ? 'success' : 'info'" size="small">
              {{ row.status === 'LOCKED' ? '锁定中' : row.status === 'COMMITTED' ? '已扣减' : '已释放' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="expireTime" label="预占到期" min-width="165" />
        <el-table-column prop="createTime" label="创建时间" min-width="165" />
      </el-table>
    </el-dialog>

    <el-dialog v-model="adjustVisible" title="调整库存" width="460px">
      <div v-if="current" class="adjust-body">
        <div class="adjust-product">
          <el-image :src="current.image" fit="cover" class="thumb" />
          <div>
            <div class="name">{{ current.spuName }}</div>
            <div class="sub">{{ current.skuCode }} · {{ current.warehouse }}</div>
          </div>
        </div>
        <el-form label-width="90px">
          <el-form-item label="当前库存">{{ current.stock }}</el-form-item>
          <el-form-item label="调整数量">
            <el-input-number v-model="delta" :min="-9999" :max="9999" />
            <span class="hint">正数入库，负数出库</span>
          </el-form-item>
          <el-form-item label="调整后">{{ Math.max(0, current.stock + delta) }}</el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="adjustVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAdjust">确认调整</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const warehouses = ['杭州中心仓', '上海前置仓', '成都区域仓']
const statusMeta: Record<string, { text: string; type: 'primary' | 'success' | 'warning' | 'info' | 'danger' }> = {
  normal: { text: '正常', type: 'success' },
  warning: { text: '偏低', type: 'warning' },
  danger: { text: '告急', type: 'danger' }
}
const loading = ref(false)
const rows = ref<any[]>([])
const overview = ref<any>({ stats: {} })
const query = reactive({ keyword: '', warehouse: '', status: '' })
const pagination = reactive({ current: 1, size: 10, total: 0 })
const adjustVisible = ref(false)
const current = ref<any>(null)
const delta = ref(0)

const reservationVisible = ref(false)
const reserveLoading = ref(false)
const releasing = ref(false)
const reservations = ref<any[]>([])
const reserveSummary = ref<any>({ lockedReservationCount: 0, lockedQuantity: 0, committedCount: 0, releasedCount: 0, lockMinutes: 30 })

const openReservations = async () => {
  reservationVisible.value = true
  reserveLoading.value = true
  try {
    const [summary, page] = await Promise.all([
      request.get('/admin/stock/reservation/summary'),
      request.get('/admin/stock/reservation/page', { params: { current: 1, size: 50 } })
    ])
    reserveSummary.value = { ...reserveSummary.value, ...(summary || {}) }
    reservations.value = page?.records || []
  } finally {
    reserveLoading.value = false
  }
}

const releaseExpired = async () => {
  releasing.value = true
  try {
    const result = await request.post('/admin/stock/reservation/release-expired')
    ElMessage.success(result?.releasedOrders ? `已释放 ${result.releasedOrders} 个超时订单的预占库存` : '暂无超时预占')
    await fetchData()
    if (reservationVisible.value) await openReservations()
  } finally {
    releasing.value = false
  }
}

const fetchData = async () => {
  loading.value = true
  try {
    const data = await request.get('/supply/inventory/page', { params: { ...query, ...pagination } })
    rows.value = data.records
    pagination.total = data.total
  } finally {
    loading.value = false
  }
}

const fetchOverview = async () => {
  overview.value = await request.get('/supply/overview')
}

const search = () => {
  pagination.current = 1
  fetchData()
}
const reset = () => {
  query.keyword = ''
  query.warehouse = ''
  query.status = ''
  search()
}

const openAdjust = (row: any) => {
  current.value = row
  delta.value = 0
  adjustVisible.value = true
}

const submitAdjust = async () => {
  await request.put(`/supply/inventory/${current.value.id}/adjust`, { delta: delta.value })
  ElMessage.success('库存已调整')
  adjustVisible.value = false
  fetchData()
  fetchOverview()
}

onMounted(() => {
  fetchOverview()
  fetchData()
})
</script>

<style scoped lang="scss">
.stat-row {
  margin-bottom: 16px;
}
.stat-card {
  border-radius: 12px;
  .label {
    color: #909399;
    font-size: 13px;
  }
  .value {
    font-size: 24px;
    font-weight: 700;
    margin-top: 6px;
    &.danger {
      color: #f56c6c;
    }
    &.warning {
      color: #e6a23c;
    }
    .unit {
      font-size: 13px;
      color: #909399;
      font-weight: 400;
    }
  }
}
.table-card {
  border-radius: 14px;
}
.stock-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  .toolbar-tip {
    color: #8b96ad;
    font-size: 12px;
  }
}
.reserve-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 12px;
  font-size: 12.5px;
  color: #5a6685;
}
.product-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  .thumb {
    width: 48px;
    height: 48px;
    border-radius: 8px;
  }
  .name {
    font-weight: 500;
  }
  .sub {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
  }
}
.adjust-body {
  .adjust-product {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    .thumb {
      width: 56px;
      height: 56px;
      border-radius: 8px;
    }
    .name {
      font-weight: 600;
    }
    .sub {
      font-size: 12px;
      color: #909399;
      margin-top: 4px;
    }
  }
  .hint {
    margin-left: 10px;
    font-size: 12px;
    color: #909399;
  }
}
.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
