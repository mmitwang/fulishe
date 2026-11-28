import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/',
    component: () => import('@/layout/index.vue'),
    children: [
      { path: '', redirect: '/home' },
      { path: 'home', name: 'Home', component: () => import('@/views/home/index.vue'), meta: { title: '首页' } },
      { path: 'category', name: 'Category', component: () => import('@/views/category/index.vue'), meta: { title: '商品分类' } },
      { path: 'cart', name: 'Cart', component: () => import('@/views/cart/index.vue'), meta: { title: '购物车' } },
      { path: 'user', name: 'User', component: () => import('@/views/user/index.vue'), meta: { title: '个人中心' } },
      { path: 'product/:id', name: 'ProductDetail', component: () => import('@/views/product/detail.vue'), meta: { title: '商品详情' } },
      { path: 'order/confirm', name: 'OrderConfirm', component: () => import('@/views/order/confirm.vue'), meta: { title: '确认订单' } },
      { path: 'order/list', name: 'OrderList', component: () => import('@/views/order/list.vue'), meta: { title: '我的订单' } },
      { path: 'pay', name: 'Payment', component: () => import('@/views/pay/index.vue'), meta: { title: '收银台' } },
      { path: 'coupon', name: 'Coupon', component: () => import('@/views/coupon/index.vue'), meta: { title: '我的卡券' } },
      { path: 'trace', name: 'Trace', component: () => import('@/views/trace/index.vue'), meta: { title: '区块链溯源' } }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/home' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title as string} · 福礼社商城` : '福礼社商城'
  window.scrollTo({ top: 0 })
})

export default router
