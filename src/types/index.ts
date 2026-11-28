export interface ApiEnvelope<T> {
  code: number
  msg?: string
  message?: string
  data: T
}

export interface PageResult<T> {
  records: T[]
  total: number
  current: number
  size: number
}

export interface Category {
  id: number
  categoryName: string
  image?: string
}

export interface Banner {
  id: number
  title: string
  subtitle: string
  image: string
  productId?: number
}

export interface Product {
  id: number
  spuCode?: string
  spuName: string
  description: string
  categoryId: number
  categoryName: string
  brandName: string
  sellPrice: number
  originalPrice: number
  stock: number
  sales: number
  image: string
  images: string[]
  tags: string[]
  deliveryTag: string
  videoUrl?: string
}

export interface Sku {
  id: number
  spuId: number
  skuName: string
  specifications?: string
  price: number
  originalPrice: number
  stock: number
  image?: string
}

export interface ProductDetail extends Product {
  skus: Sku[]
  serviceTags: string[]
  specs: { name: string; value: string }[]
  detailSections: { title: string; content: string }[]
  reviews: { id: number; user: string; content: string; score: number; time: string }[]
}

export interface HomeData {
  banners: Banner[]
  notices: string[]
  categories: Category[]
  hotProducts: Product[]
}

export interface CartItem {
  skuId: number
  spuId: number
  spuName: string
  skuName: string
  image: string
  price: number
  quantity: number
  stock: number
  selected: boolean
}

export interface User {
  id: number
  tenantId: number
  username: string
  nickname: string
  realName?: string
  mobile?: string
  avatar?: string
  userType?: number
  roleName?: string
  tenantName?: string
  deptName?: string
}

export interface LoginResult {
  token: string
  refreshToken?: string
  userInfo: User
}

export interface OrderItem {
  id?: number
  spuId: number
  spuName: string
  spuImage?: string
  skuId: number
  skuName: string
  quantity: number
  unitPrice: number
  totalPrice?: number
  shareId?: string
}

export interface FullReductionRule {
  id: number
  thresholdAmount: number
  discountAmount: number
}

export interface FullReductionQuote {
  appliedRule: FullReductionRule | null
  nextRule: FullReductionRule | null
  shortfallAmount: number
  discountAmount: number
  payAmount: number
  progress: number
}

export interface OrderPromotion {
  type: 'FULL_REDUCTION'
  ruleId: number
  name: string
  thresholdAmount: number
  discountAmount: number
}

export interface Order {
  id: number
  orderNo: string
  userId: number
  userName: string
  mobile: string
  address: string
  orderStatus: number
  payStatus: number
  totalAmount: number
  discountAmount: number
  payAmount: number
  payNo?: string
  payMethod?: string
  payTime?: string
  createTime: string
  items: OrderItem[]
  logistics?: LogisticsStep[]
  refundAmount?: number
  addressId?: number
  storeId?: number
  storeName?: string
  deliverySlot?: string
  promotion?: OrderPromotion | null
  localMock?: boolean
}

export interface CheckoutDraft {
  items: CartItem[]
  receiver: string
  mobile: string
  address: string
  addressId?: number
  storeId?: number
  storeName?: string
  deliverySlot?: string
  promotionId?: number
}

export interface Store {
  id: number
  name: string
  city: string
  district: string
  address: string
  latitude: number
  longitude: number
  businessHours: string
  deliveryMinutes: number
}

export interface DeliverySlot {
  id: string
  label: string
  period: string
  available: boolean
}

export interface FulfillmentInfo {
  store: Store
  arrivalText: string
  slots: DeliverySlot[]
}

export interface Address {
  id: number
  userId: number
  receiver: string
  mobile: string
  region: string
  detail: string
  tag: string
  isDefault: boolean
  createTime?: string
}

export interface PaymentResult {
  payNo: string
  orderNo: string
  payMethod: number
  qrcode?: string
  payUrl?: string
  timeStamp?: string
  nonceStr?: string
  package?: string
  signType?: string
  paySign?: string
  payStatus?: number
  payAmount?: number
  payTime?: string
}

export type FuliCardOperationType = 'RECHARGE' | 'TRANSFER' | 'ORDER_PAY' | 'ORDER_REFUND'
export type FuliCardOperationStatus = 'PENDING' | 'SUCCESS' | 'FAILED'

export interface FuliCardAccount {
  accountId: number
  userId: number
  balanceCents: number
  totalIncomeCents: number
  totalExpenseCents: number
  status: number
  version: number
  updateTime?: string
}

export interface FuliCardFlow {
  flowNo: string
  requestId: string
  bizType: FuliCardOperationType
  bizNo: string
  direction: 'IN' | 'OUT'
  amountCents: number
  balanceBeforeCents: number
  balanceAfterCents: number
  payNo?: string
  counterpartName?: string
  remark?: string
  createTime: string
}

export interface FuliCardRechargeResult {
  requestId: string
  rechargeNo: string
  payNo: string
  amountCents: number
  status: FuliCardOperationStatus
}

export interface FuliCardTransferResult {
  requestId: string
  transferNo: string
  amountCents: number
  fromUserId: number
  toUserId: number
  toUsername: string
  toUserName: string
  status: FuliCardOperationStatus
}

export interface FuliCardOperation<T = unknown> {
  requestId: string
  type: FuliCardOperationType
  status: FuliCardOperationStatus
  data?: T
  message?: string
}

export interface ChannelStatus {
  channel: string
  mode: 'mock' | 'production'
  appIdReady: boolean
  apiBaseUrl: string
  cachedEntries: number
}

export interface TraceRecord {
  traceCode: string
  productName: string
  batchNo: string
  status: string
  steps: { name: string; time: string; operator: string }[]
}

export type RoleKey = 'member' | 'buyer' | 'tenant' | 'operator'

export interface DemoAccount {
  username: string
  password: string
  title: string
  subtitle: string
  permissions: string[]
}

export interface LogisticsStep {
  name: string
  desc: string
  time: string
}
