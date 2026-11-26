<template>
  <div class="batch-page">
    <el-card>
      <el-form :inline="true" :model="queryForm" class="query-form">
        <el-form-item label="批次编码">
          <el-input v-model="queryForm.batchCode" placeholder="请输入批次编码" clearable />
        </el-form-item>
        <el-form-item label="模板名称">
          <el-select v-model="queryForm.templateId" placeholder="请选择模板" clearable style="width: 150px">
            <el-option v-for="tpl in templateOptions" :key="tpl.id" :label="tpl.templateName" :value="tpl.id" />
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
          新增批次
        </el-button>
      </div>

      <el-table :data="tableData" v-loading="loading" border stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="batchCode" label="批次编码" width="150" />
        <el-table-column prop="templateName" label="模板名称" />
        <el-table-column prop="releaseCount" label="发放数量" width="100" />
        <el-table-column prop="receivedCount" label="已领取" width="100" />
        <el-table-column prop="usedCount" label="已使用" width="100" />
        <el-table-column prop="releaseTime" label="发放时间" width="180" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-form-item label="批次编码" prop="batchCode">
          <el-input v-model="form.batchCode" placeholder="请输入批次编码" />
        </el-form-item>
        <el-form-item label="关联模板" prop="templateId">
          <el-select v-model="form.templateId" placeholder="请选择模板" style="width: 100%">
            <el-option v-for="tpl in templateOptions" :key="tpl.id" :label="tpl.templateName" :value="tpl.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="发放数量" prop="releaseCount">
          <el-input v-model="form.releaseCount" type="number" placeholder="请输入发放数量" />
        </el-form-item>
        <el-form-item label="发放时间" prop="releaseTime">
          <el-date-picker v-model="form.releaseTime" type="datetime" placeholder="选择发放时间" />
        </el-form-item>
        <el-form-item label="有效期开始" prop="validStartTime">
          <el-date-picker v-model="form.validStartTime" type="datetime" placeholder="选择开始时间" />
        </el-form-item>
        <el-form-item label="有效期结束" prop="validEndTime">
          <el-date-picker v-model="form.validEndTime" type="datetime" placeholder="选择结束时间" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" placeholder="请输入备注" />
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
const templateOptions = ref<any[]>([])

const queryForm = reactive({
  batchCode: '',
  templateId: ''
})

const pagination = reactive({
  current: 1,
  size: 10,
  total: 0
})

const tableData = ref<any[]>([])

const form = reactive({
  id: null as number | null,
  batchCode: '',
  templateId: null as number | null,
  releaseCount: 0,
  status: 1,
  releaseTime: '',
  validStartTime: '',
  validEndTime: '',
  remark: ''
})

const rules: FormRules = {
  batchCode: [{ required: true, message: '请输入批次编码', trigger: 'blur' }],
  templateId: [{ required: true, message: '请选择模板', trigger: 'change' }],
  releaseCount: [{ required: true, message: '请输入发放数量', trigger: 'blur' }]
}

const fetchData = async () => {
  loading.value = true
  try {
    const params = {
      ...queryForm,
      current: pagination.current,
      size: pagination.size
    }
    const data = await request.get('/coupon/batch/page', { params })
    tableData.value = data.records
    pagination.total = data.total
  } finally {
    loading.value = false
  }
}

const fetchTemplateOptions = async () => {
  const data = await request.get('/coupon/template/page')
  templateOptions.value = data.records || []
}

const handleSearch = () => {
  pagination.current = 1
  fetchData()
}

const handleReset = () => {
  queryForm.batchCode = ''
  queryForm.templateId = ''
  handleSearch()
}

const handleAdd = () => {
  dialogTitle.value = '新增批次'
  Object.assign(form, {
    id: null,
    batchCode: '',
    templateId: null,
    releaseCount: 0,
    status: 1,
    releaseTime: '',
    validStartTime: '',
    validEndTime: '',
    remark: ''
  })
  dialogVisible.value = true
}

const handleEdit = (row: any) => {
  dialogTitle.value = '编辑批次'
  Object.assign(form, row)
  dialogVisible.value = true
}

const handleSubmit = async () => {
  formRef.value?.validate(async (valid) => {
    if (valid) {
      try {
        if (form.id) {
          await request.put('/coupon/batch', form)
        } else {
          await request.post('/coupon/batch', form)
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
  ElMessageBox.confirm('确定要删除该批次吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    await request.delete(`/coupon/batch/${row.id}`)
    ElMessage.success('删除成功')
    fetchData()
  })
}

onMounted(() => {
  fetchTemplateOptions()
  fetchData()
})
</script>

<style lang="scss" scoped>
.batch-page {
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