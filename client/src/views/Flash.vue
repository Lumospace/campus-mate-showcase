<template>
  <div>
    <div class="bar">
      <div>
        <div class="page-title">快闪组局 ⚡</div>
        <div class="page-sub">临时起意的短局，一键发布、秒级集结，适合即兴约饭/约球/开黑</div>
      </div>
      <el-button type="primary" class="create-btn" @click="openCreate">发起快闪</el-button>
    </div>

    <div v-if="flashes.length || keyword || categoryFilter" class="filter-bar">
      <el-input v-model="keyword" placeholder="搜索标题 / 地点" clearable size="large" style="width: 280px" :prefix-icon="Search" />
      <el-select v-model="categoryFilter" clearable placeholder="全部类型" size="large" style="width: 200px">
        <el-option v-for="c in CATEGORIES" :key="c.key" :label="`${c.emoji} ${c.label}`" :value="c.key" />
      </el-select>
    </div>

    <div v-if="loading" class="skeleton-list">
      <div class="flash-grid" style="margin-top:12px">
        <div v-for="i in 4" :key="i" class="card flash-card" style="cursor:default; pointer-events:none">
          <div class="fc-top">
            <div class="skeleton" style="width:40px; height:40px; border-radius:10px; flex-shrink:0"></div>
            <div class="fc-body">
              <div class="skeleton skeleton-title"></div>
              <div class="skeleton skeleton-text short"></div>
            </div>
          </div>
          <div style="display:flex; gap:10px">
            <div class="skeleton" style="width:100px; height:20px; border-radius:6px"></div>
            <div class="skeleton" style="width:80px; height:20px; border-radius:6px"></div>
            <div class="skeleton" style="width:90px; height:20px; border-radius:6px"></div>
          </div>
          <div class="fc-bottom">
            <div style="display:flex; gap:6px">
              <div class="skeleton" style="width:28px; height:28px; border-radius:50%"></div>
              <div class="skeleton" style="width:28px; height:28px; border-radius:50%"></div>
              <div class="skeleton" style="width:60px; height:24px; border-radius:6px"></div>
            </div>
            <div class="skeleton" style="width:80px; height:32px; border-radius:8px"></div>
          </div>
        </div>
      </div>
    </div>

    <template v-else>
      <div v-if="!flashes.length" class="empty" style="padding:32px 0">
        <p>当前没有进行中的快闪，来发一局吧</p>
      </div>
      <div v-else class="flash-grid stagger-enter">
        <div v-for="f in filteredFlashes" :key="f.id" class="card flash-card ani-fade-in-up">
          <div class="fc-top">
            <span class="fc-emoji">{{ f.category_emoji }}</span>
            <div class="fc-body">
              <div class="fc-title">{{ f.title }}</div>
              <div class="fc-meta text-muted">
                {{ f.category_label }} · {{ f.owner?.nickname }}
              </div>
            </div>
            <el-tag v-if="f.joined" size="small" type="success" effect="plain">已加入</el-tag>
          </div>
          <div class="fc-info">
            <span>🕐 {{ fmtTime(f.start_time) || '时间待定' }}</span>
            <span v-if="f.duration_minutes">⏱ {{ f.duration_minutes }} 分钟</span>
            <span v-if="f.location_name">📍 {{ f.location_name }}</span>
          </div>
          <div class="fc-bottom">
            <div class="fc-members">
              <el-avatar v-for="m in f.members" :key="m.id" :size="24" :src="m.avatar || undefined" style="background: var(--brand); font-size:13px" :title="m.nickname">{{ m.nickname.slice(0, 1) }}</el-avatar>
              <span class="text-muted" style="font-size:15.5px; color: var(--ink)">{{ f.members.length - 1 }} / {{ f.need_count }}</span>
            </div>
            <div class="fc-actions">
              <el-button v-if="!f.joined" size="small" type="primary" @click="join(f)">立即加入</el-button>
              <el-button v-else size="small" type="info" plain disabled>已加入</el-button>
              <el-button v-if="isOwner(f) || auth.user?.is_admin" size="small" text type="danger" @click="close(f)">关闭</el-button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <el-dialog v-model="createOpen" title="发起快闪组局（仅支持当日开始的活动）" width="480px">
      <el-form :model="form" label-position="top">
        <el-form-item label="标题" required>
          <el-input v-model="form.title" maxlength="30" placeholder="如：图书馆一楼拼座 1.5h" />
        </el-form-item>
        <el-form-item label="类型" required>
          <el-select v-model="form.category" style="width:100%">
            <el-option v-for="c in CATEGORIES" :key="c.key" :label="`${c.emoji} ${c.label}`" :value="c.key" />
          </el-select>
        </el-form-item>
        <div class="form-grid">
          <el-form-item label="地点">
            <el-input v-model="form.location_name" placeholder="选填" />
          </el-form-item>
          <el-form-item label="时长（分钟）">
            <el-input-number v-model="form.duration_minutes" :min="15" :max="480" :step="15" style="width:100%" />
          </el-form-item>
        </div>
        <div class="form-grid">
          <el-form-item label="活动开始时间">
            <el-date-picker v-model="form.start_time" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" :disabled-date="disabledDate" placeholder="选填，越快越好" style="width:100%" />
          </el-form-item>
          <el-form-item label="招募截止时间">
            <el-date-picker v-model="form.recruit_deadline" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" placeholder="选填，默认全天招募" style="width:100%" @change="deadlineTouched = true" />
          </el-form-item>
        </div>
        <div class="form-grid">
          <el-form-item label="需求人数（不包含自己）" required>
            <el-input-number v-model="form.need_count" :min="1" :max="10" style="width:100%" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="createOpen = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">发布</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import api from '../api/index.js'
