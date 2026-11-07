<template>
  <div class="app-layout">
    <header class="app-header">
      <router-link to="/" class="logo"><img src="/logo.png" class="logo-img" alt="校遇" /></router-link>
      <nav class="app-nav">
        <router-link to="/">推荐</router-link>
        <router-link to="/hall">大厅</router-link>
        <router-link to="/teams">我的搭子</router-link>
        <router-link to="/flash">快闪</router-link>
        <router-link to="/circles">兴趣圈</router-link>
        <router-link to="/stories">故事墙</router-link>
        <router-link to="/calendar">日历</router-link>
        <router-link to="/activities">校园活动</router-link>
        <a class="nav-feedback" role="button" tabindex="0" @click="feedbackOpen = true" @keydown.enter="feedbackOpen = true">反馈</a>
      </nav>
      <AiAssistant />
      <span class="notif-bell" :class="{ 'bell-bounce': bounce }" role="button" tabindex="0" @click="router.push('/notifications')" @keydown.enter="router.push('/notifications')" title="消息">
        <el-icon :size="20"><Bell /></el-icon>
        <span v-if="unread.total" class="notif-badge">{{ unread.total > 99 ? '99+' : unread.total }}</span>
      </span>
      <el-dropdown trigger="click" @command="onCommand">
        <span class="user-chip">
          <el-avatar :size="28" :src="auth.user?.avatar || undefined" style="background: var(--brand)">{{ auth.nickname.slice(0, 1) }}</el-avatar>
          <span class="user-name">{{ auth.nickname }}</span>
          <el-icon><ArrowDown /></el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="me">我的画像</el-dropdown-item>
            <el-dropdown-item command="credit">信誉与勋章</el-dropdown-item>
            <el-dropdown-item command="growth">成长档案</el-dropdown-item>
            <el-dropdown-item command="applications">我的申请</el-dropdown-item>
            <el-dropdown-item command="weekly">搭子周报</el-dropdown-item>
            <el-dropdown-item command="favorites">我的收藏</el-dropdown-item>
            <el-dropdown-item v-if="auth.user?.is_admin" command="admin">运营看板</el-dropdown-item>
            <el-dropdown-item command="settings">设置</el-dropdown-item>
            <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </header>
    <main class="app-main">
      <router-view />
    </main>
    <FeedbackDialog v-model="feedbackOpen" />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElNotification } from 'element-plus'
import { useAuth } from '../store/auth.js'
import { useUnread } from '../store/unread.js'
import { connectSocket, onNotification, offNotification, onBanned, offBanned, onTeamNotice, offTeamNotice, getCurrentTeamId, disconnectSocket } from '../socket.js'
import AiAssistant from '../components/AiAssistant.vue'
import FeedbackDialog from '../components/FeedbackDialog.vue'
import api from '../api/index.js'

const auth = useAuth()
const router = useRouter()
const unread = useUnread()
const feedbackOpen = ref(false)
const bounce = ref(false)
const baseTitle = document.title || '校遇'

let notifHandler = null
let teamHandler = null
let bounceTimer = null

// 提示音（默认关闭，可在设置页开启）
function soundOn() { return localStorage.getItem('msg_sound') === '1' }
let audioCtx = null
function beep() {
  if (!soundOn()) return
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain); gain.connect(audioCtx.destination)
    osc.frequency.value = 880; gain.gain.value = 0.06
    osc.start(); osc.stop(audioCtx.currentTime + 0.12)
  } catch { /* 忽略浏览器自动播放限制 */ }
}

// 桌面通知（仅页面在后台且已授权时生效）
function desktopOn() {
  return localStorage.getItem('msg_desktop') === '1' && 'Notification' in window && Notification.permission === 'granted'
}
function showNotice(title, message, onClick) {
  if (desktopOn() && document.hidden) {
    try {
      const n = new Notification(title, { body: message })
      n.onclick = () => { window.focus(); onClick?.() }
      return
    } catch { /* 回退到站内弹窗 */ }
  }
  ElNotification({ title, message, duration: 4000, position: 'top-right', onClick })
}

