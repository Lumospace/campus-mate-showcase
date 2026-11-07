<template>
  <div>
    <div class="page-title">我发布的需求</div>
    <div class="page-sub">管理你发布的搭子需求</div>

    <div class="filter-bar">
      <div class="filter-row">
        <el-radio-group v-model="query.category" size="large">
          <el-radio-button label="">全部</el-radio-button>
          <el-radio-button v-for="c in CATEGORIES" :key="c.key" :label="c.key">{{ c.label }}</el-radio-button>
        </el-radio-group>
      </div>
      <div class="filter-row filter-controls">
        <el-input v-model="query.keyword" placeholder="搜索标题 / 内容关键词" clearable size="large" style="width: 320px" :prefix-icon="Search" />
        <el-select v-model="query.status" placeholder="状态" clearable size="large" style="width: 160px" @change="onStatusChange">
          <el-option label="招募中" value="recruiting" />
          <el-option label="已匹配" value="matched" />
          <el-option label="已过期" value="expired" />
          <el-option label="已下架" value="off" />
        </el-select>
        <el-select v-model="query.sort" placeholder="排序" size="large" style="width: 170px">
          <el-option label="默认排序" value="default" />
          <el-option label="最新发布" value="new" />
          <el-option label="活动时间" value="time" />
          <el-option label="缺口最多" value="need" />
        </el-select>
        <el-checkbox v-if="query.status !== 'expired'" v-model="onlyUnlocked">未锁定</el-checkbox>
        <el-checkbox v-model="onlyRecurring">周期搭子</el-checkbox>
      </div>
    </div>

    <div v-if="loading" style="cursor:default; pointer-events:none">
      <div v-for="i in 4" :key="i" class="demand-item" style="cursor:default">
        <div class="skeleton" style="width:54px;height:54px;border-radius:12px;flex-shrink:0"></div>
        <div class="di-body">
          <div class="skeleton skeleton-title" style="width:50%"></div>
          <div class="skeleton skeleton-text" style="width:85%"></div>
        </div>
      </div>
    </div>
    <div v-else-if="!list.length" class="empty">
      <el-icon><MessageBox /></el-icon>
      <p>你还没有发布过需求</p>
      <el-button type="primary" @click="$router.push('/publish')">去发布</el-button>
    </div>
    <div v-else-if="!shownList.length" class="empty">
      <el-icon><MessageBox /></el-icon>
      <p>没有找到匹配的需求</p>
    </div>
    <div v-else class="stagger-enter">
      <div v-for="d in shownList" :key="d.id" class="demand-item ani-fade-in-up" role="button" tabindex="0" @click="$router.push(`/demand/${d.id}`)" @keydown.enter="$router.push(`/demand/${d.id}`)">
        <div class="di-emoji">{{ d.category_emoji }}</div>
        <div class="di-body">
          <div class="di-title-row">
            <div class="di-title">{{ d.title }}</div>
            <el-tag size="small" :type="STATUS_TYPE[effectiveStatus(d)]" class="status-tag">{{ STATUS_LABEL[effectiveStatus(d)] }}</el-tag>
            <el-tag v-if="isLocked(d)" size="small" type="info" effect="plain" class="status-tag">已锁定</el-tag>
            <el-tag v-if="d.recurrence" size="small" type="warning" effect="plain" class="status-tag">🔁 周期搭子</el-tag>
          </div>
          <div class="di-meta">
            <span>🕐 {{ fmtTime(d.activity_start) }}</span>
            <span>📍 {{ d.location_name || '未填地点' }}</span>
            <span>👥 {{ d.applicant_count }}/{{ d.need_count }} 人</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, MessageBox } from '@element-plus/icons-vue'
import api from '../api/index.js'
import { CATEGORIES, STATUS_LABEL, STATUS_TYPE, fmtTime, parseLocalTime } from '../utils.js'

const list = ref([])
const loading = ref(true)
const query = reactive({ category: '', keyword: '', status: '', sort: 'default' })
const onlyUnlocked = ref(false)
const onlyRecurring = ref(false)

const STATUS_RANK = { recruiting: 0, matched: 1, expired: 2, off: 3 }

// 实时过期：招募中需求活动开始时间已过，视为已过期（与大厅口径一致）
function effectiveStatus(d) {
  if (d.status === 'recruiting' && d.activity_start && parseLocalTime(d.activity_start) <= new Date()) return 'expired'
  return d.status
}

