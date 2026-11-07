<template>
  <div v-if="profile">
    <div class="card up-head">
      <el-avatar :size="76" :src="profile.avatar || undefined" style="background: var(--brand); font-size:32px">{{ profile.nickname.slice(0, 1) }}</el-avatar>
      <div class="uh-main">
        <div class="uh-name">
          {{ profile.nickname }}
          <span class="credit-tier">{{ credit.tier_icon }} {{ credit.tier_label }}</span>
          <el-tag v-if="profile.student_verified" size="large" type="success">学生认证</el-tag>
          <el-tag v-if="profile.email_verified" size="large" type="info" effect="plain">邮箱认证</el-tag>
        </div>
        <div class="uh-sub text-muted">
          {{ profile.college || '未填学校' }}{{ profile.grade ? ' · ' + profile.grade : '' }}
          <el-tag v-if="profile.consumption_level" size="large" effect="plain">消费：{{ profile.consumption_level }}</el-tag>
        </div>
        <div class="uh-bio" v-if="profile.bio">{{ profile.bio }}</div>
      </div>
      <div class="uh-actions">
        <el-button v-if="!isSelf" type="danger" @click="block">拉黑</el-button>
        <el-button @click="goStories">看看他的故事</el-button>
      </div>
    </div>

    <div class="two-col mt-16 up-grid">
      <div class="card g-archive">
        <div class="sec-title">搭子档案</div>
        <div class="stat-row mt-8">
          <div class="stat"><div class="stat-num">{{ (credit.credit_score ?? 0).toFixed(1) }}</div><div class="stat-label">信誉分</div></div>
          <div class="stat"><div class="stat-num">{{ team_count }}</div><div class="stat-label">组队次数</div></div>
          <div class="stat"><div class="stat-num">{{ rating_avg.avg || '—' }}</div><div class="stat-label">平均评分 ({{ rating_avg.count }})</div></div>
          <div class="stat"><div class="stat-num">{{ credit.good_count }}</div><div class="stat-label">好评</div></div>
        </div>
      </div>

      <div class="card g-cloud">
        <div class="sec-title">标签云</div>
        <div v-if="!tagCloud.length" class="text-muted mt-8">暂无评价标签</div>
        <div v-else class="cloud mt-8">
          <span v-for="t in tagCloud" :key="t.tag" class="cloud-tag" :style="{ fontSize: 15 + Math.min(t.count, 4) * 2 + 'px' }">{{ t.tag }}<span class="cloud-cnt">{{ t.count }}</span></span>
        </div>
      </div>

      <div class="card g-tags" v-if="tags?.length">
        <div class="sec-title">兴趣标签</div>
        <div class="mt-8">
          <el-tag v-for="t in tags" :key="t" size="large" class="mr-8 tag-chip">{{ t }}</el-tag>
        </div>
      </div>

      <div class="card g-old">
        <div class="sec-title">老搭子</div>
        <div v-if="!old_dazis.length" class="text-muted mt-8">暂无老搭子</div>
        <div v-else>
          <div v-for="o in old_dazis.slice(0, 3)" :key="o.id" class="od-item" @click="$router.push('/user/' + o.id)">
            <el-avatar :size="36" :src="o.avatar || undefined" style="background: var(--brand); font-size:16px">{{ o.nickname.slice(0, 1) }}</el-avatar>
            <span class="od-name">{{ o.nickname }}</span>
            <span class="od-meta">合作 {{ o.times }} 次</span>
            <span class="badge-teal ml-auto">{{ o.credit_score.toFixed(1) }}</span>
          </div>
        </div>
      </div>

      <div class="card g-badge">
        <div class="sec-title">勋章</div>
        <div v-if="!badges.length" class="text-muted mt-8">暂无勋章</div>
        <div v-else class="badge-list mt-8">
          <div v-for="b in badges" :key="b.type" class="badge-item">
            <div class="badge-icon">🏅</div>
            <div><div class="badge-name">{{ b.label }}</div><div class="badge-desc">{{ b.desc }}</div></div>
          </div>
        </div>
      </div>
    </div>

    <div class="card mt-16" v-if="circles !== null">
      <div class="sec-title">兴趣圈</div>
      <div v-if="!circles.length" class="text-muted mt-8">暂无加入的兴趣圈</div>
      <div v-else class="circle-grid">
        <div v-for="c in circles" :key="c.id" class="circle-card" @click="$router.push('/circles/' + c.id)">
          <div class="cc-name">{{ c.name }}<span class="cc-cat">{{ c.category || '未分类' }}</span></div>
          <div class="cc-desc">{{ c.description || '暂无简介' }}</div>
          <div class="cc-count">👥 {{ c.member_count }} 人</div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="empty"><p>用户不存在</p></div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api/index.js'
import { useAuth } from '../store/auth.js'

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const profile = ref(null)
const isSelf = computed(() => profile.value && auth.user && profile.value.id === auth.user.id)
const credit = ref({ credit_score: 0, tier_label: '', tier_icon: '', good_count: 0 })
const team_count = ref(0)
const old_dazis = ref([])
const badges = ref([])
const rating_avg = ref({ avg: 0, count: 0 })
const tags = ref([])
const tagCloud = ref([])
const circles = ref(null)

