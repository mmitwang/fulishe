import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Image, Swiper, SwiperItem, Text, Video, View } from '@tarojs/components'
import Taro, { useRouter, useShareAppMessage } from '@tarojs/taro'
import classnames from 'classnames'
import { getProductDetail } from '@/services/catalog'
import { shareGift } from '@/services/wechat'
import { useCartStore } from '@/store/cart'
import type { CartItem, ProductDetail, Sku } from '@/types'
import styles from './index.module.scss'

const ProductPage: React.FC = () => {
  const router = useRouter()
  const productId = Number(router.params.id || 1)
  const addToCart = useCartStore(state => state.add)
  const [detail, setDetail] = useState<ProductDetail | null>(null)
  const [selectedSku, setSelectedSku] = useState<Sku | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [error, setError] = useState('')
  const [showVideo, setShowVideo] = useState(false)

  const load = useCallback(async () => {
    setError('')
    try {
      const result = await getProductDetail(productId)
      setDetail(result)
      setSelectedSku(result.skus.find(sku => sku.stock > 0) || null)
      setShowVideo(false)
      setQuantity(1)
      console.log('[Product] 商品详情就绪', result.id, result.skus.length)
    } catch (loadError) {
      console.error('[Product] 商品详情加载失败', productId, loadError)
      setError('商品详情暂时无法加载')
    }
  }, [productId])

  useEffect(() => { void load() }, [load])

  useShareAppMessage(() => ({
    title: detail?.spuName || '福礼社精选好礼',
    path: `/pages/product/index?id=${productId}`,
    imageUrl: detail?.image
  }))

  const checkoutItem = useMemo<CartItem | null>(() => {
    if (!detail || !selectedSku) return null
    return {
      skuId: selectedSku.id,
      spuId: detail.id,
      spuName: detail.spuName,
      skuName: selectedSku.skuName,
      image: selectedSku.image || detail.image,
      price: selectedSku.price,
      quantity,
      stock: selectedSku.stock,
      selected: true
    }
  }, [detail, quantity, selectedSku])

  const validateSelection = (): boolean => {
    if (!selectedSku || selectedSku.stock <= 0) {
      Taro.showToast({ title: '请选择有库存的规格', icon: 'none' })
      return false
    }
    return true
  }

  const add = () => {
    if (!detail || !selectedSku || !validateSelection()) return
    addToCart(detail, selectedSku, quantity)
    Taro.showToast({ title: '已加入购物车', icon: 'success' })
  }

  const buyNow = () => {
    if (!checkoutItem || !validateSelection()) return
    Taro.setStorageSync('checkoutItems', [checkoutItem])
    Taro.navigateTo({ url: '/pages/checkout/index' })
  }

  if (!detail && !error) return <View className={styles.loading}>正在展开好礼详情…</View>
  if (!detail) return <View className={styles.error}>{error}<View className={styles.retry} onClick={() => void load()}>重新加载</View></View>

  return (
    <View className={styles.page}>
      <View className={styles.productMain}>
        <View className={styles.mediaColumn}>
          {detail.videoUrl && showVideo ? (
            <View className={styles.videoWrap}>
              <Video
                className={styles.galleryVideo}
                src={detail.videoUrl}
                poster={detail.image}
                controls
                objectFit="contain"
                onError={() => {
                  setShowVideo(false)
                  Taro.showToast({ title: '视频加载失败，已回退图片', icon: 'none' })
                }}
              />
              <View className={styles.videoToggle} onClick={() => setShowVideo(false)}>查看图片</View>
            </View>
          ) : (
            <View className={styles.galleryWrap}>
              <Swiper className={styles.gallery} indicatorDots={detail.images.length > 1} circular={detail.images.length > 1} indicatorColor="rgba(255,255,255,.45)" indicatorActiveColor="#ffffff">
                {detail.images.map((image, index) => (
                  <SwiperItem key={`${image}-${index}`}>
                    <Image className={styles.galleryImage} src={image} mode="aspectFill" lazyLoad onError={event => console.error('[Product] 商品图加载失败', productId, index, event)} />
                  </SwiperItem>
                ))}
              </Swiper>
              {detail.videoUrl && (
                <View className={styles.videoToggle} onClick={() => setShowVideo(true)}>▶ 播放视频</View>
              )}
            </View>
          )}
        </View>

        <View className={styles.purchaseColumn}>
          <View className={styles.summary}>
            <View className={styles.priceRow}>
              <Text className={styles.currency}>¥</Text>
              <Text className={styles.price}>{selectedSku?.price ?? detail.sellPrice}</Text>
              <Text className={styles.originalPrice}>¥{selectedSku?.originalPrice ?? detail.originalPrice}</Text>
              <View className={styles.shareButton} onClick={() => void shareGift()} role="button" aria-label="分享好礼">分享好礼</View>
            </View>
            <Text className={styles.name}>{detail.spuName}</Text>
            <Text className={styles.description}>{detail.description}</Text>
            <View className={styles.metaRow}>
              <Text>{detail.brandName}</Text>
              <Text>已售 {detail.sales}</Text>
              <Text>库存 {selectedSku?.stock ?? detail.stock}</Text>
            </View>
          </View>

          <View className={styles.serviceStrip}>
            {detail.serviceTags.map(tag => <Text key={tag} className={styles.serviceTag}>✓ {tag}</Text>)}
          </View>

          <View className={styles.deliveryNotice}>
            <Text className={styles.deliveryLabel}>门店履约</Text>
            <Text className={styles.deliveryText}>{detail.deliveryTag} · 结算可选送达时段</Text>
          </View>

          <View className={styles.card}>
            <Text className={styles.sectionTitle}>选择规格</Text>
            <View className={styles.skuList}>
              {detail.skus.map(sku => (
                <View
                  key={sku.id}
                  className={classnames(styles.skuOption, selectedSku?.id === sku.id && styles.skuActive, sku.stock <= 0 && styles.skuDisabled)}
                  role="radio"
                  aria-checked={selectedSku?.id === sku.id}
                  aria-disabled={sku.stock <= 0}
                  onClick={() => {
                    if (sku.stock <= 0) return
                    setSelectedSku(sku)
                    setQuantity(current => Math.min(current, sku.stock))
                  }}
                >
                  <Text className={styles.skuName}>{sku.skuName} · ¥{sku.price}</Text>
                  <Text className={styles.skuStock}>{sku.stock > 0 ? `现货 ${sku.stock} 件` : '暂时缺货'}</Text>
                </View>
              ))}
            </View>
            <View className={styles.quantityRow}>
              <Text className={styles.quantityLabel}>采购数量</Text>
              <View className={styles.stepper}>
                <View className={styles.stepButton} onClick={() => setQuantity(current => Math.max(1, current - 1))} aria-label="减少数量">−</View>
                <Text className={styles.quantity}>{quantity}</Text>
                <View className={styles.stepButton} onClick={() => setQuantity(current => Math.min(selectedSku?.stock || 1, current + 1))} aria-label="增加数量">＋</View>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View className={styles.card}>
        <Text className={styles.sectionTitle}>规格参数</Text>
        {detail.specs.map(spec => (
          <View className={styles.specRow} key={spec.name}>
            <Text className={styles.specName}>{spec.name}</Text>
            <Text className={styles.specValue}>{spec.value}</Text>
          </View>
        ))}
      </View>

      <View className={styles.card}>
        <Text className={styles.sectionTitle}>好礼详情</Text>
        {detail.detailSections.map((section, index) => (
          <View className={styles.detailSection} key={`${section.title}-${index}`}>
            <Text className={styles.detailHeading}>{section.title}</Text>
            <Text className={styles.detailContent}>{section.content}</Text>
          </View>
        ))}
      </View>

      <View className={styles.actionBar}>
        <View className={styles.actionBarInner}>
          <View className={styles.cartShortcut} onClick={() => Taro.switchTab({ url: '/pages/cart/index' })} role="button" aria-label="打开购物车">
            <Text className={styles.cartIcon}>袋</Text>
            <Text>购物车</Text>
          </View>
          <View className={classnames(styles.actionButton, !selectedSku && styles.disabled)} onClick={add} role="button" aria-label="加入购物车">加入购物车</View>
          <View className={classnames(styles.actionButton, styles.buyButton, !selectedSku && styles.disabled)} onClick={buyNow} role="button" aria-label="立即购买">立即购买</View>
        </View>
      </View>
    </View>
  )
}

export default ProductPage
