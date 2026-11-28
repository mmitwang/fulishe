const crypto = require('crypto')

const ok = (res, data, message = 'success') => res.json({ code: 200, message, data })
const fail = (res, message, code = 400) => res.json({ code, message })

const pad = n => String(n).padStart(2, '0')
const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
const daysAgo = n => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}
const timeAgo = (n, hour = 10) => {
  const d = daysAgo(n)
  d.setHours(hour, (n * 7) % 60, 0, 0)
  return fmt(d)
}
const img = (prompt, size = 'square') =>
  `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=${size}`
const hash = seed => '0x' + crypto.createHash('sha256').update(String(seed)).digest('hex')
const rand = arr => arr[Math.floor(Math.random() * arr.length)]
const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a
const pick = (arr, n) => arr.slice(0, n)

const paginate = (list, q = {}) => {
  // 分页参数做上下界收敛，避免负数 offset 与超大 size 拖垮 Mock
  const current = Math.max(1, parseInt(q.current || q.pageNum || 1) || 1)
  const size = Math.min(200, Math.max(1, parseInt(q.size || q.pageSize || 10) || 10))
  const start = (current - 1) * size
  return { records: list.slice(start, start + size), total: list.length, current, size }
}

const like = (value, keyword) => {
  if (!keyword) return true
  return String(value || '').toLowerCase().includes(String(keyword).toLowerCase())
}

const numEq = (value, target) => {
  if (target === undefined || target === null || target === '') return true
  return Number(value) === Number(target)
}

module.exports = { ok, fail, fmt, daysAgo, timeAgo, img, hash, rand, randInt, pick, paginate, like, numEq }
