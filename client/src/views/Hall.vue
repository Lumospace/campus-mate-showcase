<template>
  <div>
    <div class="hall-title-row">
      <div class="page-title">需求大厅</div>
      <div class="publish-entry" role="button" tabindex="0" title="发布新需求" @click="$router.push('/publish')" @keydown.enter="$router.push('/publish')">
        <span class="publish-plus"><el-icon><Plus /></el-icon></span>
        <span class="publish-label">发布</span>
      </div>
    </div>
    <div class="hall-sub">
      <div class="page-sub">按分类、关键词、状态筛选，找最合适的搭子</div>
      <el-button class="my-demands-btn" @click="$router.push('/my-demands')">我发布的需求</el-button>
    </div>

    <div class="filter-bar">
      <div class="filter-row">
        <el-radio-group v-model="query.category" size="large" @change="load">
          <el-radio-button label="">全部</el-radio-button>
          <el-radio-button v-for="c in CATEGORIES" :key="c.key" :label="c.key">{{ c.label }}</el-radio-button>
        </el-radio-group>
      </div>
      <div class="filter-row filter-controls">
        <el-input v-model="query.keyword" placeholder="搜索标题 / 内容关键词" clearable size="large" style="width: 320px" :prefix-icon="Search" @keyup.enter="load" @clear="load" />
        <el-select v-model="query.status" placeholder="状态" clearable size="large" style="width: 160px" @change="onStatusChange">
          <el-option label="招募中" value="recruiting" />
          <el-option label="已匹配" value="matched" />
          <el-option label="已过期" value="expired" />
        </el-select>
        <el-select v-model="query.sort" placeholder="排序" size="large" style="width: 170px" @change="load">
          <el-option label="默认排序" value="default" />
          <el-option label="最新发布" value="new" />
          <el-option label="活动时间" value="time" />
          <el-option label="缺口最多" value="need" />
        </el-select>
        <el-checkbox v-model="query.verifiedOnly" @change="load">已认证</el-checkbox>
        <el-checkbox v-model="onlyCircle">同兴趣圈</el-checkbox>
        <el-checkbox v-if="query.status !== 'expired'" v-model="onlyUnlocked" @change="onUnlockedToggle">未锁定</el-checkbox>
        <el-checkbox v-model="onlyRecurring">周期搭子</el-checkbox>
      </div>
    </div>

    <div v-if="loading" class="skeleton-list" style="margin-top:16px">
      <div v-for="i in 5" :key="i" class="demand-item" style="cursor:default; pointer-events:none; position:relative">
        <div class="skeleton" style="width:54px; height:54px; border-radius:12px; flex-shrink:0"></div>
        <div class="di-body" style="padding-right:0">
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-text" style="width:85%"></div>
          <div style="display:flex; gap:8px; margin-top:10px">
            <div class="skeleton" style="width:50px; height:24px; border-radius:999px"></div>
            <div class="skeleton" style="width:65px; height:24px; border-radius:999px"></div>
            <div class="skeleton" style="width:55px; height:24px; border-radius:999px"></div>
          </div>
        </div>
      </div>
    </div>
    <div v-else-if="!shownList.length" class="empty"><el-icon><MessageBox /></el-icon><p>没有找到匹配的需求</p></div>

    <div v-else class="stagger-enter">
      <div v-for="d in shownList" :key="d.id" class="demand-item ani-fade-in-up" role="button" tabindex="0" @click="$router.push(`/demand/${d.id}`)" @keydown.enter="$router.push(`/demand/${d.id}`)">
        <div class="di-emoji">{{ d.category_emoji }}</div>
        <div class="di-body">
          <div class="di-title-row"><div class="di-title">{{ d.title }}</div><el-tag size="small" :type="STATUS_TYPE[d.status]" class="status-tag">{{ STATUS_LABEL[d.status] }}</el-tag><el-tag v-if="d.circle_match" size="small" type="success" effect="plain" class="status-tag">同好</el-tag><el-tag v-if="isLocked(d)" size="small" type="info" effect="plain" class="status-tag">已锁定</el-tag></div><div class="di-meta">
            <span>🕐 {{ fmtTime(d.activity_start) }}</span>
            <span>📍 {{ d.location_name }}</span>
            <span>👥 {{ d.applicant_count }}/{{ d.need_count }} 人</span>
          </div>
          <div class="di-tags">
            <el-tag v-for="t in d.tags" :key="t" size="small" effect="plain">{{ t }}</el-tag>
            <el-tag v-if="d.recurrence" size="small" type="warning" effect="plain">🔁 周期搭子</el-tag>
          </div>
        </div>
        <div class="di-side">
          <span v-if="d.owner?.student_verified" class="auth-badge">✓ 学生认证</span>
          <span class="owner-nickname">{{ d.owner?.nickname }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, MessageBox, Plus } from '@element-plus/icons-vue'
import api from '../api/index.js'
import { CATEGORIES, STATUS_LABEL, STATUS_TYPE, fmtTime, parseLocalTime } from '../utils.js'
import { saveHallFilters, getHallFilters } from '../store/hall.js'

