import type { DemoAccount, RoleKey, User } from '@/types'

export const ROLE_ACCOUNTS: (DemoAccount & { key: RoleKey })[] = [
  { key: 'member', username: 'user1', password: '123456', title: '普通会员', subtitle: '个人购物全流程体验', permissions: ['浏览选购', '下单支付', '物流跟踪', '申请退款'] },
  { key: 'buyer', username: 'zhangsan', password: '123456', title: '企业采购员', subtitle: '员工福利批量集采', permissions: ['企业价下单', '批量代下单', '模拟开票', '对账导出'] },
  { key: 'tenant', username: 'fulishe_admin', password: '123456', title: '租户管理员', subtitle: '企业管理与审批视角', permissions: ['企业订单总览', '福利分配模拟', '预算看板'] },
  { key: 'operator', username: 'admin', password: '123456', title: '平台运营', subtitle: '平台经营驾驶舱', permissions: ['运营驾驶舱', '虚拟并发压测', '订单漏斗分析'] }
]

export const getPresetByUsername = (username?: string): (DemoAccount & { key: RoleKey }) | null =>
  ROLE_ACCOUNTS.find(item => item.username === username) || null

export const isOperator = (user: User | null): boolean =>
  !!user && user.userType === 1 && user.tenantId === 1
