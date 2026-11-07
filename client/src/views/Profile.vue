<template>
  <div>
    <div class="page-title">我的画像</div>
    <div class="page-sub">完善画像能显著提升匹配精准度，五维引擎中兴趣标签与空闲时段权重最高</div>

    <div class="card ani-fade-in-up">
      <el-form :model="form" label-position="top">
        <div class="avatar-box">
          <el-avatar :size="84" :src="form.avatar || undefined" class="a-a"><span class="a-a-fallback">{{ (form.nickname || '我').slice(0, 1) }}</span></el-avatar>
          <div class="a-a-actions">
            <el-button @click="fileEl.click()">更换头像</el-button>
            <div class="text-muted" style="font-size:16px; color: var(--text-secondary)">支持 JPG / PNG，不超过 1MB</div>
          </div>
          <input ref="fileEl" type="file" accept="image/*" hidden @change="onPickAvatar">
        </div>

        <div class="form-grid">
          <el-form-item label="昵称">
            <el-input v-model="form.nickname" maxlength="20" />
          </el-form-item>
          <el-form-item label="消费偏好">
            <el-select v-model="form.consumption_level" placeholder="选择档位" style="width:100%">
              <el-option v-for="c in CONSUMPTION_LEVELS" :key="c" :label="c" :value="c" />
            </el-select>
          </el-form-item>
          <el-form-item label="学校 / 学院">
            <el-input v-model="form.college" placeholder="如：计算机学院" />
          </el-form-item>
          <el-form-item label="年级">
            <el-input v-model="form.grade" placeholder="如：大三" />
          </el-form-item>
        </div>

        <el-form-item label="个人简介">
          <el-input v-model="form.bio" type="textarea" :autosize="{ minRows: 3, maxRows: 5 }" placeholder="一句话介绍自己，让搭子更了解你" maxlength="140" show-word-limit />
        </el-form-item>

        <el-form-item label="兴趣标签">
          <el-select v-model="form.tags" multiple filterable allow-create default-first-option placeholder="选择或输入兴趣标签" style="width:100%" class="tag-select" :teleported="false">
            <el-option v-for="t in tagOptions" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>

        <el-form-item label="每周空闲时段">
          <div class="slot-list">
            <div v-for="(s, i) in form.free_slots" :key="i" class="slot-row">
              <el-select v-model="s.day" style="width:88px">
                <el-option v-for="(w, d) in WEEKDAYS" :key="d" :label="w" :value="d" />
              </el-select>
              <el-time-picker v-model="s.start" value-format="HH:mm" format="HH:mm" placeholder="开始" style="flex:1 1 0; min-width:0" class="slot-tp" />
              <span class="text-muted">—</span>
              <el-time-picker v-model="s.end" value-format="HH:mm" format="HH:mm" placeholder="结束" style="flex:1 1 0; min-width:0" class="slot-tp" />
              <el-button text type="danger" class="slot-del" @click="form.free_slots.splice(i, 1)"><el-icon><Delete /></el-icon></el-button>
            </div>
          </div>
          <el-button size="small" @click="addSlot">+ 添加时段</el-button>
          <div class="timetable mt-16" @mouseleave="ttUp">
            <div class="tt-head">
              <div class="tt-corner">时段</div>
              <div v-for="(w, d) in WEEKDAYS" :key="d" class="tt-day">{{ w }}</div>
            </div>
            <div v-for="h in hours" :key="h" class="tt-row">
              <div class="tt-hour">{{ h }}:00</div>
              <div
                v-for="d in 7"
                :key="d"
                class="tt-cell"
                :class="{ active: slotActive(d - 1, h) }"
                @mousedown.prevent="ttDown(d - 1, h)"
                @mousemove="ttMove(d - 1, h)"
              ></div>
            </div>
          </div>
          <div class="text-muted tt-tip">可直接点击时间框，或按住鼠标滑动选择连续空闲时段，上方时段列表将自动同步；点击已选中的格子可移除对应时段</div>
        </el-form-item>

        <div class="save-row">
          <el-button type="primary" size="large" :loading="saving" @click="save">保存画像</el-button>
        </div>
      </el-form>
    </div>

    <div class="card ani-fade-in-up" style="animation-delay: 80ms">
      <div class="flex-between">
        <div class="sec-title">学生认证 🎓</div>
        <el-tag v-if="verify.verified" type="success" effect="plain">已认证</el-tag>
        <el-tag v-else-if="verify.pending" type="warning" effect="plain">审核中</el-tag>
        <el-tag v-else type="info" effect="plain">未认证</el-tag>
      </div>
      <p class="text-muted mt-8 verify-desc">填写姓名、学号、专业，并上传学生证正面照，经管理员人工审核通过后获得「认证学生」身份标识，提升匹配信任度与推荐权重。</p>
      <template v-if="verify.verified">
        <el-alert type="success" :closable="false" title="你已通过学生认证" show-icon class="mt-8" />
      </template>
      <template v-else-if="verify.pending">
        <el-alert type="info" :closable="false" title="认证申请审核中，请耐心等待" show-icon class="mt-8" />
      </template>
      <template v-else>
        <div class="verify-form mt-8">
          <el-input v-model="verifyForm.real_name" placeholder="姓名" maxlength="20" />
          <el-input v-model="verifyForm.student_id" placeholder="学号" maxlength="30" />
          <el-input v-model="verifyForm.major" placeholder="专业（如：计算机科学与技术）" maxlength="40" />
          <div class="verify-photo">
            <input ref="photoEl" type="file" accept="image/*" hidden @change="onPickPhoto">
            <el-button @click="photoEl.click()">上传学生证正面照</el-button>
            <div v-if="verifyForm.photo" class="photo-wrap">
              <el-image :src="verifyForm.photo" :preview-src-list="[verifyForm.photo]" fit="cover" class="photo-preview" preview-teleported />
              <span class="photo-remove" title="取消上传" @click.stop="removePhoto">×</span>
            </div>
            <span v-else class="text-muted photo-hint">尚未上传</span>
          </div>
          <el-button type="primary" :loading="verifySubmitting" @click="submitVerify">提交核验</el-button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import api from '../api/index.js'