// 已锁定标签：进行中（招募中/已匹配）且已过锁定时间
function isLocked(d) {
  const s = effectiveStatus(d)
  return (s === 'recruiting' || s === 'matched') && !!d.lock_time && parseLocalTime(d.lock_time) <= new Date()
}

// 未锁定：未设锁定时间，或锁定时间未到（与后端 unlocked 口径一致）
function isUnlocked(d) {
  return !d.lock_time || parseLocalTime(d.lock_time) > new Date()
}

function onStatusChange() {
  if (query.status === 'expired') onlyUnlocked.value = false
}

function sortList(arr) {
  const out = arr.slice()
  const s = query.sort
  if (s === 'new') return out.sort((a, b) => b.id - a.id)
  if (s === 'time') return out.sort((a, b) => {
    if (!a.activity_start && !b.activity_start) return 0
    if (!a.activity_start) return 1
    if (!b.activity_start) return -1
    return parseLocalTime(a.activity_start) - parseLocalTime(b.activity_start)
  })
  if (s === 'need') return out.sort((a, b) => (b.need_count - b.applicant_count) - (a.need_count - a.applicant_count))
  // 默认：招募中 → 已匹配 → 已过期 → 其他，活动时间靠前优先
  return out.sort((a, b) => {
    const ra = STATUS_RANK[effectiveStatus(a)] ?? 3
    const rb = STATUS_RANK[effectiveStatus(b)] ?? 3
    if (ra !== rb) return ra - rb
    const na = a.activity_start ? parseLocalTime(a.activity_start).getTime() : Infinity
    const nb = b.activity_start ? parseLocalTime(b.activity_start).getTime() : Infinity
    if (na !== nb) return na - nb
    return a.id - b.id
  })
}

const shownList = computed(() => {
  let arr = list.value
  if (query.category) arr = arr.filter((d) => d.category === query.category)
  if (query.keyword) {
    const k = query.keyword.trim().toLowerCase()
    arr = arr.filter((d) => (d.title || '').toLowerCase().includes(k) || (d.description || '').toLowerCase().includes(k))
  }
  if (query.status) {
    arr = arr.filter((d) => effectiveStatus(d) === query.status)
  }
  if (onlyUnlocked.value) {
    arr = arr.filter((d) => isUnlocked(d))
  }
  if (onlyRecurring.value) {
    arr = arr.filter((d) => d.recurrence)
  }
  // 未选状态：显示全部自己发布的需求（管理视角）
  return sortList(arr)
})

onMounted(async () => {
  try {
    const res = await api.myDemands()
    list.value = res.demands || []
  } catch (e) {
    // 加载失败时给出明确提示，避免静默显示空列表误导用户
    ElMessage.error(e?.response?.data?.error || '需求列表加载失败，请稍后重试')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.page-title { font-size: 30px; }
.page-sub { font-size: 18px; color: var(--ink); }
.filter-bar { background: linear-gradient(135deg, #eaf5f0 0%, #eef4ff 100%); border: 1px solid #cfe9de; border-radius: var(--radius); padding: 20px 24px; box-shadow: var(--shadow); margin-bottom: 16px; }
.filter-row { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
.filter-controls { margin-top: 16px; }
.filter-bar :deep(.el-radio-button__inner) { font-size: 15.5px; font-weight: 600; color: var(--ink); }
.filter-bar :deep(.el-input__inner) { font-size: 15.5px; color: var(--ink); }
.filter-bar :deep(.el-input__inner::placeholder) { color: var(--text-secondary); }
.filter-bar :deep(.el-select__selected-item) { font-size: 15.5px; color: var(--ink); }
.filter-bar :deep(.el-checkbox__label) { font-size: 15.5px; font-weight: 600; color: var(--ink); }
.empty { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.di-title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.di-title { font-size: 20px; font-weight: 700; color: var(--ink); }
.status-tag { font-size: 16px; height: auto; line-height: 1.4; padding: 2px 10px; }
.di-meta { font-size: 16px; color: var(--ink); }
@media (max-width: 600px) {
  .filter-controls { flex-direction: column; align-items: stretch; }
  .filter-controls .el-input, .filter-controls .el-select { width: 100% !important; }
}
</style>