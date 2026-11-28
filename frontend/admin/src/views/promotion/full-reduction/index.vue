<template>
  <div class="full-reduction-page">
    <el-card class="table-card">
      <el-form :inline="true" :model="query" class="query-form">
        <el-form-item label="规则名称">
          <el-input v-model="query.name" placeholder="请输入规则名称" clearable style="width: 200px" @keyup.enter="search" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部状态" clearable style="width: 130px">
            <el-option label="启用" :value="1" />
            <el-option label="停用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>

      <div class="table-toolbar">
        <el-button type="primary" @click="openCreate">
          <el-icon><Plus /></el-icon>
          新增满减规则
        </el-button>
        <span class="toolbar-tip">满足门槛自动取最高档位，与优惠券可叠加；下单时以服务端 SKU 实价重新计算</span>
      </div>

      <el-table :data="rows" v-loading="loading" border stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="name" label="规则名称" min-width="170" />
        <el-table-column label="门槛（满）" width="120" align="right">
          <template #default="{ row }">¥{{ formatAmount(row.thresholdAmount) }}</template>
        </el-table-column>
        <el-table-column label="优惠（减）" width="120" align="right">
          <template #default="{ row }"><span class="discount">-¥{{ formatAmount(row.discountAmount) }}</span></template>
        </el-table-column>
        <el-table-column label="优惠力度" width="110" align="center">
          <template #default="{ row }">{{ formatRate(row.discountAmount, row.thresholdAmount) }}</template>
        </el-table-column>
        <el-table-column label="有效期" min-width="310">
          <template #default="{ row }">
            <div class="validity">
              <span>{{ row.validStartTime || '-' }}</span>
              <span>至 {{ row.validEndTime || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="生效状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.effective ? 'success' : 'info'" size="small">{{ row.effective ? '生效中' : '未生效' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="规则状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="Number(row.status) === 1 ? 'success' : 'info'" size="small">
              {{ Number(row.status) === 1 ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row as FullReductionRule)">编辑</el-button>
            <el-button
              link
              :type="Number(row.status) === 1 ? 'warning' : 'success'"
              :loading="operatingId === row.id"
              @click="toggleStatus(row as FullReductionRule)"
            >{{ Number(row.status) === 1 ? '停用' : '启用' }}</el-button>
            <el-button link type="danger" @click="remove(row as FullReductionRule)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty><el-empty description="暂无满减规则" :image-size="90" /></template>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.current"
        v-model:page-size="pagination.size"
        :total="pagination.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        class="pagination"
        @size-change="handleSizeChange"
        @current-change="fetchData"
      />
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑满减规则' : '新增满减规则'"
      width="min(560px, calc(100vw - 32px))"
      :close-on-click-modal="!submitting"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="96px">
        <el-form-item label="规则名称" prop="name">
          <el-input v-model="form.name" placeholder="留空则自动生成，如：满 199 减 25" maxlength="30" show-word-limit />
        </el-form-item>
        <el-form-item label="满减门槛" prop="thresholdAmount">
          <el-input-number v-model="form.thresholdAmount" :min="1" :precision="2" :step="10" controls-position="right" style="width: 100%" />
          <div class="field-tip">订单商品金额达到该值即可享受优惠</div>
        </el-form-item>
        <el-form-item label="优惠金额" prop="discountAmount">
          <el-input-number v-model="form.discountAmount" :min="0.01" :precision="2" :step="5" controls-position="right" style="width: 100%" />
          <div class="field-tip">需小于满减门槛，避免出现零元订单</div>
        </el-form-item>
        <el-form-item label="开始时间" prop="validStartTime">
          <el-date-picker
            v-model="form.validStartTime"
            type="datetime"
            placeholder="请选择开始时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="结束时间" prop="validEndTime">
          <el-date-picker
            v-model="form.validEndTime"
            type="datetime"
            placeholder="请选择结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="规则预览">
          <div class="preview">满 ¥{{ formatAmount(form.thresholdAmount) }} 减 ¥{{ formatAmount(form.discountAmount) }}</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="submitting" @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import request from '@/utils/request'

interface PageResult<T> {
  records: T[]
  total: number
}

interface FullReductionRule {
  id: number
  name: string
  thresholdAmount: number
  discountAmount: number
  status: number
  validStartTime: string
  validEndTime: string
  effective: boolean
}

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const operatingId = ref<number | null>(null)
const rows = ref<FullReductionRule[]>([])
const formRef = ref<FormInstance>()
const query = reactive<{ name: string; status: '' | number }>({ name: '', status: '' })
const pagination = reactive({ current: 1, size: 10, total: 0 })
const form = reactive({
  name: '',
  thresholdAmount: 199,
  discountAmount: 25,
  validStartTime: '',
  validEndTime: '',
  status: 1
})

const formRules: FormRules = {
  thresholdAmount: [{ required: true, message: '请输入满减门槛', trigger: 'change' }],
  discountAmount: [
    { required: true, message: '请输入优惠金额', trigger: 'change' },
    {
      validator: (_rule, value, callback) => {
        if (Number(value) >= Number(form.thresholdAmount)) {
          callback(new Error('优惠金额需小于满减门槛'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ],
  validStartTime: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  validEndTime: [
    { required: true, message: '请选择结束时间', trigger: 'change' },
    {
      validator: (_rule, value, callback) => {
        if (value && form.validStartTime && value <= form.validStartTime) {
          callback(new Error('结束时间需晚于开始时间'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ]
}

const formatAmount = (value: number | string) => Number(value || 0).toLocaleString('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})
const formatRate = (discount: number, threshold: number) => {
  if (!Number(threshold)) return '-'
  return `${((Number(discount) / Number(threshold)) * 100).toFixed(1)}%`
}

const fetchData = async () => {
  loading.value = true
  try {
    const data = await request.get<PageResult<FullReductionRule>>('/admin/promotion/full-reduction/page', {
      params: { ...query, current: pagination.current, size: pagination.size }
    })
    rows.value = data.records || []
    pagination.total = Number(data.total || 0)
  } finally {
    loading.value = false
  }
}

const search = () => {
  pagination.current = 1
  fetchData()
}

const reset = () => {
  query.name = ''
  query.status = ''
  search()
}

const handleSizeChange = () => {
  pagination.current = 1
  fetchData()
}

const defaultTimeRange = () => {
  const now = new Date()
  const end = new Date(now.getTime() + 365 * 86400000)
  const pad = (num: number) => String(num).padStart(2, '0')
  const format = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  return { start: format(now), end: format(end) }
}

const openCreate = () => {
  const range = defaultTimeRange()
  editingId.value = null
  Object.assign(form, {
    name: '',
    thresholdAmount: 199,
    discountAmount: 25,
    validStartTime: range.start,
    validEndTime: range.end,
    status: 1
  })
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

const openEdit = (row: FullReductionRule) => {
  editingId.value = row.id
  Object.assign(form, {
    name: row.name,
    thresholdAmount: Number(row.thresholdAmount),
    discountAmount: Number(row.discountAmount),
    validStartTime: row.validStartTime,
    validEndTime: row.validEndTime,
    status: Number(row.status)
  })
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

const submit = async () => {
  if (submitting.value || !formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const payload = {
      name: form.name,
      thresholdAmount: form.thresholdAmount,
      discountAmount: form.discountAmount,
      validStartTime: form.validStartTime,
      validEndTime: form.validEndTime,
      status: form.status
    }
    if (editingId.value) {
      await request.put(`/admin/promotion/full-reduction/${editingId.value}`, payload)
      ElMessage.success('满减规则已更新')
    } else {
      await request.post('/admin/promotion/full-reduction', payload)
      ElMessage.success('满减规则已创建')
    }
    dialogVisible.value = false
    await fetchData()
  } finally {
    submitting.value = false
  }
}

const toggleStatus = async (row: FullReductionRule) => {
  if (operatingId.value !== null) return
  const enabling = Number(row.status) !== 1
  const action = enabling ? '启用' : '停用'
  try {
    await ElMessageBox.confirm(`确定要${action}规则「${row.name}」吗？`, `${action}满减规则`, {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  operatingId.value = row.id
  try {
    await request.put(`/admin/promotion/full-reduction/${row.id}/status`, { status: enabling ? 1 : 0 })
    ElMessage.success(`${action}成功`)
    await fetchData()
  } finally {
    operatingId.value = null
  }
}

const remove = async (row: FullReductionRule) => {
  try {
    await ElMessageBox.confirm(`删除规则「${row.name}」后将不再参与计价，历史订单不受影响。`, '删除满减规则', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  await request.delete(`/admin/promotion/full-reduction/${row.id}`)
  ElMessage.success('满减规则已删除')
  await fetchData()
}

onMounted(fetchData)
</script>

<style scoped lang="scss">
.full-reduction-page {
  .table-card {
    border-radius: 14px;
  }

  .query-form {
    margin-bottom: 4px;
  }

  .table-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .toolbar-tip {
    color: #909399;
    font-size: 12px;
  }

  .discount {
    color: #f56c6c;
    font-weight: 600;
  }

  .validity {
    display: flex;
    flex-direction: column;
    color: #606266;
    font-size: 12px;
    line-height: 1.6;
  }

  .field-tip {
    color: #909399;
    font-size: 12px;
    line-height: 1.5;
    margin-top: 4px;
  }

  .preview {
    color: #f56c6c;
    font-weight: 600;
  }

  .pagination {
    margin-top: 18px;
    display: flex;
    justify-content: flex-end;
    overflow-x: auto;
  }
}
</style>