import { useAuth } from '../store/auth.js'
import { CONSUMPTION_LEVELS } from '../utils.js'

const auth = useAuth()
const saving = ref(false)
const fileEl = ref(null)
const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const tagOptions = ['考研', '四六级', '编程', '数学建模', '前端', '后端', 'Python', '算法', '羽毛球', '篮球', '跑步', '健身', '王者荣耀', 'LOL', '原神', '摄影', '旅行', '电影', '桌游', '阅读', '探店', '火锅', '奶茶']

const form = reactive({
  nickname: '', college: '', grade: '', bio: '', tags: [], consumption_level: '', free_slots: [], avatar: ''
})

const verify = reactive({ verified: false, pending: false })
const verifyForm = reactive({ real_name: '', student_id: '', major: '', photo: '' })
const verifySubmitting = ref(false)
const photoEl = ref(null)

function loadVerifyStatus() {
  api.verifyStatus().then((r) => {
    verify.verified = !!r.verified
    verify.pending = r.verification?.status === 'pending'
  }).catch(() => {})
}

async function submitVerify() {
  if (!verifyForm.real_name.trim()) return ElMessage.warning('请填写姓名')
  if (!verifyForm.student_id.trim()) return ElMessage.warning('请填写学号')
  if (!verifyForm.major.trim()) return ElMessage.warning('请填写专业')
  if (!verifyForm.photo) return ElMessage.warning('请上传学生证正面照')
  verifySubmitting.value = true
  try {
    await api.verifyStudentSubmit({
      real_name: verifyForm.real_name,
      student_id: verifyForm.student_id,
      major: verifyForm.major,
      photo: verifyForm.photo
    })
    ElMessage.success('提交成功，等待管理员审核')
    loadVerifyStatus()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    verifySubmitting.value = false
  }
}

