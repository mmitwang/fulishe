<template>
  <el-container class="layout-container">
    <el-aside :width="isCollapse ? '72px' : '232px'" class="aside">
      <div class="logo">
        <div class="logo-mark">福</div>
        <div v-show="!isCollapse" class="logo-text">
          <span class="name">福礼社</span>
          <span class="sub">企业福利数智平台</span>
        </div>
      </div>

      <el-scrollbar class="menu-scroll">
        <el-menu
          :default-active="activeMenu"
          :collapse="isCollapse"
          :unique-opened="true"
          router
          class="side-menu"
        >
          <template v-for="route in menuRoutes" :key="route.path">
            <el-sub-menu v-if="route.children.length > 0" :index="route.path">
              <template #title>
                <el-icon><component :is="route.icon" /></el-icon>
                <span>{{ route.title }}</span>
              </template>
              <el-menu-item
                v-for="child in route.children"
                :key="child.path"
                :index="child.path"
              >
                <el-icon><component :is="child.icon" /></el-icon>
                <template #title>{{ child.title }}</template>
              </el-menu-item>
            </el-sub-menu>
            <el-menu-item v-else :index="route.path">
              <el-icon><component :is="route.icon" /></el-icon>
              <template #title>{{ route.title }}</template>
            </el-menu-item>
          </template>
        </el-menu>
      </el-scrollbar>

      <div v-show="!isCollapse" class="aside-footer">
        <div class="chain-status">
          <span class="dot"></span>
          福礼链节点在线
        </div>
        <div class="version">v2.0.0 · Mock 数据版</div>
      </div>
    </el-aside>

    <el-container class="main-container">
      <el-header class="header">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="toggleCollapse">
            <Fold v-if="!isCollapse" />
            <Expand v-else />
          </el-icon>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-for="item in breadcrumbs" :key="item.path">
              {{ item.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-tooltip content="访问 H5 商城" placement="bottom">
            <a class="h5-link" :href="H5_BASE_URL" target="_blank">
              <el-icon><Cellphone /></el-icon>
              H5 商城
            </a>
          </el-tooltip>
          <el-badge :value="3" class="notice">
            <el-icon class="header-icon"><Bell /></el-icon>
          </el-badge>
          <el-divider direction="vertical" />
          <el-dropdown @command="handleCommand">
            <div class="user-info">
              <el-avatar :size="34" class="avatar">{{ displayName[0] }}</el-avatar>
              <div class="user-text">
                <span class="username">{{ displayName }}</span>
                <span class="role">
                  {{ displayRole }}<template v-if="authStore.userInfo?.merchantName"> · {{ authStore.userInfo.merchantName }}</template>
                </span>
              </div>
              <el-icon><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                <el-dropdown-item command="switch">切换账号</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main">
        <router-view v-slot="{ Component }">
          <transition name="fade-transform" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { H5_BASE_URL } from '@/config'

interface MenuRoute {
  path: string
  title: string
  icon?: string
  children: MenuRoute[]
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const isCollapse = ref(false)

const displayName = computed(() => {
  const user = authStore.userInfo
  return user?.nickname || user?.realName || user?.username || '用户'
})

const displayRole = computed(() => {
  const user = authStore.userInfo
  return user?.roleNames?.join('、') || user?.roleName || '未分配角色'
})

const absolutePath = (parentPath: string, path: string) => {
  if (path.startsWith('/')) return path
  const base = parentPath.endsWith('/') ? parentPath.slice(0, -1) : parentPath
  return `${base}/${path}`
}

const filterMenuRoutes = (routes: RouteRecordRaw[], parentPath: string): MenuRoute[] => {
  const menus: MenuRoute[] = []
  routes.forEach(route => {
    if (!route.meta?.title) return
    const path = absolutePath(parentPath, route.path)
    const sourceChildren = route.children || []
    const children = filterMenuRoutes(sourceChildren, path)
    const menu = {
      path,
      title: String(route.meta.title),
      icon: route.meta.icon as string | undefined,
      children
    }

    if (sourceChildren.length > 0) {
      if (children.length > 0) menus.push(menu)
      return
    }
    if (authStore.hasPermission(route.meta.permission as string | undefined)) {
      menus.push(menu)
    }
  })
  return menus
}

const menuRoutes = computed(() => {
  const layout = router.options.routes.find(item => item.path === '/')
  return filterMenuRoutes(layout?.children || [], '/')
})

const activeMenu = computed(() => route.path)

const breadcrumbs = computed(() => {
  return route.matched.filter(item => item.meta?.title && item.path !== '/').map(item => ({
    path: item.path,
    title: item.meta?.title
  }))
})

const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value
}

const switchAccount = async () => {
  authStore.logout()
  await router.replace('/login')
}

const handleCommand = async (command: string) => {
  if (command === 'profile') {
    const isMerchantAdmin = authStore.userInfo?.roleCodes?.includes('merchant_admin')
    await router.push(isMerchantAdmin ? '/merchant/profile' : authStore.homePath)
    return
  }
  if (command === 'switch' || command === 'logout') {
    await switchAccount()
  }
}
</script>

<style lang="scss" scoped>
.layout-container {
  height: 100vh;
  background: #f4f6fb;
}

.aside {
  background: #fff;
  border-right: 1px solid #eef0f5;
  transition: width 0.25s;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 12px rgba(122, 12, 30, 0.04);
  z-index: 10;

  .logo {
    height: 64px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 18px;
    border-bottom: 1px solid #f2f3f7;
    overflow: hidden;

    .logo-mark {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: linear-gradient(135deg, #c8102e, #f0556b);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 700;
      font-family: 'STKaiti', 'KaiTi', 'Songti SC', 'SimSun', serif;
      flex-shrink: 0;
      box-shadow: 0 6px 14px rgba(200, 16, 46, 0.3);
    }

    .logo-text {
      display: flex;
      flex-direction: column;
      line-height: 1.2;
      .name {
        font-size: 18px;
        font-weight: 800;
        color: #7a0c1e;
        letter-spacing: 1px;
      }
      .sub {
        font-size: 11px;
        color: #9aa0ad;
        margin-top: 2px;
      }
    }
  }

  .menu-scroll {
    flex: 1;
    padding: 10px 10px 0;
  }

  .side-menu {
    border-right: none;
    background: transparent;
    :deep(.el-menu-item),
    :deep(.el-sub-menu__title) {
      height: 46px;
      line-height: 46px;
      margin-bottom: 4px;
      border-radius: 10px;
      color: #4b5563;
      font-size: 14px;
    }
    :deep(.el-menu-item:hover),
    :deep(.el-sub-menu__title:hover) {
      background: #f4f7ff;
      color: #c8102e;
    }
    :deep(.el-menu-item.is-active) {
      background: linear-gradient(90deg, #c8102e, #f0556b);
      color: #fff;
      font-weight: 600;
      box-shadow: 0 6px 14px rgba(200, 16, 46, 0.24);
    }
    :deep(.el-sub-menu .el-menu) {
      background: transparent;
    }
    :deep(.el-sub-menu .el-menu-item) {
      height: 40px;
      line-height: 40px;
      min-width: auto;
      padding-left: 46px !important;
      font-size: 13px;
    }
  }

  .aside-footer {
    padding: 14px 18px;
    border-top: 1px solid #f2f3f7;
    .chain-status {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #4b5563;
      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #67c23a;
        box-shadow: 0 0 0 4px rgba(103, 194, 58, 0.15);
      }
    }
    .version {
      margin-top: 6px;
      font-size: 11px;
      color: #b0b3b8;
    }
  }
}

.header {
  height: 64px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 22px;
  border-bottom: 1px solid #eef0f5;

  .header-left {
    display: flex;
    align-items: center;
    gap: 18px;

    .collapse-btn {
      font-size: 20px;
      cursor: pointer;
      color: #4b5563;
      &:hover {
        color: #c8102e;
      }
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 14px;

    .h5-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #c8102e;
      text-decoration: none;
      padding: 6px 12px;
      border-radius: 8px;
      background: #f0f5ff;
      &:hover {
        background: #e4edff;
      }
    }

    .header-icon {
      font-size: 19px;
      color: #4b5563;
      cursor: pointer;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;

      .avatar {
        background: linear-gradient(135deg, #c8102e, #f0556b);
        font-weight: 600;
      }

      .user-text {
        display: flex;
        flex-direction: column;
        line-height: 1.2;
        .username {
          font-size: 13px;
          color: #303133;
        }
        .role {
          font-size: 11px;
          color: #909399;
        }
      }
    }
  }
}

.main {
  background: #f4f6fb;
  padding: 18px;
  overflow-y: auto;
}

.fade-transform-enter-active,
.fade-transform-leave-active {
  transition: all 0.25s;
}

.fade-transform-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-transform-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
