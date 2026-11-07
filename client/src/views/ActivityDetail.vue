<template>
  <div v-if="a">
    <div class="card detail-head">
      <div class="dh-off" v-if="(isOwner || auth.user?.is_admin) && a.status === 'published'">
        <el-button type="danger" plain size="default" :loading="acting" @click="offActivity">下架该帖</el-button>
      </div>
      <div class="dh-off" v-else-if="isOwner && a.status === 'off'">
        <el-tag type="info" size="default" effect="plain">已下架</el-tag>
      </div>
      <div class="dh-top">
        <div class="dh-emoji">{{ a.category_emoji }}</div>
        <div class="dh-main">
          <div class="dh-title">
            {{ a.title }}
            <span class="badge-teal" style="font-size:17px">{{ a.category_label }}</span>
          </div>
          <div class="dh-meta">
            <span v-if="a.start_time">🕐 {{ fmtTime(a.start_time) }}{{ a.end_time ? ' ~ ' + fmtTime(a.end_time) : '' }}</span>
            <span v-if="a.location_name">📍 {{ a.location_name }}</span>
            <span>👥 {{ a.quota ? `名额 ${a.quota} 人` : '名额不限' }}</span>
            <span>🙋 已报名 {{ a.signup_count }} 人</span>
            <span>📅 发布于 {{ fmtTime(a.created_at) }}</span>
          </div>
          <div class="dh-tags" v-if="a.organization || a.tags?.length">
            <span v-if="a.organization" class="org-text">主办方：{{ a.organization }}</span>
            <el-tag v-for="t in a.tags" :key="t" size="default" effect="plain">{{ t }}</el-tag>
          </div>
        </div>
      </div>

      <div class="dh-desc" v-if="a.description">{{ a.description }}</div>
      <div class="contact-box" v-if="a.contact">📞 报名/联系：{{ a.contact }}</div>

      <div class="publish-images" v-if="a.publish_images?.length">
        <div class="pi-title">📷 活动附图</div>
        <div class="pi-grid">
          <el-image v-for="(img, i) in a.publish_images" :key="i" :src="img" :preview-src-list="a.publish_images" :initial-index="i" fit="cover" class="pi-img" preview-teleported />
        </div>
      </div>

      <div class="publish-attachments" v-if="a.publish_attachments?.length">
        <div class="pa-title">📎 活动附件</div>
        <div class="pa-list">
          <a v-for="(att, i) in a.publish_attachments" :key="i" :href="att.data" :download="att.name" class="pa-item" target="_blank">
            <span class="pa-icon">📄</span>
            <span class="pa-name">{{ att.name }}</span>
          </a>
        </div>
      </div>

      <div class="safety-tip">🔔 温馨提示：参加活动请通过官方渠道核实信息，谨防以「保证金」「报名费」等名义的私下转账。</div>

      <div class="dh-actions">
        <template v-if="isOwner">
          <el-button v-if="a.status === 'published'" size="large" type="success" :loading="acting" @click="completeActivity">结束活动</el-button>
          <el-tag v-else size="default" type="info" effect="plain">{{ a.status === 'off' ? '已下架' : '活动已结束' }}</el-tag>
        </template>
        <template v-else>
          <el-button v-if="a.my_signup === 'signed' && a.signup_open" size="large" type="warning" plain :loading="acting" @click="cancelSignup">取消报名</el-button>
          <el-tag v-else-if="a.my_signup === 'signed'" size="default" type="info" effect="plain">已报名（报名截止）</el-tag>
          <el-button v-else-if="a.status === 'published' && a.signup_open" size="large" type="primary" :loading="acting" @click="signup">立即报名</el-button>
          <el-button v-else-if="a.status === 'published' && a.phase === 'ongoing'" size="large" disabled>活动已开始，无法报名</el-button>
          <el-button v-else-if="a.status === 'published'" size="large" disabled>报名已截止</el-button>
          <el-tag v-else size="default" type="info" effect="plain">{{ a.status === 'off' ? '已下架' : '活动已结束' }}</el-tag>
        </template>
        <el-button v-if="!isOwner" size="large" :type="a.favorited ? 'warning' : 'default'" :loading="acting" @click="toggleFav">{{ a.favorited ? '已收藏' : '收藏' }}</el-button>
      </div>
    </div>

    <div class="card">
      <div class="sec-title">发布者</div>
      <div class="owner-card mt-8" role="button" tabindex="0" @click="$router.push(`/user/${a.owner.id}`)" @keydown.enter="$router.push(`/user/${a.owner.id}`)">
        <el-avatar :size="50" :src="a.owner.avatar || undefined" style="background: var(--brand)">{{ a.owner.nickname.slice(0, 1) }}</el-avatar>
        <div class="oc-body">
          <div class="oc-name">{{ a.owner.nickname }} <span class="credit-tier">{{ a.owner.tier }}</span></div>
          <div class="oc-sub text-muted">
            {{ a.owner.college || '未填学校' }}{{ a.owner.grade ? ' · ' + a.owner.grade : '' }}
            <el-tag v-if="a.owner.student_verified" size="default" type="success" effect="plain">已认证</el-tag>
          </div>
        </div>
        <div class="oc-side">
          <div class="score-badge">{{ (a.owner?.credit_score ?? 0).toFixed(1) }}</div>
          <div class="text-muted" style="font-size:15px; color: var(--text-secondary)">信誉分</div>
        </div>
      </div>
    </div>

    <div class="card" v-if="isOwner">
      <div class="sec-title">报名名单（{{ roster.length }} 人）</div>
      <div v-if="!roster.length" class="text-muted mt-8" style="font-size:16px">暂无报名</div>
      <div v-else class="roster-list mt-8">
        <div v-for="s in roster" :key="s.id" class="roster-item" role="button" tabindex="0" @click="$router.push('/user/' + s.id)" @keydown.enter="$router.push('/user/' + s.id)">
          <el-avatar :size="32" :src="s.avatar || undefined" style="background: var(--brand); font-size:14px">{{ s.nickname.slice(0, 1) }}</el-avatar>
          <span class="ro-name">{{ s.nickname }}</span>
          <span class="text-muted" style="font-size:15px; color: var(--text-secondary)">{{ s.college || '' }}{{ s.grade ? ' · ' + s.grade : '' }}</span>
          <el-tag size="default" type="warning" effect="plain">已报名</el-tag>
        </div>
      </div>
    </div>
  </div>

  <div v-else-if="loading" class="card detail-head">
    <div class="dh-top">
      <div class="skeleton" style="width:60px; height:60px; border-radius:12px; flex-shrink:0"></div>
      <div class="dh-main">
        <div class="skeleton skeleton-title" style="width:50%"></div>
        <div class="skeleton skeleton-text" style="width:80%; margin-top:12px"></div>
        <div class="skeleton skeleton-text short" style="margin-top:8px"></div>
        <div class="skeleton skeleton-text" style="width:100%; margin-top:20px"></div>
        <div class="skeleton skeleton-text" style="width:92%"></div>
        <div class="skeleton skeleton-text" style="width:68%"></div>
      </div>
    </div>
  </div>
  <div v-else class="empty"><p style="font-size:17px">活动不存在或已下架</p><el-button size="large" @click="$router.push('/activities')">返回活动大厅</el-button></div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api/index.js'
