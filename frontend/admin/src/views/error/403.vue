<template>
  <div class="forbidden-page">
    <section class="forbidden-card">
      <div class="code">403</div>
      <h1>暂无访问权限</h1>
      <p>当前账号没有访问该页面的权限。如需办理相关业务，请联系管理员授权或切换账号。</p>
      <div class="actions">
        <el-button type="primary" size="large" @click="goHome">返回我的工作台</el-button>
        <el-button size="large" @click="switchAccount">切换账号</el-button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const goHome = async () => {
  await router.push(authStore.homePath)
}

const switchAccount = async () => {
  authStore.logout()
  await router.replace('/login')
}
</script>

<style lang="scss" scoped>
.forbidden-page {
  min-height: 100vh;
  padding: 24px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f4f6fb;
}

.forbidden-card {
  width: min(520px, 100%);
  padding: 48px 32px;
  box-sizing: border-box;
  text-align: center;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 16px 48px rgba(122, 12, 30, 0.08);

  .code {
    color: #c8102e;
    font-size: 88px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: 4px;
  }

  h1 {
    margin: 24px 0 12px;
    color: #7a0c1e;
    font-size: 24px;
  }

  p {
    margin: 0 auto;
    max-width: 400px;
    color: #6b7280;
    font-size: 14px;
    line-height: 1.8;
  }

  .actions {
    margin-top: 32px;
    display: flex;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;

    .el-button {
      margin-left: 0;
    }
  }
}

@media (max-width: 480px) {
  .forbidden-card {
    padding: 40px 20px;

    .code {
      font-size: 68px;
    }

    .actions {
      flex-direction: column;

      .el-button {
        width: 100%;
      }
    }
  }
}
</style>
