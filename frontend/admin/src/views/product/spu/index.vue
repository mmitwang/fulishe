<template>
  <div class="spu-page">
    <el-card>
      <el-form :inline="true" :model="queryForm" class="query-form">
        <el-form-item label="商品名称">
          <el-input v-model="queryForm.spuName" placeholder="请输入商品名称" clearable />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="queryForm.categoryId" placeholder="请选择分类" clearable style="width: 150px">
            <el-option v-for="cat in categoryOptions" :key="cat.id" :label="cat.categoryName" :value="cat.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="品牌">
          <el-select v-model="queryForm.brandId" placeholder="请选择品牌" clearable style="width: 150px">
            <el-option v-for="brand in brandOptions" :key="brand.id" :label="brand.brandName" :value="brand.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryForm.status" placeholder="请选择状态" clearable style="width: 120px">
            <el-option label="上架" :value="1" />
            <el-option label="下架" :value="0" />
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
          新增商品
        </el-button>
        <el-button type="danger" :disabled="selectedRows.length === 0" @click="handleBatchDelete">
          <el-icon><Delete /></el-icon>
          批量删除
        </el-button>
      </div>

      <el-table
        :data="tableData"
        v-loading="loading || detailLoading"
        border
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="图片" width="90">
          <template #default="{ row }">
            <el-image lazy :src="row.coverImage || row.image" fit="cover" style="width: 48px; height: 48px; border-radius: 8px" :preview-src-list="[row.coverImage || row.image]" preview-teleported />
          </template>
        </el-table-column>
        <el-table-column prop="spuCode" label="商品编码" width="120" />
        <el-table-column prop="spuName" label="商品名称" min-width="200" />
        <el-table-column prop="merchantName" label="经营商户" min-width="160" />
        <el-table-column prop="sales" label="销量" width="90" />
        <el-table-column prop="categoryName" label="分类" width="120" />
        <el-table-column prop="brandName" label="品牌" width="120" />
        <el-table-column label="售价" width="120">
          <template #default="{ row }">
            <span class="price">¥{{ row.sellPrice }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="stock" label="库存" width="100" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'">
              {{ row.status === 1 ? '上架' : '下架' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="180" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="warning" link @click="handleToggleStatus(row)">
              {{ row.status === 1 ? '下架' : '上架' }}
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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="800px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item v-if="authStore.isPlatformAdmin && !form.id" label="经营商户" prop="merchantId">
          <el-select v-model="form.merchantId" placeholder="请选择经营商户" style="width: 100%" :loading="merchantOptionsLoading">
            <el-option v-for="merchant in merchantOptions" :key="merchant.id" :label="merchant.tenantName" :value="merchant.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-else-if="authStore.isPlatformAdmin" label="经营商户">
          <el-input :model-value="form.merchantName" disabled />
        </el-form-item>
        <el-form-item label="商品名称" prop="spuName">
          <el-input v-model="form.spuName" placeholder="请输入商品名称" />
        </el-form-item>
        <el-form-item label="商品编码" prop="spuCode">
          <el-input v-model="form.spuCode" placeholder="请输入商品编码" />
        </el-form-item>
        <el-form-item label="商品图片">
          <div class="image-field">
            <el-image v-if="form.image" :src="form.image" fit="cover" class="image-preview" />
            <el-input v-model="form.image" placeholder="请输入图片地址（默认使用 AI 生成商品图）" style="flex: 1" />
          </div>
        </el-form-item>
        <el-form-item label="视频地址">
          <el-input v-model="form.videoUrl" placeholder="请输入商品视频地址（mp4，可选）" />
        </el-form-item>
        <el-form-item label="分类" prop="categoryId">
          <el-select v-model="form.categoryId" placeholder="请选择分类" style="width: 100%">
            <el-option v-for="cat in categoryOptions" :key="cat.id" :label="cat.categoryName" :value="cat.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="品牌" prop="brandId">
          <el-select v-model="form.brandId" placeholder="请选择品牌" style="width: 100%">
            <el-option v-for="brand in brandOptions" :key="brand.id" :label="brand.brandName" :value="brand.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="原价" prop="originalPrice">
          <el-input v-model="form.originalPrice" placeholder="请输入原价" />
        </el-form-item>
        <el-form-item label="售价" prop="sellPrice">
          <el-input v-model="form.sellPrice" placeholder="请输入售价" />
        </el-form-item>
        <el-form-item label="成本价" prop="costPrice">
          <el-input v-model="form.costPrice" placeholder="请输入成本价" />
        </el-form-item>
        <el-form-item label="库存" prop="stock">
          <el-input v-model="form.stock" type="number" placeholder="请输入库存" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" placeholder="请输入商品描述" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">上架</el-radio>
            <el-radio :value="0">下架</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import request, { cachedGet } from '@/utils/request'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const loading = ref(false)
const detailLoading = ref(false)
const submitting = ref(false)
const merchantOptionsLoading = ref(false)
const merchantOptions = ref<any[]>([])
const dialogVisible = ref(false)
const dialogTitle = ref('')
const formRef = ref<FormInstance>()
const selectedRows = ref<any[]>([])
const categoryOptions = ref<any[]>([])
const brandOptions = ref<any[]>([])

const queryForm = reactive({
  spuName: '',
  categoryId: '',
  brandId: '',
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
  merchantId: null as number | null,
  merchantName: '',
  spuCode: '',
  spuName: '',
  image: '',
  videoUrl: '',
  description: '',
  categoryId: null as number | null,
  brandId: null as number | null,
  originalPrice: '',
  sellPrice: '',
  costPrice: '',
  stock: 0,
  status: 1
})

const rules: FormRules = {
  merchantId: [{ required: true, message: '请选择经营商户', trigger: 'change' }],
  spuName: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  sellPrice: [{ required: true, message: '请输入售价', trigger: 'blur' }]
}

const fetchData = async () => {
  loading.value = true
  try {
    const params = {
      ...queryForm,
      current: pagination.current,
      size: pagination.size
    }
    const data = await request.get('/admin/product/spu/page', { params })
    tableData.value = data.records
    pagination.total = data.total
  } finally {
    loading.value = false
  }
}

const fetchOptions = async () => {
  const [categoryRes, brandRes] = await Promise.all([
    cachedGet('/product/category/tree'),
    cachedGet('/product/brand/list')
  ])
  categoryOptions.value = categoryRes
  brandOptions.value = brandRes
}

const fetchMerchantOptions = async () => {
  if (!authStore.isPlatformAdmin) return
  merchantOptionsLoading.value = true
  try {
    const data = await request.get('/user/tenant/page', { params: { current: 1, size: 100 } })
    merchantOptions.value = data.records || []
  } finally {
    merchantOptionsLoading.value = false
  }
}

const handleSearch = () => {
  pagination.current = 1
  fetchData()
}

const handleReset = () => {
  queryForm.spuName = ''
  queryForm.categoryId = ''
  queryForm.brandId = ''
  queryForm.status = ''
  handleSearch()
}

const handleAdd = () => {
  dialogTitle.value = '新增商品'
  Object.assign(form, {
    id: null,
    merchantId: null,
    merchantName: '',
    spuCode: '',
    spuName: '',
    image: '',
    videoUrl: '',
    description: '',
    categoryId: null,
    brandId: null,
    originalPrice: '',
    sellPrice: '',
    costPrice: '',
    stock: 0,
    status: 1
  })
  formRef.value?.clearValidate()
  dialogVisible.value = true
}

const handleEdit = async (row: any) => {
  detailLoading.value = true
  try {
    const data = await request.get(`/admin/product/spu/${row.id}`)
    dialogTitle.value = '编辑商品'
    Object.assign(form, data, {
      merchantId: Number(data.merchantId),
      merchantName: data.merchantName || ''
    })
    formRef.value?.clearValidate()
    dialogVisible.value = true
  } finally {
    detailLoading.value = false
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const payload = { ...form }
    if (form.id) {
      const { merchantId: _merchantId, merchantName: _merchantName, ...editablePayload } = payload
      await request.put('/admin/product/spu', editablePayload)
    } else {
      await request.post('/admin/product/spu', payload)
    }
    ElMessage.success(form.id ? '商品修改成功' : '商品新增成功')
    dialogVisible.value = false
    await fetchData()
  } finally {
    submitting.value = false
  }
}

const handleDelete = (row: any) => {
  ElMessageBox.confirm('确定要删除该商品吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    await request.delete(`/admin/product/spu/${row.id}`)
    ElMessage.success('删除成功')
    await fetchData()
  })
}

const handleBatchDelete = () => {
  ElMessageBox.confirm(`确定要删除选中的 ${selectedRows.value.length} 个商品吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    const ids = selectedRows.value.map(r => r.id)
    await request.delete('/admin/product/spu/batch', { data: ids })
    ElMessage.success('批量删除成功')
    await fetchData()
  })
}

const handleToggleStatus = (row: any) => {
  const statusText = Number(row.status) === 1 ? '下架' : '上架'
  ElMessageBox.confirm(`确定要${statusText}该商品吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    await request.put(`/admin/product/spu/${row.id}/status`, { status: Number(row.status) === 1 ? 0 : 1 })
    ElMessage.success(`${statusText}成功`)
    await fetchData()
  })
}

const handleSelectionChange = (selection: any[]) => {
  selectedRows.value = selection
}

onMounted(() => {
  fetchOptions()
  fetchMerchantOptions()
  fetchData()
})
</script>

<style lang="scss" scoped>
.spu-page {
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

  .price {
    color: #ff4444;
    font-weight: bold;
  }

  .image-field {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;

    .image-preview {
      width: 56px;
      height: 56px;
      border-radius: 8px;
      flex-shrink: 0;
    }
  }
}
</style>