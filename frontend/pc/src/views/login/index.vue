<template>
  <div class="login-page">
    <div class="login-card">
      <div class="brand">
        <div class="logo">福</div>
        <h1>福礼社</h1>
        <p>企业福利数智平台 · 区块链溯源</p>
      </div>

      <el-form :model="form" size="large" @keyup.enter="login">
        <el-form-item>
          <el-input v-model="form.username" placeholder="请输入用户名" :prefix-icon="User" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.password" type="password" show-password placeholder="请输入密码" :prefix-icon="Lock" />
        </el-form-item>
        <el-button type="primary" class="login-btn" :loading="loading" @click="login">登 录</el-button>
      </el-form>

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

      <div class="back-home" @click="router.push('/home')">暂不登录，返回首页 →</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { login as apiLogin, getDemoUsers } from '@/api/auth'
import { useUserStore } from '@/store/user'
import { useCartStore } from '@/store/cart'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()

const demoUsers = ref<any[]>([])
const loading = ref(false)
const form = reactive({ username: 'zhangsan', password: '123456' })

const choose = (u: any) => {
  form.username = u.username
  form.password = u.password || '123456'
}

const login = async () => {
  if (!form.username || !form.password) return ElMessage.warning('请输入账号密码')
  loading.value = true
  try {
    const res = await apiLogin(form)
    userStore.setSession(res)
    cartStore.refreshCount()
    ElMessage.success('登录成功')
    const redirect = String(route.query.redirect || '')
    router.replace(redirect.startsWith('/') ? redirect : '/home')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    const res = await getDemoUsers()
    demoUsers.value = (res || []).slice(0, 4)
  } catch {
    demoUsers.value = []
  }
})
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(160deg, #7a0c1e 0%, #c8102e 45%, #f0556b 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.login-card {
  width: 400px;
  background: #fff;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}
.brand {
  text-align: center;
  margin-bottom: 24px;
  .logo {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, #c8102e, #f0556b);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 30px;
    font-weight: 700;
    font-family: 'STKaiti', 'KaiTi', 'Songti SC', 'SimSun', serif;
    margin: 0 auto 12px;
  }
  h1 {
    font-size: 26px;
    letter-spacing: 4px;
    color: var(--brand-dark);
    margin: 0;
  }
  p {
    font-size: 12px;
    color: var(--text-sub);
    margin-top: 6px;
  }
}
.login-btn {
  width: 100%;
}
.quick-title {
  font-size: 12px;
  color: var(--text-sub);
  margin: 20px 0 10px;
}
.quick-users {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  .quick-user {
    border: 1px solid #ebeef5;
    border-radius: 8px;
    padding: 8px 12px;
    cursor: pointer;
    &.active {
      border-color: var(--brand-primary);
      background: #fdf3f4;
    }
    .name {
      font-size: 13px;
      color: var(--text-main);
    }
    .role {
      font-size: 11px;
      color: var(--text-sub);
      margin-top: 2px;
    }
  }
}
.back-home {
  text-align: center;
  font-size: 12px;
  color: var(--text-sub);
  margin-top: 18px;
  cursor: pointer;
  &:hover {
    color: var(--brand-primary);
  }
}
</style>