// 站内通知：同一内容 5 秒内不重复弹窗
let lastNotice = { content: '', at: 0 }
function onNotif(payload) {
  unread.bumpNotice()
  bumpBadge()
  const content = payload?.content || '您有一条新通知'
  const now = Date.now()
  if (lastNotice.content === content && now - lastNotice.at < 5000) return
  lastNotice = { content, at: now }
  beep()
  showNotice('🔔 新通知', content, () => router.push(payload?.link || '/notifications'))
}

// 聊天新消息：正在该聊天室时不提醒；同一队伍 30 秒内合并
const teamToastAt = new Map()
function onTeamNotif(p) {
  const teamId = Number(p?.team_id)
  if (!teamId) return
  if (Number(getCurrentTeamId()) === teamId) return
  unread.bumpTeam(teamId)
  bumpBadge()
  const now = Date.now()
  if (now - (teamToastAt.get(teamId) || 0) < 30000) return
  teamToastAt.set(teamId, now)
  beep()
  showNotice(`💬 ${p.team_title || '搭子队伍'}`, `${p.sender_name || '队友'}：${p.preview || '发来一条消息'}`,
    () => router.push('/chat/' + teamId))
}

// 有新消息时铃铛轻弹一下
function bumpBadge() {
  bounce.value = false
  requestAnimationFrame(() => {
    bounce.value = true
    clearTimeout(bounceTimer)
    bounceTimer = setTimeout(() => (bounce.value = false), 700)
  })
}

// 未读总数变化时同步浏览器标题（切回页面也能一眼看到）
watch(() => unread.total, (n) => {
  document.title = n > 0 ? `(${n > 99 ? '99+' : n}) 新消息 · 校遇` : baseTitle
})

onMounted(async () => {
  // 建立 Socket 并订阅通知/聊天消息实时推送，同时拉取当前未读汇总与登录态
  connectSocket()
  notifHandler = onNotif
  onNotification(notifHandler)
  teamHandler = onTeamNotif
  onTeamNotice(teamHandler)
  // 账号被封禁：管理员强制下线，清登录态并跳转登录页
  onBanned((payload) => {
    auth.logout()
    ElMessage.error(payload?.message || '您的账号已被封禁')
    if (window.location.pathname !== '/login') router.push('/login')
  })
  auth.refresh()
  try {
    const s = await api.messagesSummary()
    unread.setNotice(s.notice_unread)
    unread.setByTeam(Object.fromEntries((s.teams || []).map((t) => [t.id, t.unread])))
  } catch { /* ignore */ }
})

onBeforeUnmount(() => {
  offNotification(notifHandler)
  offTeamNotice(teamHandler)
  offBanned()
  clearTimeout(bounceTimer)
})

function onCommand(cmd) {
  if (cmd === 'logout') {
    disconnectSocket()
    auth.logout()
    router.push('/login')
    return
  }
  const map = { me: '/me', credit: '/credit', growth: '/growth', applications: '/applications', weekly: '/weekly', favorites: '/favorites', settings: '/settings', admin: '/admin' }
  router.push(map[cmd] || '/')
}
</script>

<style scoped>
.user-chip { display: flex; align-items: center; gap: 6px; cursor: pointer; outline: none; color: var(--ink); }
.user-name { font-size: 20px; color: var(--ink); font-weight:600; }
.notif-bell { position: relative; display: flex; align-items: center; cursor: pointer; color: var(--ink); padding: 6px; border-radius: 8px; }
.notif-bell:hover { background: var(--surface); }
.notif-badge { position: absolute; top: 0; right: 0; min-width: 18px; height: 16px; padding: 0 4px; border-radius: 999px; background: var(--danger); color: #fff; font-size: 12px; line-height: 16px; text-align: center; font-weight: 700; transform: translate(30%, -30%); }
.notif-bell :deep(.el-icon) { font-size: 22px !important; }
@keyframes bellBounce {
  0%, 100% { transform: translateY(0); }
  30% { transform: translateY(-4px); }
  60% { transform: translateY(2px); }
}
.bell-bounce :deep(.el-icon) { animation: bellBounce 0.6s ease; }
.nav-feedback { color: var(--danger); font-weight: 700; }
.nav-feedback:hover { color: var(--danger); background: rgba(245, 63, 63, 0.08); }
</style>