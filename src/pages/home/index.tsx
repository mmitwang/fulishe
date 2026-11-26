import React, { useCallback, useEffect, useState } from 'react'
import { Image, ScrollView, Swiper, SwiperItem, Text, View } from '@tarojs/components'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import ProductCard from '@/components/ProductCard'
import { clearRequestCache } from '@/services/api'
import { getHomeData } from '@/services/catalog'
import type { HomeData } from '@/types'
import styles from './index.module.scss'

const HomePage: React.FC = () => {
  const [data, setData] = useState<HomeData | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async (refresh = false) => {
    if (refresh) clearRequestCache()
    setError('')
    try {
      const result = await getHomeData()
      setData(result)
      console.log('[Home] 首页就绪，商品数', result.hotProducts.length)
    } catch (loadError) {
      console.error('[Home] 首页加载失败', loadError)
      setError('精选内容暂时未能送达')
    }
  }, [])

  useEffect(() => { load() }, [load])
  usePullDownRefresh(async () => {
    await load(true)
    Taro.stopPullDownRefresh()
  })

  const goCategory = () => Taro.switchTab({ url: '/pages/category/index' })
  const goDetail = (id: number) => Taro.navigateTo({ url: `/pages/product/index?id=${id}` })

  if (!data && !error) return <View className={styles.loading}>正在备好今日精选…</View>
  if (!data) return <View className={styles.error}>{error}<View className={styles.retry} onClick={() => load(true)}>重新加载</View></View>

  return (
    <View className={styles.page}>
      <View className={styles.hero}>
        <View className={styles.heroInner}>
          <View className={styles.brandRow}>
            <View>
              <Text className={styles.brandName}>福礼社</Text>
              <Text className={styles.brandMeta}>FULISHE · 企业礼赠与福利集采</Text>
            </View>
            <View className={styles.seal}><Text>礼</Text></View>
          </View>
          <Text className={styles.heroTitle}>{'让每一份心意，\n都体面抵达。'}</Text>
          <Text className={styles.heroDesc}>品牌直供 · 企业定制 · 多地址交付</Text>
          <View className={styles.search} onClick={goCategory} role="button" aria-label="搜索节庆礼盒、员工福利、商务好礼">
            <Text className={styles.searchIcon}>⌕</Text>
            <Text>搜索节庆礼盒、员工福利、商务好礼</Text>
          </View>
        </View>
      </View>

      <View className={styles.content}>
        <Swiper className={styles.banner} autoplay circular indicatorDots indicatorColor="rgba(255,255,255,.4)" indicatorActiveColor="#ffffff">
          {data.banners.map(banner => (
            <SwiperItem key={banner.id}>
              <View className={styles.bannerItem} onClick={() => banner.productId && goDetail(banner.productId)}>
                <Image className={styles.bannerImage} src={banner.image} mode="aspectFill" onError={event => console.error('[Home] Banner 加载失败', event)} />
                <View className={styles.bannerShade} />
                <View className={styles.bannerCopy}>
                  <Text className={styles.bannerTitle}>{banner.title}</Text>
                  <Text className={styles.bannerSubtitle}>{banner.subtitle}</Text>
                </View>
              </View>
            </SwiperItem>
          ))}
        </Swiper>

        <ScrollView className={styles.categoryScroll} scrollX>
          {data.categories.slice(0, 8).map((category, index) => (
            <View key={category.id} className={styles.categoryItem} onClick={goCategory}>
              <Text className={styles.categoryIndex}>{String(index + 1).padStart(2, '0')}</Text>
              <Text className={styles.categoryName}>{category.categoryName}</Text>
            </View>
          ))}
        </ScrollView>

        <View className={styles.serviceStrip}>
          <Text className={styles.serviceItem}>正品保障</Text>
          <Text className={styles.serviceItem}>统一开票</Text>
          <Text className={styles.serviceItem}>分址交付</Text>
        </View>

        <View className={styles.section}>
          <View className={styles.sectionHead}>
            <Text className={styles.sectionTitle}>今日甄选</Text>
            <Text className={styles.sectionMore} onClick={goCategory}>全部好物 →</Text>
          </View>
          <View className={styles.grid}>
            {data.hotProducts.map(product => <ProductCard key={product.id} product={product} onTap={goDetail} />)}
          </View>
        </View>

        <View className={styles.channelLink} onClick={() => Taro.navigateTo({ url: '/pages/channel/index' })}>
          当前支持 Web / 小程序 / 公众号模拟联调 · 查看渠道状态
        </View>
      </View>
    </View>
  )
}

export default HomePage
