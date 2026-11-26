import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', requiresAuth: false }
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/views/error/403.vue'),
    meta: { title: '无权访问', requiresAuth: true }
  },
  {
    path: '/',
    component: () => import('@/layout/index.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '数据看板', icon: 'DataBoard', requiresAuth: true, permission: 'dashboard:view' }
      },
      {
        path: 'merchant/dashboard',
        name: 'MerchantDashboard',
        component: () => import('@/views/merchant/dashboard/index.vue'),
        meta: { title: '商户工作台', icon: 'DataAnalysis', requiresAuth: true, permission: 'merchant:dashboard' }
      },
      {
        path: 'product',
        name: 'Product',
        redirect: '/product/spu',
        meta: { title: '商品管理', icon: 'Goods', requiresAuth: true },
        children: [
          {
            path: 'spu',
            name: 'ProductSpu',
            component: () => import('@/views/product/spu/index.vue'),
            meta: { title: '商品列表', icon: 'List', requiresAuth: true, permission: 'product:spu' }
          },
          {
            path: 'category',
            name: 'ProductCategory',
            component: () => import('@/views/product/category/index.vue'),
            meta: { title: '商品分类', icon: 'Grid', requiresAuth: true, permission: 'product:category' }
          },
          {
            path: 'brand',
            name: 'ProductBrand',
            component: () => import('@/views/product/brand/index.vue'),
            meta: { title: '品牌管理', icon: 'Flag', requiresAuth: true, permission: 'product:brand' }
          }
        ]
      },
      {
        path: 'coupon',
        name: 'Coupon',
        redirect: '/coupon/template',
        meta: { title: '卡券管理', icon: 'Tickets', requiresAuth: true },
        children: [
          {
            path: 'template',
            name: 'CouponTemplate',
            component: () => import('@/views/coupon/template/index.vue'),
            meta: { title: '卡券模板', icon: 'Document', requiresAuth: true, permission: 'coupon:template' }
          },
          {
            path: 'list',
            name: 'CouponList',
            component: () => import('@/views/coupon/list/index.vue'),
            meta: { title: '卡券列表', icon: 'Ticket', requiresAuth: true, permission: 'coupon:list' }
          },
          {
            path: 'batch',
            name: 'CouponBatch',
            component: () => import('@/views/coupon/batch/index.vue'),
            meta: { title: '发放批次', icon: 'Box', requiresAuth: true, permission: 'coupon:batch' }
          }
        ]
      },
      {
        path: 'order',
        name: 'Order',
        redirect: '/order/list',
        meta: { title: '订单管理', icon: 'List', requiresAuth: true },
        children: [
          {
            path: 'list',
            name: 'OrderList',
            component: () => import('@/views/order/list/index.vue'),
            meta: { title: '订单列表', icon: 'Document', requiresAuth: true, permission: 'order:info' }
          }
        ]
      },
      {
        path: 'pay',
        name: 'Pay',
        redirect: '/pay/record',
        meta: { title: '支付管理', icon: 'Wallet', requiresAuth: true },
        children: [
          {
            path: 'record',
            name: 'PayRecord',
            component: () => import('@/views/pay/record/index.vue'),
            meta: { title: '支付记录', icon: 'Wallet', requiresAuth: true, permission: 'pay:record' }
          },
          {
            path: 'refund',
            name: 'RefundRecord',
            component: () => import('@/views/pay/refund/index.vue'),
            meta: { title: '退款记录', icon: 'RefreshLeft', requiresAuth: true, permission: 'pay:refund' }
          },
          {
            path: 'config',
            name: 'PayConfig',
            component: () => import('@/views/pay/config/index.vue'),
            meta: { title: '支付配置', icon: 'Setting', requiresAuth: true, permission: 'pay:config' }
          }
        ]
      },
      {
        path: 'chain',
        name: 'Chain',
        redirect: '/chain/tx',
        meta: { title: '区块链溯源', icon: 'Link', requiresAuth: true },
        children: [
          {
            path: 'tx',
            name: 'ChainTx',
            component: () => import('@/views/chain/tx/index.vue'),
            meta: { title: '链上交易', icon: 'Connection', requiresAuth: true, permission: 'chain:tx' }
          },
          {
            path: 'block',
            name: 'ChainBlock',
            component: () => import('@/views/chain/block/index.vue'),
            meta: { title: '区块浏览器', icon: 'Coin', requiresAuth: true, permission: 'chain:block' }
          },
          {
            path: 'trace',
            name: 'ChainTrace',
            component: () => import('@/views/chain/trace/index.vue'),
            meta: { title: '溯源验真', icon: 'Search', requiresAuth: true, permission: 'chain:trace' }
          }
        ]
      },
      {
        path: 'supply',
        name: 'Supply',
        redirect: '/supply/supplier',
        meta: { title: '供应链协同', icon: 'Van', requiresAuth: true },
        children: [
          {
            path: 'supplier',
            name: 'SupplySupplier',
            component: () => import('@/views/supply/supplier/index.vue'),
            meta: { title: '供应商管理', icon: 'OfficeBuilding', requiresAuth: true, permission: 'supply:supplier' }
          },
          {
            path: 'purchase',
            name: 'SupplyPurchase',
            component: () => import('@/views/supply/purchase/index.vue'),
            meta: { title: '采购订单', icon: 'ShoppingCart', requiresAuth: true, permission: 'supply:purchase' }
          },
          {
            path: 'inventory',
            name: 'SupplyInventory',
            component: () => import('@/views/supply/inventory/index.vue'),
            meta: { title: '库存管理', icon: 'Box', requiresAuth: true, permission: 'supply:inventory' }
          },
          {
            path: 'shipment',
            name: 'SupplyShipment',
            component: () => import('@/views/supply/shipment/index.vue'),
            meta: { title: '物流发货', icon: 'Van', requiresAuth: true, permission: 'supply:shipment' }
          },
          {
            path: 'settlement',
            name: 'SupplySettlement',
            component: () => import('@/views/supply/settlement/index.vue'),
            meta: { title: '对账结算', icon: 'Money', requiresAuth: true, permission: 'settlement' }
          }
        ]
      },
      {
        path: 'system',
        name: 'System',
        redirect: '/system/user',
        meta: { title: '系统管理', icon: 'Setting', requiresAuth: true },
        children: [
          {
            path: 'user',
            name: 'User',
            component: () => import('@/views/system/user/index.vue'),
            meta: { title: '用户管理', icon: 'User', requiresAuth: true, permission: 'system:user' }
          },
          {
            path: 'role',
            name: 'Role',
            component: () => import('@/views/system/role/index.vue'),
            meta: { title: '角色管理', icon: 'UserFilled', requiresAuth: true, permission: 'system:role' }
          },
          {
            path: 'dept',
            name: 'Dept',
            component: () => import('@/views/system/dept/index.vue'),
            meta: { title: '部门管理', icon: 'OfficeBuilding', requiresAuth: true, permission: 'system:dept' }
          },
          {
            path: 'menu',
            name: 'Menu',
            component: () => import('@/views/system/menu/index.vue'),
            meta: { title: '菜单管理', icon: 'Menu', requiresAuth: true, permission: 'system:menu' }
          },
          {
            path: 'tenant',
            name: 'Tenant',
            component: () => import('@/views/system/tenant/index.vue'),
            meta: { title: '租户管理', icon: 'Building', requiresAuth: true, permission: 'system:tenant' }
          }
        ]
      },
      {
        path: 'merchant/profile',
        name: 'MerchantProfile',
        component: () => import('@/views/merchant/profile/index.vue'),
        meta: { title: '商户资料', icon: 'Shop', requiresAuth: true, permission: 'merchant:profile' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to) => {
  document.title = (to.meta.title as string) || '福礼社管理后台'
  const authStore = useAuthStore()

  if (to.path === '/login') {
    if (!authStore.token) return true
    try {
      await authStore.ensureReady()
    } catch {
      authStore.clearSession()
      return true
    }
    return authStore.token ? authStore.homePath : true
  }

  if (to.meta.requiresAuth === false) return true
  if (!authStore.token) return '/login'

  try {
    await authStore.ensureReady()
  } catch {
    authStore.clearSession()
    return '/login'
  }

  if (!authStore.token) return '/login'
  if (to.path === '/') return authStore.homePath

  const permission = to.meta.permission as string | undefined
  if (permission && !authStore.hasPermission(permission)) {
    return { path: '/403', query: { from: to.fullPath } }
  }

  return true
})

export default router
