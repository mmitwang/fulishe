<template>
  <div class="order-page">
    <el-card>
      <el-form :inline="true" :model="queryForm" class="query-form">
        <el-form-item label="订单号">
          <el-input v-model="queryForm.orderNo" placeholder="请输入订单号" clearable />
        </el-form-item>
        <el-form-item label="用户名">
          <el-input v-model="queryForm.userName" placeholder="请输入用户名" clearable />
        </el-form-item>
        <el-form-item label="订单状态">
          <el-select v-model="queryForm.orderStatus" placeholder="请选择状态" clearable style="width: 120px">
            <el-option label="待支付" :value="0" />
            <el-option label="已支付" :value="1" />
            <el-option label="已发货" :value="2" />
            <el-option label="已完成" :value="3" />
            <el-option label="已取消" :value="4" />
          </el-select>
        </el-form-item>
        <el-form-item label="支付状态">
          <el-select v-model="queryForm.payStatus" placeholder="请选择支付状态" clearable style="width: 120px">
            <el-option label="未支付" :value="0" />
            <el-option label="已支付" :value="1" />
            <el-option label="支付失败" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="tableData" v-loading="loading || detailLoading" border stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="orderNo" label="订单号" width="180" />
        <el-table-column prop="userName" label="用户名" min-width="110" />
        <el-table-column label="经营商户" min-width="190">
          <template #default="{ row }">
            <div class="merchant-cell">
              <span>{{ (row.merchantNames || []).join('、') || '-' }}</span>
              <el-tag v-if="row.multiMerchant" type="warning" size="small">多商户</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="mobile" label="手机号" width="130" />
        <el-table-column label="订单金额" width="120">
          <template #default="{ row }">
            <span class="price">¥{{ row.payAmount }}</span>
          </template>
        </el-table-column>
        <el-table-column label="订单状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getOrderStatusTagType(row.orderStatus)">
              {{ getOrderStatusText(row.orderStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="支付状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getPayStatusTagType(row.payStatus)">
              {{ getPayStatusText(row.payStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="payMethod" label="支付方式" width="100">
          <template #default="{ row }">
            {{ row.payMethod === 'wechat' ? '微信支付' : row.payMethod === 'alipay' ? '支付宝' : '其他' }}
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="180" />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleView(row)">详情</el-button>
            <el-button v-if="[0, 1].includes(Number(row.orderStatus))" type="warning" link :loading="operatingId === row.id" @click="handleCancel(row)">取消订单</el-button>
            <el-button v-if="Number(row.orderStatus) === 1" type="success" link :loading="operatingId === row.id" @click="handleShip(row)">发货</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.current"
        v-model:page-size="pagination.size"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        class="pagination"
        @size-change="fetchData"
        @current-change="fetchData"
      />
    </el-card>

    <el-dialog v-model="detailVisible" title="订单详情" width="800px">
      <div v-if="orderDetail" class="order-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="订单号">{{ orderDetail.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="经营商户">
            <span>{{ (orderDetail.merchantNames || []).join('、') || '-' }}</span>
            <el-tag v-if="orderDetail.multiMerchant" type="warning" size="small" class="merchant-tag">多商户</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="订单状态">
            <el-tag :type="getOrderStatusTagType(orderDetail.orderStatus)">
              {{ getOrderStatusText(orderDetail.orderStatus) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="支付状态">
            <el-tag :type="getPayStatusTagType(orderDetail.payStatus)">
              {{ getPayStatusText(orderDetail.payStatus) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="支付方式">
            {{ orderDetail.payMethod === 'wechat' ? '微信支付' : orderDetail.payMethod === 'alipay' ? '支付宝' : '其他' }}
          </el-descriptions-item>
          <el-descriptions-item label="订单金额">
            <span class="price">¥{{ orderDetail.totalAmount }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="优惠金额">
            <span class="discount">¥{{ orderDetail.discountAmount || 0 }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="实付金额">
            <span class="price">¥{{ orderDetail.payAmount }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="支付时间">{{ orderDetail.payTime || '-' }}</el-descriptions-item>
          <el-descriptions-item label="用户名称">{{ orderDetail.userName }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ orderDetail.mobile }}</el-descriptions-item>
          <el-descriptions-item label="收货地址" :span="2">{{ orderDetail.address || '-' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ orderDetail.createTime }}</el-descriptions-item>
          <el-descriptions-item label="备注">{{ orderDetail.remark || '-' }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'

const route = useRoute()
const loading = ref(false)
const detailLoading = ref(false)
const operatingId = ref<number | null>(null)
const detailVisible = ref(false)
const orderDetail = ref<any>(null)

const queryForm = reactive({
  orderNo: String(route.query.orderNo || ''),
  userName: '',
  orderStatus: '',
  payStatus: ''
})

const pagination = reactive({
  current: 1,
  size: 10,
  total: 0
})

const tableData = ref<any[]>([])

const getOrderStatusText = (status: number) => {
  const map: Record<number, string> = {
    0: '待支付',
    1: '已支付',
    2: '已发货',
    3: '已完成',
    4: '已取消',
    5: '售后中',
    6: '已退款'
  }
  return map[status] || '未知'
}

type TagType = 'primary' | 'success' | 'warning' | 'info' | 'danger'

const getOrderStatusTagType = (status: number) => {
  const map: Record<number, TagType> = {
    0: 'warning',
    1: 'success',
    2: 'info',
    3: 'success',
    4: 'danger',
    5: 'warning',
    6: 'info'
  }
  return map[status] || 'info'
}

const getPayStatusText = (status: number) => {
  const map: Record<number, string> = {
    0: '未支付',
    1: '已支付',
    2: '支付失败'
  }
  return map[status] || '未知'
}

const getPayStatusTagType = (status: number) => {
  const map: Record<number, TagType> = {
    0: 'warning',
    1: 'success',
    2: 'danger'
  }
  return map[status] || 'info'
}

const fetchData = async () => {
  loading.value = true
  try {
    const params = {
      ...queryForm,
      current: pagination.current,
      size: pagination.size
    }
    const data = await request.get('/admin/order/info/page', { params })
    tableData.value = data.records
    pagination.total = data.total
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.current = 1
  fetchData()
}

const handleReset = () => {
  queryForm.orderNo = ''
  queryForm.userName = ''
  queryForm.orderStatus = ''
  queryForm.payStatus = ''
  handleSearch()
}

const handleView = async (row: any) => {
  detailLoading.value = true
  try {
    orderDetail.value = await request.get(`/admin/order/info/${row.id}`)
    detailVisible.value = true
  } finally {
    detailLoading.value = false
  }
}

const handleCancel = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要取消该订单吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }

  operatingId.value = row.id
  try {
    await request.put('/admin/order/info', { id: row.id, orderStatus: 4 })
    ElMessage.success('订单已取消')
    await fetchData()
  } finally {
    operatingId.value = null
  }
}

const handleShip = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要将该待发货订单标记为已发货吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }

  operatingId.value = row.id
  try {
    await request.put('/admin/order/info', { id: row.id, orderStatus: 2 })
    ElMessage.success('发货状态已更新')
    await fetchData()
  } finally {
    operatingId.value = null
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style lang="scss" scoped>
.order-page {
  .query-form {
    margin-bottom: 20px;
  }

  .pagination {
    margin-top: 20px;
    justify-content: flex-end;
    display: flex;
  }

  .price {
    color: #ff4444;
    font-weight: bold;
  }

  .discount {
    color: #67c23a;
    font-weight: bold;
  }

  .merchant-cell {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .merchant-tag {
    margin-left: 6px;
  }

  .order-detail {
    .el-descriptions {
      margin-bottom: 0;
    }
  }
}
</style>