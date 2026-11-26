<template>
  <div class="template-page">
    <el-card>
      <el-form :inline="true" :model="queryForm" class="query-form">
        <el-form-item label="模板名称">
          <el-input v-model="queryForm.templateName" placeholder="请输入模板名称" clearable />
        </el-form-item>
        <el-form-item label="卡券类型">
          <el-select v-model="queryForm.couponType" placeholder="请选择类型" clearable style="width: 150px">
            <el-option label="满减券" :value="1" />
            <el-option label="折扣券" :value="2" />
            <el-option label="无门槛券" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryForm.status" placeholder="请选择状态" clearable style="width: 120px">
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <div class="table-toolbar">
        <el-button type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon>
          新增模板
        </el-button>
      </div>

      <el-table :data="tableData" v-loading="loading" border stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="templateCode" label="模板编码" width="150" />
        <el-table-column prop="templateName" label="模板名称" />
        <el-table-column label="卡券类型" width="100">
          <template #default="{ row }">
            {{ row.couponType === 1 ? '满减券' : row.couponType === 2 ? '折扣券' : '无门槛券' }}
          </template>
        </el-table-column>
        <el-table-column label="面值/折扣" width="120">
          <template #default="{ row }">
            <span v-if="row.couponType === 2">
              {{ row.discount * 10 }}折
            </span>
            <span v-else>
              ¥{{ row.faceValue }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="minAmount" label="最低消费" width="100">
          <template #default="{ row }">
            ¥{{ row.minAmount || 0 }}
          </template>
        </el-table-column>
        <el-table-column prop="totalCount" label="发放总量" width="100" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="180" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="warning" link @click="handleToggleStatus(row)">
              {{ row.status === 1 ? '禁用' : '启用' }}
            </el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="700px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-form-item label="模板名称" prop="templateName">
          <el-input v-model="form.templateName" placeholder="请输入模板名称" />
        </el-form-item>
        <el-form-item label="模板编码" prop="templateCode">
          <el-input v-model="form.templateCode" placeholder="请输入模板编码" />
        </el-form-item>
        <el-form-item label="卡券类型" prop="couponType">
          <el-radio-group v-model="form.couponType">
            <el-radio :value="1">满减券</el-radio>
            <el-radio :value="2">折扣券</el-radio>
            <el-radio :value="3">无门槛券</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="面值" prop="faceValue">
          <el-input v-model="form.faceValue" placeholder="请输入面值" />
        </el-form-item>
        <el-form-item label="最低消费" prop="minAmount">
          <el-input v-model="form.minAmount" placeholder="请输入最低消费金额" />
        </el-form-item>
        <el-form-item label="折扣" prop="discount" v-if="form.couponType === 2">
          <el-input v-model="form.discount" placeholder="请输入折扣(0.8表示8折)" />
        </el-form-item>
        <el-form-item label="发放总量" prop="totalCount">
          <el-input v-model="form.totalCount" type="number" placeholder="请输入发放总量" />
        </el-form-item>
        <el-form-item label="每人限领" prop="perUserLimit">
          <el-input v-model="form.perUserLimit" type="number" placeholder="请输入每人限领数量" />
        </el-form-item>
        <el-form-item label="有效期开始" prop="validStartTime">
          <el-date-picker v-model="form.validStartTime" type="datetime" placeholder="选择开始时间" />
        </el-form-item>
        <el-form-item label="有效期结束" prop="validEndTime">
          <el-date-picker v-model="form.validEndTime" type="datetime" placeholder="选择结束时间" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import request from '@/utils/request'

const loading = ref(false)
const dialogVisible = ref(false)
const dialogTitle = ref('')
const formRef = ref<FormInstance>()

const queryForm = reactive({
  templateName: '',
  couponType: '',
  status: ''
})

const pagination = reactive({
  current: 1,
  size: 10,
  total: 0
})

const tableData = ref<any[]>([])

const form = reactive({
  id: null as number | null,
  templateCode: '',
  templateName: '',
  description: '',
  couponType: 1,
  faceValue: '',
  minAmount: '',
  discount: '',
  totalCount: 0,
  perUserLimit: 1,
  status: 1,
  validStartTime: '',
  validEndTime: ''
})

const rules: FormRules = {
  templateName: [{ required: true, message: '请输入模板名称', trigger: 'blur' }]
}

const fetchData = async () => {
  loading.value = true
  try {
    const params = {
      ...queryForm,
      current: pagination.current,
      size: pagination.size
    }
    const data = await request.get('/coupon/template/page', { params })
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
  queryForm.templateName = ''
  queryForm.couponType = ''
  queryForm.status = ''
  handleSearch()
}

const handleAdd = () => {
  dialogTitle.value = '新增模板'
  Object.assign(form, {
    id: null,
    templateCode: '',
    templateName: '',
    description: '',
    couponType: 1,
    faceValue: '',
    minAmount: '',
    discount: '',
    totalCount: 0,
    perUserLimit: 1,
    status: 1,
    validStartTime: '',
    validEndTime: ''
  })
  dialogVisible.value = true
}

const handleEdit = (row: any) => {
  dialogTitle.value = '编辑模板'
  Object.assign(form, row)
  dialogVisible.value = true
}

const handleSubmit = async () => {
  formRef.value?.validate(async (valid) => {
    if (valid) {
      try {
        if (form.id) {
          await request.put('/coupon/template', form)
        } else {
          await request.post('/coupon/template', form)
        }
        ElMessage.success('操作成功')
        dialogVisible.value = false
        fetchData()
      } catch (e) {
        console.error(e)
      }
    }
  })
}

const handleDelete = (row: any) => {
  ElMessageBox.confirm('确定要删除该模板吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    await request.delete(`/coupon/template/${row.id}`)
    ElMessage.success('删除成功')
    fetchData()
  })
}

const handleToggleStatus = (row: any) => {
  const statusText = row.status === 1 ? '禁用' : '启用'
  ElMessageBox.confirm(`确定要${statusText}该模板吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    await request.put('/coupon/template', { ...row, status: row.status === 1 ? 0 : 1 })
    ElMessage.success(`${statusText}成功`)
    fetchData()
  })
}

onMounted(() => {
  fetchData()
})
</script>

<style lang="scss" scoped>
.template-page {
  .query-form {
    margin-bottom: 20px;
  }

  .table-toolbar {
    margin-bottom: 20px;
  }

  .pagination {
    margin-top: 20px;
    justify-content: flex-end;
    display: flex;
  }
}
</style>