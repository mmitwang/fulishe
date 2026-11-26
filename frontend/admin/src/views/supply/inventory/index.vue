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
