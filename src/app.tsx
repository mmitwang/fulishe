import React, { useEffect } from 'react'
import type { PropsWithChildren } from 'react'
import Taro from '@tarojs/taro'
import './app.scss'

function App({ children }: PropsWithChildren) {
  useEffect(() => {
    if (process.env.TARO_ENV !== 'weapp') return
    const updateManager = Taro.getUpdateManager()
    updateManager.onUpdateReady(() => {
      Taro.showModal({ title: '版本已更新', content: '重启后使用最新版本', showCancel: false })
        .then(() => updateManager.applyUpdate())
        .catch(error => console.error('[App] 应用更新失败', error))
    })
    updateManager.onUpdateFailed(() => console.error('[App] 新版本下载失败'))
  }, [])

  return children
}

export default App
