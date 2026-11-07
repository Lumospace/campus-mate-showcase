export const CATEGORIES = [
  { key: 'study', label: '学习搭子', emoji: '📚' },
  { key: 'meal', label: '饭搭子', emoji: '🍚' },
  { key: 'sport', label: '运动搭子', emoji: '🏀' },
  { key: 'game', label: '游戏搭子', emoji: '🎮' },
  { key: 'team', label: '比赛组队', emoji: '🏆' },
  { key: 'travel', label: '出行搭子', emoji: '🚗' },
  { key: 'other', label: '其他', emoji: '✨' }
]
export const catMap = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]))
export const catLabel = (k) => catMap[k]?.label || k
export const catEmoji = (k) => catMap[k]?.emoji || '✨'

// 校园活动分类（大型活动/招募）
export const ACTIVITY_CATEGORIES = [
  { key: 'lecture', label: '讲座/论坛', emoji: '🎤' },
  { key: 'competition', label: '比赛', emoji: '🏆' },
  { key: 'recruit', label: '招募', emoji: '📣' },
  { key: 'volunteer', label: '志愿', emoji: '🤝' },
  { key: 'show', label: '演出/展览', emoji: '🎭' },
  { key: 'sport', label: '体育赛事', emoji: '⚽' },
  { key: 'other', label: '其他', emoji: '📌' }
]
export const activityCatMap = Object.fromEntries(ACTIVITY_CATEGORIES.map((c) => [c.key, c]))
export const activityCatLabel = (k) => activityCatMap[k]?.label || k

// 发布资格申请状态
export const ACTIVITY_REQ_STATUS = {
  pending: { label: '审核中', type: 'warning' },
  published: { label: '已发布', type: 'success' },
  rejected: { label: '已驳回', type: 'info' }
}

export const CONSUMPTION_LEVELS = ['经济', '适中', '随性']

// 破冰快问快答题库（聊天室小游戏）
export const QUIZ_QUESTIONS = [
  '用三个词形容你自己，你会选哪三个？',
  '如果明天没课，你最想去校园哪个角落？',
  '最近单曲循环的一首歌是什么？',
  '你最想和搭子一起解锁的一件小事？',
  '你觉得组队合作里最难的一环是什么？',
  '用一个 emoji 形容你此刻的心情～',
  '如果瞬间学会一项技能，会选什么？',
  '推荐一部你觉得被低估的电影或书？',
  '说一个只有你们专业才懂的梗？',
  '下次想约什么活动来破冰？'
]

export const STATUS_LABEL = {
  recruiting: '招募中',
  matched: '已匹配',
  done: '已过期',
  expired: '已过期',
  draft: '草稿',
  off: '已下架'
}
export const STATUS_TYPE = {
  recruiting: 'success',
  matched: 'warning',
  done: 'info',
  expired: 'info',
  draft: 'info',
  off: 'info'
}

// 兼容 'YYYY-MM-DD HH:mm:ss'（空格分隔）等本地时间字符串：Safari 的 new Date 不认空格格式
export function parseLocalTime(s) {
  if (!s) return new Date(NaN)
  if (s instanceof Date) return s
  const str = String(s)
  const t = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(str) ? str.replace(' ', 'T') : str
  return new Date(t)
}

export function fmtTime(iso) {
  if (!iso) return ''
  const d = parseLocalTime(iso)
  if (isNaN(d)) return iso
  const now = new Date()
  const sameYear = d.getFullYear() === now.getFullYear()
  const ymd = `${d.getMonth() + 1}月${d.getDate()}日`
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  if (sameYear) return `${ymd} ${hm}`
  return `${d.getFullYear()}年${ymd} ${hm}`
}

export function fmtDate(iso) {
  if (!iso) return ''
  const d = parseLocalTime(iso)
  if (isNaN(d)) return iso
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

// 仅本地时区的 HH:MM（用于日历事件卡片）
export function fmtHM(iso) {
  if (!iso) return ''
  const d = parseLocalTime(iso)
  if (isNaN(d)) return iso
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// 距现在还有多久（用于临期提示）
export function timeLeft(iso) {
  if (!iso) return ''
  const d = parseLocalTime(iso)
  if (isNaN(d)) return ''
  const diff = d - Date.now()
  if (diff < 0) return '已开始'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (h > 24) return `还有 ${Math.floor(h / 24)} 天`
  if (h > 0) return `还有 ${h} 小时`
  return `${m} 分钟后`
}

export function weekdayText(d) {
  return ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][d]
}

// 图片上传前压缩：长边限制 1280、JPEG 逐步降质，确保结果不超过 1MB，
// 避免 base64 图片过大导致兴趣圈列表/详情响应缓慢或超时
export function compressImageFile(file, { maxSide = 1280, maxBytes = 1024 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('读取图片失败'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('图片解析失败'))
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        let quality = 0.82
        let data = canvas.toDataURL('image/jpeg', quality)
        while (data.length > maxBytes && quality > 0.5) {
          quality = Math.max(0.5, quality - 0.12)
          data = canvas.toDataURL('image/jpeg', quality)
        }
        resolve(data)
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

// 信誉档位
export function tierOf(score) {
  if (score >= 4.6) return { label: '金牌搭子', icon: '🥇' }
  if (score >= 4.2) return { label: '靠谱搭子', icon: '🤝' }
  if (score >= 3.8) return { label: '友好搭子', icon: '🙂' }
  if (score >= 1.8) return { label: '观察期', icon: '👀' }
  return { label: '受限', icon: '🚫' }
}