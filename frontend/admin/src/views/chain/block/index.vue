<template>
  <div class="chain-block-page">
    <el-row :gutter="16" class="stat-row">
      <el-col :span="6" v-for="s in stats" :key="s.label">
        <el-card shadow="never" class="stat-card">
          <div class="stat-icon" :style="{ background: s.bg }">
            <el-icon><component :is="s.icon" /></el-icon>
          </div>
          <div class="stat-body">
            <div class="label">{{ s.label }}</div>
            <div class="value">{{ s.value }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <span>区块浏览器</span>
          <div class="header-actions">
            <el-input v-model="query.height" placeholder="按区块高度搜索" clearable style="width: 200px" @keyup.enter="search" />
            <el-button type="primary" @click="search">查询</el-button>
          </div>
        </div>
      </template>

      <el-table :data="rows" v-loading="loading" stripe>
        <el-table-column prop="height" label="高度" width="90" align="center">
          <template #default="{ row }">
            <el-link type="primary" @click="openBlock(row)">#{{ row.height }}</el-link>
          </template>
        </el-table-column>
        <el-table-column prop="blockHash" label="区块哈希" min-width="220">
          <template #default="{ row }"><span class="hash">{{ shortHash(row.blockHash) }}</span></template>
        </el-table-column>
        <el-table-column prop="prevHash" label="父区块哈希" min-width="220">
          <template #default="{ row }"><span class="hash muted">{{ shortHash(row.prevHash) }}</span></template>
        </el-table-column>
        <el-table-column prop="txCount" label="交易数" width="90" align="center" />
        <el-table-column prop="proposer" label="出块节点" width="110" />
        <el-table-column prop="size" label="区块大小" width="100" />
        <el-table-column prop="timestamp" label="出块时间" width="180" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }"><el-tag type="success" size="small">已确认</el-tag></template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center">
          <template #default="{ row }"><el-button link type="primary" @click="openBlock(row)">详情</el-button></template>
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

    <el-drawer v-model="detailVisible" title="区块详情" size="560px">
      <div v-if="current">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="区块高度">#{{ current.height }}</el-descriptions-item>
          <el-descriptions-item label="区块哈希"><span class="hash">{{ current.blockHash }}</span></el-descriptions-item>
          <el-descriptions-item label="父区块哈希"><span class="hash">{{ current.prevHash }}</span></el-descriptions-item>
          <el-descriptions-item label="出块节点">{{ current.proposer }}</el-descriptions-item>
          <el-descriptions-item label="出块时间">{{ current.timestamp }}</el-descriptions-item>
          <el-descriptions-item label="交易数量">{{ current.txCount }}</el-descriptions-item>
        </el-descriptions>
        <div class="sub-title">区块内交易</div>
        <el-timeline>
          <el-timeline-item v-for="tx in current.txs" :key="tx.id" :timestamp="tx.timestamp" placement="top">
            <div class="tx-item">
              <div class="tx-head">
                <el-tag size="small">{{ tx.txTypeName }}</el-tag>
                <span class="hash">{{ shortHash(tx.txHash) }}</span>
              </div>
              <div class="tx-body">{{ tx.bizNo }} · {{ tx.spuName }} · ¥{{ tx.amount }}</div>
            </div>
          </el-timeline-item>
        </el-timeline>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import request from '@/utils/request'

const loading = ref(false)
const rows = ref<any[]>([])
const meta = ref<any>({})
const query = reactive({ height: '' })
const pagination = reactive({ current: 1, size: 10, total: 0 })
const detailVisible = ref(false)
const current = ref<any>(null)

const stats = computed(() => [
  { label: '区块高度', value: meta.value.height || 0, icon: 'Coin', bg: 'linear-gradient(135deg,#667eea,#764ba2)' },
  { label: '交易总数', value: meta.value.totalTx || 0, icon: 'Connection', bg: 'linear-gradient(135deg,#2f6feb,#26c6da)' },
  { label: '共识节点', value: meta.value.nodeCount || 0, icon: 'Cpu', bg: 'linear-gradient(135deg,#f093fb,#f5576c)' },
  { label: '平均出块', value: meta.value.avgBlockTime || '-', icon: 'Timer', bg: 'linear-gradient(135deg,#43e97b,#38f9d7)' }
])

const shortHash = (h: string) => (h ? `${h.slice(0, 10)}...${h.slice(-8)}` : '')

const fetchData = async () => {
  loading.value = true
  try {
    const data = await request.get('/chain/block/page', { params: { ...query, ...pagination } })
    rows.value = data.records
    pagination.total = data.total
  } finally {
    loading.value = false
  }
}

const fetchOverview = async () => {
  const data = await request.get('/chain/overview')
  meta.value = data.meta
}

const search = () => {
  pagination.current = 1
  fetchData()
}

const openBlock = async (row: any) => {
  current.value = await request.get(`/chain/block/${row.height}`)
  detailVisible.value = true
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
  :deep(.el-card__body) {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 18px;
  }
  .stat-icon {
    width: 46px;
    height: 46px;
    border-radius: 12px;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
  }
  .label {
    font-size: 12px;
    color: #909399;
  }
  .value {
    font-size: 22px;
    font-weight: 700;
    color: #303133;
  }
}
.table-card {
  border-radius: 14px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  .header-actions {
    display: flex;
    gap: 10px;
  }
}
.hash {
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
  color: #2f6feb;
  &.muted {
    color: #909399;
  }
}
.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
.sub-title {
  margin: 20px 0 12px;
  font-weight: 600;
}
.tx-item {
  .tx-head {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .tx-body {
    margin-top: 6px;
    color: #606266;
    font-size: 13px;
  }
}
</style>
