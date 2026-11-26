import React, { useEffect, useState } from 'react'
import { View, Text, Image, Input, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import styles from './index.module.scss'
import { request, getUserId } from '@/services/api'
import type { HomeData, Product, ProductDetail } from '@/types'

const CategoryPage: React.FC = () => {
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [activeId, setActiveId] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)

  const fetchProducts = async (categoryId: number, name: string) => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { current: 1, size: 50 }
      if (categoryId) params.categoryId = categoryId
      if (name) params.spuName = name
      const res = await request<{ records: Product[]; total: number }>({ url: '/product/spu/page', data: params })
      console.log('[Category] 商品加载成功', res.total)
      setProducts(res.records)
    } catch (err) {
      console.error('[Category] 商品加载失败', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      const home = await request<HomeData>({ url: '/h5/home' })
      setCategories(home.categories)
      fetchProducts(0, '')
    }
    init()
  }, [])

  const selectCategory = (id: number) => {
    setActiveId(activeId === id ? 0 : id)
    fetchProducts(activeId === id ? 0 : id, keyword)
  }

  const goDetail = (id: number) => {
    Taro.navigateTo({ url: `/pages/product/index?id=${id}` })
  }

  const addCart = async (product: Product) => {
    try {
      const detail = await request<ProductDetail>({ url: `/h5/product/${product.id}` })
      const sku = detail.skus[0]
      if (!sku) {
        Taro.showToast({ title: '暂无可售规格', icon: 'none' })
        return
      }
      await request({ url: '/cart/add', method: 'POST', data: { userId: getUserId(), skuId: sku.id, quantity: 1 } })
      Taro.showToast({ title: '已加入购物车', icon: 'success' })
    } catch (err) {
      console.error('[Category] 加入购物车失败', err)
    }
  }

  return (
    <View className={styles.page}>
      <View className={styles.searchBar}>
        <Input
          className={styles.searchInput}
          value={keyword}
          placeholder="搜索礼品卡 / 礼盒 / 数码"
          onInput={e => setKeyword(e.detail.value)}
          onConfirm={() => fetchProducts(activeId, keyword)}
        />
      </View>

      <View className={styles.body}>
        <ScrollView className={styles.side} scrollY>
          <View
            className={classnames(styles.sideItem, activeId === 0 && styles.active)}
            onClick={() => {
              setActiveId(0)
              fetchProducts(0, keyword)
            }}
          >
            <Text>全部</Text>
          </View>
          {categories.map(category => (
            <View
              key={category.id}
              className={classnames(styles.sideItem, activeId === category.id && styles.active)}
              onClick={() => selectCategory(category.id)}
            >
              <Text>{category.name}</Text>
            </View>
          ))}
        </ScrollView>

        <ScrollView className={styles.list} scrollY>
          {loading && <View className={styles.empty}>加载中...</View>}
          {!loading && products.map(product => (
            <View key={product.id} className={styles.productItem} onClick={() => goDetail(product.id)}>
              <Image className={styles.cover} src={product.image} mode="aspectFill" />
              <View className={styles.info}>
                <Text className={styles.name}>{product.spuName}</Text>
                <Text className={styles.brand}>{product.brandName} · 已售 {product.sales}</Text>
                <View className={styles.bottom}>
                  <Text className={styles.price}>¥{product.sellPrice}</Text>
                  <View className={styles.addBtn} onClick={e => { e.stopPropagation(); addCart(product) }}>
                    <Text>+</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
          {!loading && products.length === 0 && <View className={styles.empty}>暂无商品</View>}
        </ScrollView>
      </View>
    </View>
  )
}

export default CategoryPage
