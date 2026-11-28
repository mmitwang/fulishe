<template>
  <div class="distributors-page">
    <el-card class="table-card">
      <el-table :data="rows" v-loading="loading" border stripe>
        <el-table-column prop="distributorCode" label="分销商编码" min-width="140" />
        <el-table-column prop="name" label="分销商名称" min-width="160" />
        <el-table-column prop="username" label="登录账号" min-width="130" />
        <el-table-column label="层级" width="130" align="center">
          <template #default="{ row }">
            <el-tag :type="Number(row.level) === 1 ? 'primary' : 'success'" size="small" effect="plain">{{ row.levelLabel }}</el-tag>
            <div class="sub-text">团队 {{ row.downlineCount || 0 }} 人</div>
          </template>
        </el-table-column>
        <el-table-column label="上级分销商" min-width="120">
          <template #default="{ row }">{{ row.parentName || '—' }}</template>
        </el-table-column>
        <el-table-column prop="mobile" label="联系电话" width="130">
          <template #default="{ row }">{{ row.mobile || '-' }}</template>
        </el-table-column>
        <el-table-column prop="orderCount" label="推广订单" width="110" align="right" />
        <el-table-column label="累计佣金" width="140" align="right">
          <template #default="{ row }"><span class="amount">¥{{ formatCents(row.totalCommissionCents) }}</span></template>
        </el-table-column>
        <el-table-column label="已结算佣金" width="140" align="right">
          <template #default="{ row }">¥{{ formatCents(row.settledCommissionCents) }}</template>
        </el-table-column>
        <el-table-column label="团队佣金(二级)" width="150" align="right">
          <template #default="{ row }"><span class="team">¥{{ formatCents(row.teamCommissionCents) }}</span></template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="Number(row.status) === 1 ? 'success' : 'info'" size="small">
              {{ Number(row.status) === 1 ? '正常' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="190" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="openBind(row as Distributor)">设置上级</el-button>
            <el-button
              link
              :type="Number(row.status) === 1 ? 'warning' : 'success'"
              :loading="operatingId === row.id"
              :disabled="operatingId !== null && operatingId !== row.id"
              @click="toggleStatus(row as Distributor)"
            >{{ Number(row.status) === 1 ? '停用' : '启用' }}</el-button>
          </template>
        </el-table-column>
        <template #empty><el-empty description="暂无分销商" :image-size="90" /></template>
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

    <el-dialog v-model="bindVisible" title="设置上级分销商" width="520px">
      <el-alert
        title="合规限制：平台仅支持二级分销；禁止自绑、成环、超过二级，且已有下级团队的分销商不能再挂上级。"
        type="warning"
        :closable="false"
        class="bind-alert"
      />
      <el-form label-width="110px">
        <el-form-item label="当前分销商">
          <span>{{ binding?.name }}（{{ binding?.levelLabel }}）</span>
        </el-form-item>
        <el-form-item label="上级分销商">
          <el-select v-model="parentId" placeholder="不设置（作为一级分销商）" clearable style="width: 100%">
            <el-option
              v-for="item in candidates"
              :key="item.id"
              :label="`${item.name}（${item.levelLabel}）`"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="二级佣金率">
          <span class="hint">由商品佣金规则中的「二级佣金率」决定，默认 3%</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="bindVisible = false">取消</el-button>
        <el-button type="primary" :loading="bindSaving" @click="submitBind">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'

interface Distributor {
  id: number
  distributorCode: string
  name: string
  username: string
  mobile: string
  status: number
  parentId?: number | null
  parentName?: string
  level?: number
  levelLabel?: string
  downlineCount?: number
  orderCount: number
  totalCommissionCents: number
  settledCommissionCents: number
  teamCommissionCents?: number
}

interface PageResult<T> {
  records: T[]
  total: number
}

const loading = ref(false)
const operatingId = ref<number | null>(null)
const rows = ref<Distributor[]>([])
const pagination = reactive({ current: 1, size: 10, total: 0 })

const bindVisible = ref(false)
const bindSaving = ref(false)
const binding = ref<Distributor | null>(null)
const parentId = ref<number | null>(null)
const candidates = ref<Distributor[]>([])

const openBind = async (row: Distributor) => {
  binding.value = row
  parentId.value = row.parentId ?? null
  bindVisible.value = true
  const data = await request.get<PageResult<Distributor>>('/distribution/distributors/page', {
    params: { current: 1, size: 100 }
  })
  candidates.value = (data.records || []).filter(item => item.id !== row.id)
}

const submitBind = async () => {
  if (!binding.value) return
  bindSaving.value = true
  try {
    await request.put(`/distribution/distributors/${binding.value.id}/parent`, {
      parentDistributorId: parentId.value || null
    })
    ElMessage.success('上级关系已更新')
    bindVisible.value = false
    await fetchData()
  } finally {
    bindSaving.value = false
  }
}

const formatCents = (value: number) => (Number(value || 0) / 100).toLocaleString('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

const fetchData = async () => {
  loading.value = true
  try {
    const data = await request.get<PageResult<Distributor>>('/distribution/distributors/page', {
      params: { current: pagination.current, size: pagination.size }
    })
    rows.value = data.records || []
    pagination.total = Number(data.total || 0)
  } finally {
    loading.value = false
  }
}

const handleSizeChange = () => {
  pagination.current = 1
  fetchData()
}

const toggleStatus = async (row: Distributor) => {
  if (operatingId.value !== null) return
  const enabling = Number(row.status) !== 1
  const action = enabling ? '启用' : '停用'
  try {
    await ElMessageBox.confirm(`确定要${action}分销商「${row.name}」吗？`, `${action}分销商`, {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }

  operatingId.value = row.id
  try {
    await request.put(`/distribution/distributors/${row.id}/status`, { status: enabling ? 1 : 0 })
    ElMessage.success(`${action}成功`)
    await fetchData()
  } finally {
    operatingId.value = null
  }
}

onMounted(fetchData)
</script>

<style scoped lang="scss">
.distributors-page {
  .table-card {
    border-radius: 14px;
  }

  .amount {
    color: #f56c6c;
    font-weight: 600;
  }

  .team {
    color: #0f9d58;
    font-weight: 600;
  }

  .sub-text {
    margin-top: 4px;
    font-size: 12px;
    color: #909399;
  }

  .bind-alert {
    margin-bottom: 14px;
  }

  .hint {
    color: #8b96ad;
    font-size: 12.5px;
  }

  .pagination {
    margin-top: 18px;
    display: flex;
    justify-content: flex-end;
    overflow-x: auto;
  }
}
</style>