import { CATEGORIES, fmtTime, parseLocalTime } from '../utils.js'
import { useAuth } from '../store/auth.js'

const auth = useAuth()
const flashes = ref([])
const loading = ref(true)
const createOpen = ref(false)
const submitting = ref(false)

const form = reactive({
  title: '', category: 'meal', location_name: '', duration_minutes: 60, need_count: 1, start_time: null, recruit_deadline: null
})

// 用户是否手动设置过招募截止时间：未手动设置时截止时间始终跟随活动开始时间变动，手动设置过一次后停止同步
const deadlineTouched = ref(false)

// 招募截止时间默认等于活动开始时间（用户未手动设置时始终同步开始时间的改动）
watch(() => form.start_time, (v) => {
  if (v && !deadlineTouched.value) form.recruit_deadline = v
})

// 活动开始时间仅支持当日
function disabledDate(date) {
  const t = new Date()
  return date.getFullYear() !== t.getFullYear() || date.getMonth() !== t.getMonth() || date.getDate() !== t.getDate()
}

const keyword = ref('')
const categoryFilter = ref('')
const filteredFlashes = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return flashes.value.filter((f) => {
    if (categoryFilter.value && f.category !== categoryFilter.value) return false
    if (kw && !`${f.title} ${f.location_name || ''}`.toLowerCase().includes(kw)) return false
    return true
  })
})

function isOwner(f) {
  return f.owner?.id === auth.user?.id
}