function onPickPhoto(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (!f) return
  if (!f.type.startsWith('image/')) return ElMessage.warning('请选择图片文件')
  if (f.size > 1024 * 1024) return ElMessage.warning('学生证照片不能超过 1MB')
  const reader = new FileReader()
  reader.onload = () => { verifyForm.photo = reader.result }
  reader.readAsDataURL(f)
}

function removePhoto() {
  verifyForm.photo = ''
}

onMounted(() => {
  const u = auth.user || {}
  form.nickname = u.nickname || ''
  form.college = u.college || ''
  form.grade = u.grade || ''
  form.bio = u.bio || ''
  form.tags = u.tags ? [...u.tags] : []
  form.consumption_level = u.consumption_level || ''
  form.free_slots = (u.free_slots || []).map((s) => ({ ...s }))
  form.avatar = u.avatar || ''
  loadVerifyStatus()
  window.addEventListener('mouseup', ttUp)
})

onBeforeUnmount(() => {
  window.removeEventListener('mouseup', ttUp)
})

async function onPickAvatar(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (!f) return
  if (f.size > 1024 * 1024) return ElMessage.warning('头像图片不能超过 1MB')
  const reader = new FileReader()
  reader.onload = async () => {
    try {
      await api.updateProfile({ avatar: reader.result })
      await auth.refresh()
      form.avatar = reader.result
      ElMessage.success('头像已更新')
    } catch (err) {
      ElMessage.error(err.message)
    }
  }
  reader.readAsDataURL(f)
}

function addSlot() {
  form.free_slots.push({ day: 0, start: '19:00', end: '21:00' })
}

// 课表热区：时间槽 8:00–22:00（14 个小时块）
const hours = Array.from({ length: 14 }, (_, i) => 8 + i)
function slotActive(day, hour) {
  return form.free_slots.some((s) => {
    if (Number(s.day) !== day) return false
    if (!s.start || !s.end) return false
    const sh = parseInt(String(s.start).split(':')[0], 10)
    let eh = parseInt(String(s.end).split(':')[0], 10)
    if (Number.isNaN(sh) || Number.isNaN(eh)) return false
    if (eh <= sh) eh += 24
    return hour >= sh && hour < eh
  })
}

// ---- 点击 / 滑动选择连续空闲时段 ----
// 按下起点格后拖动，松手按「起点~当前格」区间重建该天时段；起点为已激活格则进入擦除模式
const drag = ref(null)
const padH = (h) => `${String(h).padStart(2, '0')}:00`

function ttDown(d, h) {
  drag.value = { d, from: h, mode: slotActive(d, h) ? 'erase' : 'add', lastKey: null }
  ttApply(d, h)
}
function ttMove(d, h) {
  if (!drag.value || drag.value.d !== d) return
  ttApply(d, h)
}
function ttUp() {
  drag.value = null
}
function ttApply(d, h) {
  const g = drag.value
  if (!g || g.d !== d) return
  const a = Math.min(g.from, h)
  const b = Math.max(g.from, h)
  const key = `${a}-${b}`
  if (g.lastKey === key) return
  g.lastKey = key
  // 现有该天的激活小时集合；跨天时段（如 22:00-02:00）不参与拆解，原样保留
  const set = new Set()
  const keepCross = []
  const others = []
  for (const s of form.free_slots) {
    if (Number(s.day) !== d) { others.push(s); continue }
    const sh = parseInt(String(s.start).split(':')[0], 10)
    let eh = parseInt(String(s.end).split(':')[0], 10)
    if (Number.isNaN(sh) || Number.isNaN(eh)) { others.push(s); continue }
    if (eh <= sh) { keepCross.push(s); continue }
    for (let x = sh; x < eh; x++) set.add(x)
  }
  for (let x = a; x <= b; x++) {
    if (g.mode === 'add') set.add(x)
    else set.delete(x)
  }
  // 按小时连续性压缩为时段
  const hrs = [...set].sort((x, y) => x - y)
  const segs = []
  for (const x of hrs) {
    const last = segs[segs.length - 1]
    if (last && x === last.end) last.end = x + 1
    else segs.push({ start: x, end: x + 1 })
  }
  form.free_slots = [...others, ...keepCross, ...segs.map((s) => ({ day: d, start: padH(s.start), end: padH(s.end) }))]
}

