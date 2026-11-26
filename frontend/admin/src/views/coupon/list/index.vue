<template>
  <div class="coupon-page">
    <el-card>
      <el-form :inline="true" :model="queryForm" class="query-form">
        <el-form-item label="卡券编码">
          <el-input v-model="queryForm.couponCode" placeholder="请输入卡券编码" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryForm.status" placeholder="请选择状态" clearable style="width: 120px">
            <el-option label="未领取" :value="0" />
            <el-option label="已领取" :value="1" />
            <el-option label="已使用" :value="2" />
            <el-option label="已过期" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="tableData" v-loading="loading" border stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="couponCode" label="卡券编码" width="180" />
        <el-table-column prop="faceValue" label="面值" width="100">
          <template #default="{ row }">
            <span class="price">¥{{ row.faceValue }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="minAmount" label="最低消费" width="100">
          <template #default="{ row }">
            ¥{{ row.minAmount || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="receivedTime" label="领取时间" width="180" />
        <el-table-column prop="usedTime" label="使用时间" width="180" />
        <el-table-column prop="expireTime" label="过期时间" width="180" />
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import request from '@/utils/request'

const loading = ref(false)

const queryForm = reactive({
  couponCode: '',
  status: ''
})

const pagination = reactive({
  current: 1,
  size: 10,
  total: 0
})

const tableData = ref<any[]>([])

const getStatusText = (status: number) => {
  const map: Record<number, string> = {
    0: '未领取',
    1: '已领取',
    2: '已使用',
    3: '已过期'
  }
  return map[status] || '未知'
}

type TagType = 'primary' | 'success' | 'warning' | 'info' | 'danger'

const getStatusTagType = (status: number) => {
  const map: Record<number, TagType> = {
    0: 'info',
    1: 'success',
    2: 'warning',
    3: 'danger'
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
    const data = await request.get('/coupon/coupon/page', { params })
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
  queryForm.couponCode = ''
  queryForm.status = ''
  handleSearch()
}

onMounted(() => {
  fetchData()
})
</script>

<style lang="scss" scoped>
.coupon-page {
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
}
</style>