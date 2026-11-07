<template>
  <div>
    <div class="page-title">{{ isRelist ? '重新发布需求' : '发布搭子需求' }}</div>
    <div class="page-sub">填写搭子需求信息，快速找到合适的搭子</div>

    <div class="card">
      <el-form :model="form" label-position="top">
        <el-form-item label="搭子类型" required>
          <div class="cat-select">
            <div v-for="c in CATEGORIES" :key="c.key" class="cat-option" :class="{ active: form.category === c.key }" @click="form.category = c.key">
              <div class="co-emoji">{{ c.emoji }}</div>
              <div class="co-label">{{ c.label }}</div>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="标题" required>
          <el-input v-model="form.title" maxlength="50" show-word-limit placeholder="一句话说清你要找什么搭子" />
        </el-form-item>

        <el-form-item label="补充说明">
          <el-input v-model="form.description" type="textarea" :autosize="{ minRows: 3, maxRows: 8 }" placeholder="补充时间、地点、具体要求等" />
        </el-form-item>

        <el-form-item required>
          <template #label>活动时间 <span class="label-sub">（活动开始前可一直招募直至满员）</span></template>
          <el-date-picker v-model="form.range" type="datetimerange" style="width:100%" start-placeholder="开始时间" end-placeholder="结束时间" value-format="YYYY-MM-DDTHH:mm:ss" />
        </el-form-item>

        <el-form-item>
          <template #label>锁定时间 <span class="label-note">（锁定后队长不可自由解散队伍或移除成员，成员不可自由退出）</span></template>
          <el-date-picker v-model="form.lock_time" type="datetime" style="width:100%" placeholder="默认为活动开始时间，可选择当前时间至活动开始时间之间的任意时间" value-format="YYYY-MM-DDTHH:mm:ss" @change="lockTouched = true" />
        </el-form-item>

        <el-form-item label="活动地点">
          <el-input v-model="form.location_name" placeholder="如：图书馆三楼、东区球场" />
        </el-form-item>

        <el-form-item label="需求人数（不包含自己）">
          <el-input-number v-model="form.need_count" :min="1" :max="10" />
        </el-form-item>

        <el-form-item label="相关标签">
          <el-select v-model="form.tags" multiple filterable allow-create default-first-option placeholder="选择或输入兴趣标签" style="width:100%">
            <el-option v-for="t in tagOptions" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-checkbox v-model="recurring">设为周期搭子（每周固定时段，长期有效）</el-checkbox>
        </el-form-item>

        <el-form-item v-if="recurring" label="周期说明">
          <el-input v-model="form.recurrence_note" placeholder="如：每周二、四晚固定自习" />
        </el-form-item>

        <div class="form-actions">
          <el-button type="primary" size="large" :loading="submitting" @click="submit">{{ isRelist ? '重新发布' : '发布需求' }}</el-button>
          <el-button size="large" @click="cancel">取消</el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api/index.js'
import { CATEGORIES, parseLocalTime } from '../utils.js'
import { useAuth } from '../store/auth.js'

const router = useRouter()
const route = useRoute()
const auth = useAuth()
const relistId = ref(route.query.relist ? Number(route.query.relist) : null)
const isRelist = computed(() => !!relistId.value)
const submitting = ref(false)
const recurring = ref(false)

const tagOptions = ['考研', '四六级', '编程', '数学建模', '前端', '后端', 'Python', '算法', '羽毛球', '篮球', '跑步', '健身', '王者荣耀', 'LOL', '原神', '摄影', '旅行', '电影', '桌游', '阅读', '探店', '火锅', '奶茶']

const form = reactive({
  category: 'study', title: '', description: '', range: null, lock_time: null, location_name: '', need_count: 2, tags: [], recurrence_note: ''
})

// 用户是否手动设置过锁定时间：未手动设置时锁定时间始终跟随活动开始时间变动，手动设置过一次后停止同步
const lockTouched = ref(false)

// 锁定时间默认等于活动开始时间（用户未手动设置时始终同步开始时间的改动）
watch(() => form.range, (v) => {
  if (v && v.length === 2 && !lockTouched.value) form.lock_time = v[0]
})

// 草稿持久化：离开/刷新不丢已填内容
const DRAFT_KEY = 'dazi_draft_demand'
function loadDraft() {
  try { const raw = localStorage.getItem(DRAFT_KEY); return raw ? JSON.parse(raw) : null } catch { return null }
}
const draft = relistId.value ? null : loadDraft() // 重新发布模式跳过草稿恢复，避免与预填的旧帖信息冲突
if (draft && draft.form) Object.assign(form, { ...form, ...draft.form })
if (draft && draft.form) lockTouched.value = !!draft.form.lock_time
if (draft && typeof draft.recurring === 'boolean') recurring.value = draft.recurring

// 从故事墙「发起同类组局」跳转时预填分类与标题（优先于草稿）
const q = route.query
if (q.category) form.category = String(q.category)
if (q.title) form.title = String(q.title)
if (q.tags) form.tags = String(q.tags).split(',').map((t) => t.trim()).filter(Boolean)
if (q.description) form.description = String(q.description)
if (q.need_count) form.need_count = Number(q.need_count)
if (q.location_name) form.location_name = String(q.location_name)

const catEmoji = computed(() => CATEGORIES.find((c) => c.key === form.category)?.emoji || '')

// 是否有实际填写的待发布内容
function hasContent() {
  return !!(form.title || form.description || form.location_name || form.tags.length || (form.range && form.range.length))
}