async function save() {
  saving.value = true
  try {
    await api.updateProfile({
      nickname: form.nickname,
      college: form.college,
      grade: form.grade,
      bio: form.bio,
      tags: form.tags,
      consumption_level: form.consumption_level,
      free_slots: form.free_slots.filter((s) => s.start && s.end)
    })
    await auth.refresh()
    ElMessage.success('画像已保存')
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.avatar-box { display: flex; flex-direction: column; align-items: center; gap: 12px; margin-bottom: 20px; padding: 20px; background: var(--surface); border-radius: 12px; }
.a-a { background: var(--brand); color: #fff; font-size: 30px; font-weight: 700; }
.a-a-fallback { font-size: 30px; font-weight: 700; }
.a-a-actions { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.save-row { display: flex; justify-content: center; margin-top: 8px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
@media (max-width: 700px) { .form-grid { grid-template-columns: 1fr; } }
.slot-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; width: 100%; }
@media (max-width: 900px) { .slot-list { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 600px) { .slot-list { grid-template-columns: 1fr; } }
.slot-row { display: flex; align-items: center; gap: 6px; min-width: 0; }
.slot-row .slot-del { flex-shrink: 0; }
.slot-tp { flex: 1 1 0; min-width: 0; }
.slot-tp :deep(.el-input__wrapper) { width: 100%; }
.timetable { width: 100%; user-select: none; }
.tt-head { display: grid; grid-template-columns: 56px repeat(7, 1fr); gap: 3px; margin-bottom: 3px; }
.tt-corner { font-size: 14px; color: var(--text-secondary); font-weight: 600; }
.tt-day { font-size: 14px; color: var(--ink); font-weight: 600; text-align: center; }
.tt-row { display: grid; grid-template-columns: 56px repeat(7, 1fr); gap: 3px; margin-bottom: 3px; }
.tt-hour { font-size: 14px; color: var(--text-secondary); line-height: 18px; }
.tt-cell { height: 18px; background: var(--surface-muted); border-radius: 4px; cursor: pointer; transition: background .12s; }
.tt-cell:hover { background: var(--surface); }
.tt-cell.active { background: var(--brand); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.25); }
.tt-cell.active:hover { background: var(--brand); filter: brightness(1.08); }
.tt-tip { margin-top: 8px; font-size: 14px; }
.verify-form { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-start; }
.verify-form .el-input { width: 200px; }
.verify-photo { display: flex; align-items: center; gap: 8px; }
.photo-preview { width: 56px; height: 56px; border-radius: 8px; border: 1px solid var(--border); object-fit: cover; cursor: zoom-in; }
.photo-wrap { position: relative; display: inline-flex; }
.photo-remove { position: absolute; top: -6px; right: -6px; width: 18px; height: 18px; line-height: 17px; text-align: center; background: rgba(0,0,0,.62); color: #fff; border-radius: 50%; font-size: 13px; cursor: pointer; opacity: 0; transition: opacity .15s; z-index: 2; }
.photo-wrap:hover .photo-remove { opacity: 1; }
.photo-hint { font-size: 15px; }
.verify-desc { font-size: 16px; }
.sec-title { font-size: 20px; font-weight: 700; }
.el-form :deep(.el-form-item__label) { font-size: 17px; color: var(--ink); font-weight: 600; }
.el-form :deep(.el-input__inner) { font-size: 17px; color: var(--ink); }
.el-form :deep(.el-textarea__inner) { font-size: 17px; color: var(--ink); }
.el-form :deep(.el-select__selected-item) { font-size: 17px; color: var(--ink); }
.tag-select :deep(.el-tag) { font-size: 16px; color: var(--ink); font-weight: 500; height: 28px; }
.tag-select :deep(.el-tag .el-tag__content) { font-size: 16px; color: var(--ink); }
.tag-select :deep(.el-select__placeholder) { color: var(--text-secondary); font-size: 16px; }
.tag-select :deep(.el-select-dropdown__item) { font-size: 16.5px; color: var(--ink); }
</style>