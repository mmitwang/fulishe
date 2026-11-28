<template>
  <div class="backup-page">
    <el-row :gutter="16" class="stat-row">
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">实时备份状态</div>
          <div class="stat-value">
            <el-tag :type="status.enabled ? 'success' : 'info'" size="large">
              {{ status.enabled ? '运行中' : '已暂停' }}
            </el-tag>
          </div>
          <div class="stat-hint">写操作后 {{ status.debounceMs || 0 }}ms 自动落盘</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">最近备份</div>
          <div class="stat-value time">{{ lastTime }}</div>
          <div class="stat-hint">{{ status.lastSnapshotFile || '等待首次快照' }}</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">备份数量</div>
          <div class="stat-value">{{ status.autoCount || 0 }} <span class="unit">自动</span> / {{ status.manualCount || 0 }} <span class="unit">手动</span></div>
          <div class="stat-hint">占用 {{ formatSize(status.totalSize) }}</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">数据量快照</div>
          <div class="stat-value">{{ status.summary?.['seed.products'] || 0 }} <span class="unit">商品</span> / {{ status.summary?.['extra.orders'] || 0 }} <span class="unit">订单</span></div>
          <div class="stat-hint">采购单 {{ status.summary?.['extra.purchaseOrders'] || 0 }} · 用户 {{ status.summary?.['seed.users'] || 0 }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="config-card">
      <template #header>
        <div class="card-header">
          <span class="title">备份策略</span>
          <div class="actions">
            <el-button type="primary" :loading="creating" @click="handleCreate">立即备份</el-button>
            <el-button @click="handleTrigger">触发自动备份</el-button>
            <el-button :loading="loading" @click="fetchAll">刷新</el-button>
          </div>
        </div>
      </template>
      <el-form :inline="true" class="config-form">
        <el-form-item label="自动备份">
          <el-switch v-model="form.enabled" @change="handleSaveConfig" />
        </el-form-item>
        <el-form-item label="定时兜底间隔">
          <el-input-number v-model="form.intervalMinutes" :min="1" :max="720" :step="1" @change="handleSaveConfig" />
          <span class="form-suffix">分钟</span>
        </el-form-item>
        <el-form-item label="自动备份保留">
          <el-input-number v-model="form.maxAuto" :min="3" :max="500" :step="10" @change="handleSaveConfig" />
          <span class="form-suffix">份</span>
        </el-form-item>
        <el-form-item label="手动备份保留">
          <el-input-number v-model="form.maxManual" :min="3" :max="500" :step="10" @change="handleSaveConfig" />
          <span class="form-suffix">份</span>
        </el-form-item>
      </el-form>
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="写操作实时备份：任意新增/修改/删除/支付/退款/入库/开票/分账成功后，都会在防抖窗口内生成自动快照；定时任务仅在有变更时补写，避免磁盘无意义增长。"
      />
      <div v-if="status.lastError" class="error-tip">最近一次备份异常：{{ status.lastError }}</div>
    </el-card>

    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="card-header">
          <span class="title">备份文件</span>
          <span class="sub">目录：{{ status.backupDir }}</span>
        </div>
      </template>
      <el-table :data="tableData" v-loading="loading" border stripe>
        <el-table-column prop="file" label="文件名" min-width="260" show-overflow-tooltip />
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.kind === 'manual' ? 'warning' : 'success'" effect="plain">
              {{ row.kind === 'manual' ? '手动' : '自动' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="label" label="说明" min-width="180" show-overflow-tooltip />
        <el-table-column label="数据量" width="150">
          <template #default="{ row }">
            商品 {{ row.counts?.['seed.products'] ?? '-' }} · 订单 {{ row.counts?.['extra.orders'] ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="大小" width="100">
          <template #default="{ row }">{{ formatSize(row.size) }}</template>
        </el-table-column>
        <el-table-column label="备份时间" width="180">
          <template #default="{ row }">{{ formatTime(row.createdAt || row.modifiedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="170" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleRestore(row)">恢复</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && tableData.length === 0" description="暂无备份文件" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import request from '@/utils/request'

interface BackupStatus {
  enabled: boolean
  intervalMinutes: number
  debounceMs: number
  maxAuto: number
  maxManual: number
  backupDir: string
  lastSnapshotAt: string | null
  lastSnapshotFile: string | null
  lastError: string | null
  autoCount: number
  manualCount: number
  totalSize: number
  summary: Record<string, number>
}

interface BackupFile {
  file: string
  kind: 'auto' | 'manual'
  label: string
  size: number
  createdAt: string
  modifiedAt: string
  counts: Record<string, number>
}

const loading = ref(false)
const creating = ref(false)
const tableData = ref<BackupFile[]>([])
const status = ref<BackupStatus>({
  enabled: true,
  intervalMinutes: 5,
  debounceMs: 800,
  maxAuto: 40,
  maxManual: 100,
  backupDir: '',
  lastSnapshotAt: null,
  lastSnapshotFile: null,
  lastError: null,
  autoCount: 0,
  manualCount: 0,
  totalSize: 0,
  summary: {}
})

const form = reactive({
  enabled: true,
  intervalMinutes: 5,
  maxAuto: 40,
  maxManual: 100
})

const lastTime = computed(() => (status.value.lastSnapshotAt ? formatTime(status.value.lastSnapshotAt) : '暂无快照'))

const formatTime = (value?: string | null) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-')
const formatSize = (size?: number) => {
  const value = Number(size || 0)
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(2)} MB`
}

const fetchStatus = async () => {
  const data = await request.get<BackupStatus>('/admin/backup/status')
  status.value = data
  form.enabled = data.enabled
  form.intervalMinutes = data.intervalMinutes
  form.maxAuto = data.maxAuto
  form.maxManual = data.maxManual
}

const fetchList = async () => {
  tableData.value = await request.get<BackupFile[]>('/admin/backup/list')
}

const fetchAll = async () => {
  loading.value = true
  try {
    await Promise.all([fetchStatus(), fetchList()])
  } finally {
    loading.value = false
  }
}

const handleSaveConfig = async () => {
  try {
    await request.put('/admin/backup/config', {
      enabled: form.enabled,
      intervalMinutes: form.intervalMinutes,
      maxAuto: form.maxAuto,
      maxManual: form.maxManual
    })
    ElMessage.success('备份策略已保存')
    await fetchAll()
  } catch (error) {
    await fetchAll()
  }
}

const handleCreate = async () => {
  try {
    const { value } = await ElMessageBox.prompt('请输入备份说明（便于恢复时识别）', '立即备份', {
      inputValue: '手动备份',
      confirmButtonText: '开始备份',
      cancelButtonText: '取消',
      inputValidator: (input: string) => (input && input.trim() ? true : '备份说明不能为空')
    })
    creating.value = true
    const result: any = await request.post('/admin/backup/create', { label: value })
    ElMessage.success(`备份完成：${result.file}`)
    await fetchAll()
  } catch (error) {
    if (error !== 'cancel') return
  } finally {
    creating.value = false
  }
}

const handleTrigger = async () => {
  try {
    const result: any = await request.post('/admin/backup/trigger', { label: '手动触发自动备份' })
    ElMessage.success(`自动备份已生成：${result.file}`)
    await fetchAll()
  } catch (error) {
    // 错误提示由请求拦截器统一处理
  }
}

const handleRestore = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `恢复会用该快照覆盖当前全部 Mock 数据（${formatTime(row.createdAt || row.modifiedAt)}），确定继续？`,
      '恢复数据',
      { type: 'warning', confirmButtonText: '确认恢复', cancelButtonText: '取消' }
    )
  } catch (error) {
    return
  }
  const result: any = await request.post('/admin/backup/restore', { file: row.file })
  ElMessage.success(`已恢复 ${result.collections} 个数据集合，并生成恢复后快照`)
  await fetchAll()
}

const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确定删除备份 ${row.file}？`, '删除备份', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
  } catch (error) {
    return
  }
  await request.delete('/admin/backup', { params: { file: row.file } })
  ElMessage.success('备份已删除')
  await fetchAll()
}

onMounted(fetchAll)
</script>

<style scoped>
.backup-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.stat-row .stat-card {
  border-radius: 10px;
}
.stat-label {
  color: #909399;
  font-size: 13px;
  margin-bottom: 10px;
}
.stat-value {
  font-size: 22px;
  font-weight: 600;
  color: #303133;
  line-height: 1.2;
}
.stat-value.time {
  font-size: 16px;
}
.unit {
  font-size: 12px;
  font-weight: 400;
  color: #909399;
  margin-left: 2px;
}
.stat-hint {
  color: #a8abb2;
  font-size: 12px;
  margin-top: 8px;
  word-break: break-all;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.card-header .title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}
.card-header .sub {
  font-size: 12px;
  color: #909399;
}
.config-form {
  margin-bottom: 4px;
}
.form-suffix {
  margin-left: 8px;
  color: #909399;
  font-size: 13px;
}
.error-tip {
  margin-top: 12px;
  color: #f56c6c;
  font-size: 12px;
}
.table-card :deep(.el-empty) {
  padding: 20px 0;
}
</style>
