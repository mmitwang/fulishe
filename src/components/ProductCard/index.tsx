import React, { memo } from 'react'
import { Image, Text, View } from '@tarojs/components'
import type { Product } from '@/types'
import styles from './index.module.scss'

interface ProductCardProps {
  product: Product
  onTap: (id: number) => void
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onTap }) => (
  <View className={styles.card} onClick={() => onTap(product.id)}>
    <View className={styles.imageWrap}>
      <Image
        className={styles.image}
        src={product.image}
        mode="aspectFill"
        lazyLoad
        onError={error => console.error('[ProductCard] 图片加载失败', product.id, error)}
      />
      <Text className={styles.badge}>{product.categoryName}</Text>
    </View>
    <View className={styles.body}>
      <Text className={styles.name}>{product.spuName}</Text>
      <Text className={styles.brand}>{product.brandName} · 已售 {product.sales}</Text>
      <View className={styles.priceRow}>
        <Text className={styles.currency}>¥</Text>
        <Text className={styles.price}>{product.sellPrice}</Text>
        <Text className={styles.original}>¥{product.originalPrice}</Text>
      </View>
    </View>
  </View>
)

export default memo(ProductCard)
