// 需求大厅筛选状态的模块级缓存。
// 用 ES 模块作用域而非 sessionStorage：SPA 内路由跳转时模块仍驻留，返回大厅可恢复状态；
// 页面刷新 / 重新登录会重新加载整个应用，模块重新执行并回到 null，从而自动恢复默认筛选。
let filters = null

export function saveHallFilters(data) {
  filters = data
}

export function getHallFilters() {
  return filters
}

export function clearHallFilters() {
  filters = null
}