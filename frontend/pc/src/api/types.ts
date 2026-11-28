// 与 Mock API 对齐的买家端 DTO

export interface Sku {
  id: number
  spuId: number
  skuName: string
  skuCode?: string
  specs?: string
  price: number
  originalPrice?: number
  costPrice?: number
  stock: number
  status?: number
  image?: string
}

export interface Product {
  id: number
  spuName: string
  spuCode?: string
  sellPrice: number
  originalPrice: number
  image: string
  images?: string[]
  videoUrl?: string | null
  sales: number
  stock: number
  unit?: string
  weight?: string
  merchantName?: string
  brandName?: string
  categoryName?: string
  categoryId?: number
  tags?: string[]
  serviceTags?: string[]
  description?: string
  traceable?: boolean
  createTime?: string
  specs?: { name: string; value: string }[]
  detailSections?: { title: string; content: string }[]
  isNew?: boolean
}

export interface ProductDetail extends Product {
  skus: Sku[]
  trace?: TraceInfo | null
  reviews?: Review[]
  related?: Product[]
}

export interface Review {
  id: number
  user: string
  content: string
  score: number
  time: string
}

export interface TraceStep {
  name: string
  time: string
  operator?: string
  location?: string
  hash?: string
}

export interface TraceInfo {
  traceCode: string
  spuId?: number
  spuName?: string
  image?: string
  batchNo?: string
  origin?: string
  manufacturer?: string
  supplierName?: string
  productionDate?: string
  expireDate?: string
  qualityReport?: string
  inspector?: string
  warehouse?: string
  chainTxHash?: string
  steps?: TraceStep[]
}

export interface HomeData {
  banners: { id: number; title: string; image: string; link?: string }[]
  quickEntries: { id: number; name: string; icon: string; path: string }[]
  notices: { id: number; title?: string; content?: string }[]
  categories: { id: number; name: string }[]
  hotProducts: Product[]
  newProducts: Product[]
  coupons: CouponTemplate[]
  recommend: Product[]
}

export interface CouponTemplate {
  id: number
  templateName: string
  couponType: number
  faceValue: number
  discount?: number
  minAmount: number
  status?: number
}

export interface Coupon {
  id: number
  templateName: string
  couponType: number
  faceValue: number
  minAmount: number
  status: number // 0未使用 1已核销 2已过期 3已转赠
  couponCode: string
  traceCode?: string
  expireTime?: string
}

export interface CartItem {
  id: number
  userId: number
  spuId: number
  spuName: string
  skuId: number
  skuName: string
  image: string
  price: number
  quantity: number
  selected: boolean
}

export interface OrderItem {
  id: number
  spuId: number
  spuName: string
  skuName: string
  image: string
  unitPrice: number
  quantity: number
}

export interface Order {
  id: number
  orderNo: string
  userName?: string
  orderStatus: number
  payStatus: number
  payAmount: number
  totalAmount: number
  source: string
  createTime: string
  payNo?: string
  refundStatus?: number | null
  refundNo?: string
  invoiceStatus?: number | null
  invoiceNo?: string
  items: OrderItem[]
}

export interface CheckoutItem {
  skuId: number
  spuId: number
  quantity: number
  image: string
  name: string
  skuName: string
  price: number
}

export interface PromotionRule {
  id: number
  name?: string
  thresholdAmount: number
  discountAmount: number
  sort?: number
}

export interface Address {
  id: number
  userId: number
  receiver: string
  mobile: string
  region: string
  detail: string
  tag?: string
  isDefault?: boolean
  createTime?: string
}

export interface FullReductionInfo {
  name: string
  rules: PromotionRule[]
}

export interface PageResult<T> {
  records: T[]
  total: number
  current: number
  size: number
}
