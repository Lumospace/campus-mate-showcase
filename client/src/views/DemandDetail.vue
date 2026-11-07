<template>
  <div v-if="d">
    <div class="card detail-head">
      <div class="dh-top">
        <div class="dh-left">
          <div class="dh-emoji">{{ d.category_emoji }}</div>
          <div class="dh-main">
            <div class="dh-title">
              {{ d.title }}
              <el-tag size="small" :type="STATUS_TYPE[d.status]" class="ml-8">{{ STATUS_LABEL[d.status] }}</el-tag>
              <el-tag v-if="d.circle_match" size="small" type="success" effect="plain" class="ml-8">同好</el-tag>
              <el-tag v-if="isLocked(d)" size="small" type="info" effect="plain" class="ml-8">已锁定</el-tag>
              <el-tag v-if="d.recurrence" size="small" type="warning" effect="plain" class="ml-8">🔁 周期搭子</el-tag>
            </div>
            <div class="dh-meta">
              <span class="cat-tag">{{ d.category_label }}</span>
              <span>🕐 {{ fmtTime(d.activity_start) }} ~ {{ fmtTime(d.activity_end) }}</span>
              <span>📍 {{ d.location_name || '未填地点' }}</span>
              <span>👥 {{ d.applicant_count }}/{{ d.need_count }} 人</span>
            </div>
            <div class="dh-tags" v-if="d.tags?.length">
              <el-tag v-for="t in d.tags" :key="t" size="small" effect="plain">{{ t }}</el-tag>
            </div>
          </div>
        </div>
        <div v-if="d.owner?.id === auth.user?.id" class="owner-side">
          <span class="owner-badge">我发布的需求</span>
          <el-button v-if="d.status === 'recruiting'" class="repost-btn" size="default" type="danger" plain @click="offDemand">下架该需求</el-button>
          <el-button v-else-if="d.status === 'off'" class="repost-btn" size="default" type="primary" @click="relist">重新发布</el-button>
        </div>
        <div v-else-if="auth.user?.is_admin && (d.status === 'recruiting' || d.status === 'matched')" class="owner-side">
          <el-button class="repost-btn" size="default" type="danger" plain @click="adminOffDemand">下架该需求</el-button>
        </div>
      </div>

      <div class="dh-desc" v-if="d.description">{{ d.description }}</div>
      <div class="recur-note" v-if="d.recurrence?.note">🔁 {{ d.recurrence.note }}</div>

      <div class="safety-tip" v-if="safetyTip">🔔 {{ safetyTip }}</div>

      <div v-if="d.owner?.id !== auth.user?.id" class="dh-actions">
        <el-button v-if="d.my_standby" size="large" type="danger" plain @click="cancelStandby">取消蹲补</el-button>
        <el-button v-else-if="d.my_application_status === 'pending'" size="large" type="danger" plain @click="cancelApply">取消申请</el-button>
        <el-button v-else-if="d.my_application_status === 'approved'" size="large" type="success" disabled>已加入队伍</el-button>
        <el-button v-else-if="d.my_application_status === 'rejected'" size="large" type="info" disabled>已拒绝</el-button>
        <el-button v-else-if="canApply" size="large" type="primary" :loading="applying" @click="apply">立即申请</el-button>
        <el-button v-else-if="canStandby" size="large" type="primary" :disabled="standbyFull || standbyBlocked" :loading="standbying" @click="doStandby">{{ standbyLabel }}</el-button>
        <el-button v-else size="large" disabled>{{ d.status === 'off' ? '已下架' : '已过期' }}</el-button>
        <el-button size="large" :type="d.favorited ? 'warning' : 'default'" @click="toggleFav">
          {{ d.favorited ? '已收藏' : '收藏' }}
        </el-button>
      </div>
      <div v-if="!d.my_standby && canStandby && d.standby_count > 0" class="standby-hint">有 {{ d.standby_count }} 人正在蹲补，名额空缺时将自动申请</div>
      <div v-if="!d.my_standby && canStandby && standbyBlocked" class="standby-hint">名额空缺中，暂不接受蹲补（将由蹲补队列自动补位）</div>
    </div>

    <!-- 五维匹配解释 -->
    <div v-if="d.match" class="card">
      <div class="flex-between">
        <div class="sec-title">你与这条需求的匹配度</div>
        <div class="score-badge">{{ (d.match.score * 100).toFixed(0) }}%<span class="text-muted" style="font-size:14px; color: var(--text-secondary)"> 匹配</span></div>
      </div>
      <div v-if="d.match.summary" class="match-summary mt-8">💡 {{ d.match.summary }}</div>
      <div class="match-viz mt-16">
        <div class="radar-box">
          <svg viewBox="0 0 340 340" class="radar-svg" role="img" aria-label="五维匹配雷达图">
            <polygon v-for="lv in gridLevels" :key="'g' + lv" class="radar-grid" :points="gridPoints(lv)" />
            <line v-for="(e, i) in radarDims" :key="'a' + i" class="radar-axis" x1="170" y1="170" :x2="radarVertex(i).x" :y2="radarVertex(i).y" />
            <polygon class="radar-shape" :points="radarPoints" />
            <circle v-for="(e, i) in radarDims" :key="'d' + i" class="radar-dot" :cx="radarDataPoint(i).x" :cy="radarDataPoint(i).y" r="3.5" />
            <text v-for="(e, i) in radarDims" :key="'t' + i" class="radar-label" :x="radarLabelPos(i).x" :y="radarLabelPos(i).y" text-anchor="middle">{{ e.key }}</text>
          </svg>
        </div>
        <div class="bar-list">
          <div v-for="e in d.match.explanation" :key="e.key" class="exp-row">
            <span class="exp-label">{{ e.key }}</span>
            <el-progress :percentage="Math.round((e.known ? e.score : 0) * 100)" :stroke-width="8" :show-text="false" style="flex:1" />
            <span class="exp-hint">{{ e.hint || '暂无记录' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 发起人卡片 -->
    <div class="card">
      <div class="flex-between">
        <div class="sec-title">发起人</div>
        <div v-if="d.owner?.id !== auth.user?.id" class="owner-actions">
          <el-button size="small" text type="danger" @click="reportOpen = true">举报</el-button>
          <el-button size="small" text type="warning" @click="block">拉黑该用户</el-button>
        </div>
      </div>
      <div class="owner-card mt-8" @click="router.push(`/user/${d.owner.id}`)">
        <el-avatar :size="50" :src="d.owner.avatar || undefined" style="background: var(--brand)">{{ d.owner.nickname.slice(0, 1) }}</el-avatar>
        <div class="oc-body">
          <div class="oc-name">{{ d.owner.nickname }} <span class="credit-tier">{{ d.owner.tier }}</span></div>
          <div class="oc-sub text-muted">
            {{ d.owner.college || '未填学校' }}{{ d.owner.grade ? ' · ' + d.owner.grade : '' }}
            <el-tag v-if="d.owner.student_verified" size="small" type="success" effect="plain">已认证</el-tag>
          </div>
        </div>
        <div class="oc-side">
          <div class="score-badge">{{ (d.owner?.credit_score ?? 0).toFixed(1) }}</div>
          <div class="oc-credit-label">信誉分</div>
        </div>
      </div>
    </div>

    <!-- 相似推荐 -->
    <div v-if="similar.length" class="card stagger-enter">
      <div class="sec-title">相似需求</div>
      <div v-for="s in similar" :key="s.id" class="demand-item ani-fade-in-up" style="margin-top:12px" @click="router.push(`/demand/${s.id}`)">
        <div class="divemoji">{{ s.category_emoji }}</div>
        <div class="divbody">
          <div class="divtitle">{{ s.title }}</div>
          <div class="divmeta"><span>🕐 {{ fmtTime(s.activity_start) }}</span><span>📍 {{ s.location_name || '未填地点' }}</span><span>👥 {{ s.applicant_count }}/{{ s.need_count }}</span></div>
        </div>
        <div class="divside">
          <div class="score-badge">{{ (s.owner?.credit_score ?? 0).toFixed(1) }}</div>
          <div class="sim-credit-label">信誉分</div>
        </div>
      </div>
    </div>

    <!-- 举报弹窗 -->
    <el-dialog v-model="reportOpen" title="举报该需求" width="440px">
      <el-form label-position="top">
        <el-form-item label="举报原因">
          <el-select v-model="reportForm.reason" placeholder="请选择" style="width:100%">
            <el-option v-for="r in reportReasons" :key="r" :label="r" :value="r" />
          </el-select>
        </el-form-item>
        <el-form-item label="文字说明（必填）">
          <el-input v-model="reportForm.evidence" type="textarea" :autosize="{ minRows: 3, maxRows: 8 }" placeholder="请描述具体情况" />
        </el-form-item>
        <el-form-item label="图片证明（必填，1-3 张）">
          <div class="ev-list">
            <div v-for="(img, i) in reportForm.images" :key="i" class="ev-item">
              <img :src="img" class="ev-img" />
              <span class="ev-del" @click="reportForm.images.splice(i, 1)">✕</span>
            </div>
            <label v-if="reportForm.images.length < 3" class="ev-add">
              <input type="file" accept="image/*" hidden @change="onPickReportImages" />
              <span>+</span>
            </label>
          </div>
          <div style="font-size:13px; color:var(--text-secondary); margin-top:6px">单张不超过 1MB，最多 3 张</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reportOpen = false">取消</el-button>
        <el-button type="primary" :loading="reporting" @click="submitReport">提交举报</el-button>
      </template>
    </el-dialog>
  </div>

  <div v-else-if="loading" style="cursor:default; pointer-events:none">
    <div class="card">
      <div class="skeleton skeleton-title" style="width:55%"></div>
      <div class="skeleton skeleton-text" style="width:85%"></div>
      <div class="skeleton skeleton-text short"></div>
      <div class="skeleton skeleton-card" style="height:180px;margin-top:16px"></div>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="skeleton skeleton-title" style="width:40%"></div>
      <div class="skeleton skeleton-text" style="width:80%"></div>
      <div class="skeleton skeleton-text" style="width:90%"></div>
    </div>
  </div>
  <div v-else class="empty"><p>需求不存在或已下架</p><el-button @click="router.push('/hall')">返回大厅</el-button></div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api/index.js'
import { useAuth } from '../store/auth.js'
import { STATUS_LABEL, STATUS_TYPE, fmtTime, timeLeft, parseLocalTime } from '../utils.js'

const route = useRoute()
const router = useRouter()
const auth = useAuth()

const d = ref(null)
const similar = ref([])
const loading = ref(true)
const applying = ref(false)
const standbying = ref(false)
const reporting = ref(false)
const reportOpen = ref(false)
const reportForm = reactive({ reason: '', evidence: '', images: [] })
const reportReasons = ['虚假信息', '广告营销', '人身攻击', '涉及诈骗', '其他']

const started = (x) => !!x?.activity_start && parseLocalTime(x.activity_start) <= new Date()
const canApply = computed(() => d.value && d.value.status === 'recruiting' && !started(d.value))
const canStandby = computed(() => d.value && d.value.status === 'matched' && !started(d.value))
const standbyFull = computed(() => (d.value?.standby_count || 0) >= 3)
const standbyBlocked = computed(() => {
  const x = d.value
  return !!x && x.status === 'matched' && (x.applicant_count || 0) < (x.need_count || 0)
})
const standbyLabel = computed(() => {
  const n = d.value?.standby_count || 0
  return n > 0 ? ('蹲补位（' + n + ' 人）') : '蹲补位'
})

// 已锁定：已过锁定时间（成员加入后不可自由退出）
function isLocked(x) {
  return !!x.lock_time && parseLocalTime(x.lock_time) <= new Date()
}

// ---- 五维雷达图（正五边形：五个轴均匀分布 72°）----
const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0]
const RAD = 100
const C = 170
const radarDims = computed(() => {
  const list = (d.value?.match?.explanation || []).slice(0, 5)
  while (list.length < 5) list.push({ key: '', score: 0, known: false })
  return list
})
function angleOf(i) { return -Math.PI / 2 + i * (2 * Math.PI / 5) }
function radarVertex(i) {
  const a = angleOf(i)
  return { x: (C + Math.cos(a) * RAD).toFixed(1), y: (C + Math.sin(a) * RAD).toFixed(1) }
}
function radarDataPoint(i) {
  const e = radarDims.value[i]
  const s = e && e.known ? e.score : 0
  const a = angleOf(i)
  return { x: (C + Math.cos(a) * RAD * s).toFixed(1), y: (C + Math.sin(a) * RAD * s).toFixed(1) }
}
function gridPoints(lv) {
  return radarDims.value.map((_, i) => {
    const a = angleOf(i)
    return `${(C + Math.cos(a) * RAD * lv).toFixed(1)},${(C + Math.sin(a) * RAD * lv).toFixed(1)}`
  }).join(' ')
}
function radarLabelPos(i) {
  const a = angleOf(i)
  return { x: (C + Math.cos(a) * 134).toFixed(1), y: (C + Math.sin(a) * 134 + 4).toFixed(1) }
}
const radarPoints = computed(() => radarDims.value.map((_, i) => {
  const p = radarDataPoint(i)
  return `${p.x},${p.y}`
}).join(' '))

// 行前安全提醒：活动 24h 内临近时提示
const safetyTip = computed(() => {
  const start = d.value?.activity_start
  if (!start) return ''
  const diff = new Date(start) - Date.now()
  if (diff < 0 || diff > 24 * 3600 * 1000) return ''
  return `活动${timeLeft(start)}开始。行前安全提醒：线下见面请选择公共场所，提前告知亲友行程；如对方提出转账、借贷或前往偏僻地点，请立即拒绝并举报。`
})

async function load() {
  loading.value = true
  try {
    const res = await api.getDemand(route.params.id)
    d.value = res.demand
    similar.value = res.similar || []
  } catch (e) {
    ElMessage.error(e.message)
    d.value = null
  } finally {
    loading.value = false
  }
}

async function apply() {
  if (isLocked(d.value)) {
    try {
      await ElMessageBox.confirm('该需求已锁定，成员加入后不可自由退出，退出需向队长申请。确定仍要申请吗？', '已锁定提示', { type: 'warning', confirmButtonText: '确认申请', cancelButtonText: '再想想' })
    } catch { return }
  }
  applying.value = true
  try {
    const res = await api.apply({ demand_id: d.value.id, message: '' })
    ElMessage.success('申请已提交，等待发起人通过')
    d.value.applied = true
    d.value.my_application_status = 'pending'
    d.value.my_application_id = res.id
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    applying.value = false
  }
}

async function cancelApply() {
  try {
    await ElMessageBox.confirm('确定取消申请？', '取消申请', { type: 'warning' })
  } catch { return }
  try {
    await api.cancelApplication(d.value.my_application_id)
    ElMessage.success('已取消申请')
    d.value.applied = false
    d.value.my_application_status = null
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function doStandby() {
  if (isLocked(d.value)) {
    try {
      await ElMessageBox.confirm('该需求已锁定，成员加入后不可自由退出，退出需向队长申请。确定仍要蹲补吗？', '已锁定提示', { type: 'warning', confirmButtonText: '确认蹲补', cancelButtonText: '再想想' })
    } catch { return }
  }
  standbying.value = true
  try {
    const res = await api.standby(d.value.id)
    ElMessage.success('已加入蹲补队列，有名额空缺时将自动申请')
    d.value.my_standby = true
    d.value.standby_count = res.standby_count
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    standbying.value = false
  }
}

async function cancelStandby() {
  try {
    await ElMessageBox.confirm('确定取消蹲补？', '取消蹲补', { type: 'warning' })
  } catch { return }
  try {
    await api.cancelStandby(d.value.id)
    ElMessage.success('已取消蹲补')
    d.value.my_standby = false
    d.value.standby_count = Math.max(0, (d.value.standby_count || 0) - 1)
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function toggleFav() {
  try {
    if (d.value.favorited) { await api.unfavorite(d.value.id); d.value.favorited = false }
    else { await api.favorite(d.value.id); d.value.favorited = true }
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function offDemand() {
  try {
    await ElMessageBox.confirm('下架后该需求将从大厅隐藏，不再接受新的申请与蹲补；已招募的成员成队不受影响。', '下架该需求', { type: 'warning', confirmButtonText: '下架', cancelButtonText: '取消' })
  } catch { return }
  try {
    await api.offDemand(d.value.id)
    ElMessage.success('已下架')
    d.value.status = 'off'
  } catch (e) {
    ElMessage.error(e.message)
  }
}

// 管理员下架：必须填写缘由（同步告知发布者），未成队或已匹配成队均走统一治理链路
async function adminOffDemand() {
  const { value } = await ElMessageBox.prompt('请填写下架缘由（将同步告知发布者）', '下架该需求', {
    confirmButtonText: '确认下架',
    cancelButtonText: '取消',
    inputValidator: (v) => (v && v.trim() ? true : '请填写缘由'),
    inputErrorMessage: '请填写缘由'
  }).catch(() => ({}))
  if (!value) return
  try {
    await api.adminTakedownDemand(d.value.id, value.trim())
    ElMessage.success('已下架')
    d.value.status = 'off'
  } catch (e) {
    ElMessage.error(e.message)
  }
}

function relist() {
  if (!d.value) return
  router.push({ path: '/publish', query: { relist: d.value.id } })
}

async function block() {
  try {
    await ElMessageBox.confirm('拉黑后将不再看到该用户的任何需求，确认？', '拉黑确认', { type: 'warning' })
  } catch { return }
  try {
    await api.block(d.value.owner.id)
    ElMessage.success('已拉黑')
  } catch (e) {
    ElMessage.error(e.message)
  }
}

function onPickReportImages(e) {
  const files = Array.from(e.target.files || [])
  for (const f of files) {
    if (reportForm.images.length >= 3) { ElMessage.warning('最多上传 3 张图片'); break }
    if (f.size > 1024 * 1024) { ElMessage.warning('单张图片不能超过 1MB'); continue }
    const reader = new FileReader()
    reader.onload = () => { if (reportForm.images.length < 3) reportForm.images.push(reader.result) }
    reader.readAsDataURL(f)
  }
  e.target.value = ''
}

async function submitReport() {
  if (!reportForm.reason) return ElMessage.warning('请选择举报原因')
  if (!reportForm.evidence.trim()) return ElMessage.warning('请填写文字说明')
  if (!reportForm.images.length) return ElMessage.warning('请上传图片证明（至少 1 张）')
  reporting.value = true
  try {
    await api.report({ target_type: 'demand', target_id: d.value.id, reason: reportForm.reason, evidence: reportForm.evidence, images: reportForm.images })
    ElMessage.success('举报已提交')
    reportOpen.value = false
    reportForm.reason = ''
    reportForm.evidence = ''
    reportForm.images = []
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    reporting.value = false
  }
}

onMounted(load)
// 从相似需求跳转到另一条需求时，路由 params 变化但组件被复用，需手动重新加载
watch(() => route.params.id, () => load())
</script>

<style scoped>
.dh-top { display: flex; gap: 14px; justify-content: space-between; align-items: flex-start; }
.dh-left { display: flex; gap: 14px; flex: 1; min-width: 0; }
.dh-emoji { font-size: 50px; }
.dh-main { flex: 1; min-width: 0; }
.owner-side { flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 12px; }
.owner-badge { font-size: 16px; font-weight: 700; color: var(--brand-text); white-space: nowrap; }
.dh-title { font-size: 23px; font-weight: 800; }
.dh-title :deep(.el-tag) { font-size: 23px; height: auto; line-height: 1.3; padding: 4px 12px; }
.owner-actions { display: flex; align-items: center; gap: 8px; }
.dh-meta { color: var(--text-secondary); font-size: 16px; margin-top: 8px; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
.dh-tags { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 6px; }
.dh-tags :deep(.el-tag) { font-size: 16px; height: auto; line-height: 1.4; padding: 4px 12px; color: var(--ink); font-weight: 600; }
.dh-desc { margin-top: 16px; color: var(--ink); line-height: 1.7; white-space: pre-wrap; font-size: 16.5px; }
.recur-note { margin-top: 8px; color: var(--brand-text); font-size: 15.5px; }
.safety-tip { margin-top: 14px; padding: 12px 14px; background: #fff7e6; border: 1px solid #ffe3b0; border-radius: 10px; color: #8a5b12; font-size: 15px; line-height: 1.6; }
.dh-actions { margin-top: 20px; display: flex; gap: 10px; align-items: center; }
.repost-btn { font-size: 15px; font-weight: 800; }
.standby-hint { margin-top: 10px; font-size: 15px; color: var(--brand-text); font-weight: 600; }
.sec-title { font-size: 20px; font-weight: 700; }
.match-summary { font-size: 16px; color: var(--brand-text); font-weight: 600; }
.owner-card { display: flex; gap: 14px; align-items: center; padding: 16px; border: 1px solid var(--border); border-radius: 10px; cursor: pointer; }
.owner-card:hover { background: var(--surface); }
.oc-body { flex: 1; }
.oc-name { font-weight: 800; font-size: 19px; }
.oc-sub { font-size: 15.5px; margin-top: 4px; display: flex; gap: 6px; align-items: center; }
.oc-sub :deep(.el-tag) { font-size: 15px; font-weight: 700; height: auto; line-height: 1.4; padding: 3px 10px; }
.oc-side { text-align: center; }
.oc-side .score-badge { font-size: 22px; }
.oc-credit-label { font-size: 15px; color: var(--text-secondary); margin-top: 2px; }
.match-viz { display: flex; gap: 28px; align-items: center; flex-wrap: wrap; }
.radar-box { flex-shrink: 0; }
.radar-svg { display: block; width: 260px; height: 260px; }
.radar-grid { fill: none; stroke: var(--border); stroke-width: 1; }
.radar-axis { stroke: var(--surface-muted); stroke-width: 1; }
.radar-shape { fill: rgba(15, 181, 126, 0.22); stroke: var(--brand); stroke-width: 2; }
.radar-dot { fill: var(--brand); }
.radar-label { font-size: 13px; fill: var(--text-secondary); font-weight: 600; }
.bar-list { flex: 1; min-width: 240px; }
.ml-8 { margin-left: 8px; }
.divbody { flex: 1; min-width: 0; }
.divtitle { font-weight: 700; }
.divmeta { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-top: 8px; font-size: 15px; color: var(--text-secondary); }
.divside { margin-left: auto; flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.sim-credit-label { font-size: 14px; color: var(--text-secondary); }
.ev-list { display: flex; flex-wrap: wrap; gap: 8px; }
.ev-item { position: relative; }
.ev-img { width: 64px; height: 64px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border); display: block; }
.ev-del { position: absolute; top: -6px; right: -6px; width: 18px; height: 18px; border-radius: 50%; background: var(--danger); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; cursor: pointer; line-height: 1; }
.ev-add { width: 64px; height: 64px; border: 1px dashed var(--border); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 26px; color: var(--text-secondary); cursor: pointer; }
.ev-add:hover { border-color: var(--brand); color: var(--brand); }
</style>