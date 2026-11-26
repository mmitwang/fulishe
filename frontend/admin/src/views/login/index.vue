<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-left">
        <div class="brand">
          <el-icon class="logo"><Gift /></el-icon>
          <h1>福礼社</h1>
          <p>企业福利采购平台</p>
        </div>
      </div>
      <div class="login-right">
        <el-form ref="formRef" :model="form" :rules="rules" class="login-form">
          <h2 class="title">管理后台登录</h2>
          <el-form-item>
            <el-select
              v-model="selectedUserId"
              placeholder="请选择演示用户（可选）"
              size="large"
              clearable
              @change="handleUserSelect"
              style="width: 100%"
            >
              <el-option-group
                v-for="group in demoUserGroups"
                :key="group.label"
                :label="group.label"
              >
                <el-option
                  v-for="user in group.users"
                  :key="user.id"
                  :value="user.id"
                  :label="`${user.displayName} - ${user.tenantName || '平台'} (${user.roleName})`"
                >
                  <span>{{ user.displayName }}</span>
                  <span style="float: right; color: #999; font-size: 12px; margin-left: 16px">
                    {{ user.tenantName || '平台' }} · {{ user.roleName }}
                  </span>
                </el-option>
              </el-option-group>
            </el-select>
          </el-form-item>
          <el-form-item prop="username">
            <el-input v-model="form.username" placeholder="请输入用户名" size="large">
              <template #prefix>
                <el-icon><User /></el-icon>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              size="large"
              show-password
            >
              <template #prefix>
                <el-icon><Lock /></el-icon>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item prop="captcha">
            <el-input v-model="form.captcha" placeholder="请输入验证码" size="large" style="flex: 1">
              <template #prefix>
                <el-icon><Key /></el-icon>
              </template>
            </el-input>
            <div class="captcha" @click="refreshCaptcha">
              {{ captcha }}
            </div>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" size="large" class="login-btn" :loading="loading" @click="handleLogin">
              登 录
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { FormInstance, FormRules } from 'element-plus'

interface DemoUser {
  id: number
  username: string
  password: string
  displayName: string
  tenantName: string
  userType: number
  roleName: string
  roleCodes: string[]
  merchantId: number | null
}

const router = useRouter()
const authStore = useAuthStore()
const formRef = ref<FormInstance>()
const loading = ref(false)
const captcha = ref('8888')
const selectedUserId = ref<number | null>(null)
const demoUsers = ref<DemoUser[]>([])

const demoUserGroups = computed(() => [
  {
    label: '平台管理员',
    users: demoUsers.value.filter(user => user.roleCodes?.includes('super_admin'))
  },
  {
    label: '商户管理员',
    users: demoUsers.value.filter(user => user.roleCodes?.includes('merchant_admin'))
  }
].filter(group => group.users.length > 0))

const form = reactive({
  username: '',
  password: '',
  captcha: ''
})

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  captcha: [{ required: true, message: '请输入验证码', trigger: 'blur' }]
}

const fetchDemoUsers = async () => {
  try {
    const response = await fetch('/api/auth/demo-users')
    const data = await response.json()
    if (data.code === 200) {
      demoUsers.value = data.data
    }
  } catch (error) {
    console.error('获取演示用户失败:', error)
  }
}

const refreshCaptcha = async () => {
  try {
    const response = await fetch('/api/auth/captcha')
    const data = await response.json()
    if (data.code === 200) {
      captcha.value = data.data
      form.captcha = data.data
    }
  } catch (error) {
    console.error('获取验证码失败:', error)
    captcha.value = Math.random().toString(36).substring(2, 6).toUpperCase()
    form.captcha = captcha.value
  }
}

const handleUserSelect = async (userId: number | null) => {
  if (!userId) {
    form.username = ''
    form.password = ''
    form.captcha = ''
    return
  }

  const user = demoUsers.value.find(item => item.id === userId)
  if (user) {
    form.username = user.username
    form.password = user.password
    await refreshCaptcha()
  }
}

const handleLogin = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await authStore.login(form.username, form.password, form.captcha)
    await router.replace(authStore.homePath)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchDemoUsers()
  refreshCaptcha()
})
</script>

<style lang="scss" scoped>
.login-container {
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-box {
  width: 900px;
  height: 550px;
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.login-left {
  width: 40%;
  background: linear-gradient(135deg, #409eff 0%, #337ecc 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  .brand {
    text-align: center;

    .logo {
      width: 80px;
      height: 80px;
      font-size: 60px;
      margin-bottom: 20px;
    }

    h1 {
      font-size: 32px;
      margin: 0 0 10px 0;
    }

    p {
      font-size: 14px;
      opacity: 0.8;
    }
  }
}

.login-right {
  width: 60%;
  padding: 60px;
  display: flex;
  flex-direction: column;
  justify-content: center;

  .login-form {
    .title {
      text-align: center;
      margin-bottom: 30px;
      color: #333;
    }

    .captcha {
      width: 100px;
      height: 40px;
      background: #f0f2f5;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: 10px;
      border-radius: 4px;
      font-weight: bold;
      letter-spacing: 4px;
      cursor: pointer;
    }

    .login-btn {
      width: 100%;
    }
  }
}

@media (max-width: 768px) {
  .login-container {
    height: auto;
    min-height: 100vh;
    padding: 16px;
    box-sizing: border-box;
  }

  .login-box {
    width: 100%;
    height: auto;
    min-height: 520px;
  }

  .login-left {
    display: none;
  }

  .login-right {
    width: 100%;
    padding: 40px 24px;
    box-sizing: border-box;
  }
}

@media (max-width: 360px) {
  .login-right {
    padding: 32px 18px;
  }

  .login-right .login-form .captcha {
    width: 86px;
  }
}
</style>
