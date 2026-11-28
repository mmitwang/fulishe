<template>
  <div class="trace-page">
    <van-nav-bar title="区块链溯源" fixed left-arrow @click-left="router.back()" />
    <div class="content">
      <div class="hero">
        <div class="hero-icon"><van-icon name="shield-o" /></div>
        <div class="hero-title">福礼链 · 溯源验真</div>
        <div class="hero-desc">输入商品溯源码或卡券编码，查询全链路存证</div>
        <van-field v-model="code" placeholder="如 TRC202630001 / FLS2026100001" class="search-input" clearable />
        <van-button block round type="primary" :loading="loading" class="verify-btn" @click="verify">立即验真</van-button>
        <div class="samples">
          <span v-for="s in samples" :key="s" @click="quick(s)">{{ s }}</span>
        </div>
      </div>

      <template v-if="result">
        <div class="result-card" :class="{ invalid: !result.valid }">
          <div class="badge">
            <van-icon :name="result.valid ? 'passed' : 'close'" />
            {{ result.valid ? '验证通过 · 数据未被篡改' : '验证失败' }}
          </div>
          <div class="badge-desc">{{ result.message }}</div>
          <div class="chain-meta">
            <div class="meta-item">
              <span class="label">链名称</span>
              <span class="value">{{ result.chainName || '福礼链' }}</span>
            </div>
            <div class="meta-item">
              <span class="label">区块高度</span>
              <span class="value">#{{ result.blockHeight }}</span>
            </div>
            <div class="meta-item">
              <span class="label">验证时间</span>
              <span class="value">{{ (result.verifyTime || '').slice(5, 16) }}</span>
            </div>
          </div>
        </div>

        <div class="product-card" v-if="result.trace || result.product">
          <img :src="result.trace?.image || result.product?.image" alt="" class="cover" />
          <div class="info">
            <div class="name">{{ result.trace?.spuName || result.product?.spuName }}</div>
            <div class="line">溯源码：{{ result.trace?.traceCode || result.code }}</div>
            <div class="line">批次号：{{ result.trace?.batchNo || '-' }}</div>
            <div class="line">质检结果：{{ result.trace?.qualityReport || '-' }}</div>
          </div>
        </div>

        <div class="timeline-card" v-if="result.trace?.steps?.length">
          <div class="card-title">全链路溯源</div>
          <div class="timeline">
            <div class="step" v-for="(s, i) in result.trace.steps" :key="i">
              <div class="dot-wrap">
                <span class="dot" :class="{ last: i === result.trace.steps.length - 1 }"></span>
                <span class="line" v-if="i !== result.trace.steps.length - 1"></span>
              </div>
              <div class="step-body">
                <div class="step-head">
                  <span class="name">{{ s.name }}</span>
                  <span class="time">{{ s.time }}</span>
                </div>
                <div class="step-line">操作方：{{ s.operator }}</div>
                <div class="step-line">地点：{{ s.location }}</div>
                <div class="step-hash">存证哈希：{{ (s.hash || '').slice(0, 26) }}...</div>
              </div>
            </div>
          </div>
        </div>

        <div class="timeline-card" v-if="result.txs?.length">
          <div class="card-title">链上流转记录</div>
          <div class="tx" v-for="tx in result.txs" :key="tx.id">
            <div class="tx-head">
              <van-tag type="primary" plain>{{ tx.txTypeName }}</van-tag>
              <span class="tx-time">{{ tx.timestamp }}</span>
            </div>
            <div class="tx-body">{{ tx.from }} → {{ tx.to }}</div>
          </div>
        </div>
      </template>

      <div class="hint">
        <div class="hint-title">关于福礼链</div>
        <div class="hint-text">福礼链采用 PBFT 共识，卡券铸造、发放、核销、转赠与商品生产、质检、仓储、物流节点均实时上链，确保企业福利采购全流程可信可追溯。</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import request from '@/utils/request'

const route = useRoute()
const router = useRouter()
const code = ref(String(route.query.code || ''))
const loading = ref(false)
const result = ref<any>(null)
const samples = ['TRC202630001', 'FLS2026100001', 'TRC202630007']

