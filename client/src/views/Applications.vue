<template>
  <div>
    <div class="page-title">申请中心</div>
    <div class="page-sub">管理你发出的申请与收到的申请</div>

    <el-tabs v-model="tab">
      <el-tab-pane :label="`我收到的（${incomingCount}）`" name="incoming">
        <div v-if="loading" style="cursor:default; pointer-events:none">
          <div v-for="i in 4" :key="i" class="app-item card">
            <div class="skeleton skeleton-avatar" style="flex-shrink:0"></div>
            <div class="ai-body">
              <div class="skeleton skeleton-title" style="width:55%"></div>
              <div class="skeleton skeleton-text short"></div>
            </div>
            <div class="ai-side">
              <div class="skeleton" style="width:56px;height:24px;border-radius:999px"></div>
            </div>
          </div>
        </div>
        <div v-else-if="!incomingCount" class="empty"><el-icon><MessageBox /></el-icon><p>暂无收到的申请</p></div>
        <div v-else>
          <div v-if="incoming.length" class="stagger-enter">
            <div class="sec-head">加入申请</div>
            <div v-for="a in incoming" :key="a.id" class="app-item card ani-fade-in-up">
              <el-avatar :size="40" :src="a.avatar || undefined" style="background: var(--brand); cursor: pointer" @click="$router.push('/user/' + a.applicant_id)">{{ a.nickname?.slice(0, 1) }}</el-avatar>
              <div class="ai-body">
                <div class="ai-title" style="cursor: pointer" @click="$router.push('/user/' + a.applicant_id)">{{ a.nickname }} <el-tag v-if="a.student_verified" size="small" type="success" effect="plain">认证</el-tag></div>
                <div class="ai-meta text-muted">
                  申请加入「{{ a.title }}」 · 信誉 {{ (a.credit_score || 0).toFixed(1) }} 分{{ a.message ? ' · ' + a.message : '' }}
                </div>
              </div>
              <div class="ai-side" v-if="a.status === 'pending'">
                <el-button size="small" type="primary" @click="approve(a)">通过</el-button>
                <el-button size="small" @click="reject(a)">拒绝</el-button>
              </div>
              <div class="ai-side" v-else>
                <el-tag :type="appStatusType(a.status)">{{ appStatusLabel(a.status) }}</el-tag>
              </div>
            </div>
          </div>
          <div v-if="incomingInvites.length" class="stagger-enter">
            <div class="sec-head">入队邀请</div>
            <div v-for="a in incomingInvites" :key="a.id" class="app-item card ani-fade-in-up">
              <el-avatar :size="40" :src="a.inviter_avatar || undefined" style="background: var(--brand); cursor: pointer" @click="$router.push('/user/' + a.inviter_id)">{{ a.inviter_nickname?.slice(0, 1) }}</el-avatar>
              <div class="ai-body">
                <div class="ai-title">{{ a.inviter_nickname }} 邀请你加入「{{ a.title }}」</div>
                <div class="ai-meta text-muted">活动时间 {{ fmtTime(a.activity_start) }} · 同意后直接入队</div>
              </div>
              <div class="ai-side">
                <el-button size="small" type="primary" :loading="inviteActingId === a.id" @click="acceptInvite(a)">同意</el-button>
                <el-button size="small" :disabled="!!inviteActingId" @click="rejectInvite(a)">拒绝</el-button>
              </div>
            </div>
          </div>
          <div v-if="incomingExitRequests.length" class="stagger-enter">
            <div class="sec-head">退出申请</div>
            <div v-for="a in incomingExitRequests" :key="a.id" class="app-item card ani-fade-in-up">
              <el-avatar :size="40" :src="a.avatar || undefined" style="background: var(--brand); cursor: pointer" @click="$router.push('/user/' + a.user_id)">{{ a.nickname?.slice(0, 1) }}</el-avatar>
              <div class="ai-body">
                <div class="ai-title" style="cursor: pointer" @click="$router.push('/user/' + a.user_id)">{{ a.nickname }}</div>
                <div class="ai-meta text-muted">申请退出「{{ a.title }}」 · 原因：{{ a.reason || '未填写' }}</div>
              </div>
              <div class="ai-side">
                <el-button size="small" type="primary" @click="approveExit(a)">通过</el-button>
                <el-button size="small" @click="rejectExit(a)">拒绝</el-button>
              </div>
            </div>
          </div>
          <div v-if="incomingDisbandVotes.length" class="stagger-enter">
            <div class="sec-head">解散表决</div>
            <div v-for="a in incomingDisbandVotes" :key="a.id" class="app-item card ani-fade-in-up">
              <div class="ai-emoji">🛑</div>
              <div class="ai-body">
                <div class="ai-title">队长申请解散「{{ a.title }}」</div>
                <div class="ai-meta text-muted">已有 {{ a.agreed }}/{{ a.total }} 人同意 · 原因：{{ a.reason || '未填写' }}</div>
              </div>
              <div class="ai-side" v-if="a.my_voted">
                <el-tag type="success">已同意解散</el-tag>
              </div>
              <div class="ai-side" v-else>
                <el-button size="small" type="danger" @click="approveDisband(a)">同意解散</el-button>
                <el-button size="small" @click="rejectDisband(a)">不同意</el-button>
              </div>
            </div>
          </div>
          <div v-if="incomingTransferRequests.length" class="stagger-enter">
            <div class="sec-head">转让申请</div>
            <div v-for="a in incomingTransferRequests" :key="a.id" class="app-item card ani-fade-in-up">
              <div class="ai-emoji">👑</div>
              <div class="ai-body">
                <div class="ai-title">{{ a.owner_nickname }} 申请将「{{ a.title }}」队长转让给你</div>
                <div class="ai-meta text-muted">原因：{{ a.reason || '未填写' }}</div>
              </div>
              <div class="ai-side">
                <el-button size="small" type="primary" @click="approveTransfer(a)">同意</el-button>
                <el-button size="small" @click="rejectTransfer(a)">拒绝</el-button>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane :label="`我发出的（${myCount}）`" name="mine">
        <div v-if="loading" style="cursor:default; pointer-events:none">
          <div v-for="i in 4" :key="i" class="app-item card">
            <div class="skeleton" style="width:40px;height:40px;border-radius:10px;flex-shrink:0"></div>
            <div class="ai-body">
              <div class="skeleton skeleton-title" style="width:55%"></div>
              <div class="skeleton skeleton-text short"></div>
            </div>
            <div class="ai-side">
              <div class="skeleton" style="width:56px;height:24px;border-radius:999px"></div>
            </div>
          </div>
        </div>
        <div v-else-if="!myCount" class="empty"><el-icon><MessageBox /></el-icon><p>还没有发出过申请</p><el-button type="primary" @click="$router.push('/hall')">去大厅</el-button></div>
        <div v-else>
          <div v-if="myList.length" class="stagger-enter">
            <div class="sec-head">加入申请</div>
            <div v-for="a in myList" :key="a.id" class="app-item card ani-fade-in-up">
              <div class="ai-emoji">{{ a.demand?.category_emoji }}</div>
              <div class="ai-body">
                <div class="ai-title" @click="$router.push('/demand/' + a.demand_id)">{{ a.demand?.title }}</div>
                <div class="ai-meta text-muted">申请于 {{ fmtTime(a.created_at) }} · 需求状态：{{ STATUS_LABEL[a.demand?.status] || a.demand?.status }}</div>
              </div>
              <div class="ai-side">
                <el-tag :type="appStatusType(a.status)">{{ appStatusLabel(a.status) }}</el-tag>
                <el-button v-if="a.status === 'pending'" size="small" text type="danger" @click="cancelApply(a)">取消申请</el-button>
                <el-button v-else-if="a.status === 'approved'" size="small" text type="primary" @click="$router.push('/teams')">查看队伍</el-button>
              </div>
            </div>
          </div>
          <div v-if="myExitRequests.length" class="stagger-enter">
            <div class="sec-head">我的退出申请</div>
            <div v-for="a in myExitRequests" :key="a.id" class="app-item card ani-fade-in-up">
              <div class="ai-emoji">🚪</div>
              <div class="ai-body">
                <div class="ai-title">退出「{{ a.title }}」</div>
                <div class="ai-meta text-muted">申请于 {{ fmtTime(a.created_at) }} · 原因：{{ a.reason || '未填写' }}</div>
              </div>
              <div class="ai-side">
                <el-tag :type="exitStatusType(a.status)">{{ exitStatusLabel(a.status) }}</el-tag>
              </div>
            </div>
          </div>
          <div v-if="myDisbandRequests.length" class="stagger-enter">
            <div class="sec-head">我的解散申请</div>
            <div v-for="a in myDisbandRequests" :key="a.id" class="app-item card ani-fade-in-up">
              <div class="ai-emoji">🛑</div>
              <div class="ai-body">
                <div class="ai-title">解散「{{ a.title }}」</div>
                <div class="ai-meta text-muted">同意进度 {{ a.agreed }}/{{ a.total }} · 原因：{{ a.reason || '未填写' }}</div>
              </div>
              <div class="ai-side">
                <el-tag :type="disbandStatusType(a.status)">{{ disbandStatusLabel(a.status) }}</el-tag>
              </div>
            </div>
          </div>
          <div v-if="myTransferRequests.length" class="stagger-enter">
            <div class="sec-head">我的转让申请</div>
            <div v-for="a in myTransferRequests" :key="a.id" class="app-item card ani-fade-in-up">
              <div class="ai-emoji">👑</div>
              <div class="ai-body">
                <div class="ai-title">将「{{ a.title }}」队长转让给 {{ a.member_nickname }}</div>
                <div class="ai-meta text-muted">申请于 {{ fmtTime(a.created_at) }} · 原因：{{ a.reason || '未填写' }}</div>
              </div>
              <div class="ai-side">
                <el-tag :type="transferStatusType(a.status)">{{ transferStatusLabel(a.status) }}</el-tag>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api/index.js'
