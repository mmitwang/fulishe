<template>
  <div class="merchant-dashboard" v-loading="loading">
    <section class="welcome-card">
      <div>
        <div class="eyebrow">商户经营工作台</div>
        <h2>{{ merchantName }}</h2>
        <p>集中查看本商户经营概况，及时处理订单、售后与结算事项。</p>
      </div>
      <el-button type="primary" plain @click="router.push('/merchant/profile')">商户资料</el-button>
    </section>

    <el-alert
      v-if="loadFailed"
      title="经营数据加载失败，请刷新页面重试"
      type="error"
      :closable="false"
      class="load-alert"
    />

    <el-row :gutter="16" class="stats-grid">
      <el-col v-for="item in statCards" :key="item.label" :xs="24" :sm="12" :lg="8" :xl="4">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">{{ item.label }}</div>
          <div class="stat-value" :class="item.className">{{ item.value }}</div>
          <div class="stat-sub">{{ item.sub }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="quick-card">
      <template #header>
        <div class="card-header">
          <span>快捷办理</span>
          <span class="header-note">仅展示当前账号权限范围内的数据</span>
        </div>
      </template>
      <div class="quick-actions">
        <el-button type="primary" plain @click="router.push('/product/spu')">商品管理</el-button>
        <el-button type="success" plain @click="router.push('/order/list')">订单处理</el-button>
        <el-button type="warning" plain @click="router.push('/pay/refund')">售后审核</el-button>
        <el-button type="info" plain @click="router.push('/supply/settlement')">结算查询</el-button>
      </div>
    </el-card>

    <el-card shadow="never" class="orders-card">
      <template #header>
        <div class="card-header">
          <span>最新订单</span>
          <el-link type="primary" underline="never" @click="router.push('/order/list')">查看全部</el-link>
        </div>
      </template>
      <el-table :data="overview.latestOrders" stripe :empty-text="loadFailed ? '数据加载失败' : '暂无订单'">
        <el-table-column prop="orderNo" label="订单号" min-width="180" />
        <el-table-column prop="userName" label="客户" min-width="110" />
        <el-table-column label="实付金额" width="130" align="right">
          <template #default="{ row }">
            <span class="price">¥{{ formatMoney(row.payAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="订单状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="orderStatusMeta[Number(row.orderStatus)]?.type || 'info'" size="small">
              {{ orderStatusMeta[Number(row.orderStatus)]?.text || '未知' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="下单时间" min-width="170" />
        <el-table-column label="操作" width="90" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="router.push({ path: '/order/list', query: { orderNo: row.orderNo } })">处理</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import request from '@/utils/request'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const loading = ref(false)
const loadFailed = ref(false)
const overview = ref<any>({ stats: null, latestOrders: [] })

const merchantName = computed(() => overview.value.merchantName || authStore.userInfo?.merchantName || '商户工作台')

const orderStatusMeta: Record<number, { text: string; type: 'primary' | 'success' | 'warning' | 'info' | 'danger' }> = {
  0: { text: '待支付', type: 'warning' },
  1: { text: '待发货', type: 'primary' },
  2: { text: '已发货', type: 'info' },
  3: { text: '已完成', type: 'success' },
  4: { text: '已取消', type: 'danger' },
  5: { text: '售后中', type: 'warning' },
  6: { text: '已退款', type: 'info' }
}

const formatMoney = (value: unknown) => Number(value || 0).toLocaleString('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

const statCards = computed(() => {
  const stats = overview.value.stats
  if (!stats) {
    return [
      { label: '销售额', value: '—', sub: '已支付订单金额', className: 'sales' },
      { label: '订单数', value: '—', sub: '本商户全部订单', className: '' },
      { label: '待发货', value: '—', sub: '等待履约的订单', className: 'warning' },
      { label: '待售后', value: '—', sub: '待处理及处理中', className: 'danger' },
      { label: '待结算', value: '—', sub: '金额 —', className: 'warning' },
      { label: '商品数', value: '—', sub: '本商户商品总数', className: '' }
    ]
  }
  return [
    { label: '销售额', value: `¥${formatMoney(stats.totalSales)}`, sub: '已支付订单金额', className: 'sales' },
    { label: '订单数', value: stats.orderCount ?? stats.totalOrders ?? 0, sub: '本商户全部订单', className: '' },
    { label: '待发货', value: stats.pendingShipments || 0, sub: '等待履约的订单', className: 'warning' },
    { label: '待售后', value: stats.pendingRefunds || 0, sub: '待处理及处理中', className: 'danger' },
    {
      label: '待结算',
      value: stats.pendingSettlement || 0,
      sub: `金额 ¥${formatMoney(stats.pendingSettlementAmount)}`,
      className: 'warning'
    },
    { label: '商品数', value: stats.productCount || 0, sub: '本商户商品总数', className: '' }
  ]
})

const fetchOverview = async () => {
  loading.value = true
  loadFailed.value = false
  try {
    const data = await request.get('/admin/merchant/dashboard/overview')
    overview.value = {
      ...data,
      latestOrders: Array.isArray(data.latestOrders) ? data.latestOrders : []
    }
  } catch (error) {
    overview.value = { stats: null, latestOrders: [] }
    loadFailed.value = true
  } finally {
    loading.value = false
  }
}

onMounted(fetchOverview)
</script>

<style scoped lang="scss">
.merchant-dashboard {
  min-height: 360px;

  .welcome-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 16px;
    padding: 24px 28px;
    border-radius: 16px;
    color: #fff;
    background: linear-gradient(120deg, #7a0c1e, #c8102e 62%, #467ee7);
    box-shadow: 0 14px 34px rgba(122, 12, 30, 0.18);

    .eyebrow {
      margin-bottom: 8px;
      font-size: 12px;
      letter-spacing: 2px;
      opacity: 0.72;
    }

    h2 {
      margin: 0 0 8px;
      font-size: 24px;
    }

    p {
      margin: 0;
      font-size: 13px;
      line-height: 1.7;
      opacity: 0.82;
    }

    .el-button {
      flex-shrink: 0;
      color: #fff;
      border-color: rgba(255, 255, 255, 0.42);
      background: rgba(255, 255, 255, 0.1);
    }
  }

  .load-alert {
    margin-bottom: 16px;
  }

  .stats-grid {
    margin-bottom: 4px;

    .el-col {
      margin-bottom: 12px;
    }
  }

  .stat-card,
  .quick-card,
  .orders-card {
    border-radius: 14px;
  }

  .stat-card {
    height: 100%;

    .stat-label {
      color: #909399;
      font-size: 13px;
    }

    .stat-value {
      margin: 8px 0 5px;
      color: #303133;
      font-size: 26px;
      font-weight: 700;
      line-height: 1.25;
      word-break: break-all;

      &.sales {
        color: #c8102e;
        font-size: 22px;
      }

      &.warning {
        color: #e6a23c;
      }

      &.danger {
        color: #f56c6c;
      }
    }

    .stat-sub {
      color: #a8abb2;
      font-size: 12px;
      line-height: 1.5;
    }
  }

  .quick-card,
  .orders-card {
    margin-top: 4px;
    margin-bottom: 16px;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    font-weight: 600;

    .header-note {
      color: #a8abb2;
      font-size: 12px;
      font-weight: 400;
    }
  }

  .quick-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;

    .el-button {
      margin-left: 0;
    }
  }

  .price {
    color: #f56c6c;
    font-weight: 600;
  }
}

@media (max-width: 600px) {
  .merchant-dashboard {
    .welcome-card {
      align-items: flex-start;
      padding: 20px;

      h2 {
        font-size: 20px;
      }
    }

    .card-header .header-note {
      display: none;
    }

    .quick-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));

      .el-button {
        width: 100%;
      }
    }
  }
}
</style>