async function load() {
  try {
    const res = await api.getProfile(route.params.id)
    profile.value = res.profile
    credit.value = res.credit ?? {}
    team_count.value = res.team_count
    old_dazis.value = res.old_dazis || []
    badges.value = res.badges || []
    rating_avg.value = res.rating_avg ?? {}
    tags.value = res.profile.tags || []
    tagCloud.value = Object.entries(res.tag_cloud || {}).map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count)
    circles.value = res.circles ?? null
  } catch (e) {
    ElMessage.error(e.message)
    profile.value = null
  }
}

async function block() {
  try {
    await ElMessageBox.confirm('拉黑后将不再看到该用户的任何需求，确认？', '拉黑确认', { type: 'warning' })
  } catch { return }
  try {
    await api.block(profile.value.id)
    ElMessage.success('已拉黑')
  } catch (e) {
    ElMessage.error(e.message)
  }
}

function goStories() {
  router.push({ path: '/stories', query: { author: profile.value.nickname } })
}

onMounted(load)
watch(() => route.params.id, () => load())
</script>

<style scoped>
.up-head { display: flex; gap: 20px; align-items: flex-start; }
.uh-main { flex: 1; }
.uh-name { font-size: 30px; font-weight: 800; color: var(--ink); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.uh-sub { font-size: 17px; color: var(--ink); margin-top: 6px; display: flex; gap: 8px; align-items: center; }
.uh-bio { margin-top: 8px; color: var(--ink); font-size: 18px; font-weight: 500; line-height: 1.7; }
.uh-actions { flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 10px; align-self: stretch; justify-content: space-between; }
.up-head .el-tag { font-size: 16px; font-weight: 700; }
.sec-title { font-size: 22px; font-weight: 800; color: var(--ink); }
.mt-8 { margin-top: 8px; } .mt-16 { margin-top: 16px; } .mr-8 { margin-right: 8px; } .ml-auto { margin-left: auto; }

/* 对齐网格：左列三卡（档案/标签云/兴趣标签），右列（老搭子对齐档案，勋章对齐标签云下到兴趣标签下） */
.up-grid .card { margin-top: 0; }
.up-grid .g-archive { grid-column: 1; grid-row: 1; display: flex; flex-direction: column; min-height: 280px; }
.up-grid .g-archive .stat-row { margin: auto 0; }
.up-grid .g-cloud   { grid-column: 1; grid-row: 2; }
.up-grid .g-tags    { grid-column: 1; grid-row: 3; }
.up-grid .g-old     { grid-column: 2; grid-row: 1; overflow: hidden; }
.up-grid .g-badge   { grid-column: 2; grid-row: 2 / 4; }
@media (max-width: 800px) {
  .up-grid .card { grid-column: auto; grid-row: auto; min-height: 0; }
}

.stat-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.stat { text-align: center; padding: 14px 10px; background: var(--surface); border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 96px; }
.stat-num { font-size: 30px; font-weight: 800; color: var(--brand-text); }
.stat-label { font-size: 17px; font-weight: 700; color: var(--ink); margin-top: 4px; }
.cloud { display: flex; flex-wrap: wrap; gap: 12px; }
.cloud-tag { color: var(--brand-text); font-weight: 800; }
.cloud-cnt { color: var(--text-secondary); font-size: 15px; margin-left: 3px; }
.tag-chip { font-size: 16px; font-weight: 700; color: var(--ink); border-color: var(--border); background: var(--surface); }
.od-item { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--surface-muted); cursor: pointer; }
.od-item:hover .od-name { color: var(--brand); }
.od-name { font-weight: 800; font-size: 18px; color: var(--ink); }
.od-meta { color: var(--text-secondary); font-size: 15px; font-weight: 600; }
.od-item .badge-teal { font-size: 16px; font-weight: 700; }
.badge-item { display: flex; gap: 12px; align-items: center; padding: 8px 0; }
.badge-icon { font-size: 32px; }
.badge-name { font-size: 18px; font-weight: 800; color: var(--ink); }
.badge-desc { color: var(--text-secondary); font-size: 15px; }
.circle-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
@media (max-width: 900px) { .circle-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 600px) { .circle-grid { grid-template-columns: 1fr; } }
.circle-card { cursor: pointer; border: 1px solid var(--surface-muted); border-radius: 12px; padding: 14px; background: var(--surface); }
.circle-card:hover { border-color: var(--brand); }
.cc-name { font-weight: 700; font-size: 17px; color: var(--ink); display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
.cc-cat { font-size: 13px; color: var(--brand-text); background: var(--brand-soft); border-radius: 6px; padding: 1px 8px; font-weight: 600; }
.cc-desc { margin-top: 6px; font-size: 14.5px; color: var(--text-secondary); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.cc-count { margin-top: 8px; font-size: 14px; color: var(--text-secondary); font-weight: 600; }
</style>