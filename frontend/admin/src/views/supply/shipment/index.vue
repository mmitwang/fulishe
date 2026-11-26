<template>
  <div class="shipment-page">
    <el-card class="table-card">
      <el-form :inline="true" :model="query" class="query-form">
        <el-form-item label="发货单/订单号">
          <el-input v-model="query.shipmentNo" placeholder="请输入单号" clearable style="width: 220px" />
        </el-form-item>
        <el-form-item label="承运商">
          <el-select v-model="query.carrier" placeholder="全部" clearable style="width: 140px">
            <el-option v-for="c in carriers" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="待发货" :value="0" />
            <el-option label="运输中" :value="1" />
            <el-option label="已签收" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>

      <div class="toolbar">
        <el-button type="primary" @click="dialogVisible = true"><el-icon><Plus /></el-icon> 创建发货单</el-button>
      </div>

      <el-table :data="rows" v-loading="loading" stripe>
        <el-table-column prop="shipmentNo" label="发货单号" width="170" />
        <el-table-column prop="orderNo" label="关联订单" width="180" />
        <el-table-column prop="carrier" label="承运商" width="110" />
        <el-table-column prop="trackingNo" label="运单号" min-width="180" />
        <el-table-column label="收件人" min-width="160">
          <template #default="{ row }">
            <div>{{ row.receiver }}</div>
            <div class="sub">{{ row.mobile }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="address" label="收货地址" min-width="240" show-overflow-tooltip />
        <el-table-column prop="warehouse" label="发货仓" width="120" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusMeta[row.status].type" size="small">{{ statusMeta[row.status].text }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="shipTime" label="发货时间" width="170" />
        <el-table-column label="上链" width="80" align="center">
          <template #default="{ row }">
            <el-tooltip :content="row.chainTxHash || '待上链'">
              <el-icon :class="row.chainTxHash ? 'chained' : 'unchained'"><Link /></el-icon>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-if="row.status === 0" link type="primary" @click="changeStatus(row, 1)">确认发货</el-button>
            <el-button v-else-if="row.status === 1" link type="success" @click="changeStatus(row, 2)">确认签收</el-button>
            <span v-else class="done">已完成</span>
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

    <el-dialog v-model="dialogVisible" title="创建发货单" width="560px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="关联订单" required><el-input v-model="form.orderNo" placeholder="请输入订单号" /></el-form-item>
        <el-form-item label="收件人" required><el-input v-model="form.receiver" /></el-form-item>
        <el-form-item label="手机号" required><el-input v-model="form.mobile" /></el-form-item>
        <el-form-item label="收货地址" required><el-input v-model="form.address" /></el-form-item>
        <el-form-item label="承运商">
          <el-select v-model="form.carrier" style="width: 100%">
            <el-option v-for="c in carriers" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="发货仓">
          <el-select v-model="form.warehouse" style="width: 100%">
            <el-option v-for="w in warehouses" :key="w" :label="w" :value="w" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const carriers = ['顺丰速运', '京东物流', '中通快递', '德邦快递']
const warehouses = ['杭州中心仓', '上海前置仓', '成都区域仓']
const statusMeta: Record<number, { text: string; type: 'primary' | 'success' | 'warning' | 'info' | 'danger' }> = {
  0: { text: '待发货', type: 'warning' },
  1: { text: '运输中', type: 'primary' },
  2: { text: '已签收', type: 'success' }
}
const loading = ref(false)
const rows = ref<any[]>([])
const query = reactive({ shipmentNo: '', carrier: '', status: '' })
const pagination = reactive({ current: 1, size: 10, total: 0 })
const dialogVisible = ref(false)
const form = reactive({ orderNo: '', receiver: '', mobile: '', address: '', carrier: '顺丰速运', warehouse: '杭州中心仓' })

const fetchData = async () => {
  loading.value = true
  try {
    const data = await request.get('/supply/shipment/page', { params: { ...query, ...pagination } })
    rows.value = data.records
    pagination.total = data.total
  } finally {
    loading.value = false
  }
}

const search = () => {
  pagination.current = 1
  fetchData()
}
const reset = () => {
  query.shipmentNo = ''
  query.carrier = ''
  query.status = ''
  search()
}

const changeStatus = async (row: any, status: number) => {
  await request.put(`/supply/shipment/${row.id}/status`, { status })
  ElMessage.success(status === 1 ? '已发货' : '已签收')
  fetchData()
}

const submit = async () => {
  if (!form.orderNo || !form.receiver) return ElMessage.warning('请填写订单与收件人信息')
  await request.post('/supply/shipment', form)
  ElMessage.success('发货单已创建')
  dialogVisible.value = false
  fetchData()
}

onMounted(fetchData)
</script>

<style scoped lang="scss">
.table-card {
  border-radius: 14px;
}
.toolbar {
  margin-bottom: 14px;
}
.sub {
  font-size: 12px;
  color: #909399;
}
.chained {
  color: #67c23a;
  font-size: 18px;
}
.unchained {
  color: #c0c4cc;
  font-size: 18px;
}
.done {
  font-size: 12px;
  color: #909399;
}
.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
