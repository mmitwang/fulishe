export interface Banner {
  id: number
  title: string
  image: string
  link: string
}

export interface QuickEntry {
  id: number
  name: string
  icon: string
  path: string
}

export interface Product {
  id: number
  spuCode: string
  spuName: string
  image: string
  images: string[]
  description: string
  categoryId: number
  categoryName: string
  brandName: string
  sellPrice: number
  originalPrice: number
  stock: number
  sales: number
  unit: string
  tags: string[]
  serviceTags?: string[]
  specs?: { name: string; value: string }[]
  detailSections?: { title: string; content: string }[]
}

export interface Sku {
  id: number
  spuId: number
  skuCode: string
  skuName: string
  price: number
  originalPrice: number
  stock: number
}

export interface TraceStep {
  name: string
  time: string
  operator: string
  location: string
  hash: string
  status: string
}

export interface TraceRecord {
  traceCode: string
  spuId: number
  spuName: string
  image: string
  batchNo: string
  supplierName: string
  productionDate: string
  qualityReport: string
  warehouse: string
  steps: TraceStep[]
}

export interface ProductDetail extends Product {
  skus: Sku[]
  trace: TraceRecord | null
  reviews: { id: number; user: string; content: string; score: number; time: string }[]
  related: Product[]
}

export interface HomeData {
  banners: Banner[]
  quickEntries: QuickEntry[]
  notices: string[]
  categories: { id: number; name: string }[]
  hotProducts: Product[]
  coupons: { id: number; templateName: string; faceValue: number; minAmount: number; couponType: number; discount: number }[]
  recommend: Product[]
}

export interface CartItem {
  id: number
  userId: number
  skuId: number
  spuId: number
  spuName: string
  image: string
  skuName: string
  price: number
  quantity: number
  selected: boolean
}

export interface OrderItem {
  id: number
  spuId: number
  spuName: string
  image: string
  skuName: string
  quantity: number
  unitPrice: number
}

export interface Order {
  id: number
  orderNo: string
  userName: string
  orderStatus: number
  payStatus: number
  payAmount: number
  totalAmount: number
  source: string
  createTime: string
  payNo: string
  refundStatus?: number | null
  refundNo?: string
  refundReason?: string
  invoiceStatus?: number | null
  invoiceNo?: string
  items: OrderItem[]
}

export interface VerifyResult {
  valid: boolean
  code: string
  message: string
  verifyTime: string
  chainName: string
  blockHeight: number
  txHash: string
  trace: TraceRecord | null
  coupon: Record<string, unknown> | null
  txs?: { id: number; txTypeName: string; from: string; to: string; timestamp: string }[]
}