const list = ref([])
const loading = ref(true)
const onlyCircle = ref(false)
const onlyUnlocked = ref(false)
const onlyRecurring = ref(false)
const query = reactive({ category: '', keyword: '', status: '', sort: 'default', verifiedOnly: false })
const shownList = computed(() => {
  let out = list.value
  if (onlyCircle.value) out = out.filter((d) => d.circle_match)
  if (onlyRecurring.value) out = out.filter((d) => d.recurrence)
  return out
})

// 已锁定：进行中（招募中/已匹配）且已过锁定时间（lock_time 为本地时间字符串）
function isLocked(d) {
  return (d.status === 'recruiting' || d.status === 'matched') && !!d.lock_time && parseLocalTime(d.lock_time) <= new Date()
}

// 筛选状态缓存：SPA 返回大厅时恢复（组件重新挂载不丢失）；页面刷新/重登时模块重载自动重置
function saveFilters() {
  saveHallFilters({ query: { ...query }, onlyCircle: onlyCircle.value, onlyUnlocked: onlyUnlocked.value, onlyRecurring: onlyRecurring.value })
}
function restoreFilters() {
  const saved = getHallFilters()
  if (!saved) return
  if (saved.query) Object.assign(query, saved.query)
  onlyCircle.value = !!saved.onlyCircle
  onlyUnlocked.value = !!saved.onlyUnlocked
  onlyRecurring.value = !!saved.onlyRecurring
}
watch([query, onlyCircle, onlyUnlocked, onlyRecurring], saveFilters, { deep: true })

function onUnlockedToggle() {
  load()
}

function onStatusChange() {
  if (query.status === 'expired') onlyUnlocked.value = false
  load()
}

let loadSeq = 0
async function load() {
  const seq = ++loadSeq
  loading.value = true
  try {
    const params = {}
    if (query.category) params.category = query.category
    if (query.keyword) params.keyword = query.keyword
    if (query.status) params.status = query.status
    if (query.sort) params.sort = query.sort
    if (query.verifiedOnly) params.verified_only = '1'
    if (onlyUnlocked.value) params.unlocked = '1'
    const res = await api.listDemands(params)
    if (seq !== loadSeq) return
    list.value = res.demands || []
  } catch (e) {
    if (seq === loadSeq) ElMessage.error(e.message)
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}
onMounted(() => { restoreFilters(); load() })
</script>

<style scoped>
.filter-bar { background: linear-gradient(135deg, #eaf5f0 0%, #eef4ff 100%); border: 1px solid #cfe9de; border-radius: var(--radius); padding: 20px 24px; box-shadow: var(--shadow); }
.filter-row { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
.filter-controls { margin-top: 16px; }
.auth-badge { font-size: 16px; color: #0b5c40; background: #cfeede; padding: 3px 10px; border-radius: 6px; font-weight: 700; }
.demand-item{position:relative}.demand-item .di-side{position:absolute;top:14px;right:18px;bottom:12px;display:flex;flex-direction:column;align-items:flex-end;pointer-events:none}.demand-item .di-body{padding-right:128px}.owner-nickname{font-size:18px;font-weight:700;color:var(--ink);margin-top:auto}
.page-title{font-size:30px;margin:0}
.hall-title-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.publish-entry{display:flex;align-items:center;gap:8px;cursor:pointer;border-radius:999px;padding:3px 14px 3px 3px;transition:background .2s}
.publish-entry:hover{background:var(--surface)}
.publish-plus{width:34px;height:34px;border-radius:50%;background:var(--brand);color:#fff;display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0}
.publish-label{font-size:20px;font-weight:700;color:var(--brand)}
.page-sub{font-size:18px;color:var(--ink);margin-bottom:0}
.hall-sub{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px}
.my-demands-btn{font-size:16px;font-weight:700}
.empty{font-size:17px;color:var(--text-secondary)}
.demand-item .di-title{font-size:20px;color:var(--ink)}
.demand-item .di-meta{font-size:16px;color:var(--ink)}
.demand-item .di-tags .el-tag{font-size:15px;color:var(--ink)}
.demand-item .badge-teal{font-size:20px;margin-right:-13px}
.demand-item .text-muted{color:var(--text-secondary)}
.demand-item .di-title-row{display:flex;align-items:center;gap:8px}.demand-item .status-tag{font-size:20px;height:auto;line-height:1.4;padding:2px 12px}.filter-bar :deep(.el-radio-button__inner){font-size:15.5px;font-weight:600;color:var(--ink)}.filter-bar :deep(.el-input__inner){font-size:15.5px;color:var(--ink)}.filter-bar :deep(.el-input__inner::placeholder){color:var(--text-secondary)}.filter-bar :deep(.el-select__selected-item){font-size:15.5px;color:var(--ink)}.filter-bar :deep(.el-checkbox__label){font-size:15.5px;font-weight:600;color:var(--ink)}@media (max-width:768px){.page-title{font-size:22px}}
@media (max-width:600px){.filter-controls{flex-direction:column;align-items:stretch}.filter-controls .el-input,.filter-controls .el-select{width:100% !important}}
</style>