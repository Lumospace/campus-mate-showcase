<template>
  <div>
    <div class="page-title">我的搭子</div>
    <div class="page-sub">你和谁搭过、正在和谁搭，一目了然</div>

    <div v-if="loading" class="team-grid" style="cursor:default; pointer-events:none">
      <div v-for="i in 4" :key="i" class="team-card card">
        <div class="tc-top">
          <div class="skeleton" style="width:30px;height:30px;border-radius:8px;flex-shrink:0"></div>
          <div class="tc-body">
            <div class="skeleton skeleton-title" style="width:75%"></div>
            <div class="skeleton skeleton-text short"></div>
          </div>
          <div class="skeleton tc-chat" style="width:110px;height:32px"></div>
        </div>
        <div class="tc-members">
          <div v-for="j in 3" :key="j" class="skeleton" style="width:90px;height:26px;border-radius:999px"></div>
        </div>
      </div>
    </div>

    <template v-else>
      <div class="sec-row">
        <div class="sec-title">进行中（{{ filteredActive.length }}）</div>
        <el-select v-model="filterType" size="default" style="width: 128px">
          <el-option label="全部" value="all" />
          <el-option label="仅常规" value="normal" />
          <el-option label="仅快闪" value="flash" />
        </el-select>
      </div>
      <div v-if="!filteredActive.length" class="empty" style="padding:24px 0"><p>{{ filterType === 'all' ? '还没有进行中的搭子，去大厅看看' : '没有符合筛选的进行中搭子' }}</p><el-button v-if="filterType === 'all'" type="primary" @click="$router.push('/hall')">去大厅</el-button></div>
      <div v-else class="team-grid stagger-enter">
        <div v-for="t in filteredActive" :key="t.id" class="team-card card ani-fade-in-up">
          <div class="tc-top">
            <span class="tc-emoji">{{ t.demand?.category_emoji }}</span>
            <div class="tc-body">
              <div class="tc-title">{{ t.demand?.title }}</div>
              <div class="tc-meta text-muted">🕐 {{ fmtTime(t.demand?.activity_start) }} · <el-tag size="small" :type="ongoingStatus(t).type">{{ ongoingStatus(t).label }}</el-tag><el-tag v-if="t.source === 'flash'" size="small" type="warning" effect="plain">⚡ 快闪</el-tag></div>
            </div>
            <div class="tc-chat-wrap">
              <el-button class="tc-chat" type="primary" @click="$router.push('/chat/' + t.id)"><el-icon><ChatDotRound /></el-icon>打开聊天室</el-button>
              <span v-if="unreadOf(t) > 0" class="unread-badge">{{ unreadOf(t) > 99 ? '99+' : unreadOf(t) }}</span>
            </div>
          </div>
          <div class="tc-members">
            <div v-for="m in t.members" :key="m.id" class="member-chip" :class="{ me: m.id === myId }" role="button" tabindex="0" @click="m.id !== myId && $router.push('/user/' + m.id)" @keydown.enter="m.id !== myId && $router.push('/user/' + m.id)">
              <el-avatar :size="26" :src="m.avatar || undefined" style="background: var(--brand); font-size:13px">{{ m.nickname.slice(0, 1) }}</el-avatar>
              <div class="mc-info">
                <div class="mc-name">
                  {{ m.nickname }}
                  <el-tag v-if="m.role === 'owner'" size="small" type="warning" effect="plain">队长</el-tag>
                  <span v-if="m.id === myId" class="text-muted mc-me">(我)</span>
                </div>
              </div>
              <div v-if="t.owner_id === myId && m.id !== myId" class="member-actions" @click.stop>
                <el-button v-if="t.source !== 'flash'" size="small" text type="primary" @click="openTransfer(t, m)">转让</el-button>
                <el-button size="small" text type="danger" @click="removeMember(t, m)">移除</el-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="sec-title mt-24">已结束（{{ filteredDone.length }}）</div>
      <div v-if="!filteredDone.length" class="empty" style="padding:20px 0"><p>{{ filterType === 'all' ? '还没有已结束的搭子' : '没有符合筛选的已结束搭子' }}</p></div>
      <div v-else class="team-grid stagger-enter">
        <div v-for="t in filteredDone" :key="t.id" class="team-card card ani-fade-in-up">
          <div class="tc-top">
            <span class="tc-emoji">{{ t.demand?.category_emoji }}</span>
            <div class="tc-body">
              <div class="tc-title-row">
                <div class="tc-title">{{ t.demand?.title }}</div>
                <el-tag v-if="pendingReview(t)" class="tc-review-badge" type="danger" effect="dark">待互评</el-tag>
              </div>
              <div class="tc-meta text-muted">🕐 {{ fmtTime(t.demand?.activity_start) }} · <el-tag size="small" type="info">{{ statusLabel(t.status) }}</el-tag><el-tag v-if="t.source === 'flash'" size="small" type="warning" effect="plain">⚡ 快闪</el-tag></div>
            </div>
            <div class="tc-chat-wrap">
              <el-button class="tc-chat" type="primary" @click="$router.push('/chat/' + t.id)"><el-icon><ChatDotRound /></el-icon>打开聊天室</el-button>
              <span v-if="unreadOf(t) > 0" class="unread-badge">{{ unreadOf(t) > 99 ? '99+' : unreadOf(t) }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 转让队长弹窗 -->
    <el-dialog v-model="transferOpen" title="转让队长" width="440px">
      <p class="text-muted mb-16">将队长转让给 <b>{{ transferTarget?.nickname }}</b>，对方同意后生效</p>
      <el-form label-position="top">
        <el-form-item label="转让理由">
          <el-select v-model="transferForm.reason" placeholder="请选择理由" style="width:100%">
            <el-option v-for="r in TRANSFER_REASONS" :key="r" :label="r" :value="r" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="transferForm.reason === '其他'" label="补充说明">
          <el-input v-model="transferForm.other" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" placeholder="请填写补充说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="transferOpen = false">取消</el-button>
        <el-button type="primary" :loading="transferSubmitting" @click="submitTransfer">发起转让申请</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api/index.js'
import { fmtTime, parseLocalTime } from '../utils.js'
import { useAuth } from '../store/auth.js'
import { useUnread } from '../store/unread.js'

const auth = useAuth()
const unreadStore = useUnread()
const myId = computed(() => auth.user?.id)
const myTags = computed(() => auth.user?.tags || [])

const active = ref([])
const done = ref([])
const loading = ref(true)
const filterType = ref('all')
function matchFilter(t) {
  if (filterType.value === 'all') return true
  if (filterType.value === 'flash') return t.source === 'flash'
  return t.source !== 'flash'
}
const filteredActive = computed(() => active.value.filter(matchFilter))
const filteredDone = computed(() => done.value.filter(matchFilter))
const TRANSFER_REASONS = ['临时有事无法继续带队', '时间安排冲突', '个人原因', '其他']
const transferOpen = ref(false)
const transferTarget = ref(null)
const transferTeamObj = ref(null)
const transferForm = reactive({ reason: '', other: '' })
const transferSubmitting = ref(false)

// 关系卡片：与某搭子的共同兴趣标签
function commonTags(m) {
  const mine = new Set(myTags.value)
  return (m.tags || []).filter((t) => mine.has(t)).slice(0, 3)
}

function statusLabel(s) {
  return { forming: '组队中', active: '进行中', done: '已结束', dismissed: '已解散' }[s] || s
}
// 进行中区块的展示状态：未满员=组队中；满员且未开始=未开始；活动开始后（无论满员）=已开始
function ongoingStatus(t) {
  const d = t.demand || {}
  const s = d.activity_start ? parseLocalTime(d.activity_start).getTime() : null
  if (s == null || s <= Date.now()) return { label: '已开始', type: 'success' }
  const full = (t.members?.length || 0) > (d.need_count || 0)
  return full ? { label: '未开始', type: 'primary' } : { label: '组队中', type: 'warning' }
}
// 已结束队伍里仍有未评价的搭子 → 高亮「待互评」
function pendingReview(t) {
  return t.status === 'done' && (t.members || []).some((m) => m.id !== myId.value && !m.my_review)
}
function relClass(level) {
  return { '老搭子': 'rel-old', '熟悉': 'rel-fam', '初识': 'rel-new' }[level] || 'rel-new'
}

// 排序档位：0 进行中 / 1 锁定后~开始前 / 2 锁定前(或未锁定且未开始) / 3 结束后
function tierOf(t) {
  const d = t.demand || {}
  const now = Date.now()
  const s = d.activity_start ? parseLocalTime(d.activity_start).getTime() : null
  const e = d.activity_end ? parseLocalTime(d.activity_end).getTime() : null
  const l = d.lock_time ? parseLocalTime(d.lock_time).getTime() : null
  if (e != null && now > e) return 3
  if (s != null && e != null && now >= s && now <= e) return 0
  if (s != null && now < s) {
    if (l != null && now >= l) return 1
    return 2
  }
  return 2
}
function compareTeams(a, b) {
  const ta = tierOf(a)
  const tb = tierOf(b)
  if (ta !== tb) return ta - tb
  const sa = a.demand?.activity_start ? parseLocalTime(a.demand.activity_start).getTime() : 0
  const sb = b.demand?.activity_start ? parseLocalTime(b.demand.activity_start).getTime() : 0
  return sa - sb
}

// 快闪团队与常规团队分开排序：常规沿用 tier 档位，快闪按自身开始时间独立排序
function flashStartMs(t) {
  const s = t.demand?.activity_start
  return s ? parseLocalTime(s).getTime() : null
}
// 快闪·进行中：开始时间早的在前面（更紧急），时间待定的排后
function compareFlashOngoing(a, b) {
  const sa = flashStartMs(a)
  const sb = flashStartMs(b)
  if (sa == null && sb == null) return 0
  if (sa == null) return 1
  if (sb == null) return -1
  return sa - sb
}
// 已结束（常规与快闪统一）：按完成/解散时间倒序，最近的在最前；旧数据无 ended_at 时退回活动结束/开始时间
function endedMs(t) {
  const e = t.ended_at || t.demand?.activity_end || t.demand?.activity_start
  return e ? parseLocalTime(e).getTime() : null
}
function compareDoneRecent(a, b) {
  const ea = endedMs(a)
  const eb = endedMs(b)
  if (ea == null && eb == null) return 0
  if (ea == null) return 1
  if (eb == null) return -1
  return eb - ea
}
// 常规在前、快闪在后，各自独立排序
function sortGroups(list, mode) {
  const demands = list.filter((t) => t.source !== 'flash').sort(mode === 'done' ? compareDoneRecent : compareTeams)
  const flashes = list.filter((t) => t.source === 'flash').sort(mode === 'ongoing' ? compareFlashOngoing : compareDoneRecent)
  return [...demands, ...flashes]
}

async function removeMember(t, m) {
  try {
    await ElMessageBox.confirm(`确定将 ${m.nickname} 移出队伍？`, '移除成员', { type: 'warning' })
  } catch { return }
  try {
    await api.removeMember(t.id, m.id)
    ElMessage.success('已移除')
    load()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

function openTransfer(t, m) {
  transferTeamObj.value = t
  transferTarget.value = m
  transferForm.reason = ''
  transferForm.other = ''
  transferOpen.value = true
}

async function submitTransfer() {
  if (!transferForm.reason) return ElMessage.warning('请选择转让理由')
  const reason = transferForm.reason === '其他' ? (transferForm.other || '其他') : transferForm.reason
  transferSubmitting.value = true
  try {
    await api.transferTeam(transferTeamObj.value.id, transferTarget.value.id, reason)
    ElMessage.success('转让申请已发出，等待对方同意')
    transferOpen.value = false
    load()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    transferSubmitting.value = false
  }
}

// 未读角标：优先取实时 store（Socket 推送即增长），首次加载用服务端值兜底
function unreadOf(t) {
  const v = unreadStore.byTeam[t.id]
  return v == null ? (Number(t.unread) || 0) : v
}
function syncUnread(list) {
  for (const t of list) {
    const server = Number(t.unread) || 0
    const live = Number(unreadStore.byTeam[t.id]) || 0
    if (server > live) unreadStore.setTeam(t.id, server)
  }
}

async function load() {
  loading.value = true
  try {
    const res = await api.myTeams()
    const ongoing = [...(res.notStarted || []), ...(res.active || [])]
    active.value = sortGroups(ongoing, 'ongoing')
    done.value = sortGroups(res.done || [], 'done')
    syncUnread([...active.value, ...done.value])
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>

<style scoped>
.sec-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.sec-title { font-size: 22px; font-weight: 800; color: var(--ink); }
.mt-24 { margin-top: 24px; }
.team-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 12px; }
@media (max-width: 700px) { .team-grid { grid-template-columns: 1fr; } }
@media (max-width: 520px) { .team-grid .team-card { padding-right: 0; } .tc-chat-wrap { position: static; transform: none; margin-top: 10px; width: 100%; justify-content: center; display: flex; } .tc-top { flex-wrap: wrap; } }
.team-grid .team-card { margin-top: 0; min-width: 0; position: relative; padding-right: 120px; }
.tc-top { display: flex; gap: 12px; align-items: center; }
.tc-chat-wrap { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); flex-shrink: 0; z-index: 1; display: inline-flex; }
.tc-chat { position: relative; display: inline-flex; align-items: center; gap: 6px; }
.unread-badge { position: absolute; top: -8px; right: -8px; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; background: #f5222d; color: #fff; font-size: 12px; font-weight: 700; line-height: 18px; text-align: center; box-shadow: 0 0 0 2px #fff; }
.tc-emoji { font-size: 30px; line-height: 1; }
.tc-body { flex: 1; min-width: 0; }
.tc-title { font-weight: 700; font-size: 18px; line-height: 1.3; color: var(--ink); }
.tc-title-row { display: flex; align-items: center; gap: 8px; min-width: 0; }
.tc-review-badge { font-size: 16px; font-weight: 800; height: auto; line-height: 1.3; padding: 3px 10px; border-radius: 8px; flex-shrink: 0; }
.tc-meta { font-size: 16px; line-height: 1.3; color: var(--ink); margin-top: 4px; display: flex; gap: 6px; align-items: center; }
.tc-members { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px; }
.member-chip { display: flex; align-items: center; gap: 8px; font-size: 15px; color: var(--ink); background: var(--surface); border-radius: 12px; padding: 8px 10px; cursor: pointer; transition: box-shadow .15s, transform .15s; }
.member-chip:hover { box-shadow: var(--shadow-lg); }
.member-chip.me { cursor: default; }
.mc-info { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.mc-name { display: flex; align-items: center; gap: 5px; font-weight: 700; font-size: 16px; color: var(--ink); }
.mc-me { font-weight: 500; }
.member-actions { display: none; gap: 4px; align-items: center; margin-left: 2px; }
.member-chip:hover .member-actions { display: flex; }
.mc-rel { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; }
.rel-badge { font-size: 14px; background: var(--brand-soft); color: var(--brand-text); border-radius: 6px; padding: 1px 6px; }
.rel-old { background: #e3f7ec; color: #0a7a4e; }
.rel-fam { background: #fff4e0; color: #b25e09; }
.rel-new { background: #eef2f0; color: #85918c; }
.rel-tag { font-size: 14px; color: var(--ink); background: #eef2f0; border-radius: 6px; padding: 1px 6px; }
.page-title{font-size:30px}.page-sub{color:var(--ink);font-size:18px}.empty{color:var(--text-secondary);font-size:17px}.text-muted{color:var(--text-secondary)}.tc-chat{font-size:16px;font-weight:700}.tc-top :deep(.el-tag){font-size:14px;height:auto}.mc-name :deep(.el-tag){font-size:14px;height:auto;line-height:1.2;padding:2px 8px}
</style>