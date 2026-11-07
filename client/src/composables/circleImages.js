import { ref } from 'vue'
import api from '../api/index.js'

// 圈子帖子图片按需加载：接口只返回图片数量，图片走独立二进制接口；
// 列表/详情进入视口才请求，避免大体积 base64 拖慢首屏并触发 axios 超时
export function useCircleImages(circleId) {
  const urls = ref({})
  const failed = ref({})
  const inflight = new Map()
  const objectUrls = new Set()
  let observer = null

  const keyOf = (postId, idx) => `${postId}:${idx}`

  function urlOf(postId, idx) {
    return urls.value[keyOf(postId, idx)] || ''
  }

  function load(postId, idx) {
    const k = keyOf(postId, idx)
    if (urls.value[k]) return Promise.resolve(urls.value[k])
    if (inflight.has(k)) return inflight.get(k)
    const task = api.circlePostImage(circleId, postId, idx)
      .then((blob) => {
        const u = URL.createObjectURL(blob)
        objectUrls.add(u)
        urls.value = { ...urls.value, [k]: u }
        return u
      })
      .catch(() => {
        failed.value = { ...failed.value, [k]: true }
        return ''
      })
      .finally(() => inflight.delete(k))
    inflight.set(k, task)
    return task
  }

  // 绑定懒加载容器：元素进入视口（提前 300px）时再请求该图片
  function bind(el, postId, idx) {
    if (!el || !el.dataset) return
    if (!observer) {
      observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const k = entry.target.dataset.imgKey
          if (k) {
            const parts = k.split(':')
            load(Number(parts[0]), Number(parts[1]))
          }
          observer.unobserve(entry.target)
        }
      }, { rootMargin: '300px' })
    }
    el.dataset.imgKey = keyOf(postId, idx)
    observer.observe(el)
  }

  async function loadAll(post) {
    const list = []
    for (let i = 0; i < (post.image_count || 0); i++) {
      const u = await load(post.id, i)
      if (u) list.push(u)
    }
    return list
  }

  function dispose() {
    if (observer) {
      observer.disconnect()
      observer = null
    }
    for (const u of objectUrls) URL.revokeObjectURL(u)
    objectUrls.clear()
    inflight.clear()
    urls.value = {}
    failed.value = {}
  }

  return { urlOf, failed, bind, load, loadAll, dispose }
}