import { STATUS_LABEL, fmtTime } from '../utils.js'

const tab = ref('incoming')
const myList = ref([])
const myExitRequests = ref([])
const myDisbandRequests = ref([])
const myTransferRequests = ref([])
const incoming = ref([])
const incomingInvites = ref([])
const incomingExitRequests = ref([])
const incomingDisbandVotes = ref([])
const incomingTransferRequests = ref([])
const loading = ref(true)
const inviteActingId = ref(null)

const myCount = computed(() => myList.value.length + myExitRequests.value.length + myDisbandRequests.value.length + myTransferRequests.value.length)
const incomingCount = computed(() => incoming.value.length + incomingInvites.value.length + incomingExitRequests.value.length + incomingDisbandVotes.value.length + incomingTransferRequests.value.length)

function appStatusLabel(s) {
  return { pending: '待处理', approved: '已通过', rejected: '已拒绝', exited: '已退出' }[s] || s
}
function appStatusType(s) {
  return { pending: 'warning', approved: 'success', rejected: 'info', exited: 'warning' }[s] || 'info'
}
function exitStatusLabel(s) {
  return { pending: '待处理', approved: '已同意', rejected: '已拒绝' }[s] || s
}
function exitStatusType(s) {
  return { pending: 'warning', approved: 'success', rejected: 'info' }[s] || 'info'
}
function disbandStatusLabel(s) {
  return { pending: '表决中', approved: '已解散', rejected: '已取消' }[s] || s
}
function disbandStatusType(s) {
  return { pending: 'warning', approved: 'success', rejected: 'info' }[s] || 'info'
}
function transferStatusLabel(s) {
  return { pending: '待对方同意', approved: '已同意', rejected: '已拒绝' }[s] || s
}
function transferStatusType(s) {
  return { pending: 'warning', approved: 'success', rejected: 'info' }[s] || 'info'
}