// 防抖保存草稿
let draftTimer = null
function scheduleSave() {
  if (relistId.value) return
  clearTimeout(draftTimer)
  draftTimer = setTimeout(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ form: JSON.parse(JSON.stringify(form)), recurring: recurring.value })) } catch {}
  }, 400)
}

// 发布成功后清除草稿，避免下次进入误恢复旧内容
function clearDraft() { localStorage.removeItem(DRAFT_KEY) }

// 发布成功后跳转不应触发「未发布离开」确认
let submitted = false

// 内容未提交时，路由离开弹确认
onBeforeRouteLeave((_to, _from, next) => {
  if (submitted || !hasContent()) return next()
  ElMessageBox.confirm('填写的需求尚未发布，确定离开吗？', '提示', { confirmButtonText: '离开', cancelButtonText: '继续填写', type: 'warning' })
    .then(() => next())
    .catch(() => next(false))
})

// 刷新/关闭标签页时浏览器原生拦截
function onBeforeUnload(e) {
  if (hasContent()) { e.preventDefault(); e.returnValue = '' }
}
onMounted(async () => {
  window.addEventListener('beforeunload', onBeforeUnload)
  if (relistId.value) await loadForRelist()
})
onBeforeUnmount(() => {
  clearTimeout(draftTimer)
  window.removeEventListener('beforeunload', onBeforeUnload)
})

watch([form, recurring], scheduleSave, { deep: true })

async function loadForRelist() {
  try {
    const res = await api.getDemand(relistId.value)
    const dm = res.demand
    if (!dm) throw new Error('需求不存在')
    if (dm.owner?.id !== auth.user?.id) throw new Error('无权重新发布该需求')
    form.category = dm.category
    form.title = dm.title
    form.description = dm.description || ''
    form.range = dm.activity_start && dm.activity_end ? [dm.activity_start, dm.activity_end] : null
    form.lock_time = dm.lock_time || null
    lockTouched.value = !!dm.lock_time
    form.location_name = dm.location_name || ''
    form.need_count = dm.need_count || 2
    form.tags = Array.isArray(dm.tags) ? dm.tags : []
    recurring.value = !!dm.recurrence
    form.recurrence_note = dm.recurrence?.note || ''
    clearDraft()
  } catch (e) {
    ElMessage.error(e.message)
    router.replace('/publish')
  }
}

function cancel() {
  if (relistId.value) submitted = true
  router.back()
}

async function submit() {
  if (!form.title) return ElMessage.warning('请填写标题')
  if (!form.range || form.range.length !== 2) return ElMessage.warning('请选择活动时间')
  const now = new Date()
  if (parseLocalTime(form.range[0]) <= now) return ElMessage.warning('活动开始时间需晚于当前时间')
  if (parseLocalTime(form.range[1]) <= now) return ElMessage.warning('活动结束时间需晚于当前时间')
  if (form.lock_time && parseLocalTime(form.lock_time) > parseLocalTime(form.range[0])) return ElMessage.warning('锁定时间不能晚于活动开始时间')
  if (form.lock_time && parseLocalTime(form.lock_time) <= now) return ElMessage.warning('锁定时间不能早于当前时间')
  submitting.value = true
  try {
    const payload = {
      category: form.category,
      title: form.title,
      description: form.description,
      activity_start: form.range[0],
      activity_end: form.range[1],
      lock_time: form.lock_time || form.range[0],
      location_name: form.location_name,
      need_count: form.need_count,
      tags: form.tags,
      recurrence: recurring.value ? { frequency: 'weekly', note: form.recurrence_note || '每周固定时段' } : null
    }
    const res = await api.createDemand(payload)
    clearDraft()
    submitted = true
    ElMessage.success(isRelist.value ? '重新发布成功' : '发布成功')
    router.push(`/demand/${res.demand.id}`)
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.form-actions { display: flex; gap: 8px; justify-content: center; margin-top: 8px; }
.cat-select { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; width: 100%; }
.cat-option { border: 1px solid var(--border); border-radius: 10px; padding: 14px; text-align: center; cursor: pointer; transition: all .15s; }
.cat-option:hover { border-color: var(--brand); }
.cat-option.active { border-color: var(--brand); background: var(--brand-soft); }
.co-emoji { font-size: 28px; }
.co-label { font-size: 16px; margin-top: 4px; color: var(--ink); font-weight: 700; }
@media (max-width: 768px) {
  .cat-select { grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .cat-option { padding: 10px; }
}
.page-title{font-size:30px}
.page-sub{font-size:18px;color:var(--ink)}
@media (max-width:768px){.page-title{font-size:22px}}
:deep(.el-form-item__label){font-size:18px;font-weight:700;color:var(--ink)}
.label-sub{font-size:15px;font-weight:400;color:var(--text-secondary)}
.label-note{font-size:15px;font-weight:500;color:var(--text-secondary)}
:deep(.el-input__inner){font-size:15px;color:var(--ink)}
:deep(.el-textarea__inner){font-size:15px;color:var(--ink)}
:deep(.el-select__selected-item){font-size:15px;color:var(--ink)}
:deep(.el-checkbox__label){font-size:15px;font-weight:600;color:var(--ink)}
:deep(.el-date-editor .el-input__inner){font-size:15px;color:var(--ink)}
.form-actions :deep(.el-button){font-size:16px;font-weight:700}
.co-label{font-size:17px;font-weight:700}
</style>