<template>
  <div class="role-page">
    <el-card>
      <el-form :inline="true" :model="queryForm" class="query-form">
        <el-form-item label="角色名称">
          <el-input v-model="queryForm.roleName" placeholder="请输入角色名称" clearable />
        </el-form-item>
        <el-form-item label="角色编码">
          <el-input v-model="queryForm.roleCode" placeholder="请输入角色编码" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <div class="table-toolbar">
        <el-button type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon>
          新增角色
        </el-button>
      </div>

      <el-table :data="tableData" v-loading="loading || menuLoading" border stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="roleName" label="角色名称" />
        <el-table-column prop="roleCode" label="角色编码" />
        <el-table-column prop="description" label="描述" min-width="180" />
        <el-table-column label="数据范围" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="row.dataScope === 'ALL' ? 'danger' : 'primary'" effect="plain">
              {{ row.dataScope === 'ALL' ? '全部数据' : '本商户' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'">
              {{ row.status === 1 ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="180" />
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button v-if="!isSuperAdmin(row)" type="primary" link @click="handleAssignMenu(row)">分配菜单</el-button>
            <el-button v-if="!isSuperAdmin(row)" type="danger" link @click="handleDelete(row)">删除</el-button>
            <el-tag v-else type="info" size="small">内置保护</el-tag>
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
        <el-form-item label="角色名称" prop="roleName">
          <el-input v-model="form.roleName" placeholder="请输入角色名称" />
        </el-form-item>
        <el-form-item label="角色编码" prop="roleCode">
          <el-input v-model="form.roleCode" placeholder="请输入角色编码" :disabled="form.roleCode === 'super_admin'" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item label="数据范围" prop="dataScope">
          <el-radio-group v-model="form.dataScope" :disabled="form.roleCode === 'super_admin'">
            <el-radio value="ALL">全部数据</el-radio>
            <el-radio value="MERCHANT">本商户</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status" :disabled="form.roleCode === 'super_admin'">
            <el-radio :value="1">正常</el-radio>
            <el-radio :value="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.roleCode === 'super_admin'">
          <span class="built-in-tip">内置系统管理员仅允许修改名称和描述，数据范围与状态受保护。</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="menuDialogVisible" title="分配菜单" width="600px">
      <el-alert
        title="目录与菜单按角色实际授权分别勾选；保存后需重新获取身份信息或重新登录才能生效。"
        type="info"
        :closable="false"
        class="menu-alert"
      />
      <el-tree
        ref="menuTreeRef"
        :data="menuTreeData"
        :props="{ label: 'menuName', children: 'children' }"
        node-key="id"
        default-expand-all
        show-checkbox
        check-strictly
        class="menu-tree"
      />
      <template #footer>
        <el-button :disabled="menuSaving" @click="menuDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="menuSaving" @click="handleSaveMenu">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import request from '@/utils/request'

const loading = ref(false)
const submitting = ref(false)
const menuLoading = ref(false)
const menuSaving = ref(false)
const dialogVisible = ref(false)
const menuDialogVisible = ref(false)
const dialogTitle = ref('')
const formRef = ref<FormInstance>()
const menuTreeRef = ref<any>()

const queryForm = reactive({
  roleName: '',
  roleCode: ''
})

const pagination = reactive({
  current: 1,
  size: 10,
  total: 0
})

const tableData = ref<any[]>([])
const menuTreeData = ref<any[]>([])
const currentRoleId = ref<number | null>(null)
const currentRoleCode = ref('')

const form = reactive({
  id: null as number | null,
  roleName: '',
  roleCode: '',
  description: '',
  dataScope: 'MERCHANT',
  status: 1
})

const isSuperAdmin = (row: any) => row?.roleCode === 'super_admin'

const rules: FormRules = {
  roleName: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  roleCode: [{ required: true, message: '请输入角色编码', trigger: 'blur' }]
}

const fetchData = async () => {
  loading.value = true
  try {
    const params = {
      ...queryForm,
      current: pagination.current,
      size: pagination.size
    }
    const data = await request.get('/user/role/page', { params })
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
  queryForm.roleName = ''
  queryForm.roleCode = ''
  handleSearch()
}

const handleAdd = () => {
  dialogTitle.value = '新增角色'
  Object.assign(form, {
    id: null,
    roleName: '',
    roleCode: '',
    description: '',
    dataScope: 'MERCHANT',
    status: 1
  })
  dialogVisible.value = true
}

const handleEdit = (row: any) => {
  dialogTitle.value = '编辑角色'
  Object.assign(form, row)
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const payload = form.roleCode === 'super_admin'
      ? { id: form.id, roleName: form.roleName, description: form.description }
      : { ...form }
    if (form.id) {
      await request.put('/user/role', payload)
    } else {
      await request.post('/user/role', payload)
    }
    ElMessage.success(form.id ? '角色资料已保存' : '角色新增成功')
    dialogVisible.value = false
    await fetchData()
  } finally {
    submitting.value = false
  }
}

const handleDelete = (row: any) => {
  if (isSuperAdmin(row)) {
    ElMessage.warning('内置系统管理员角色不可删除')
    return
  }
  ElMessageBox.confirm('确定要删除该角色吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    await request.delete(`/user/role/${row.id}`)
    ElMessage.success('删除成功')
    await fetchData()
  })
}

const handleAssignMenu = async (row: any) => {
  if (isSuperAdmin(row)) {
    ElMessage.warning('内置系统管理员权限不可撤销')
    return
  }
  menuLoading.value = true
  try {
    const [tree, checkedIds] = await Promise.all([
      request.get('/user/menu/tree'),
      request.get(`/user/role/${row.id}/menus`)
    ])
    currentRoleId.value = Number(row.id)
    currentRoleCode.value = row.roleCode
    menuTreeData.value = Array.isArray(tree) ? tree : []
    menuDialogVisible.value = true
    await nextTick()
    menuTreeRef.value?.setCheckedKeys((checkedIds || []).map(Number))
  } finally {
    menuLoading.value = false
  }
}

const handleSaveMenu = async () => {
  if (!currentRoleId.value || currentRoleCode.value === 'super_admin') return
  const checkedIds = (menuTreeRef.value?.getCheckedKeys() || []).map(Number)
  menuSaving.value = true
  try {
    await request.put(`/user/role/${currentRoleId.value}/menus`, { menuIds: [...new Set(checkedIds)] })
    ElMessage.success('菜单权限已保存，请重新获取身份信息或重新登录后生效')
    menuDialogVisible.value = false
  } finally {
    menuSaving.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style lang="scss" scoped>
.role-page {
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

  .built-in-tip {
    color: #909399;
    font-size: 12px;
    line-height: 1.6;
  }

  .menu-alert {
    margin-bottom: 12px;
  }

  .menu-tree {
    max-height: 400px;
    overflow-y: auto;
  }
}
</style>
