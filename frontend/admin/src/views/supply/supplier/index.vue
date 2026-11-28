<template>
  <div class="supplier-page">
    <el-row :gutter="16" class="stat-row">
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="label">合作供应商</div>
          <div class="value">{{ pagination.total }} <span class="unit">家</span></div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="label">A 级供应商</div>
          <div class="value success">{{ aLevelCount }} <span class="unit">家</span></div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="label">累计结算金额</div>
          <div class="value">¥{{ (totalSettled / 10000).toFixed(1) }} <span class="unit">万</span></div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="label">平均信用分</div>
          <div class="value warning">{{ avgCredit }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="table-card">
      <el-form :inline="true" :model="query" class="query-form">
        <el-form-item label="关键字">
          <el-input v-model="query.keyword" placeholder="供应商名称 / 编码 / 联系人" clearable style="width: 260px" />
        </el-form-item>
        <el-form-item label="品类">
          <el-select v-model="query.category" placeholder="全部品类" clearable style="width: 140px">
            <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 110px">
            <el-option label="合作中" :value="1" />
            <el-option label="已暂停" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-alert v-if="isSupplier" title="当前为供应商身份，仅展示本人资料，不可管理其他供应商。" type="info" :closable="false" class="role-alert" />
      <div class="toolbar" v-if="!isSupplier">
        <el-button type="primary" @click="openDialog()"><el-icon><Plus /></el-icon> 新增供应商</el-button>
      </div>

      <el-table :data="rows" v-loading="loading" stripe>
        <el-table-column prop="supplierCode" label="编码" width="100" />
        <el-table-column prop="supplierName" label="供应商名称" min-width="200" />
        <el-table-column prop="category" label="供应品类" width="110" />
        <el-table-column prop="contactPerson" label="联系人" width="100" />
        <el-table-column prop="contactPhone" label="联系电话" width="130" />
        <el-table-column label="等级" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.level === 'A' ? 'success' : 'info'" effect="dark" size="small">{{ row.level }} 级</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="信用分" width="140">
          <template #default="{ row }">
            <el-progress :percentage="row.creditScore" :stroke-width="8" :color="row.creditScore >= 95 ? '#67c23a' : row.creditScore >= 90 ? '#2f6feb' : '#e6a23c'" />
          </template>
        </el-table-column>
        <el-table-column label="累计结算" width="130" align="right">
          <template #default="{ row }">¥{{ (row.settledAmount / 10000).toFixed(1) }} 万</template>
        </el-table-column>
        <el-table-column prop="cooperationYears" label="合作年限" width="100" align="center" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">{{ row.status === 1 ? '合作中' : '已暂停' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column v-if="!isSupplier" label="操作" width="180" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
            <el-button link :type="row.status === 1 ? 'warning' : 'success'" @click="toggleStatus(row)">{{ row.status === 1 ? '暂停' : '恢复' }}</el-button>
            <el-button link type="danger" @click="remove(row)">删除</el-button>
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

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑供应商' : '新增供应商'" width="640px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="供应商名称" prop="supplierName"><el-input v-model="form.supplierName" placeholder="请输入供应商名称" /></el-form-item>
        <el-form-item label="供应品类" prop="category">
          <el-select v-model="form.category" placeholder="请选择品类" style="width: 100%">
            <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="联系人" prop="contactPerson"><el-input v-model="form.contactPerson" /></el-form-item>
        <el-form-item label="联系电话" prop="contactPhone"><el-input v-model="form.contactPhone" /></el-form-item>
        <el-form-item label="供应商等级">
          <el-radio-group v-model="form.level">
            <el-radio value="A">A 级</el-radio>
            <el-radio value="B">B 级</el-radio>
            <el-radio value="C">C 级</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="地址"><el-input v-model="form.address" /></el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">合作中</el-radio>
            <el-radio :value="0">已暂停</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import request from '@/utils/request'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const isSupplier = computed(() => Boolean(authStore.userInfo?.roleCodes?.includes('supplier') && !authStore.isPlatformAdmin))
const categories = ['食品礼盒', '节庆礼盒', '数码家电', '茶酒饮品', '家居生活', '健康关怀', '办公用品']
const loading = ref(false)
const rows = ref<any[]>([])
const query = reactive({ keyword: '', category: '', status: '' })
const pagination = reactive({ current: 1, size: 10, total: 0 })
const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const form = reactive<any>({ id: null, supplierName: '', category: '食品礼盒', contactPerson: '', contactPhone: '', level: 'B', address: '', status: 1 })

const rules: FormRules = {
  supplierName: [{ required: true, message: '请输入供应商名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择供应品类', trigger: 'change' }]
}

const aLevelCount = computed(() => rows.value.filter(r => r.level === 'A').length)
const totalSettled = computed(() => rows.value.reduce((s, r) => s + r.settledAmount, 0))
const avgCredit = computed(() => rows.value.length ? Math.round(rows.value.reduce((s, r) => s + r.creditScore, 0) / rows.value.length) : 0)

const fetchData = async () => {
  loading.value = true
  try {
    const data = await request.get('/supply/supplier/page', { params: { ...query, ...pagination } })
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
  query.keyword = ''
  query.category = ''
  query.status = ''
  search()
}

const openDialog = (row?: any) => {
  Object.assign(form, row || { id: null, supplierName: '', category: '食品礼盒', contactPerson: '', contactPhone: '', level: 'B', address: '', status: 1 })
  dialogVisible.value = true
}

const submit = () => {
  formRef.value?.validate(async valid => {
    if (!valid) return
    if (form.id) await request.put('/supply/supplier', form)
    else await request.post('/supply/supplier', form)
    ElMessage.success('操作成功')
    dialogVisible.value = false
    fetchData()
  })
}

const toggleStatus = async (row: any) => {
  await request.put('/supply/supplier', { ...row, status: row.status === 1 ? 0 : 1 })
  ElMessage.success('状态已更新')
  fetchData()
}

const remove = (row: any) => {
  ElMessageBox.confirm(`确定删除供应商「${row.supplierName}」吗？`, '提示', { type: 'warning' }).then(async () => {
    await request.delete(`/supply/supplier/${row.id}`)
    ElMessage.success('删除成功')
    fetchData()
  })
}

onMounted(fetchData)
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
    font-size: 26px;
    font-weight: 700;
    margin-top: 6px;
    &.success {
      color: #67c23a;
    }
    &.warning {
      color: #e6a23c;
    }
    .unit {
      font-size: 13px;
      color: #909399;
      font-weight: 400;
    }
  }
}
.table-card {
  border-radius: 14px;
}
.role-alert {
  margin-bottom: 14px;
}
.query-form {
  margin-bottom: 4px;
}
.toolbar {
  margin-bottom: 14px;
}
.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
