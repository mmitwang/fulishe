import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useReachBottom, useRouter } from '@tarojs/taro'
import classnames from 'classnames'
import ProductCard from '@/components/ProductCard'
import { getCategories, getProductPage } from '@/services/catalog'
import { getHotKeywords, getSearchSuggestions } from '@/services/search'
import type { Category, Product } from '@/types'
import styles from './index.module.scss'

const PAGE_SIZE = 10
const HISTORY_KEY = 'searchHistory'
type SortKey = 'default' | 'sales' | 'priceAsc' | 'priceDesc'
const sortOptions: { key: SortKey; label: string }[] = [
  { key: 'default', label: '综合' },
  { key: 'sales', label: '销量优先' },
  { key: 'priceAsc', label: '价格 ↑' },
  { key: 'priceDesc', label: '价格 ↓' }
]

const SearchPage: React.FC = () => {
  const router = useRouter()
  const initialKeyword = router.params.keyword || ''
  const [keyword, setKeyword] = useState(initialKeyword)
  const [searchKeyword, setSearchKeyword] = useState(initialKeyword)
  const [searched, setSearched] = useState(Boolean(initialKeyword))
  const [hotKeywords, setHotKeywords] = useState<string[]>([])
  const [history, setHistory] = useState<string[]>(() => Taro.getStorageSync(HISTORY_KEY) || [])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState(0)
  const [sort, setSort] = useState<SortKey>('default')
  const [instant, setInstant] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [current, setCurrent] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const loadingRef = useRef(false)
  const requestIdRef = useRef(0)

  useEffect(() => {
    void getHotKeywords().then(setHotKeywords)
    void getCategories().then(setCategories)
  }, [])

  useEffect(() => {
    const value = keyword.trim()
    if (!value || (searched && value === searchKeyword)) {
      setSuggestions([])
      return
    }
    const timer = setTimeout(() => {
      void getSearchSuggestions(value).then(setSuggestions)
    }, 250)
    return () => clearTimeout(timer)
  }, [keyword, searchKeyword, searched])

  const loadProducts = useCallback(async (page: number, append = false) => {
    if (!searchKeyword) {
      setProducts([])
      setTotal(0)
      return
    }
    const requestId = ++requestIdRef.current
    loadingRef.current = true
    setLoading(true)
    try {
      const result = await getProductPage(page, PAGE_SIZE, categoryId, searchKeyword, { sort, instant })
      if (requestId !== requestIdRef.current) return
      setProducts(previous => append ? [...previous, ...result.records] : result.records)
      setTotal(result.total)
      setCurrent(page)
    } catch (error) {
      console.error('[Search] 搜索结果加载失败', error)
      Taro.showToast({ title: '搜索暂时不可用，请重试', icon: 'none' })
    } finally {
      if (requestId === requestIdRef.current) {
        loadingRef.current = false
        setLoading(false)
      }
    }
  }, [categoryId, instant, searchKeyword, sort])

  useEffect(() => { void loadProducts(1) }, [loadProducts])

  const search = (value = keyword) => {
    const nextKeyword = value.trim()
    if (!nextKeyword) {
      Taro.showToast({ title: '请输入商品、品牌或品类', icon: 'none' })
      return
    }
    const nextHistory = [nextKeyword, ...history.filter(item => item !== nextKeyword)].slice(0, 8)
    setHistory(nextHistory)
    Taro.setStorageSync(HISTORY_KEY, nextHistory)
    setKeyword(nextKeyword)
    setSuggestions([])
    setSearched(true)
    if (nextKeyword === searchKeyword) void loadProducts(1)
    else setSearchKeyword(nextKeyword)
  }

  const clearHistory = () => {
    setHistory([])
    Taro.removeStorageSync(HISTORY_KEY)
  }

  useReachBottom(() => {
    if (searched && !loadingRef.current && products.length < total) void loadProducts(current + 1, true)
  })

  const goDetail = (id: number) => Taro.navigateTo({ url: `/pages/product/index?id=${id}` })

  return (
    <View className={styles.page}>
      <View className={styles.searchBar}>
        <Text className={styles.searchIcon}>⌕</Text>
        <Input
          className={styles.searchInput}
          value={keyword}
          focus
          confirmType="search"
          placeholder="搜索商品、品牌或品类"
          onInput={event => setKeyword(event.detail.value)}
          onConfirm={() => search()}
        />
        <Text className={styles.searchAction} onClick={() => search()}>搜索</Text>
      </View>

      {suggestions.length > 0 && keyword.trim() !== searchKeyword && (
        <View className={styles.suggestionCard}>
          {suggestions.map(item => (
            <View className={styles.suggestionRow} key={item} onClick={() => search(item)}>
              <Text className={styles.suggestionIcon}>⌕</Text>
              <Text>{item}</Text>
            </View>
          ))}
        </View>
      )}

      {!searched ? (
        <View className={styles.discovery}>
          {history.length > 0 && (
            <View className={styles.keywordSection}>
              <View className={styles.sectionHead}>
                <Text className={styles.sectionTitle}>搜索历史</Text>
                <Text className={styles.clearButton} onClick={clearHistory}>清空</Text>
              </View>
              <View className={styles.keywordList}>
                {history.map(item => <Text className={styles.keyword} key={item} onClick={() => search(item)}>{item}</Text>)}
              </View>
            </View>
          )}
          <View className={styles.keywordSection}>
            <View className={styles.sectionHead}><Text className={styles.sectionTitle}>热门搜索</Text></View>
            <View className={styles.keywordList}>
              {hotKeywords.map((item, index) => (
                <Text className={styles.keyword} key={item} onClick={() => search(item)}><Text className={styles.hotIndex}>{index + 1}</Text>{item}</Text>
              ))}
            </View>
          </View>
        </View>
      ) : (
        <View className={styles.results}>
          <ScrollView className={styles.filterScroll} scrollX>
            <View className={classnames(styles.filterItem, categoryId === 0 && styles.active)} onClick={() => setCategoryId(0)}>全部品类</View>
            {categories.map(category => (
              <View className={classnames(styles.filterItem, categoryId === category.id && styles.active)} key={category.id} onClick={() => setCategoryId(category.id)}>{category.categoryName}</View>
            ))}
            <View className={classnames(styles.filterItem, instant && styles.active)} onClick={() => setInstant(value => !value)}>极速达</View>
          </ScrollView>

          <View className={styles.sortRow}>
            {sortOptions.map(option => (
              <Text className={classnames(styles.sortItem, sort === option.key && styles.sortActive)} key={option.key} onClick={() => setSort(option.key)}>{option.label}</Text>
            ))}
          </View>

          <View className={styles.resultMeta}>“{searchKeyword}” · {total} 件商品</View>
          <View className={styles.grid}>
            {products.map(product => <ProductCard key={product.id} product={product} onTap={goDetail} />)}
          </View>
          {loading && <View className={styles.state}>正在搜索…</View>}
          {!loading && products.length === 0 && <View className={styles.state}>没有找到匹配商品，换个关键词或筛选条件试试</View>}
          {!loading && products.length > 0 && <View className={styles.state}>{products.length < total ? '上滑加载更多' : '已展示全部结果'}</View>}
        </View>
      )}
    </View>
  )
}

export default SearchPage
