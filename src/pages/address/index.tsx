import React, { useCallback, useState } from 'react'
import { Input, Switch, Text, Textarea, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import classnames from 'classnames'
import { deleteAddress, formatAddress, listAddresses, saveAddress } from '@/services/address'
import { getCurrentUser } from '@/services/auth'
import type { Address } from '@/types'
import styles from './index.module.scss'

const AddressPage: React.FC = () => {
  const router = useRouter()
  const selectMode = router.params.select === '1'
  const [addresses, setAddresses] = useState<Address[]>([])
  const [editing, setEditing] = useState<Address | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      setAddresses(await listAddresses())
    } catch (error) {
      console.error('[AddressPage] 地址簿加载失败', error)
      Taro.showToast({ title: '地址簿加载失败', icon: 'none' })
    }
  }, [])

  useDidShow(() => { void load() })

  const openEditor = (address?: Address) => {
    const user = getCurrentUser()
    setEditing(address ? { ...address } : {
      id: 0,
      userId: user?.id || 2,
      receiver: user?.realName || user?.nickname || '',
      mobile: user?.mobile || '',
      region: '',
      detail: '',
      tag: '家',
      isDefault: addresses.length === 0
    })
  }

  const update = (patch: Partial<Address>) => {
    setEditing(current => current ? { ...current, ...patch } : current)
  }

  const save = async () => {
    if (!editing || saving) return
    if (editing.receiver.trim().length < 2) {
      Taro.showToast({ title: '请填写收货人姓名', icon: 'none' })
      return
    }
    if (!/^1\d{10}$/.test(editing.mobile.trim())) {
      Taro.showToast({ title: '请填写 11 位手机号码', icon: 'none' })
      return
    }
    if (editing.region.trim().length < 2 || editing.detail.trim().length < 2) {
      Taro.showToast({ title: '请填写省市区和详细门牌号', icon: 'none' })
      return
    }
    setSaving(true)
    try {
      await saveAddress(editing)
      await load()
      setEditing(null)
      Taro.showToast({ title: '地址已保存', icon: 'success' })
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '地址保存失败', icon: 'none' })
    } finally {
      setSaving(false)
    }
  }

  const choose = (address: Address) => {
    if (!selectMode) return
    Taro.setStorageSync('checkoutAddress', address)
    Taro.navigateBack()
  }

  const setDefault = async (address: Address) => {
    await saveAddress({ ...address, isDefault: true })
    await load()
    Taro.showToast({ title: '已设为默认地址', icon: 'none' })
  }

  const remove = async (address: Address) => {
    const result = await Taro.showModal({ title: '删除地址', content: `确定删除${address.receiver}的这条地址吗？` })
    if (!result.confirm) return
    await deleteAddress(address.id)
    await load()
    Taro.showToast({ title: '地址已删除', icon: 'none' })
  }

  if (editing) {
    return (
      <View className={styles.page}>
        <View className={styles.editorCard}>
          <View className={styles.editorHead}>
            <Text className={styles.editorTitle}>{editing.id ? '编辑地址' : '新增地址'}</Text>
            <Text className={styles.cancelButton} onClick={() => setEditing(null)}>返回列表</Text>
          </View>
          <View className={styles.formRow}>
            <Text className={styles.formLabel}>收货人</Text>
            <Input className={styles.input} value={editing.receiver} maxlength={20} placeholder="请输入姓名" onInput={event => update({ receiver: event.detail.value })} />
          </View>
          <View className={styles.formRow}>
            <Text className={styles.formLabel}>手机号码</Text>
            <Input className={styles.input} value={editing.mobile} type="number" maxlength={11} placeholder="请输入 11 位手机号" onInput={event => update({ mobile: event.detail.value })} />
          </View>
          <View className={styles.formRow}>
            <Text className={styles.formLabel}>省市区</Text>
            <Input className={styles.input} value={editing.region} maxlength={50} placeholder="例如：浙江省杭州市西湖区" onInput={event => update({ region: event.detail.value })} />
          </View>
          <View className={styles.formRow}>
            <Text className={styles.formLabel}>详细地址</Text>
            <Textarea className={`${styles.input} ${styles.textarea}`} value={editing.detail} maxlength={100} placeholder="街道、楼栋、门牌号" onInput={event => update({ detail: event.detail.value })} />
          </View>
          <View className={styles.formRow}>
            <Text className={styles.formLabel}>地址标签</Text>
            <View className={styles.tagList}>
              {['家', '公司', '学校'].map(tag => <Text className={classnames(styles.tagOption, editing.tag === tag && styles.tagActive)} key={tag} onClick={() => update({ tag })}>{tag}</Text>)}
            </View>
          </View>
          <View className={styles.defaultRow}>
            <Text>设为默认地址</Text>
            <Switch checked={editing.isDefault} color="#a52a2a" onChange={event => update({ isDefault: event.detail.value })} />
          </View>
          <View className={classnames(styles.saveButton, saving && styles.disabled)} onClick={() => void save()}>{saving ? '正在保存…' : '保存地址'}</View>
        </View>
      </View>
    )
  }

  return (
    <View className={styles.page}>
      {selectMode && <View className={styles.modeTip}>选择本次订单的收货地址</View>}
      {addresses.map(address => (
        <View className={styles.addressCard} key={address.id} onClick={() => choose(address)}>
          <View className={styles.addressHead}>
            <Text className={styles.receiver}>{address.receiver}</Text>
            <Text className={styles.mobile}>{address.mobile}</Text>
            <Text className={styles.addressTag}>{address.tag}</Text>
            {address.isDefault && <Text className={styles.defaultBadge}>默认</Text>}
          </View>
          <Text className={styles.addressText}>{formatAddress(address)}</Text>
          <View className={styles.addressActions}>
            {!address.isDefault && <Text className={styles.action} onClick={event => { event.stopPropagation(); void setDefault(address) }}>设为默认</Text>}
            <Text className={styles.action} onClick={event => { event.stopPropagation(); openEditor(address) }}>编辑</Text>
            <Text className={`${styles.action} ${styles.deleteAction}`} onClick={event => { event.stopPropagation(); void remove(address) }}>删除</Text>
          </View>
        </View>
      ))}
      {addresses.length === 0 && <View className={styles.empty}>还没有收货地址，请先新增一条</View>}
      <View className={styles.addButton} onClick={() => openEditor()}>＋ 新增收货地址</View>
    </View>
  )
}

export default AddressPage
