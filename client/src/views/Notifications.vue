<template>
  <div>
    <div class="flex-between">
      <div>
        <div class="page-title">消息中心</div>
        <div class="page-sub">
          通知{{ unreadStore.notice ? ` ${unreadStore.notice} 条未读` : '已全部读完' }} ·
          聊天{{ unreadStore.chat ? ` ${unreadStore.chat} 条未读` : '已全部读完' }}
        </div>
      </div>
      <el-button v-if="unreadStore.notice" type="primary" @click="readAll">全部已读</el-button>
    </div>

    <el-tabs v-model="tab" class="msg-tabs">
      <el-tab-pane :label="`通知（${unreadStore.notice}）`" name="notice">
        <div v-if="loading" class="skeleton-list">
          <div v-for="i in 4" :key="i" class="notif-item card" style="cursor: default; pointer-events: none">
            <div class="skeleton" style="width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0"></div>
            <div class="ni-body">
              <div class="skeleton skeleton-text" style="width: 90%"></div>
              <div class="skeleton skeleton-text short"></div>
            </div>
          </div>
        </div>
        <div v-else-if="!list.length" class="empty"><el-icon><Bell /></el-icon><p>暂无通知</p></div>
        <div v-else class="stagger-enter">
          <div v-for="n in list" :key="n.id" class="notif-item card ani-fade-in-up" :class="{ unread: !n.is_read }" @click="open(n)">
            <div class="ni-icon">{{ typeMeta(n.type).icon }}</div>
            <div class="ni-body">
              <div class="ni-content">{{ n.content }}</div>
              <div class="ni-time text-muted">{{ fmtTime(n.created_at) }} · {{ typeMeta(n.type).label }}<span v-if="n.link"> · 点击查看</span></div>
            </div>
            <div v-if="!n.is_read" class="ni-dot"></div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane :label="`聊天（${unreadStore.chat}）`" name="chat">
        <div v-if="chatLoading" class="skeleton-list">
          <div v-for="i in 3" :key="i" class="notif-item card" style="cursor: default; pointer-events: none">
            <div class="skeleton" style="width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0"></div>
            <div class="ni-body">
              <div class="skeleton skeleton-text" style="width: 80%"></div>
              <div class="skeleton skeleton-text short"></div>
            </div>
          </div>
        </div>
        <div v-else-if="!chatTeams.length" class="empty"><el-icon><ChatDotRound /></el-icon><p>暂无聊天</p></div>
        <div v-else class="stagger-enter">
          <div v-for="t in chatTeams" :key="t.id" class="notif-item card ani-fade-in-up" :class="{ unread: t.unread }" @click="openChat(t)">
            <div class="ni-icon">{{ catEmoji(t.category) }}</div>
            <div class="ni-body">
              <div class="ni-content">{{ t.title }}</div>
              <div class="ni-time text-muted">
                <template v-if="t.last">{{ t.last.nickname }}：{{ t.last.content }} · {{ fmtTime(t.last.created_at) }}</template>
                <template v-else>暂无消息</template>
              </div>
            </div>
            <span v-if="t.unread" class="chat-badge">{{ t.unread > 99 ? '99+' : t.unread }}</span>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '../api/index.js'
import { useUnread } from '../store/unread.js'
import { fmtTime, catEmoji } from '../utils.js'

const router = useRouter()
const unreadStore = useUnread()
const list = ref([])
const loading = ref(true)
const tab = ref('notice')
const chatTeams = ref([])
const chatLoading = ref(true)

function typeMeta(t) {
  const map = {
    apply: { icon: '🙋', label: '申请' },
    approve: { icon: '✅', label: '通过' },
    reject: { icon: 'ℹ️', label: '未通过' },
    team: { icon: '🎯', label: '组队' },
    review: { icon: '⭐', label: '互评' },
    system: { icon: '📢', label: '系统' }
  }
  return map[t] || { icon: '🔔', label: '通知' }
}

async function load() {
  loading.value = true
  try {
    const res = await api.notifications()
    list.value = res.notifications || []
    unreadStore.setNotice(res.unread)
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

// 聊天页签：各队伍未读数与最后一条消息摘要
async function loadChat() {
  chatLoading.value = true
  try {
    const s = await api.messagesSummary()
    chatTeams.value = s.teams || []
    unreadStore.setNotice(s.notice_unread)
    unreadStore.setByTeam(Object.fromEntries((s.teams || []).map((t) => [t.id, t.unread])))
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    chatLoading.value = false
  }
}

async function readAll() {
  try {
    await api.readAll()
    unreadStore.clearNotice()
    list.value.forEach((n) => (n.is_read = true))
  } catch (e) {
    ElMessage.error(e.message)
  }
}

// 点击通知：有跳转链接的标记已读后跳转对应页面；无链接的仅标记已读
async function open(n) {
  if (!n.is_read) {
    try {
      await api.readOne(n.id)
      n.is_read = true
      unreadStore.setNotice(Math.max(0, unreadStore.notice - 1))
    } catch (e) {
      ElMessage.error(e.message)
    }
  }
  if (n.link) router.push(n.link)
}

// 点击聊天：清除该队未读并进入聊天室
function openChat(t) {
  unreadStore.clearTeam(t.id)
  router.push('/chat/' + t.id)
}

watch(tab, (v) => { if (v === 'chat') loadChat() })

onMounted(() => {
  load()
  loadChat()
})
</script>

<style scoped>
.msg-tabs { margin-top: 8px; }
.notif-item { display: flex; gap: 12px; align-items: flex-start; padding: 14px 16px; cursor: pointer; transition: background 0.15s; }
.notif-item:hover { background: #f0f2f5; }
.notif-item.unread:hover { background: #e6f6ef; }
.notif-item.unread { background: #f0fbf7; border-color: #c5e8dc; }
.ni-icon { font-size: 24px; }
.ni-body { flex: 1; min-width: 0; }
.ni-content { font-size: 15.5px; line-height: 1.5; color: var(--ink); font-weight: 600; }
.ni-time { font-size: 14px; margin-top: 4px; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ni-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--brand); flex-shrink: 0; margin-top: 6px; }
.chat-badge { min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px; background: var(--danger); color: #fff; font-size: 13px; line-height: 20px; text-align: center; font-weight: 700; flex-shrink: 0; }
</style>
