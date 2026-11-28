import React, { useEffect, useState } from 'react'
import { View, Text, Image, Swiper, SwiperItem, ScrollView } from '@tarojs/components'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import styles from './index.module.scss'
import ProductCard from '@/components/ProductCard'
import { request } from '@/services/api'
import type { HomeData } from '@/types'

const HomePage: React.FC = () => {
  const [data, setData] = useState<HomeData | null>(null)
  const [noticeIndex, setNoticeIndex] = useState(0)

  const loadData = async () => {
    try {
      const res = await request<HomeData>({ url: '/h5/home' })
      console.log('[Home] 首页数据加载成功', res.hotProducts.length)
      setData(res)
    } catch (err) {
      console.error('[Home] 首页数据加载失败', err)
    }
  }

  useEffect(() => {
    loadData()
    const timer = setInterval(() => {
      setNoticeIndex(prev => (prev + 1) % 3)
    }, 3000)
    return () => clearInterval(timer)
  }, [])

  usePullDownRefresh(async () => {
    await loadData()
    Taro.stopPullDownRefresh()
  })

  const goDetail = (id: number) => {
    Taro.navigateTo({ url: `/pages/product/index?id=${id}` })
  }

  const goTrace = () => {
    Taro.navigateTo({ url: '/pages/trace/index' })
  }

  const goCategory = () => {
    Taro.switchTab({ url: '/pages/category/index' })
  }

  if (!data) {
    return <View className={styles.loading}>正在加载福礼社精选好物...</View>
  }

  return (
    <View className={styles.page}>
      <View className={styles.hero}>
        <View className={styles.brandRow}>
          <View className={styles.brandLeft}>
            <View className={styles.brandMark}>福</View>
            <View className={styles.brand}>
              <Text className={styles.brandName}>福礼社</Text>
              <Text className={styles.brandSlogan}>企业福利 · 区块链溯源</Text>
            </View>
          </View>
          <View className={styles.traceBtn} onClick={goTrace}>
            <Text>扫码验真</Text>
          </View>
        </View>
        <View className={styles.search} onClick={goCategory}>
          <Text>搜索礼品卡 / 节庆礼盒 / 数码好礼</Text>
        </View>
      </View>

      <View className={styles.content}>
        <Swiper className={styles.banner} autoplay circular indicatorDots indicatorActiveColor="#ffffff">
          {data.banners.map(banner => (
            <SwiperItem key={banner.id}>
              <Image className={styles.bannerImage} src={banner.image} mode="aspectFill" />
            </SwiperItem>
          ))}
        </Swiper>

        <View className={styles.notice}>
          <Text>公告</Text>
          <Text className={styles.noticeText}>{data.notices[noticeIndex % data.notices.length]}</Text>
        </View>

        <ScrollView className={styles.entryScroll} scrollX>
          {data.quickEntries.map(entry => (
            <View key={entry.id} className={styles.entryItem} onClick={() => (entry.name === '溯源验真' ? goTrace() : goCategory())}>
              <Image className={styles.entryIcon} src={entry.icon} mode="aspectFill" />
              <Text className={styles.entryName}>{entry.name}</Text>
            </View>
          ))}
        </ScrollView>

        <View className={styles.traceCard} onClick={goTrace}>
          <View>
            <Text className={styles.traceTitle}>区块链溯源验真</Text>
            <Text className={styles.traceDesc}>卡券与商品全链路存证，数据不可篡改</Text>
          </View>
          <Text className={styles.traceArrow}>›</Text>
        </View>

        <View className={styles.section}>
          <View className={styles.sectionHead}>
            <Text className={styles.sectionTitle}>精选好物</Text>
            <Text className={styles.sectionMore} onClick={goCategory}>查看更多 ›</Text>
          </View>
          <View className={styles.grid}>
            {data.hotProducts.map(product => (
              <View key={product.id} className={styles.gridItem}>
                <ProductCard product={product} onTap={goDetail} />
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  )
}

export default HomePage
