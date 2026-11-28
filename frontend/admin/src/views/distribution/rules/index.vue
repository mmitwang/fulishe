<template>
  <div class="rules-page">
    <el-card class="table-card">
      <el-form :inline="true" :model="query" class="query-form">
        <el-form-item label="商品名称">
          <el-input v-model="query.spuName" placeholder="请输入商品名称" clearable style="width: 220px" @keyup.enter="search" />
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
        <el-button type="primary" @click="openCreateDialog">
          <el-icon><Plus /></el-icon>
          新建佣金规则
        </el-button>
      </div>

      <el-table :data="rows" v-loading="loading" border stripe>
        <el-table-column prop="id" label="ID" width="75" />
        <el-table-column label="商品" min-width="240">
          <template #default="{ row }">
            <div class="product-cell">
              <el-image
                v-if="row.spuImage"
                :src="row.spuImage"
                fit="cover"
                class="product-image"
                :preview-src-list="[row.spuImage]"
                preview-teleported
              />
              <div v-else class="image-placeholder">无图</div>
              <div class="product-info">
                <span class="product-name">{{ row.spuName }}</span>
                <span class="product-id">商品 ID：{{ row.spuId }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="merchantName" label="经营商户" min-width="160" />
        <el-table-column label="售价" width="120" align="right">
          <template #default="{ row }"><span class="price">¥{{ formatAmount(row.sellPrice) }}</span></template>
        </el-table-column>
        <el-table-column label="佣金率" width="110" align="center">
          <template #default="{ row }"><span class="commission">{{ formatRate(row.commissionRate) }}</span></template>
        </el-table-column>
        <el-table-column label="二级佣金率" width="120" align="center">
          <template #default="{ row }">
            <span class="commission">{{ formatRate(row.level2CommissionRate || 0) }}</span>
            <div class="rate-sum">合计 {{ formatRate((Number(row.commissionRate) || 0) + (Number(row.level2CommissionRate) || 0)) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="结算周期" width="110" align="center">
          <template #default="{ row }">T+{{ Number(row.settleDays || 0) }}</template>
        </el-table-column>
        <el-table-column label="有效期" min-width="300">
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
        <el-table-column label="操作" width="100" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              link
              :type="Number(row.status) === 1 ? 'warning' : 'success'"
              :loading="operatingId === row.id"
              :disabled="operatingId !== null && operatingId !== row.id"
              @click="toggleStatus(row as CommissionRule)"
            >{{ Number(row.status) === 1 ? '停用' : '启用' }}</el-button>
          </template>
        </el-table-column>
        <template #empty><el-empty description="暂无佣金规则" :image-size="90" /></template>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.current"
        v-model:page-size="pagination.size"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        class="pagination"
        @size-change="handleSizeChange"
        @current-change="fetchData"
      />
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      title="新建佣金规则"
      width="min(560px, calc(100vw - 32px))"
      :close-on-click-modal="!submitting"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <el-form-item label="分销商品" prop="spuId">
          <el-select
            v-model="form.spuId"
            placeholder="请选择商品"
            filterable
            style="width: 100%"
            :loading="productLoading"
            no-data-text="暂无可选商品"
          >
            <el-option
              v-for="product in productOptions"
              :key="product.id"
              :label="productOptionLabel(product)"
              :value="product.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="佣金率" prop="commissionRate">
          <div class="rate-field">
            <el-input-number
              v-model="form.commissionRate"
              :min="0"
              :max="100"
              :precision="2"
              :step="1"
              controls-position="right"
              style="width: 100%"
            />
            <span class="rate-unit">%</span>
          </div>
          <div class="field-tip">按百分数填写，例如 10 表示 10%</div>
        </el-form-item>
        <el-form-item label="二级佣金率" prop="level2CommissionRate">
          <div class="rate-field">
            <el-input-number
              v-model="form.level2CommissionRate"
              :min="0"
              :max="100"
              :precision="2"
              :step="1"
              controls-position="right"
              style="width: 100%"
            />
            <span class="rate-unit">%</span>
          </div>
          <div class="field-tip">团队（二级）佣金率，需 ≤ 一级佣金率；一二级合计不超过 50%（合规上限）</div>
        </el-form-item>
        <el-form-item label="结算周期" prop="settleDays">
          <div class="rate-field">
            <el-input-number
              v-model="form.settleDays"
              :min="0"
              :max="365"
              :precision="0"
              :step="1"
              controls-position="right"
              style="width: 100%"
            />
            <span class="rate-unit">天</span>
          </div>
          <div class="field-tip">订单完成后 T+N 天转为可结算，T+0 表示完成即可结算（默认 T+7）</div>
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
      </el-form>
      <template #footer>
        <el-button :disabled="submitting" @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import request from '@/utils/request'
import { useAuthStore } from '@/stores/auth'

interface PageResult<T> {
  records: T[]
  total: number
}

interface CommissionRule {
  id: number
  merchantId: number
  merchantName: string
  spuId: number
  spuName: string
  spuImage: string
  sellPrice: number | string
  commissionRate: number
  level2CommissionRate?: number
  settleDays?: number
  validStartTime: string
  validEndTime: string
  status: number
  effective: boolean
}

interface ProductSpu {
  id: number
  merchantId: number
  merchantName: string
  spuName: string
  sellPrice: number | string
}

const authStore = useAuthStore()
const loading = ref(false)
const productLoading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const operatingId = ref<number | null>(null)
const rows = ref<CommissionRule[]>([])
const productOptions = ref<ProductSpu[]>([])
const formRef = ref<FormInstance>()
const query = reactive<{ spuName: string; status: '' | number }>({ spuName: '', status: '' })
const pagination = reactive({ current: 1, size: 10, total: 0 })
const form = reactive({
  spuId: null as number | null,
  commissionRate: 10,
  level2CommissionRate: 3,
  settleDays: 7,
  validStartTime: '',
  validEndTime: ''
})

const formRules: FormRules = {
  spuId: [{ required: true, message: '请选择分销商品', trigger: 'change' }],
  commissionRate: [{ required: true, message: '请输入佣金率', trigger: 'change' }],
  level2CommissionRate: [
    { required: true, message: '请输入二级佣金率', trigger: 'change' },
    {
      validator: (_rule, value, callback) => {
        if (Number(value) > Number(form.commissionRate)) {
          callback(new Error('二级佣金率不能高于一级佣金率'))
        } else if (Number(value) + Number(form.commissionRate) > 50) {
          callback(new Error('一二级佣金率合计不能超过 50%'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ],
  validStartTime: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  settleDays: [{ required: true, message: '请输入结算周期', trigger: 'change' }],
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
const formatRate = (value: number) => `${Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}%`
const productOptionLabel = (product: ProductSpu) => authStore.isPlatformAdmin
  ? `${product.spuName} · ${product.merchantName || '未标注商户'}`
  : product.spuName

const fetchData = async () => {
  loading.value = true
  try {
    const data = await request.get<PageResult<CommissionRule>>('/distribution/rules/page', {
      params: { ...query, current: pagination.current, size: pagination.size }
    })
    rows.value = data.records || []
    pagination.total = Number(data.total || 0)
  } finally {
    loading.value = false
  }
}

const fetchProducts = async () => {
  productLoading.value = true
  try {
    const data = await request.get<PageResult<ProductSpu>>('/product/spu/page', {
      params: { current: 1, size: 100 }
    })
    const records = data.records || []
    const merchantId = authStore.userInfo?.merchantId
    productOptions.value = authStore.isPlatformAdmin
      ? records
      : merchantId == null
        ? []
        : records.filter(item => Number(item.merchantId) === Number(merchantId))
  } finally {
    productLoading.value = false
  }
}

const search = () => {
  pagination.current = 1
  fetchData()
}

const reset = () => {
  query.spuName = ''
  query.status = ''
  search()
}

const handleSizeChange = () => {
  pagination.current = 1
  fetchData()
}

const openCreateDialog = () => {
  Object.assign(form, { spuId: null, commissionRate: 10, level2CommissionRate: 3, settleDays: 7, validStartTime: '', validEndTime: '' })
  dialogVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}

const submit = async () => {
  if (submitting.value || !formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    await request.post('/distribution/rules', {
      spuId: form.spuId,
      commissionRate: form.commissionRate,
      level2CommissionRate: form.level2CommissionRate,
      settleDays: form.settleDays,
      validStartTime: form.validStartTime,
      validEndTime: form.validEndTime
    })
    ElMessage.success('佣金规则创建成功')
    dialogVisible.value = false
    await fetchData()
  } finally {
    submitting.value = false
  }
}

const toggleStatus = async (row: CommissionRule) => {
  if (operatingId.value !== null) return
  const enabling = Number(row.status) !== 1
  const action = enabling ? '启用' : '停用'
  try {
    await ElMessageBox.confirm(`确定要${action}商品「${row.spuName}」的佣金规则吗？`, `${action}规则`, {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }

  operatingId.value = row.id
  try {
    await request.put(`/distribution/rules/${row.id}/status`, { status: enabling ? 1 : 0 })
    ElMessage.success(`${action}成功`)
    await fetchData()
  } finally {
    operatingId.value = null
  }
}

onMounted(() => {
  fetchData()
  fetchProducts()
})
</script>

<style scoped lang="scss">
.rules-page {
  .table-card {
    border-radius: 14px;
  }

  .query-form {
    margin-bottom: 4px;
  }

  .table-toolbar {
    margin-bottom: 16px;
  }

  .product-cell {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .product-image,
  .image-placeholder {
    width: 48px;
    height: 48px;
    border-radius: 8px;
    flex-shrink: 0;
  }

  .image-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f4f6fb;
    color: #a8abb2;
    font-size: 12px;
  }

  .product-info {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .product-name {
    color: #303133;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .product-id {
    color: #909399;
    font-size: 12px;
  }

  .price,
  .commission {
    color: #f56c6c;
    font-weight: 600;
  }

  .rate-sum {
    margin-top: 2px;
    font-size: 12px;
    color: #909399;
  }

  .validity {
    display: flex;
    flex-direction: column;
    gap: 4px;
    color: #606266;
    font-size: 13px;
  }

  .pagination {
    margin-top: 18px;
    display: flex;
    justify-content: flex-end;
    overflow-x: auto;
  }

  .rate-field {
    position: relative;
    width: 100%;

    :deep(.el-input__inner) {
      padding-right: 34px;
    }
  }

  .rate-unit {
    position: absolute;
    right: 42px;
    top: 50%;
    transform: translateY(-50%);
    color: #909399;
    pointer-events: none;
  }

  .field-tip {
    width: 100%;
    margin-top: 4px;
    color: #909399;
    font-size: 12px;
    line-height: 1.5;
  }
}

@media (max-width: 640px) {
  .rules-page {
    .query-form :deep(.el-form-item) {
      margin-right: 0;
    }

    .query-form :deep(.el-input),
    .query-form :deep(.el-select) {
      width: min(220px, calc(100vw - 150px)) !important;
    }
  }
}
</style>
