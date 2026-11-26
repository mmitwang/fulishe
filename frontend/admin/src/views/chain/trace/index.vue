<template>
  <div class="trace-page">
    <div class="trace-hero">
      <div class="hero-text">
        <h2>区块链溯源验真</h2>
        <p>输入礼品卡券编码或商品溯源码，查询从原料采购到终端签收的全链路存证</p>
      </div>
      <div class="hero-search">
        <el-input v-model="code" size="large" placeholder="请输入卡券编码 / 溯源码，如 FLS2026100001" clearable @keyup.enter="verify">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-button type="primary" size="large" :loading="verifying" @click="verify">立即验真</el-button>
      </div>
      <div class="hero-samples">
        <span>示例：</span>
        <el-tag v-for="s in samples" :key="s" effect="plain" class="sample" @click="quickVerify(s)">{{ s }}</el-tag>
      </div>
    </div>

    <el-card v-if="result" class="result-card" v-loading="verifying">
      <div class="result-head">
        <div class="valid-badge" :class="{ invalid: !result.valid }">
          <el-icon><CircleCheckFilled v-if="result.valid" /><CircleCloseFilled v-else /></el-icon>
          {{ result.valid ? '验证通过 · 链上数据未被篡改' : '验证失败' }}
        </div>
        <span class="verify-time">验证时间：{{ result.verifyTime }}</span>
      </div>

      <el-row :gutter="24" class="result-body">
        <el-col :span="7">
          <el-image v-if="result.trace?.image || result.product?.image" :src="result.trace?.image || result.product?.image" fit="cover" class="trace-image" />
          <el-descriptions :column="1" border class="trace-desc">
            <el-descriptions-item label="商品名称">{{ result.trace?.spuName || result.product?.spuName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="溯源码">{{ result.trace?.traceCode || result.code }}</el-descriptions-item>
            <el-descriptions-item label="生产批次">{{ result.trace?.batchNo || '-' }}</el-descriptions-item>
            <el-descriptions-item label="供应商">{{ result.trace?.supplierName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="质检结果">
              <el-tag :type="result.trace?.qualityReport === '检验合格' ? 'success' : 'warning'" size="small">{{ result.trace?.qualityReport || '-' }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="上链区块">#{{ result.blockHeight }}</el-descriptions-item>
            <el-descriptions-item label="交易哈希"><span class="hash">{{ shortHash(result.txHash) }}</span></el-descriptions-item>
          </el-descriptions>
        </el-col>
        <el-col :span="17">
          <div class="section-title">全链路溯源</div>
          <el-timeline v-if="result.trace?.steps?.length" class="trace-timeline">
            <el-timeline-item
              v-for="(step, idx) in result.trace.steps"
              :key="idx"
              :timestamp="step.time"
              placement="top"
              :color="idx === result.trace.steps.length - 1 ? '#67c23a' : '#2f6feb'"
            >
              <div class="step-card">
                <div class="step-head">
                  <span class="step-name">{{ step.name }}</span>
                  <el-tag size="small" type="success">已上链</el-tag>
                </div>
                <div class="step-line">操作方：{{ step.operator }}</div>
                <div class="step-line">地点：{{ step.location }}</div>
                <div class="step-hash">存证哈希：{{ shortHash(step.hash) }}</div>
              </div>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-else description="该卡券暂无商品溯源链路，仅包含卡券链上流转记录" />

          <div class="section-title" v-if="result.txs?.length">链上流转记录</div>
          <el-table v-if="result.txs?.length" :data="result.txs" size="small" border>
            <el-table-column prop="txTypeName" label="类型" width="110" />
            <el-table-column prop="bizNo" label="业务单号" min-width="150" />
            <el-table-column label="流转" min-width="200">
              <template #default="{ row }">{{ row.from }} → {{ row.to }}</template>
            </el-table-column>
            <el-table-column prop="amount" label="金额" width="90" />
            <el-table-column prop="timestamp" label="时间" width="170" />
          </el-table>
        </el-col>
      </el-row>
    </el-card>

    <el-card class="list-card">
      <template #header>
        <div class="card-header">
          <span>溯源存证记录</span>
          <el-input v-model="keyword" placeholder="搜索溯源码 / 商品名称 / 批次" clearable style="width: 260px" @keyup.enter="fetchList" />
        </div>
      </template>
      <el-table :data="rows" v-loading="loading" stripe>
        <el-table-column label="商品" min-width="240">
          <template #default="{ row }">
            <div class="product-cell">
              <el-image :src="row.image" fit="cover" class="thumb" />
              <div>
                <div class="name">{{ row.spuName }}</div>
                <div class="sub">{{ row.traceCode }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="batchNo" label="批次号" width="140" />
        <el-table-column prop="supplierName" label="供应商" min-width="180" />
        <el-table-column prop="productionDate" label="生产日期" width="120" />
        <el-table-column prop="warehouse" label="仓储" width="120" />
        <el-table-column label="质检" width="100">
          <template #default="{ row }">
            <el-tag :type="row.qualityReport === '检验合格' ? 'success' : 'warning'" size="small">{{ row.qualityReport }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="quickVerify(row.traceCode)">查看链路</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="pagination.current"
        v-model:page-size="pagination.size"
        :total="pagination.total"
        layout="total, prev, pager, next"
        class="pagination"
        @current-change="fetchList"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const code = ref('')
const keyword = ref('')
const verifying = ref(false)
const loading = ref(false)
const result = ref<any>(null)
const rows = ref<any[]>([])
const pagination = reactive({ current: 1, size: 10, total: 0 })
const samples = ['FLS2026100001', 'TRC202630001', 'FLS2026100007']

const shortHash = (h: string) => (h ? `${h.slice(0, 12)}...${h.slice(-10)}` : '')

const verify = async () => {
  if (!code.value) return ElMessage.warning('请输入溯源码或卡券编码')
  verifying.value = true
  try {
    result.value = await request.post('/chain/verify', { code: code.value.trim() })
    if (!result.value.valid) ElMessage.error(result.value.message)
  } finally {
    verifying.value = false
  }
}

const quickVerify = async (c: string) => {
  code.value = c
  await verify()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const fetchList = async () => {
  loading.value = true
  try {
    const data = await request.get('/chain/trace/page', { params: { keyword: keyword.value, ...pagination } })
    rows.value = data.records
    pagination.total = data.total
  } finally {
    loading.value = false
  }
}

onMounted(fetchList)
</script>

<style scoped lang="scss">
.trace-hero {
  border-radius: 16px;
  padding: 30px 32px;
  margin-bottom: 18px;
  color: #fff;
  background: linear-gradient(120deg, #0f2027 0%, #203a43 45%, #2c5364 100%);
  box-shadow: 0 14px 34px rgba(15, 32, 39, 0.3);

  .hero-text h2 {
    margin: 0 0 8px;
    font-size: 24px;
  }
  .hero-text p {
    margin: 0 0 20px;
    opacity: 0.78;
    font-size: 13px;
  }
  .hero-search {
    display: flex;
    gap: 12px;
    max-width: 720px;
  }
  .hero-samples {
    margin-top: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    opacity: 0.9;
    .sample {
      cursor: pointer;
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.3);
      color: #fff;
    }
  }
}

.result-card {
  border-radius: 14px;
  margin-bottom: 18px;
  .result-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 18px;
    .valid-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 600;
      color: #67c23a;
      &.invalid {
        color: #f56c6c;
      }
    }
    .verify-time {
      font-size: 12px;
      color: #909399;
    }
  }
  .trace-image {
    width: 100%;
    height: 200px;
    border-radius: 10px;
    margin-bottom: 14px;
  }
  .section-title {
    font-weight: 600;
    margin-bottom: 14px;
    &:not(:first-child) {
      margin-top: 20px;
    }
  }
  .step-card {
    background: #f7f9fc;
    border-radius: 10px;
    padding: 12px 14px;
    .step-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      .step-name {
        font-weight: 600;
      }
    }
    .step-line {
      font-size: 12px;
      color: #606266;
      margin-top: 6px;
    }
    .step-hash {
      font-size: 12px;
      color: #909399;
      margin-top: 6px;
      font-family: Consolas, Monaco, monospace;
    }
  }
}

.list-card {
  border-radius: 14px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.product-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  .thumb {
    width: 52px;
    height: 52px;
    border-radius: 8px;
  }
  .name {
    font-weight: 500;
  }
  .sub {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
  }
}
.hash {
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
}
.pagination {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
}
</style>
