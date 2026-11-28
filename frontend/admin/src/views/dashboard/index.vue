<template>
  <div class="dashboard" v-loading="pageLoading">
    <div class="hero">
      <div class="hero-left">
        <h2>下午好，{{ authStore.userInfo?.nickname || '管理员' }}</h2>
        <p>今天是 {{ today }}，福礼链运行正常，供应链协同有序进行。</p>
        <div class="hero-actions">
          <el-button type="primary" plain @click="$router.push('/product/spu')">商品管理</el-button>
          <el-button type="success" plain @click="$router.push('/chain/trace')">溯源验真</el-button>
          <el-button type="warning" plain @click="$router.push('/supply/purchase')">采购协同</el-button>
        </div>
      </div>
      <div class="hero-right">
        <div class="chain-pill">
          <el-icon><Link /></el-icon>
          福礼链
          <el-tag type="success" effect="dark" size="small">运行中</el-tag>
        </div>
        <div class="chain-height">#{{ data.stats.chainHeight || 0 }}</div>
        <div class="chain-label">当前区块高度 · {{ data.stats.chainTx || 0 }} 笔链上交易</div>
      </div>
    </div>

    <el-row :gutter="16" class="todo-grid" v-loading="todoLoading">
      <el-col :xs="24" :sm="12">
        <el-card shadow="never" class="todo-card tenant-todo">
          <div class="todo-main">
            <div class="todo-label">待审核商户</div>
            <div class="todo-value">{{ pendingTenantCount === null ? '—' : pendingTenantCount }}</div>
            <div class="todo-sub">审核状态为“待审核”的经营商户</div>
          </div>
          <el-button type="warning" plain @click="$router.push('/system/tenant')">前往审核</el-button>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12">
        <el-card shadow="never" class="todo-card refund-todo">
          <div class="todo-main">
            <div class="todo-label">待处理售后</div>
            <div class="todo-value">{{ pendingRefundCount === null ? '—' : pendingRefundCount }}</div>
            <div class="todo-sub">待处理及处理中的售后申请</div>
          </div>
          <el-button type="primary" plain @click="$router.push('/pay/refund')">处理售后</el-button>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="stat-grid">
      <el-col :span="6" v-for="s in primaryStats" :key="s.label">
        <el-card shadow="never" class="stat-card">
          <div class="icon" :style="{ background: s.bg }"><el-icon><component :is="s.icon" /></el-icon></div>
          <div class="body">
            <div class="label">{{ s.label }}</div>
            <div class="value">{{ s.value }}</div>
            <div class="trend" :class="s.up ? 'up' : 'down'">
              <el-icon><component :is="s.up ? 'Top' : 'Bottom'" /></el-icon>
              {{ s.trend }}
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="stat-grid">
      <el-col :span="6" v-for="s in secondaryStats" :key="s.label">
        <el-card shadow="never" class="mini-card">
          <div class="mini-label">{{ s.label }}</div>
          <div class="mini-value" :class="s.cls">{{ s.value }}</div>
          <div class="mini-sub">{{ s.sub }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :span="16">
        <el-card shadow="never" class="chart-card">
          <template #header>
            <div class="card-head">
              <span>近 7 日交易趋势</span>
              <el-tag size="small" effect="plain">订单量 / 销售额</el-tag>
            </div>
          </template>
          <div ref="trendRef" style="height: 300px"></div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never" class="chart-card">
          <template #header><div class="card-head"><span>品类销售占比</span></div></template>
          <div ref="pieRef" style="height: 300px"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :span="8">
        <el-card shadow="never" class="chart-card">
          <template #header><div class="card-head"><span>订单状态分布</span></div></template>
          <div ref="barRef" style="height: 260px"></div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never" class="chart-card">
          <template #header>
            <div class="card-head">
              <span>链上动态</span>
              <el-link type="primary" underline="never" @click="$router.push('/chain/tx')">全部</el-link>
            </div>
          </template>
          <div class="activity-list">
            <div v-for="tx in data.chainActivity" :key="tx.id" class="activity-item">
              <el-tag size="small" :type="txTypeColor(tx.txType)">{{ tx.txTypeName }}</el-tag>
              <div class="activity-main">
                <div class="activity-title">{{ tx.bizNo }}</div>
                <div class="activity-sub">{{ tx.from }} → {{ tx.to }}</div>
              </div>
              <div class="activity-time">{{ (tx.timestamp || '').slice(5, 16) }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never" class="chart-card">
          <template #header>
            <div class="card-head">
              <span>库存预警</span>
              <el-link type="primary" underline="never" @click="$router.push('/supply/inventory')">处理</el-link>
            </div>
          </template>
          <div class="alert-list">
            <div v-for="item in data.supplyAlerts" :key="item.id" class="alert-item">
              <el-image :src="item.image" fit="cover" class="alert-img" />
              <div class="alert-main">
                <div class="alert-title">{{ item.spuName }}</div>
                <div class="alert-sub">{{ item.warehouse }} · 可用 {{ item.availableStock }}</div>
              </div>
              <el-tag :type="item.status === 'danger' ? 'danger' : 'warning'" size="small">
                {{ item.status === 'danger' ? '告急' : '偏低' }}
              </el-tag>
            </div>
            <el-empty v-if="!data.supplyAlerts?.length" description="暂无库存预警" :image-size="60" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :span="16">
        <el-card shadow="never" class="chart-card">
          <template #header>
            <div class="card-head">
              <span>最新订单</span>
              <el-link type="primary" underline="never" @click="$router.push('/order/list')">查看全部</el-link>
            </div>
          </template>
          <el-table :data="data.recentOrders" size="small">
            <el-table-column prop="orderNo" label="订单号" width="170" />
            <el-table-column prop="userName" label="客户" width="100" />
            <el-table-column label="金额" width="110" align="right">
              <template #default="{ row }"><span class="price">¥{{ row.payAmount }}</span></template>
            </el-table-column>
            <el-table-column label="状态" width="90" align="center">
              <template #default="{ row }">
                <el-tag size="small" :type="orderTag(row.orderStatus)">{{ orderText(row.orderStatus) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="source" label="来源" width="100" />
            <el-table-column prop="createTime" label="下单时间" min-width="150" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never" class="chart-card">
          <template #header><div class="card-head"><span>热销商品 TOP5</span></div></template>
          <div class="hot-list">
            <div v-for="(p, i) in data.hotProducts" :key="p.id" class="hot-item">
              <span class="rank" :class="`rank-${i + 1}`">{{ i + 1 }}</span>
              <el-image :src="p.image" fit="cover" class="hot-img" />
              <div class="hot-main">
                <div class="hot-title">{{ p.spuName }}</div>
                <div class="hot-sub">销量 {{ p.sales }} · ¥{{ p.sellPrice }}</div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import request from '@/utils/request'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const pageLoading = ref(false)
const todoLoading = ref(false)
const pendingTenantCount = ref<number | null>(null)
const pendingRefundCount = ref<number | null>(null)
const data = ref<any>({ stats: {}, trend: [], categorySales: [], orderStatus: [], chainActivity: [], supplyAlerts: [], hotProducts: [], recentOrders: [] })
const trendRef = ref<HTMLDivElement>()
const pieRef = ref<HTMLDivElement>()
const barRef = ref<HTMLDivElement>()
let charts: echarts.ECharts[] = []

const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
const money = (n: number) => n >= 10000 ? `¥${(n / 10000).toFixed(1)} 万` : `¥${n}`

const primaryStats = computed(() => {
  const s = data.value.stats
  return [
    { label: '销售额', value: money(s.totalSales || 0), icon: 'Money', bg: 'linear-gradient(135deg,#f6d365,#fda085)', up: true, trend: '较上周 +12.6%' },
    { label: '订单总数', value: s.totalOrders || 0, icon: 'Document', bg: 'linear-gradient(135deg,#4facfe,#00f2fe)', up: true, trend: '今日新增 ' + (s.todayOrders || 0) },
    { label: '商品 SKU', value: s.totalProducts || 0, icon: 'Goods', bg: 'linear-gradient(135deg,#43e97b,#38f9d7)', up: true, trend: '在售 ' + (s.totalProducts || 0) },
    { label: '平台用户', value: s.totalUsers || 0, icon: 'User', bg: 'linear-gradient(135deg,#a18cd1,#fbc2eb)', up: true, trend: '活跃 86%' }
  ]
})

const secondaryStats = computed(() => {
  const s = data.value.stats
  return [
    { label: '链上交易', value: s.chainTx || 0, sub: '区块高度 ' + (s.chainHeight || 0), cls: 'blue' },
    { label: '库存预警', value: s.lowStock || 0, sub: '需及时补货', cls: 'red' },
    { label: '待发货订单', value: s.pendingShipments || 0, sub: '建议今日处理', cls: 'orange' },
    { label: '待结算单', value: s.unsettled || 0, sub: '供应商 ' + (s.supplierCount || 0) + ' 家', cls: 'green' }
  ]
})

type TagType = 'primary' | 'success' | 'warning' | 'info' | 'danger'

const txTypeColor = (t: string) => ({
  COUPON_MINT: 'warning',
  COUPON_ISSUE: 'success',
  COUPON_REDEEM: 'danger',
  COUPON_TRANSFER: 'info',
  ORDER_PAY: 'primary',
  TRACE_ANCHOR: 'success'
} as Record<string, TagType>)[t] || 'info'
const orderText = (s: number) => ({ 0: '待支付', 1: '已支付', 2: '已发货', 3: '已完成', 4: '已取消', 5: '售后中', 6: '已退款' }[s] || '未知')
const orderTag = (s: number) => ({
  0: 'warning',
  1: 'success',
  2: 'primary',
  3: 'success',
  4: 'danger',
  5: 'warning',
  6: 'info'
} as Record<number, TagType>)[s] || 'info'

const renderCharts = () => {
  charts.forEach(c => c.dispose())
  charts = []
  if (trendRef.value) {
    const chart = echarts.init(trendRef.value)
    chart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['订单量', '销售额'], right: 0 },
      grid: { left: 10, right: 10, top: 40, bottom: 0, containLabel: true },
      xAxis: { type: 'category', data: data.value.trend.map((d: any) => d.date), axisLine: { lineStyle: { color: '#dcdfe6' } }, axisLabel: { color: '#909399' } },
      yAxis: [
        { type: 'value', name: '订单', splitLine: { lineStyle: { color: '#f0f2f5' } }, axisLabel: { color: '#909399' } },
        { type: 'value', name: '销售额', splitLine: { show: false }, axisLabel: { color: '#909399', formatter: (v: number) => `${v / 10000}万` } }
      ],
      series: [
        { name: '订单量', type: 'bar', barWidth: 18, data: data.value.trend.map((d: any) => d.orders), itemStyle: { borderRadius: [6, 6, 0, 0], color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#4facfe' }, { offset: 1, color: '#c2e9fb' }]) } },
        { name: '销售额', type: 'line', smooth: true, yAxisIndex: 1, data: data.value.trend.map((d: any) => d.sales), lineStyle: { width: 3, color: '#f6a04d' }, itemStyle: { color: '#f6a04d' }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(246,160,77,0.35)' }, { offset: 1, color: 'rgba(246,160,77,0.02)' }]) } }
      ]
    })
    charts.push(chart)
  }
  if (pieRef.value) {
    const chart = echarts.init(pieRef.value)
    chart.setOption({
      tooltip: { trigger: 'item', formatter: '{b}<br/>{c} ({d}%)' },
      legend: { bottom: 0, icon: 'circle', itemWidth: 8, itemHeight: 8 },
      color: ['#5b8ff9', '#5ad8a6', '#f6bd16', '#e8684a', '#6dc8ec', '#9270ca', '#ff9d4d', '#269a99'],
      series: [{ type: 'pie', radius: ['42%', '68%'], center: ['50%', '44%'], avoidLabelOverlap: true, itemStyle: { borderColor: '#fff', borderWidth: 2 }, label: { show: false }, data: data.value.categorySales }]
    })
    charts.push(chart)
  }
  if (barRef.value) {
    const chart = echarts.init(barRef.value)
    chart.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 10, right: 20, top: 10, bottom: 0, containLabel: true },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: '#f0f2f5' } }, axisLabel: { color: '#909399' } },
      yAxis: { type: 'category', data: data.value.orderStatus.map((s: any) => s.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#606266' } },
      series: [{ type: 'bar', barWidth: 14, data: data.value.orderStatus.map((s: any) => s.value), itemStyle: { borderRadius: [0, 8, 8, 0], color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#667eea' }, { offset: 1, color: '#764ba2' }]) }, label: { show: true, position: 'right', color: '#909399' } }]
    })
    charts.push(chart)
  }
}

const resize = () => charts.forEach(c => c.resize())

const fetchOverview = async () => {
  pageLoading.value = true
  try {
    data.value = await request.get('/dashboard/overview')
    setTimeout(renderCharts, 50)
  } finally {
    pageLoading.value = false
  }
}

const fetchTodoData = async () => {
  todoLoading.value = true
  pendingTenantCount.value = null
  pendingRefundCount.value = null
  try {
    const [tenantResult, refundResult] = await Promise.allSettled([
      request.get('/user/tenant/page', { params: { current: 1, size: 100 } }),
      request.get('/admin/pay/refund', { params: { current: 1, size: 100 } })
    ])
    if (tenantResult.status === 'fulfilled') {
      pendingTenantCount.value = (tenantResult.value.records || [])
        .filter((item: any) => Number(item.auditStatus) === 0).length
    }
    if (refundResult.status === 'fulfilled') {
      pendingRefundCount.value = (refundResult.value.records || [])
        .filter((item: any) => Number(item.refundStatus) < 2).length
    }
  } finally {
    todoLoading.value = false
  }
}

onMounted(() => {
  fetchOverview()
  fetchTodoData()
  window.addEventListener('resize', resize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  charts.forEach(c => c.dispose())
})
</script>

<style scoped lang="scss">
.dashboard {
  .hero {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 26px 30px;
    border-radius: 16px;
    margin-bottom: 16px;
    color: #fff;
    background: linear-gradient(120deg, #7a0c1e 0%, #c8102e 52%, #f0556b 100%);
    box-shadow: 0 14px 34px rgba(122, 12, 30, 0.26);
    h2 {
      margin: 0 0 8px;
      font-size: 24px;
    }
    p {
      margin: 0 0 16px;
      opacity: 0.82;
      font-size: 13px;
    }
    .hero-actions {
      display: flex;
      gap: 12px;
      :deep(.el-button) {
        background: rgba(255, 255, 255, 0.12);
        border-color: rgba(255, 255, 255, 0.35);
        color: #fff;
      }
    }
    .hero-right {
      text-align: right;
      .chain-pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        opacity: 0.95;
      }
      .chain-height {
        font-size: 38px;
        font-weight: 800;
        letter-spacing: 2px;
        margin-top: 6px;
      }
      .chain-label {
        font-size: 12px;
        opacity: 0.75;
      }
    }
  }

  .todo-grid {
    margin-bottom: 4px;

    .el-col {
      margin-bottom: 12px;
    }
  }

  .todo-card {
    height: 100%;
    border-radius: 14px;

    :deep(.el-card__body) {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 18px 20px;
    }

    .todo-label {
      color: #606266;
      font-size: 14px;
      font-weight: 600;
    }

    .todo-value {
      margin: 3px 0;
      color: #e6a23c;
      font-size: 28px;
      font-weight: 700;
    }

    .todo-sub {
      color: #a8abb2;
      font-size: 12px;
    }

    &.refund-todo .todo-value {
      color: #2f6feb;
    }

    .el-button {
      flex-shrink: 0;
    }
  }

  .stat-grid {
    margin-bottom: 16px;
  }

  .stat-card {
    border-radius: 14px;
    :deep(.el-card__body) {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 18px;
    }
    .icon {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }
    .label {
      font-size: 13px;
      color: #909399;
    }
    .value {
      font-size: 24px;
      font-weight: 700;
      color: #303133;
      margin: 2px 0;
    }
    .trend {
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 4px;
      &.up {
        color: #67c23a;
      }
      &.down {
        color: #f56c6c;
      }
    }
  }

  .mini-card {
    border-radius: 12px;
    :deep(.el-card__body) {
      padding: 16px 18px;
    }
    .mini-label {
      font-size: 13px;
      color: #909399;
    }
    .mini-value {
      font-size: 24px;
      font-weight: 700;
      margin: 4px 0;
      &.blue {
        color: #2f6feb;
      }
      &.red {
        color: #f56c6c;
      }
      &.orange {
        color: #e6a23c;
      }
      &.green {
        color: #67c23a;
      }
    }
    .mini-sub {
      font-size: 12px;
      color: #b0b3b8;
    }
  }

  .chart-card {
    border-radius: 14px;
    margin-bottom: 16px;
    .card-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
    }
  }

  .activity-list,
  .alert-list,
  .hot-list {
    height: 260px;
    overflow: auto;
  }
  .activity-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 0;
    border-bottom: 1px dashed #ebeef5;
    .activity-main {
      flex: 1;
      min-width: 0;
    }
    .activity-title {
      font-size: 13px;
      color: #303133;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .activity-sub {
      font-size: 11px;
      color: #a8abb2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .activity-time {
      font-size: 11px;
      color: #c0c4cc;
    }
  }
  .alert-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
    border-bottom: 1px dashed #ebeef5;
    .alert-img {
      width: 40px;
      height: 40px;
      border-radius: 8px;
    }
    .alert-main {
      flex: 1;
      min-width: 0;
    }
    .alert-title {
      font-size: 13px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .alert-sub {
      font-size: 11px;
      color: #a8abb2;
    }
  }
  .hot-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 0;
    .rank {
      width: 20px;
      height: 20px;
      border-radius: 6px;
      background: #f0f2f5;
      color: #909399;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      &.rank-1 {
        background: #fef0f0;
        color: #f56c6c;
      }
      &.rank-2 {
        background: #fdf6ec;
        color: #e6a23c;
      }
      &.rank-3 {
        background: #f0f9eb;
        color: #67c23a;
      }
    }
    .hot-img {
      width: 38px;
      height: 38px;
      border-radius: 8px;
    }
    .hot-main {
      flex: 1;
      min-width: 0;
    }
    .hot-title {
      font-size: 13px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .hot-sub {
      font-size: 11px;
      color: #a8abb2;
    }
  }
  .price {
    color: #f56c6c;
    font-weight: 600;
  }
}
</style>
