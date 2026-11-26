import React from 'react'
import { View, Text, Image } from '@tarojs/components'
import styles from './index.module.scss'
import type { Product } from '@/types'

interface ProductCardProps {
  product: Product
  onTap: (id: number) => void
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onTap }) => {
  return (
    <View className={styles.card} onClick={() => onTap(product.id)}>
      <View className={styles.imageWrap}>
        <Image className={styles.image} src={product.image} mode="aspectFill" />
        <Text className={styles.sales}>已售 {product.sales}</Text>
      </View>
      <View className={styles.body}>
        <Text className={styles.name}>{product.spuName}</Text>
        <View className={styles.tags}>
          {(product.tags || []).slice(0, 2).map(tag => (
            <Text key={tag} className={styles.tag}>
              {tag}
            </Text>
          ))}
        </View>
        <View className={styles.priceRow}>
          <Text className={styles.priceSymbol}>¥</Text>
          <Text className={styles.price}>{product.sellPrice}</Text>
          <Text className={styles.original}>¥{product.originalPrice}</Text>
        </View>
      </View>
    </View>
  )
}

export default ProductCard
