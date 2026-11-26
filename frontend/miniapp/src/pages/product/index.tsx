import React, { useEffect, useState } from 'react'
import { View, Text, Image, Swiper, SwiperItem, ScrollView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import classnames from 'classnames'
import styles from './index.module.scss'
import { request, getUserId } from '@/services/api'
import type { ProductDetail, Sku } from '@/types'

const ProductPage: React.FC = () => {
  const router = useRouter()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [currentSku, setCurrentSku] = useState<Sku | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const id = router.params.id
        const res = await request<ProductDetail>({ url: `/h5/product/${id}` })
        console.log('[Product] 详情加载成功', res.spuName)
        setProduct(res)
        setCurrentSku(res.skus[0] || null)
      } catch (err) {
        console.error('[Product] 详情加载失败', err)
      }
    }
    load()
  }, [])

  const addCart = async () => {
    if (!currentSku) {
      Taro.showToast({ title: '请选择规格', icon: 'none' })
      return
    }
    await request({ url: '/cart/add', method: 'POST', data: { userId: getUserId(), skuId: currentSku.id, quantity: 1 } })
    Taro.showToast({ title: '已加入购物车', icon: 'success' })
  }

  const buyNow = async () => {
    if (!currentSku || !product) {
      Taro.showToast({ title: '请选择规格', icon: 'none' })
      return
    }
    try {
      const order = await request<{ orderNo: string }>({
        url: '/order/create',
        method: 'POST',
        data: {
          userId: getUserId(),
          items: [{ skuId: currentSku.id, quantity: 1 }],
          receiver: '张三',
          mobile: '13800138005',
          address: '浙江省杭州市西湖区文三路 90 号东部软件园 3 号楼'
        }
      })
      await request({ url: '/pay/create', method: 'POST', data: { orderNo: order.orderNo, payMethod: 1 } })
      Taro.showToast({ title: '支付成功，已上链', icon: 'success' })
      setTimeout(() => Taro.navigateTo({ url: '/pages/order/index' }), 800)
    } catch (err) {
      console.error('[Product] 立即购买失败', err)
    }
  }

  const goTrace = () => {
    if (!product?.trace) {
      Taro.showToast({ title: '该商品暂无溯源记录', icon: 'none' })
      return
    }
    Taro.navigateTo({ url: `/pages/trace/index?code=${product.trace.traceCode}` })
  }

  if (!product) {
    return <View className={styles.loading}>正在加载商品详情...</View>
  }

  return (
    <View className={styles.page}>
      <Swiper className={styles.gallery} circular indicatorDots indicatorActiveColor="#ffffff">
        {(product.images.length ? product.images : [product.image]).map(image => (
          <SwiperItem key={image}>
            <Image className={styles.galleryImage} src={image} mode="aspectFill" lazyLoad />
          </SwiperItem>
        ))}
      </Swiper>

      <View className={styles.card}>
        <View className={styles.priceRow}>
          <Text className={styles.price}>¥{currentSku?.price || product.sellPrice}</Text>
          <Text className={styles.original}>¥{currentSku?.originalPrice || product.originalPrice}</Text>
          <Text className={styles.sales}>已售 {product.sales}</Text>
        </View>
        <Text className={styles.name}>{product.spuName}</Text>
        <View className={styles.tags}>
          <Text className={styles.tag}>{product.brandName}</Text>
          <Text className={styles.tag}>{product.categoryName}</Text>
          {(product.serviceTags || []).map(tag => (
            <Text key={tag} className={styles.tag}>{tag}</Text>
          ))}
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>选择规格</Text>
        <ScrollView className={styles.skuScroll} scrollX>
          {product.skus.map(sku => (
            <View
              key={sku.id}
              className={classnames(styles.skuItem, currentSku?.id === sku.id && styles.active)}
              onClick={() => setCurrentSku(sku)}
            >
              <Text className={styles.skuName}>{sku.skuName}</Text>
              <Text className={styles.skuPrice}>¥{sku.price}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {product.trace && (
        <View className={styles.traceCard} onClick={goTrace}>
          <View className={styles.traceHead}>
            <Text className={styles.traceTitle}>区块链溯源 · 已验证</Text>
            <Text className={styles.traceTag}>已上链</Text>
          </View>
          <View className={styles.steps}>
            {product.trace.steps.slice(0, 4).map(step => (
              <View key={step.name} className={styles.step}>
                <Text className={styles.stepName}>{step.name}</Text>
                <Text className={styles.stepTime}>{step.time.slice(5, 16)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>商品介绍</Text>
        <Text className={styles.desc}>{product.description}</Text>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>规格参数</Text>
        {(product.specs || []).map(spec => (
          <View key={spec.name} className={styles.specRow}>
            <Text className={styles.specName}>{spec.name}</Text>
            <Text className={styles.specValue}>{spec.value}</Text>
          </View>
        ))}
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>图文详情</Text>
        {(product.detailSections || []).map(section => (
          <View key={section.title} className={styles.detailBlock}>
            <Text className={styles.detailSub}>{section.title}</Text>
            <Text className={styles.desc}>{section.content}</Text>
          </View>
        ))}
        <View className={styles.detailGallery}>
          {product.images.slice(1, 5).map(image => (
            <Image key={image} className={styles.detailImage} src={image} mode="aspectFill" lazyLoad />
          ))}
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>用户评价（{product.reviews.length}）</Text>
        {product.reviews.map(review => (
          <View key={review.id} className={styles.review}>
            <View className={styles.reviewHead}>
              <Text className={styles.reviewUser}>{review.user}</Text>
              <Text className={styles.reviewTime}>{review.time}</Text>
            </View>
            <Text className={styles.reviewContent}>{review.content}</Text>
          </View>
        ))}
      </View>

      <View className={styles.footer}>
        <View className={classnames(styles.btn, styles.btnAdd)} onClick={addCart}>
          <Text>加入购物车</Text>
        </View>
        <View className={classnames(styles.btn, styles.btnBuy)} onClick={buyNow}>
          <Text>立即购买</Text>
        </View>
      </View>
    </View>
  )
}

export default ProductPage
