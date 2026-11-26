<template>
  <div class="purchase-page">
    <el-row :gutter="16" class="stat-row">
      <el-col :span="6" v-for="s in stats" :key="s.label">
        <el-card shadow="never" class="stat-card">
          <div class="label">{{ s.label }}</div>
          <div class="value" :class="s.cls">{{ s.value }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="table-card">
      <el-form :inline="true" :model="query" class="query-form">
        <el-form-item label="采购单号">
          <el-input v-model="query.purchaseNo" placeholder="请输入采购单号" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="供应商">
          <el-select v-model="query.supplierId" placeholder="全部供应商" clearable style="width: 220px">
            <el-option v-for="s in suppliers" :key="s.id" :label="s.supplierName" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 130px">
            <el-option v-for="(t, k) in statusMap" :key="k" :label="t.text" :value="Number(k)" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>

      <div class="toolbar">
        <el-button type="primary" @click="dialogVisible = true"><el-icon><Plus /></el-icon> 新建采购单</el-button>
      </div>

      <el-table :data="rows" v-loading="loading" stripe>
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="expand-wrap">
              <el-table :data="row.items" size="small" border>
                <el-table-column prop="spuName" label="商品" min-width="220" />
                <el-table-column prop="quantity" label="数量" width="100" />
                <el-table-column label="采购单价" width="120">
                  <template #default="{ row: item }">¥{{ item.price }}</template>
                </el-table-column>
                <el-table-column label="小计" width="120">
                  <template #default="{ row: item }">¥{{ item.price * item.quantity }}</template>
                </el-table-column>
              </el-table>
              <div class="expand-remark">备注：{{ row.remark || '无' }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="purchaseNo" label="采购单号" width="180" />
        <el-table-column prop="supplierName" label="供应商" min-width="200" />
        <el-table-column prop="warehouse" label="入库仓库" width="120" />
        <el-table-column label="采购金额" width="130" align="right">
          <template #default="{ row }"><span class="amount">¥{{ row.totalAmount.toLocaleString() }}</span></template>
        </el-table-column>
        <el-table-column label="状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="statusMap[row.status]?.type || 'info'" size="small">{{ statusMap[row.status]?.text }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="expectedDate" label="预计到货" width="120" />
        <el-table-column prop="createTime" label="创建时间" width="170" />
        <el-table-column label="操作" width="190" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-if="row.status === 0" link type="primary" @click="changeStatus(row, 1)">审核通过</el-button>
            <el-button v-if="row.status === 1" link type="success" @click="changeStatus(row, 3)">确认入库</el-button>
            <el-button v-if="row.status === 2" link type="success" @click="changeStatus(row, 3)">完成入库</el-button>
            <el-button link type="info">详情</el-button>
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

    <el-dialog v-model="dialogVisible" title="新建采购单" width="760px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="供应商" required>
          <el-select v-model="form.supplierId" placeholder="请选择供应商" style="width: 100%">
            <el-option v-for="s in suppliers" :key="s.id" :label="s.supplierName" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="入库仓库">
          <el-select v-model="form.warehouse" style="width: 100%">
            <el-option v-for="w in warehouses" :key="w" :label="w" :value="w" />
          </el-select>
        </el-form-item>
        <el-form-item label="预计到货">
          <el-date-picker v-model="form.expectedDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" />
        </el-form-item>
        <el-form-item label="采购商品">
          <div class="item-editor">
            <div v-for="(item, idx) in form.items" :key="idx" class="item-row">
              <el-select v-model="item.spuId" placeholder="选择商品" style="flex: 1" @change="(v: number) => onProductChange(item, v)">
                <el-option v-for="p in products" :key="p.id" :label="p.spuName" :value="p.id" />
              </el-select>
              <el-input-number v-model="item.quantity" :min="1" :max="9999" style="width: 130px" />
              <span class="price">¥{{ item.price }}</span>
              <el-button link type="danger" @click="form.items.splice(idx, 1)" :disabled="form.items.length === 1">删除</el-button>
            </div>
            <el-button link type="primary" @click="addItem">+ 添加商品</el-button>
          </div>
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="采购金额">
          <span class="amount">¥{{ formTotal.toLocaleString() }}</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">提交采购单</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import request, { cachedGet } from '@/utils/request'

const statusMap: Record<number, { text: string; type: 'primary' | 'success' | 'warning' | 'info' | 'danger' }> = {
  0: { text: '待审核', type: 'warning' },
  1: { text: '已下单', type: 'primary' },
  2: { text: '部分入库', type: 'info' },
  3: { text: '已完成', type: 'success' },
  4: { text: '已取消', type: 'danger' }
}
const warehouses = ['杭州中心仓', '上海前置仓', '成都区域仓']
const loading = ref(false)
const rows = ref<any[]>([])
const suppliers = ref<any[]>([])
const products = ref<any[]>([])
const query = reactive({ purchaseNo: '', supplierId: '', status: '' })
const pagination = reactive({ current: 1, size: 10, total: 0 })
const overview = ref<any>({ stats: {} })
const dialogVisible = ref(false)
const form = reactive<any>({ supplierId: null, warehouse: '杭州中心仓', expectedDate: '', remark: '', items: [{ spuId: null, quantity: 100, price: 0 }] })

const stats = computed(() => [
  { label: '采购总额', value: `¥${((overview.value.stats.purchaseTotal || 0) / 10000).toFixed(1)} 万`, cls: '' },
  { label: '待处理采购单', value: overview.value.stats.pendingPurchase || 0, cls: 'warning' },
  { label: '在途发货单', value: overview.value.stats.inTransit || 0, cls: '' },
  { label: '库存预警 SKU', value: overview.value.stats.lowStock || 0, cls: 'danger' }
])

const formTotal = computed(() => form.items.reduce((s: number, i: any) => s + (i.price || 0) * (i.quantity || 0), 0))

const fetchData = async () => {
  loading.value = true
  try {
    const data = await request.get('/supply/purchase/page', { params: { ...query, ...pagination } })
    rows.value = data.records
    pagination.total = data.total
  } finally {
    loading.value = false
  }
}

const fetchOptions = async () => {
  const [s, p, o] = await Promise.all([
    cachedGet('/supply/supplier/page', { current: 1, size: 100 }),
    cachedGet('/product/spu/page', { current: 1, size: 100 }),
    cachedGet('/supply/overview')
  ])
  suppliers.value = s.records
  products.value = p.records
  overview.value = o
}

const search = () => {
  pagination.current = 1
  fetchData()
}
const reset = () => {
  query.purchaseNo = ''
  query.supplierId = ''
  query.status = ''
  search()
}

const onProductChange = (item: any, spuId: number) => {
  const p = products.value.find(x => x.id === spuId)
  item.price = p ? p.costPrice : 0
}
const addItem = () => form.items.push({ spuId: null, quantity: 50, price: 0 })

const submit = async () => {
  if (!form.supplierId) return ElMessage.warning('请选择供应商')
  const items = form.items.filter((i: any) => i.spuId).map((i: any) => ({
    spuId: i.spuId,
    spuName: products.value.find(p => p.id === i.spuId)?.spuName,
    quantity: i.quantity,
    price: i.price
  }))
  if (!items.length) return ElMessage.warning('请添加采购商品')
  await request.post('/supply/purchase', { ...form, items })
  ElMessage.success('采购单已创建')
  dialogVisible.value = false
  form.items = [{ spuId: null, quantity: 100, price: 0 }]
  fetchData()
  fetchOptions()
}

const changeStatus = async (row: any, status: number) => {
  await request.put(`/supply/purchase/${row.id}/status`, { status })
  ElMessage.success(status === 3 ? '已完成入库，库存已更新' : '状态已更新')
  fetchData()
  fetchOptions()
}

onMounted(() => {
  fetchOptions()
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
    &.warning {
      color: #e6a23c;
    }
    &.danger {
      color: #f56c6c;
    }
  }
}
.table-card {
  border-radius: 14px;
}
.toolbar {
  margin-bottom: 14px;
}
.amount {
  color: #f56c6c;
  font-weight: 600;
}
.expand-wrap {
  padding: 8px 24px 16px;
  .expand-remark {
    margin-top: 8px;
    font-size: 12px;
    color: #909399;
  }
}
.item-editor {
  width: 100%;
  .item-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
    .price {
      width: 90px;
      color: #f56c6c;
      font-weight: 600;
    }
  }
}
.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