async function load() {
  loading.value = true
  try {
    const [mine, inc, invites] = await Promise.all([api.myApplications(), api.incoming(), api.receivedInvites()])
    myList.value = mine.applications || []
    myExitRequests.value = mine.exit_requests || []
    myDisbandRequests.value = mine.disband_requests || []
    myTransferRequests.value = mine.transfer_requests || []
    incoming.value = inc.applications || []
    incomingInvites.value = invites.invites || []
    incomingExitRequests.value = inc.exit_requests || []
    incomingDisbandVotes.value = inc.disband_votes || []
    incomingTransferRequests.value = inc.transfer_requests || []
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

async function approve(a) {
  try {
    const res = await api.approve(a.id)
    ElMessage.success('已通过，队伍已更新')
    a.status = 'approved'
    if (res.team_id) ElMessage.info('已加入队伍，可前往「我的搭子」聊天')
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function reject(a) {
  try {
    await api.reject(a.id)
    ElMessage.success('已拒绝')
    a.status = 'rejected'
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function acceptInvite(a) {
  if (inviteActingId.value) return
  inviteActingId.value = a.id
  try {
    await api.acceptInvite(a.id)
    ElMessage.success('已同意邀请，成功加入队伍')
    incomingInvites.value = incomingInvites.value.filter((x) => x.id !== a.id)
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    inviteActingId.value = null
  }
}

async function rejectInvite(a) {
  if (inviteActingId.value) return
  inviteActingId.value = a.id
  try {
    await api.rejectInvite(a.id)
    ElMessage.success('已拒绝邀请')
    incomingInvites.value = incomingInvites.value.filter((x) => x.id !== a.id)
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    inviteActingId.value = null
  }
}

async function cancelApply(a) {
  try {
    await ElMessageBox.confirm('确认取消本次申请？', '取消申请', { type: 'warning' })
  } catch { return }
  try {
    await api.cancelApplication(a.id)
    ElMessage.success('已取消申请')
    myList.value = myList.value.filter((x) => x.id !== a.id)
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function approveExit(a) {
  try {
    await api.approveExitRequest(a.id)
    ElMessage.success('已通过退出申请')
    incomingExitRequests.value = incomingExitRequests.value.filter((x) => x.id !== a.id)
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function rejectExit(a) {
  try {
    await api.rejectExitRequest(a.id)
    ElMessage.success('已拒绝退出申请')
    incomingExitRequests.value = incomingExitRequests.value.filter((x) => x.id !== a.id)
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function approveDisband(a) {
  try {
    const res = await api.approveDisband(a.id)
    if (res.agreed >= res.total) {
      ElMessage.success('已同意解散，队伍已解散')
    } else {
      ElMessage.success('已同意解散，等待其余成员表决')
    }
    a.my_voted = true
    a.agreed = res.agreed
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function rejectDisband(a) {
  try {
    await api.rejectDisband(a.id)
    ElMessage.success('已表示不同意，解散申请已取消')
    incomingDisbandVotes.value = incomingDisbandVotes.value.filter((x) => x.id !== a.id)
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function approveTransfer(a) {
  try {
    await api.approveTransfer(a.id)
    ElMessage.success('已同意转让，你已成为队长')
    incomingTransferRequests.value = incomingTransferRequests.value.filter((x) => x.id !== a.id)
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function rejectTransfer(a) {
  try {
    await api.rejectTransfer(a.id)
    ElMessage.success('已拒绝转让申请')
    incomingTransferRequests.value = incomingTransferRequests.value.filter((x) => x.id !== a.id)
  } catch (e) {
    ElMessage.error(e.message)
  }
}

onMounted(load)
</script>

<style scoped>
.app-item { display: flex; gap: 14px; align-items: center; padding: 14px 18px; }
.ai-emoji { font-size: 30px; }
.ai-body { flex: 1; min-width: 0; }
.ai-title { font-weight: 700; font-size: 17px; cursor: pointer; }
.ai-title:hover { color: var(--brand); }
.ai-meta { font-size: 14.5px; margin-top: 4px; color: var(--text-secondary); }
.ai-side { display: flex; gap: 6px; align-items: center; flex-shrink: 0; }
.card { margin-bottom: 10px; }
.sec-head { margin: 18px 2px 10px; padding-left: 10px; border-left: 3px solid var(--brand); font-size: 16px; font-weight: 700; color: var(--ink); }
</style>