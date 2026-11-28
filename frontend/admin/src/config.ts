// H5 商城基地址：优先读取环境变量 VITE_H5_BASE_URL，未配置时回退到当前主机的 3001 端口
const envBase = import.meta.env.VITE_H5_BASE_URL as string | undefined

export const H5_BASE_URL = String(
  envBase || `${window.location.protocol}//${window.location.hostname}:3001`
).replace(/\/+$/, '')
