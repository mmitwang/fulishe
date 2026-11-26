import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useReachBottom } from '@tarojs/taro'
import classnames from 'classnames'
import ProductCard from '@/components/ProductCard'
import { getCategories, getProductPage } from '@/services/catalog'
import type { Category, Product } from '@/types'
import styles from './index.module.scss'

const PAGE_SIZE = 10

const CategoryPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([])
  const [activeId, setActiveId] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [current, setCurrent] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const loadingRef = useRef(false)
  const requestIdRef = useRef(0)

  const loadProducts = useCallback(async (page: number, append = false) => {
    const requestId = ++requestIdRef.current
    loadingRef.current = true
    setLoading(true)
    try {
      const result = await getProductPage(page, PAGE_SIZE, activeId, searchKeyword)
      if (requestId !== requestIdRef.current) return
      setProducts(previous => append ? [...previous, ...result.records] : result.records)
      setTotal(result.total)
      setCurrent(page)
    } catch (error) {
      if (requestId !== requestIdRef.current) return
      console.error('[Category] 商品加载失败', error)
      Taro.showToast({ title: '商品加载失败，请重试', icon: 'none' })
    } finally {
      if (requestId === requestIdRef.current) {
        loadingRef.current = false
        setLoading(false)
      }
    }
  }, [activeId, searchKeyword])

  useEffect(() => {
    getCategories().then(setCategories).catch(error => console.error('[Category] 分类加载失败', error))
  }, [])

  useEffect(() => { void loadProducts(1) }, [loadProducts])

  const search = () => {
    const nextKeyword = keyword.trim()
    if (nextKeyword === searchKeyword) {
      void loadProducts(1)
      return
    }
    setSearchKeyword(nextKeyword)
  }
  const selectCategory = (id: number) => setActiveId(id)
  const goDetail = (id: number) => Taro.navigateTo({ url: `/pages/product/index?id=${id}` })

  useReachBottom(() => {
    if (!loadingRef.current && products.length < total) void loadProducts(current + 1, true)
  })

  return (
    <View className={styles.page}>
      <View className={styles.searchBar}>
        <Text className={styles.searchIcon}>⌕</Text>
        <Input
          className={styles.searchInput}
          value={keyword}
          confirmType="search"
          placeholder="搜索好礼或品牌"
          onInput={event => setKeyword(event.detail.value)}
          onConfirm={search}
        />
        <Text className={styles.searchAction} onClick={search}>搜索</Text>
      </View>

      <ScrollView className={styles.categoryScroll} scrollX>
        <View className={classnames(styles.categoryItem, activeId === 0 && styles.active)} onClick={() => selectCategory(0)}>全部</View>
        {categories.map(category => (
          <View key={category.id} className={classnames(styles.categoryItem, activeId === category.id && styles.active)} onClick={() => selectCategory(category.id)}>
            {category.categoryName}
          </View>
        ))}
      </ScrollView>

      <View className={styles.resultMeta}>
        <Text className={styles.resultTitle}>好礼目录</Text>
        <Text>{total} 件商品</Text>
      </View>

      <View className={styles.grid}>
        {products.map(product => <ProductCard key={product.id} product={product} onTap={goDetail} />)}
      </View>
      {loading && <View className={styles.state}>正在加载…</View>}
      {!loading && products.length === 0 && <View className={styles.state}>没有找到匹配的好礼</View>}
      {!loading && products.length > 0 && <View className={styles.loadMore}>{products.length < total ? '上滑加载更多' : '已展示全部商品'}</View>}
    </View>
  )
}

export default CategoryPage