async function load() {
  loading.value = true
  try {
    const res = await api.flashes()
    flashes.value = res.flashes || []
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  Object.assign(form, { title: '', category: 'meal', location_name: '', duration_minutes: 60, need_count: 1, start_time: null, recruit_deadline: null })
  deadlineTouched.value = false
  createOpen.value = true
}

async function submit() {
  if (!form.title.trim()) return ElMessage.warning('请填写标题')
  const now = new Date()
  if (form.start_time && parseLocalTime(form.start_time) <= now) return ElMessage.warning('活动开始时间需晚于当前时间')
  if (form.recruit_deadline && parseLocalTime(form.recruit_deadline) <= now) return ElMessage.warning('招募截止时间需晚于当前时间')
  if (form.start_time && form.recruit_deadline && parseLocalTime(form.recruit_deadline) > parseLocalTime(form.start_time)) return ElMessage.warning('招募截止时间不能晚于活动开始时间')
  submitting.value = true
  try {
    await api.createFlash({
      title: form.title,
      category: form.category,
      location_name: form.location_name,
      duration_minutes: form.duration_minutes,
      need_count: form.need_count,
      start_time: form.start_time,
      recruit_deadline: form.recruit_deadline
    })
    ElMessage.success('快闪已发布')
    createOpen.value = false
    load()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    submitting.value = false
  }
}

async function join(f) {
  try {
    await api.joinFlash(f.id)
    ElMessage.success('已加入，记得按约定碰头哦')
    load()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function close(f) {
  const isOwner = f.owner?.id === auth.user?.id
  try {
    if (!isOwner) {
      // 管理员关闭：必须填写缘由，同步告知发起人
      const { value } = await ElMessageBox.prompt('请填写关闭缘由（将同步告知发起人）', '关闭快闪', {
        confirmButtonText: '确认关闭',
        cancelButtonText: '取消',
        inputValidator: (v) => (v && v.trim() ? true : '请填写缘由'),
        inputErrorMessage: '请填写缘由'
      }).catch(() => ({}))
      if (!value) return
      await api.closeFlash(f.id, value.trim())
    } else {
      await api.closeFlash(f.id)
    }
    ElMessage.success('已关闭')
    load()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

onMounted(load)
</script>

<style scoped>
.bar { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-bottom: 24px; }
.page-sub { margin-bottom: 0; }
.create-btn { font-size: 17px; font-weight: 700; }
.filter-bar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; background: linear-gradient(135deg, #eaf5f0 0%, #eef4ff 100%); border: 1px solid #cfe9de; border-radius: var(--radius); padding: 14px 18px; margin-top: 12px; }
.filter-bar :deep(.el-input__inner) { font-size: 15.5px; font-weight: 600; color: var(--ink); }
.filter-bar :deep(.el-input__inner::placeholder) { color: var(--text-secondary); }
.filter-bar :deep(.el-select__selected-item) { font-size: 15.5px; font-weight: 600; color: var(--ink); }
.flash-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 12px; }
@media (max-width: 700px) { .flash-grid { grid-template-columns: 1fr; } }
.flash-card { margin-top: 0; display: flex; flex-direction: column; gap: 12px; }
.fc-top { display: flex; gap: 12px; align-items: center; }
.fc-emoji { font-size: 30px; }
.fc-body { flex: 1; min-width: 0; }
.fc-title { font-weight: 700; font-size: 20px; }
.fc-meta { font-size: 15.5px; margin-top: 3px; }
.fc-info { display: flex; flex-wrap: wrap; gap: 10px; font-size: 16px; color: var(--ink); }
.fc-bottom { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.fc-members { display: flex; align-items: center; gap: 6px; }
.fc-members .el-avatar { margin-right: -4px; border: 2px solid #fff; }
.fc-actions { display: flex; align-items: center; gap: 4px; }
.fc-actions :deep(.el-button) { font-size: 15px; font-weight: 600; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
@media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
:deep(.el-dialog__title) { font-size: 20px; font-weight: 700; color: var(--ink); }
:deep(.el-form-item__label) { font-size: 15.5px; font-weight: 600; color: var(--ink); }
:deep(.el-input__inner) { font-size: 15px; color: var(--ink); }
:deep(.el-select__selected-item) { font-size: 15px; color: var(--ink); }
.page-title{font-size:30px}.page-sub{color:var(--ink);font-size:18px}.empty{color:var(--ink)}.empty p{font-size:18px}.text-muted{color:var(--text-secondary)}</style>