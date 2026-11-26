import React, { useCallback, useEffect, useState } from 'react'
import { Image, ScrollView, Swiper, SwiperItem, Text, View } from '@tarojs/components'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import ProductCard from '@/components/ProductCard'
import { clearRequestCache } from '@/services/api'
import { getHomeData } from '@/services/catalog'
import { findNearestStore, getFulfillment, getStores, resolveSelectedStore, saveSelectedStore } from '@/services/fulfillment'
import type { FulfillmentInfo, HomeData, Store } from '@/types'
import styles from './index.module.scss'

const HomePage: React.FC = () => {
  const [data, setData] = useState<HomeData | null>(null)
  const [stores, setStores] = useState<Store[]>([])
  const [store, setStore] = useState<Store | null>(null)
  const [fulfillment, setFulfillment] = useState<FulfillmentInfo | null>(null)
  const [error, setError] = useState('')

  const selectStore = useCallback(async (nextStore: Store) => {
    saveSelectedStore(nextStore)
    setStore(nextStore)
    setFulfillment(await getFulfillment(nextStore.id))
  }, [])

  const load = useCallback(async (refresh = false) => {
    if (refresh) clearRequestCache()
    setError('')
    try {
      const [result, storeList] = await Promise.all([getHomeData(), getStores()])
      const selectedStore = resolveSelectedStore(storeList)
      const delivery = await getFulfillment(selectedStore.id)
      setData(result)
      setStores(storeList)
      setStore(selectedStore)
      setFulfillment(delivery)
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
  const goSearch = () => Taro.navigateTo({ url: '/pages/search/index' })
  const goDetail = (id: number) => Taro.navigateTo({ url: `/pages/product/index?id=${id}` })

  const locateStore = async () => {
    Taro.showLoading({ title: '正在定位…' })
    try {
      const location = await Taro.getLocation({ type: 'gcj02' })
      const nearest = findNearestStore(stores, location.latitude, location.longitude)
      await selectStore(nearest)
      Taro.showToast({ title: `已定位到${nearest.name}`, icon: 'none' })
    } catch (locationError) {
      console.error('[Home] 定位不可用', locationError)
      Taro.showToast({ title: '定位未授权，请手动选择门店', icon: 'none' })
    } finally {
      Taro.hideLoading()
    }
  }

  const openStorePicker = async () => {
    try {
      const result = await Taro.showActionSheet({ itemList: ['定位到最近门店', ...stores.map(item => `${item.district} · ${item.name}`)] })
      if (result.tapIndex === 0) await locateStore()
      else if (stores[result.tapIndex - 1]) await selectStore(stores[result.tapIndex - 1])
    } catch (pickerError) {
      console.log('[Home] 取消门店选择', pickerError)
    }
  }

  if (!data && !error) return <View className={styles.loading}>正在备好今日精选…</View>
  if (!data) return <View className={styles.error}>{error}<View className={styles.retry} onClick={() => load(true)}>重新加载</View></View>

  return (
    <View className={styles.page}>
      <View className={styles.hero}>
        <View className={styles.heroInner}>
          <View className={styles.locationRow}>
            <View className={styles.locationButton} onClick={() => void openStorePicker()} role="button" aria-label="定位或选择门店">
              <Text className={styles.locationIcon}>⌖</Text>
              <View className={styles.locationCopy}>
                <Text className={styles.locationName}>{store?.name || '选择附近门店'}</Text>
                <Text className={styles.locationMeta}>{store ? `${store.city}${store.district} · 营业 ${store.businessHours}` : '定位或手动选择'}</Text>
              </View>
              <Text>›</Text>
            </View>
            {fulfillment && <Text className={styles.arrivalBadge}>{fulfillment.arrivalText}</Text>}
          </View>
          <View className={styles.brandRow}>
            <View>
              <Text className={styles.brandName}>福礼社</Text>
              <Text className={styles.brandMeta}>FULISHE · 企业礼赠与福利集采</Text>
            </View>
            <View className={styles.seal}><Text>礼</Text></View>
          </View>
          <Text className={styles.heroTitle}>{'让每一份心意，\n都体面抵达。'}</Text>
          <Text className={styles.heroDesc}>品牌直供 · 企业定制 · 多地址交付</Text>
          <View className={styles.search} onClick={goSearch} role="button" aria-label="搜索节庆礼盒、员工福利、商务好礼">
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
