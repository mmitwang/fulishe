<template>
  <div class="tenant-page">
    <el-card>
      <el-form :inline="true" :model="queryForm" class="query-form">
        <el-form-item label="租户名称">
          <el-input v-model="queryForm.tenantName" placeholder="请输入租户名称" clearable />
        </el-form-item>
        <el-form-item label="租户编码">
          <el-input v-model="queryForm.tenantCode" placeholder="请输入租户编码" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryForm.status" placeholder="请选择状态" clearable style="width: 150px">
            <el-option label="正常" :value="1" />
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
          新增租户
        </el-button>
      </div>

      <el-table :data="tableData" v-loading="loading" border stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="tenantName" label="租户名称" />
        <el-table-column prop="tenantCode" label="租户编码" />
        <el-table-column prop="contactPerson" label="联系人" />
        <el-table-column prop="contactPhone" label="联系电话" />
        <el-table-column prop="contactEmail" label="邮箱" />
        <el-table-column prop="address" label="地址" min-width="180" />
        <el-table-column label="审核状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="auditStatusMeta(row.auditStatus).type">{{ auditStatusMeta(row.auditStatus).text }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="审核意见" min-width="180">
          <template #default="{ row }">{{ row.auditRemark || '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'">
              {{ row.status === 1 ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="180" />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="warning" link @click="handleAudit(row)">审核</el-button>
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
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="租户名称" prop="tenantName">
          <el-input v-model="form.tenantName" placeholder="请输入租户名称" />
        </el-form-item>
        <el-form-item label="租户编码" prop="tenantCode">
          <el-input v-model="form.tenantCode" placeholder="请输入租户编码" />
        </el-form-item>
        <el-form-item label="联系人" prop="contactPerson">
          <el-input v-model="form.contactPerson" placeholder="请输入联系人" />
        </el-form-item>
        <el-form-item label="联系电话" prop="contactPhone">
          <el-input v-model="form.contactPhone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="邮箱" prop="contactEmail">
          <el-input v-model="form.contactEmail" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model="form.address" placeholder="请输入地址" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">正常</el-radio>
            <el-radio :value="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="!form.id" label="审核状态">
          <el-tag type="warning">待审核（新增默认）</el-tag>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="auditDialogVisible" title="商户审核（Mock）" width="520px">
      <el-alert title="仅保存 Mock 审核状态与意见，用于演示登录准入流程。" type="info" :closable="false" class="audit-alert" />
      <el-form :model="auditForm" label-width="100px">
        <el-form-item label="商户名称">
          <el-input :model-value="currentTenant?.tenantName" disabled />
        </el-form-item>
        <el-form-item label="审核结果" required>
          <el-radio-group v-model="auditForm.auditStatus">
            <el-radio :value="1">通过</el-radio>
            <el-radio :value="2">驳回</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="审核意见">
          <el-input v-model="auditForm.auditRemark" type="textarea" :rows="4" placeholder="请输入审核意见" maxlength="300" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="auditSaving" @click="auditDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="auditSaving" @click="handleSubmitAudit">保存审核状态</el-button>
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
const submitting = ref(false)
const dialogVisible = ref(false)
const auditDialogVisible = ref(false)
const auditSaving = ref(false)
const currentTenant = ref<any>(null)
const dialogTitle = ref('')
const formRef = ref<FormInstance>()
const auditForm = reactive({ auditStatus: 1, auditRemark: '' })

const queryForm = reactive({
  tenantName: '',
  tenantCode: '',
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
  tenantName: '',
  tenantCode: '',
  contactPerson: '',
  contactPhone: '',
  contactEmail: '',
  address: '',
  status: 1,
  auditStatus: 0,
  auditRemark: ''
})

const rules: FormRules = {
  tenantName: [{ required: true, message: '请输入租户名称', trigger: 'blur' }],
  tenantCode: [{ required: true, message: '请输入租户编码', trigger: 'blur' }],
  contactPerson: [{ required: true, message: '请输入联系人', trigger: 'blur' }],
  contactPhone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }]
}

const auditStatusMeta = (status: number) => ({
  0: { text: '待审核', type: 'warning' },
  1: { text: '审核通过', type: 'success' },
  2: { text: '审核驳回', type: 'danger' }
} as Record<number, { text: string; type: 'primary' | 'success' | 'warning' | 'info' | 'danger' }>)[Number(status)] || { text: '未知', type: 'info' as const }

const fetchData = async () => {
  loading.value = true
  try {
    const params = {
      ...queryForm,
      current: pagination.current,
      size: pagination.size
    }
    const data = await request.get('/user/tenant/page', { params })
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
  queryForm.tenantName = ''
  queryForm.tenantCode = ''
  queryForm.status = ''
  handleSearch()
}

const handleAdd = () => {
  dialogTitle.value = '新增租户'
  Object.assign(form, {
    id: null,
    tenantName: '',
    tenantCode: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    address: '',
    status: 1,
    auditStatus: 0,
    auditRemark: ''
  })
  dialogVisible.value = true
}

const handleEdit = (row: any) => {
  dialogTitle.value = '编辑租户'
  Object.assign(form, row)
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const payload: any = {
      tenantName: form.tenantName,
      tenantCode: form.tenantCode,
      contactPerson: form.contactPerson,
      contactPhone: form.contactPhone,
      contactEmail: form.contactEmail,
      address: form.address,
      status: form.status
    }
    if (form.id) {
      await request.put('/user/tenant', { ...payload, id: form.id })
    } else {
      await request.post('/user/tenant', { ...payload, auditStatus: 0, auditRemark: '' })
    }
    ElMessage.success(form.id ? '租户资料已保存' : '租户新增成功，默认待审核（Mock）')
    dialogVisible.value = false
    await fetchData()
  } finally {
    submitting.value = false
  }
}

const handleAudit = (row: any) => {
  currentTenant.value = row
  auditForm.auditStatus = 1
  auditForm.auditRemark = row.auditRemark || ''
  auditDialogVisible.value = true
}

const handleSubmitAudit = async () => {
  if (!currentTenant.value) return
  auditSaving.value = true
  try {
    await request.put(`/user/tenant/${currentTenant.value.id}/audit`, {
      auditStatus: auditForm.auditStatus,
      auditRemark: auditForm.auditRemark.trim()
    })
    ElMessage.success('Mock 审核状态已保存')
    auditDialogVisible.value = false
    await fetchData()
  } finally {
    auditSaving.value = false
  }
}

const handleDelete = (row: any) => {
  ElMessageBox.confirm('确定要删除该租户吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    await request.delete(`/user/tenant/${row.id}`)
    ElMessage.success('删除成功')
    fetchData()
  })
}

onMounted(() => {
  fetchData()
})
</script>

<style lang="scss" scoped>
.tenant-page {
  .query-form {
    margin-bottom: 20px;
  }

  .table-toolbar {
    margin-bottom: 20px;
  }

  .audit-alert {
    margin-bottom: 16px;
  }

  .pagination {
    margin-top: 20px;
    justify-content: flex-end;
    display: flex;
  }
}
</style>
