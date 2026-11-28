<template>
  <div class="login-page">
    <div class="brand">
      <div class="logo">福</div>
      <h1>福礼社</h1>
      <p>企业福利数智平台 · 区块链溯源</p>
    </div>

    <div class="form-card">
      <div class="form-title">账号登录</div>
      <van-cell-group inset>
        <van-field v-model="form.username" label="账号" placeholder="请输入用户名" />
        <van-field v-model="form.password" type="password" label="密码" placeholder="请输入密码" />
      </van-cell-group>

      <div class="quick-title">演示账号（密码均为 123456）</div>
      <div class="quick-users">
        <div
          v-for="u in demoUsers"
          :key="u.id"
          class="quick-user"
          :class="{ active: form.username === u.username }"
          @click="choose(u)"
        >
          <div class="name">{{ u.displayName }}</div>
          <div class="role">{{ u.roleName }}</div>
        </div>
      </div>

      <van-button block round type="primary" :loading="loading" class="login-btn" @click="login">登 录</van-button>
      <div class="tips">登录即代表同意《用户协议》与《隐私政策》</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import request from '@/utils/request'

const router = useRouter()
const demoUsers = ref<any[]>([])
const loading = ref(false)
const form = reactive({ username: 'zhangsan', password: '123456' })

const choose = (u: any) => {
  form.username = u.username
  form.password = u.password
}

const login = async () => {
  if (!form.username || !form.password) return showToast('请输入账号密码')
  loading.value = true
  try {
    const res = await request.post('/h5/login', form)
    localStorage.setItem('token', res.token)
    localStorage.setItem('userInfo', JSON.stringify(res.userInfo))
    localStorage.setItem('userId', String(res.userInfo.id))
    showToast('登录成功')
    router.replace('/home')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  const res = await fetch('/api/auth/demo-users')
  const json = await res.json()
  demoUsers.value = (json.data || []).slice(0, 4)
})
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(160deg, #7a0c1e 0%, #c8102e 45%, #f0556b 100%);
  padding: 60px 20px 30px;
  .brand {
    text-align: center;
    color: #fff;
    margin-bottom: 28px;
    .logo {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.16);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 12px;
      font-size: 32px;
      font-weight: 700;
      font-family: 'STKaiti', 'KaiTi', 'Songti SC', 'SimSun', serif;
    }
    h1 {
      margin: 0;
      font-size: 26px;
      letter-spacing: 4px;
    }
    p {
      margin: 6px 0 0;
      font-size: 11px;
      opacity: 0.75;
    }
  }
  .form-card {
    background: #fff;
    border-radius: 18px;
    padding: 22px 14px;
    .form-title {
      font-size: 16px;
      font-weight: 700;
      color: #7a0c1e;
      margin-bottom: 14px;
      padding-left: 6px;
    }
    .quick-title {
      font-size: 11px;
      color: #9aa0ad;
      margin: 18px 0 10px;
      padding-left: 6px;
    }
    .quick-users {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      .quick-user {
        width: calc(50% - 4px);
        border: 1px solid #ebeef5;
        border-radius: 10px;
        padding: 8px 10px;
        &.active {
          border-color: #c8102e;
          background: #fdf3f4;
        }
        .name {
          font-size: 12px;
          color: #303133;
        }
        .role {
          font-size: 10px;
          color: #9aa0ad;
          margin-top: 2px;
        }
      }
    }
    .login-btn {
      margin-top: 22px;
      background: linear-gradient(90deg, #c8102e, #f0556b);
      border: none;
    }
    .tips {
      text-align: center;
      font-size: 10px;
      color: #b0b3b8;
      margin-top: 12px;
    }
  }
}
</style>
