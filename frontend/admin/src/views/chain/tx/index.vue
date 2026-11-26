<template>
  <div class="chain-tx-page">
    <div class="chain-banner">
      <div class="banner-main">
        <div class="banner-title">
          <el-icon><Link /></el-icon>
          福礼链 · 链上交易
          <el-tag effect="dark" type="success" size="small">运行中</el-tag>
        </div>
        <div class="banner-desc">卡券铸造、发放、核销、转赠与订单支付全流程上链存证，数据不可篡改</div>
      </div>
      <div class="banner-metrics">
        <div class="metric">
          <span class="label">区块高度</span>
          <span class="value">{{ meta.height }}</span>
        </div>
        <div class="metric">
          <span class="label">交易总数</span>
          <span class="value">{{ meta.totalTx }}</span>
        </div>
        <div class="metric">
          <span class="label">共识节点</span>
          <span class="value">{{ meta.nodeCount }}</span>
        </div>
        <div class="metric">
          <span class="label">TPS</span>
          <span class="value">{{ meta.tps }}</span>
        </div>
      </div>
    </div>

    <el-card class="table-card">
      <el-form :inline="true" :model="query" class="query-form">
        <el-form-item label="交易类型">
          <el-select v-model="query.txType" placeholder="全部类型" clearable style="width: 160px">
            <el-option v-for="t in typeOptions" :key="t.type" :label="t.name" :value="t.type" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键字">
          <el-input v-model="query.keyword" placeholder="交易哈希 / 业务单号 / 卡券码" clearable style="width: 280px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="rows" v-loading="loading" stripe>
        <el-table-column prop="txHash" label="交易哈希" min-width="220">
          <template #default="{ row }">
            <span class="hash">{{ shortHash(row.txHash) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="typeTag(row.txType)" effect="light">{{ row.txTypeName }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="bizNo" label="业务单号" min-width="150" />
        <el-table-column prop="couponCode" label="卡券编码" width="150">
          <template #default="{ row }">{{ row.couponCode || '-' }}</template>
        </el-table-column>
        <el-table-column prop="spuName" label="商品/业务" min-width="150" />
        <el-table-column label="流转" min-width="220">
          <template #default="{ row }">
            <span class="flow">{{ row.from }} <el-icon><Right /></el-icon> {{ row.to }}</span>
          </template>
        </el-table-column>
        <el-table-column label="金额" width="110" align="right">
          <template #default="{ row }">
            <span v-if="row.amount" class="amount">¥{{ row.amount }}</span>
            <span v-else class="muted">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="blockHeight" label="区块" width="90" align="center" />
        <el-table-column prop="timestamp" label="上链时间" width="180" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag type="success" size="small">{{ row.status === 'success' ? '成功' : row.status }}</el-tag>
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
        @size-change="fetchData"
        @current-change="fetchData"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import request from '@/utils/request'

const loading = ref(false)
const rows = ref<any[]>([])
const meta = ref<any>({ height: 0, totalTx: 0, nodeCount: 0, tps: 0 })
const typeOptions = ref<any[]>([])
const query = reactive({ txType: '', keyword: '' })
const pagination = reactive({ current: 1, size: 10, total: 0 })

type TagType = 'primary' | 'success' | 'warning' | 'info' | 'danger'

const typeTag = (type: string) => {
  const map: Record<string, TagType> = {
    COUPON_MINT: 'warning',
    COUPON_ISSUE: 'success',
    COUPON_REDEEM: 'danger',
    COUPON_TRANSFER: 'info',
    ORDER_PAY: 'primary',
    TRACE_ANCHOR: 'success'
  }
  return map[type] || 'info'
}
const shortHash = (h: string) => (h ? `${h.slice(0, 10)}...${h.slice(-8)}` : '')

const fetchData = async () => {
  loading.value = true
  try {
    const data = await request.get('/chain/tx/page', { params: { ...query, ...pagination } })
    rows.value = data.records
    pagination.total = data.total
  } finally {
    loading.value = false
  }
}

const fetchOverview = async () => {
  const data = await request.get('/chain/overview')
  meta.value = data.meta
  typeOptions.value = data.typeStats
}

const search = () => {
  pagination.current = 1
  fetchData()
}
const reset = () => {
  query.txType = ''
  query.keyword = ''
  search()
}

onMounted(() => {
  fetchOverview()
  fetchData()
})
</script>

<style scoped lang="scss">
.chain-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  padding: 24px 28px;
  margin-bottom: 16px;
  border-radius: 14px;
  color: #fff;
  background: linear-gradient(120deg, #1d2b64 0%, #2f6feb 55%, #26c6da 100%);
  box-shadow: 0 12px 30px rgba(29, 43, 100, 0.28);

  .banner-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 20px;
    font-weight: 600;
  }
  .banner-desc {
    margin-top: 8px;
    font-size: 13px;
    opacity: 0.85;
  }
  .banner-metrics {
    display: flex;
    gap: 34px;
    .metric {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      .label {
        font-size: 12px;
        opacity: 0.75;
      }
      .value {
        font-size: 24px;
        font-weight: 700;
        letter-spacing: 1px;
      }
    }
  }
}

.table-card {
  border-radius: 14px;
}

.query-form {
  margin-bottom: 8px;
}

.hash {
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
  color: #2f6feb;
}

.flow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #606266;
}

.amount {
  color: #f56c6c;
  font-weight: 600;
}

.muted {
  color: #c0c4cc;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 1200px) {
  .chain-banner {
    flex-direction: column;
    align-items: flex-start;
    .banner-metrics {
      width: 100%;
      justify-content: space-between;
    }
  }
}
</style>
