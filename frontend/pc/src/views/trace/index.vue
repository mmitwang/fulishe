<template>
  <div class="trace-page">
    <!-- 验真 -->
    <div class="hero">
      <div class="hero-title"><el-icon><Lock /></el-icon> 福礼链 · 溯源验真</div>
      <div class="hero-desc">输入商品溯源码或卡券编码，查询全链路存证</div>
      <div class="search-row">
        <el-input v-model="code" placeholder="如 TRC202630001 / FLS2026100001" clearable size="large" @keyup.enter="verify" />
        <el-button type="primary" size="large" :loading="loading" @click="verify">立即验真</el-button>
      </div>
      <div class="samples">
        示例：<span v-for="s in samples" :key="s" @click="quick(s)">{{ s }}</span>
      </div>
    </div>

    <template v-if="result">
      <el-alert
        :type="result.valid ? 'success' : 'error'"
        :title="result.valid ? '验证通过 · 数据未被篡改' : '验证失败'"
        :description="result.message"
        show-icon
        :closable="false"
        class="result-alert"
      />

      <el-descriptions v-if="result.valid" :column="3" border class="chain-meta">
        <el-descriptions-item label="链名称">{{ result.chainName || '福礼链' }}</el-descriptions-item>
        <el-descriptions-item label="区块高度">#{{ result.blockHeight }}</el-descriptions-item>
        <el-descriptions-item label="验证时间">{{ result.verifyTime }}</el-descriptions-item>
      </el-descriptions>

      <el-card shadow="never" class="product-card" v-if="result.trace || result.product">
        <div class="p-wrap">
          <el-image :src="result.trace?.image || result.product?.image" fit="cover" class="cover">
            <template #error><div class="cover-fallback">福礼社</div></template>
          </el-image>
          <div class="info">
            <div class="name">{{ result.trace?.spuName || result.product?.spuName }}</div>
            <div class="line">溯源码：{{ result.trace?.traceCode || result.code }}</div>
            <div class="line">批次号：{{ result.trace?.batchNo || '-' }}</div>
            <div class="line">质检结果：{{ result.trace?.qualityReport || '-' }}</div>
          </div>
        </div>
      </el-card>

      <el-card shadow="never" class="timeline-card" v-if="result.trace?.steps?.length">
        <div class="card-title">全链路溯源</div>
        <el-timeline>
          <el-timeline-item
            v-for="(s, i) in result.trace.steps"
            :key="i"
            :type="i === result.trace.steps.length - 1 ? 'success' : 'primary'"
            :timestamp="s.time"
          >
            <div class="step-name">{{ s.name }}</div>
            <div class="step-line">操作方：{{ s.operator }}　地点：{{ s.location }}</div>
            <div class="step-hash">存证哈希：{{ (s.hash || '').slice(0, 32) }}...</div>
          </el-timeline-item>
        </el-timeline>
      </el-card>

      <el-card shadow="never" class="timeline-card" v-if="result.txs?.length">
        <div class="card-title">链上流转记录</div>
        <div class="tx" v-for="tx in result.txs" :key="tx.id">
          <el-tag size="small" effect="plain">{{ tx.txTypeName }}</el-tag>
          <span class="tx-body">{{ tx.from }} → {{ tx.to }}</span>
          <span class="tx-time">{{ tx.timestamp }}</span>
        </div>
      </el-card>
    </template>

    <el-card shadow="never" class="hint">
      <div class="hint-title">关于福礼链</div>
      <div class="hint-text">福礼链采用 PBFT 共识，卡券铸造、发放、核销、转赠与商品生产、质检、仓储、物流节点均实时上链，确保企业福利采购全流程可信可追溯。</div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Lock } from '@element-plus/icons-vue'
import { verifyTrace } from '@/api/trace'

const route = useRoute()
const code = ref(String(route.query.code || ''))
const loading = ref(false)
const result = ref<any>(null)
const samples = ['TRC202630001', 'FLS2026100001', 'TRC202630007']

const verify = async () => {
  if (!code.value.trim()) return ElMessage.warning('请输入溯源码')
  loading.value = true
  try {
    result.value = await verifyTrace(code.value.trim())
  } finally {
    loading.value = false
  }
}

const quick = (c: string) => {
  code.value = c
  verify()
}

onMounted(() => {
  if (code.value) verify()
})
</script>

<style lang="scss" scoped>
.hero {
  background: linear-gradient(135deg, #7a0c1e, #c8102e 60%, #f0556b);
  color: #fff;
  border-radius: 14px;
  padding: 32px;
  text-align: center;
  .hero-title {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 22px;
    font-weight: 700;
  }
  .hero-desc {
    font-size: 13px;
    opacity: 0.85;
    margin: 8px 0 20px;
  }
  .search-row {
    display: flex;
    gap: 12px;
    max-width: 560px;
    margin: 0 auto;
  }
  .samples {
    margin-top: 14px;
    font-size: 12px;
    opacity: 0.8;
    span {
      text-decoration: underline;
      cursor: pointer;
      margin: 0 6px;
    }
  }
}
.result-alert {
  margin-top: 16px;
}
.chain-meta {
  margin-top: 16px;
}
.product-card {
  margin-top: 16px;
  border-radius: 12px;
  .p-wrap {
    display: flex;
    gap: 16px;
    .cover {
      width: 100px;
      height: 100px;
      border-radius: 10px;
      flex-shrink: 0;
      background: #f5f6fa;
    }
    .cover-fallback {
      width: 100px;
      height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #c0c4cc;
    }
    .info {
      .name {
        font-size: 16px;
        font-weight: 600;
      }
      .line {
        font-size: 13px;
        color: var(--text-sub);
        margin-top: 6px;
      }
    }
  }
}
.timeline-card {
  margin-top: 16px;
  border-radius: 12px;
  .card-title {
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 16px;
  }
  .step-name {
    font-size: 14px;
    font-weight: 600;
  }
  .step-line {
    font-size: 12px;
    color: var(--text-sub);
    margin-top: 4px;
  }
  .step-hash {
    font-size: 11px;
    color: #b0b3b8;
    margin-top: 4px;
    font-family: Consolas, monospace;
  }
  .tx {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid #f5f6fa;
    &:last-child {
      border-bottom: none;
    }
    .tx-body {
      font-size: 13px;
      color: #606266;
    }
    .tx-time {
      margin-left: auto;
      font-size: 12px;
      color: var(--text-sub);
    }
  }
}
.hint {
  margin-top: 16px;
  border-radius: 12px;
  background: #fdeef0;
  .hint-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--brand-primary);
  }
  .hint-text {
    font-size: 13px;
    color: #6b7a99;
    line-height: 1.7;
    margin-top: 8px;
  }
}
</style>
