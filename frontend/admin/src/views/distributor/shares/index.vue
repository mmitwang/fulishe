<template>
  <div class="shares-page">
    <el-card class="table-card">
      <div class="table-intro">
        <div>
          <div class="intro-title">我的商品分享</div>
          <div class="intro-description">复制 H5 链接或 Taro 路径用于推广，链接以接口返回内容为准。</div>
        </div>
        <el-button @click="fetchData"><el-icon><Refresh /></el-icon>刷新</el-button>
      </div>

      <el-table :data="rows" v-loading="loading" border stripe>
        <el-table-column prop="shareId" label="分享 ID" min-width="150" show-overflow-tooltip />
        <el-table-column prop="spuName" label="推广商品" min-width="180" show-overflow-tooltip />
        <el-table-column prop="merchantName" label="经营商户" min-width="150" />
        <el-table-column prop="expireTime" label="过期时间" min-width="165">
          <template #default="{ row }">{{ row.expireTime || '-' }}</template>
        </el-table-column>
        <el-table-column label="H5 链接" min-width="330">
          <template #default="{ row }">
            <div class="path-line">
              <el-tooltip :content="getFullH5Url(row.h5Url)" placement="top" :disabled="!row.h5Url">
                <span class="path-text">{{ getFullH5Url(row.h5Url) || '-' }}</span>
              </el-tooltip>
              <el-button link type="primary" :disabled="!row.h5Url" @click="copyText(getFullH5Url(row.h5Url))">复制</el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="Taro 路径" min-width="290">
          <template #default="{ row }">
            <div class="path-line">
              <el-tooltip :content="row.taroPath" placement="top" :disabled="!row.taroPath">
                <span class="path-text">{{ row.taroPath || '-' }}</span>
              </el-tooltip>
              <el-button link type="primary" :disabled="!row.taroPath" @click="copyText(row.taroPath)">复制</el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" :disabled="!row.h5Url" @click="openH5(row.h5Url)">打开 H5</el-button>
          </template>
        </el-table-column>
        <template #empty><el-empty description="暂无分享记录，请先在选品中心生成分享" :image-size="90" /></template>
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
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import { H5_BASE_URL } from '@/config'

interface ShareItem {
  shareId: string | number
  spuId: number
  spuName: string
  merchantName: string
  expireTime: string
  h5Url: string
  taroPath: string
}

interface PageResult<T> {
  records: T[]
  total: number
}

const loading = ref(false)
const rows = ref<ShareItem[]>([])
const pagination = reactive({ current: 1, size: 10, total: 0 })
const h5BaseUrl = H5_BASE_URL

const getFullH5Url = (path: string) => {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return `${h5BaseUrl}/${path.replace(/^\/+/, '')}`
}

const fetchData = async () => {
  if (loading.value) return
  loading.value = true
  try {
    const data = await request.get<PageResult<ShareItem>>('/distribution/shares/page', {
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

const fallbackCopy = (text: string) => {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)
  if (!copied) throw new Error('copy failed')
}

const copyText = async (text: string) => {
  if (!text) return
  try {
    try {
      if (!navigator.clipboard) throw new Error('clipboard unavailable')
      await navigator.clipboard.writeText(text)
    } catch {
      fallbackCopy(text)
    }
    ElMessage.success('复制成功')
  } catch {
    ElMessage.error('复制失败，请手动复制')
  }
}

const openH5 = (path: string) => {
  const url = getFullH5Url(path)
  if (url) window.open(url, '_blank', 'noopener,noreferrer')
}

onMounted(fetchData)
</script>

<style scoped lang="scss">
.shares-page {
  .table-card {
    border-radius: 14px;
  }

  .table-intro {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
  }

  .intro-title {
    color: #303133;
    font-size: 16px;
    font-weight: 600;
  }

  .intro-description {
    margin-top: 5px;
    color: #909399;
    font-size: 13px;
    line-height: 1.5;
  }

  .path-line {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;

    :deep(.el-button) {
      flex-shrink: 0;
      margin-left: 0;
    }
  }

  .path-text {
    display: block;
    min-width: 0;
    overflow: hidden;
    color: #606266;
    font-family: Consolas, Monaco, monospace;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pagination {
    margin-top: 18px;
    display: flex;
    justify-content: flex-end;
    overflow-x: auto;
  }
}

@media (max-width: 640px) {
  .shares-page .table-intro {
    align-items: flex-start;
  }
}
</style>
