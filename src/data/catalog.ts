import type { Category, Product, ProductDetail } from '@/types'

const image = (prompt: string, id: number) => `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=square`

export const fallbackCategories: Category[] = [
  { id: 1, categoryName: '礼品卡券' }, { id: 2, categoryName: '节庆礼盒' },
  { id: 3, categoryName: '食品礼盒' }, { id: 4, categoryName: '茶酒饮品' },
  { id: 5, categoryName: '数码家电' }, { id: 6, categoryName: '家居生活' },
  { id: 7, categoryName: '健康关怀' }, { id: 8, categoryName: '办公用品' }
]

const names = [
  '福礼贺岁礼品卡 · 500型', '稻香村中秋月饼礼盒', '新春坚果大礼包', '西湖龙井明前茶礼盒',
  '华为 FreeBuds 无线耳机', '膳魔师保温杯礼盒', '同仁堂滋补养生礼盒', '得力商务办公礼盒',
  '景德镇陶瓷茶具套装', '美心流心奶黄月饼'
]
const prompts = [
  'premium red Chinese gift card in elegant envelope', 'traditional Chinese mooncake gift box red gold',
  'mixed nuts festive gift box', 'West Lake Longjing green tea luxury gift box',
  'white wireless earbuds with charging case', 'stainless thermos bottle premium gift box',
  'Chinese herbal wellness gift box', 'black business stationery gift set',
  'blue white porcelain Chinese tea set', 'Hong Kong custard mooncake premium packaging'
]

const VIDEO_URLS: Record<number, string> = {
  2: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
  5: 'https://media.w3.org/2010/05/bunny/trailer.mp4',
  8: 'https://media.w3.org/2010/05/video/movie_300.mp4'
}

export const fallbackProducts: Product[] = names.map((spuName, index) => {
  const id = index + 1
  const categoryId = [1, 2, 3, 4, 5, 6, 7, 8, 6, 2][index]
  const price = [500, 188, 158, 568, 499, 268, 598, 198, 388, 328][index]
  return {
    id,
    spuName,
    description: '品牌直供，支持企业批量采购、专属贺卡与一件代发。',
    categoryId,
    categoryName: fallbackCategories.find(item => item.id === categoryId)?.categoryName || '精选好礼',
    brandName: '福礼社甄选',
    sellPrice: price,
    originalPrice: Math.round(price * 1.2),
    stock: 300 + index * 20,
    sales: 320 + index * 83,
    image: image(prompts[index], id),
    images: [image(prompts[index], id)],
    videoUrl: VIDEO_URLS[id],
    tags: ['品牌直供', '企业集采'],
    deliveryTag: categoryId === 1 ? '电子卡券 · 即时到账' : [2, 3, 4, 6].includes(categoryId) ? '最快 30 分钟达' : '今日发货 · 预计明日达'
  }
})

export const toFallbackDetail = (product: Product): ProductDetail => ({
  ...product,
  skus: [
    { id: product.id * 2 - 1, spuId: product.id, skuName: '标准礼盒', price: product.sellPrice, originalPrice: product.originalPrice, stock: product.stock },
    { id: product.id * 2, spuId: product.id, skuName: '企业定制装', price: product.sellPrice + 30, originalPrice: product.originalPrice + 30, stock: Math.max(20, product.stock - 80) }
  ],
  serviceTags: ['正品保障', '开具发票', '一件代发', '企业定制'],
  specs: [{ name: '包装', value: '精装礼盒' }, { name: '定制', value: '支持企业 LOGO 与贺卡' }, { name: '配送', value: '全国分地址代发' }],
  detailSections: [{ title: '好礼有心，更有新意', content: product.description }],
  reviews: []
})