import { useAuth } from '../store/auth.js'
import { fmtTime } from '../utils.js'

const route = useRoute()
const auth = useAuth()

const a = ref(null)
const loading = ref(true)
const acting = ref(false)
const roster = ref([])

const isOwner = computed(() => !!auth.user && a.value?.owner?.id === auth.user.id)

async function load() {
  loading.value = true
  try {
    const res = await api.getActivity(route.params.id)
    a.value = res.activity
    if (a.value?.owner?.id === auth.user?.id) loadRoster()
  } catch (e) {
    ElMessage.error(e.message)
    a.value = null
  } finally {
    loading.value = false
  }
}

async function loadRoster() {
  try {
    const res = await api.activitySignups(route.params.id)
    roster.value = res.signups || []
  } catch { /* 非发布者忽略 */ }
}

async function signup() {
  acting.value = true
  try {
    await api.signupActivity(a.value.id)
    ElMessage.success('报名成功')
    refresh()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    acting.value = false
  }
}

async function cancelSignup() {
  acting.value = true
  try {
    await api.cancelActivitySignup(a.value.id)
    ElMessage.success('已取消报名')
    refresh()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    acting.value = false
  }
}

async function completeActivity() {
  try {
    await ElMessageBox.confirm('确认活动已结束？活动结束后将不再接受新的报名。', '结束活动', { type: 'warning' })
  } catch { return }
  acting.value = true
  try {
    await api.completeActivity(a.value.id)
    ElMessage.success('活动已结束')
    refresh()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    acting.value = false
  }
}

