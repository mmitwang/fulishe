// 金额已是元，直接保留两位小数展示，不做分/元换算
export const formatMoney = (value: number | string | undefined | null): string => {
  return Number(value || 0).toFixed(2)
}