const verify = async () => {
  if (!code.value) return showToast('请输入溯源码')
  loading.value = true
  try {
    result.value = await request.post('/trace/verify', { code: code.value.trim() })
    if (!result.value.valid) showToast(result.value.message)
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
.trace-page {
  min-height: 100vh;
  background: #f5f6fa;
}
.content {
  padding: 56px 12px 24px;
}
.hero {
  border-radius: 16px;
  padding: 22px 18px;
  text-align: center;
  color: #fff;
  background: linear-gradient(135deg, #7a0c1e, #c8102e 60%, #f0556b);
  .hero-icon {
    font-size: 36px;
  }
  .hero-title {
    font-size: 18px;
    font-weight: 700;
    margin-top: 6px;
  }
  .hero-desc {
    font-size: 11px;
    opacity: 0.8;
    margin: 4px 0 14px;
  }
  .search-input {
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 12px;
  }
  .verify-btn {
    background: #fff;
    color: #c8102e;
    font-weight: 600;
    border: none;
  }
  .samples {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-top: 12px;
    font-size: 10px;
    opacity: 0.75;
    span {
      text-decoration: underline;
    }
  }
}
.result-card {
  margin-top: 12px;
  background: #fff;
  border-radius: 14px;
  padding: 16px;
  border-left: 4px solid #07c160;
  &.invalid {
    border-left-color: #ee0a24;
  }
  .badge {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #07c160;
    font-weight: 700;
    font-size: 15px;
    .invalid & {
      color: #ee0a24;
    }
  }
  .badge-desc {
    font-size: 11px;
    color: #9aa0ad;
    margin-top: 4px;
  }
  .chain-meta {
    display: flex;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #f5f6fa;
    .meta-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      .label {
        font-size: 10px;
        color: #b0b3b8;
      }
      .value {
        font-size: 12px;
        color: #303133;
        margin-top: 3px;
        font-weight: 600;
      }
    }
  }
}
.product-card {
  display: flex;
  gap: 12px;
  background: #fff;
  border-radius: 14px;
  padding: 12px;
  margin-top: 12px;
  .cover {
    width: 84px;
    height: 84px;
    border-radius: 10px;
    object-fit: cover;
  }
  .info {
    flex: 1;
    min-width: 0;
    .name {
      font-size: 14px;
      font-weight: 600;
      color: #7a0c1e;
    }
    .line {
      font-size: 11px;
      color: #9aa0ad;
      margin-top: 4px;
    }
  }
}
.timeline-card {
  background: #fff;
  border-radius: 14px;
  padding: 16px;
  margin-top: 12px;
  .card-title {
    font-size: 14px;
    font-weight: 700;
    color: #7a0c1e;
    margin-bottom: 12px;
  }
  .step {
    display: flex;
    gap: 10px;
    .dot-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #c8102e;
        margin-top: 4px;
        &.last {
          background: #07c160;
        }
      }
      .line {
        flex: 1;
        width: 2px;
        background: #e8eefc;
        margin: 4px 0;
      }
    }
    .step-body {
      flex: 1;
      padding-bottom: 16px;
      .step-head {
        display: flex;
        justify-content: space-between;
        .name {
          font-size: 13px;
          font-weight: 600;
          color: #303133;
        }
        .time {
          font-size: 10px;
          color: #b0b3b8;
        }
      }
      .step-line {
        font-size: 11px;
        color: #9aa0ad;
        margin-top: 4px;
      }
      .step-hash {
        font-size: 10px;
        color: #b0b3b8;
        margin-top: 4px;
        font-family: Consolas, monospace;
      }
    }
  }
  .tx {
    padding: 10px 0;
    border-bottom: 1px solid #f5f6fa;
    .tx-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      .tx-time {
        font-size: 10px;
        color: #b0b3b8;
      }
    }
    .tx-body {
      font-size: 11px;
      color: #606266;
      margin-top: 6px;
    }
  }
}
.hint {
  margin-top: 14px;
  padding: 14px;
  background: #fdeef0;
  border-radius: 12px;
  .hint-title {
    font-size: 12px;
    font-weight: 600;
    color: #c8102e;
  }
  .hint-text {
    font-size: 11px;
    color: #6b7a99;
    line-height: 1.6;
    margin-top: 5px;
  }
}
</style>