async function offActivity() {
  if (!isOwner && auth.user?.is_admin) {
    // 管理员下架：必须填写缘由，同步告知发布者
    const { value } = await ElMessageBox.prompt('请填写下架缘由（将同步告知发布者）', '下架该帖', {
      confirmButtonText: '确认下架',
      cancelButtonText: '取消',
      inputValidator: (v) => (v && v.trim() ? true : '请填写缘由'),
      inputErrorMessage: '请填写缘由'
    }).catch(() => ({}))
    if (!value) return
    acting.value = true
    try {
      await api.offActivity(a.value.id, value.trim())
      ElMessage.success('活动已下架')
      refresh()
    } catch (e) {
      ElMessage.error(e.message)
    } finally {
      acting.value = false
    }
    return
  }
  try {
    await ElMessageBox.confirm('确认下架该活动？下架后活动大厅将不再展示，可在「我的发布」中查看。', '下架该帖', { type: 'warning' })
  } catch { return }
  acting.value = true
  try {
    await api.offActivity(a.value.id)
    ElMessage.success('活动已下架')
    refresh()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    acting.value = false
  }
}

async function toggleFav() {
  if (!auth.user) return ElMessage.warning('请先登录')
  acting.value = true
  try {
    if (a.value.favorited) {
      await api.unfavoriteActivity(a.value.id)
      a.value.favorited = false
      ElMessage.success('已取消收藏')
    } else {
      await api.favoriteActivity(a.value.id)
      a.value.favorited = true
      ElMessage.success('已收藏')
    }
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    acting.value = false
  }
}

function refresh() {
  const id = a.value.id
  api.getActivity(id).then((res) => {
    a.value = res.activity
    if (a.value?.owner?.id === auth.user?.id) loadRoster()
  })
}

onMounted(load)
</script>

<style scoped>
.detail-head { position: relative; }
.dh-off { position: absolute; top: 16px; right: 16px; z-index: 2; }
.dh-top { display: flex; gap: 16px; }
.dh-emoji { font-size: 58px; }
.dh-main { flex: 1; min-width: 0; }
.dh-title { font-size: 26px; font-weight: 800; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.dh-meta { color: var(--text-secondary); font-size: 17px; margin-top: 10px; display: flex; flex-wrap: wrap; gap: 16px; align-items: center; }
.dh-tags { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.org-text { font-size: 16px; color: var(--ink); font-weight: 600; margin-right: 4px; }
.dh-desc { margin-top: 20px; color: var(--text-secondary); line-height: 1.8; white-space: pre-wrap; font-size: 17px; }
.contact-box { margin-top: 16px; padding: 14px 18px; background: var(--brand-soft); border: 1px solid #bfe6d6; border-radius: 10px; color: var(--brand-text); font-weight: 600; font-size: 16px; }
.publish-images { margin-top: 18px; }
.pi-title { font-size: 16px; font-weight: 700; color: var(--ink); margin-bottom: 10px; }
.pi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
@media (max-width: 600px) { .pi-grid { grid-template-columns: repeat(2, 1fr); } }
.pi-img { width: 100%; aspect-ratio: 16/10; border-radius: 8px; border: 1px solid var(--border); object-fit: cover; }
.publish-attachments { margin-top: 18px; }
.pa-title { font-size: 16px; font-weight: 700; color: var(--ink); margin-bottom: 10px; }
.pa-list { display: flex; flex-direction: column; gap: 8px; }
.pa-item { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; text-decoration: none; color: var(--brand); transition: background .15s; }
.pa-item:hover { background: var(--brand-soft); }
.pa-icon { font-size: 18px; }
.pa-name { font-size: 15px; font-weight: 600; word-break: break-all; }
.safety-tip { margin-top: 16px; padding: 14px 16px; background: #fff7e6; border: 1px solid #ffe3b0; border-radius: 10px; color: #8a5b12; font-size: 15px; line-height: 1.6; }
.dh-actions { margin-top: 22px; display: flex; gap: 12px; align-items: center; }
.owner-card { display: flex; gap: 14px; align-items: center; padding: 14px 16px; border: 1px solid var(--border); border-radius: 10px; cursor: pointer; }
.owner-card:hover { background: var(--surface); }
.oc-body { flex: 1; }
.oc-name { font-weight: 700; font-size: 18px; }
.oc-sub { font-size: 15px; margin-top: 4px; display: flex; gap: 8px; align-items: center; }
.oc-side { text-align: center; }
.roster-list { display: flex; flex-direction: column; gap: 10px; }
.roster-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px; cursor: pointer; }
.ro-name { font-weight: 700; font-size: 16px; flex: 1; }
</style>