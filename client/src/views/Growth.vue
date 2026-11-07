<template>
  <div>
    <div class="page-title">成长档案 🎓</div>
    <div class="page-sub">记录你在「校遇」的每一次相遇与成长，也是你的校园社交第二成绩单</div>

    <div v-if="loading" style="cursor:default; pointer-events:none">
      <div class="card tier-card">
        <div class="tier-main">
          <div class="skeleton" style="width:44px;height:44px;border-radius:12px;flex-shrink:0"></div>
          <div style="flex:1; min-width:0">
            <div class="skeleton skeleton-title" style="width:40%"></div>
            <div class="skeleton skeleton-text" style="width:80%"></div>
          </div>
        </div>
      </div>
      <div class="metric-grid mt-16">
        <div v-for="i in 6" :key="i" class="metric card">
          <div class="skeleton" style="width:40%;height:30px;margin:0 auto 12px"></div>
          <div class="skeleton skeleton-text short" style="margin:0 auto"></div>
        </div>
      </div>
      <div class="two-col mt-16">
        <div class="card">
          <div class="skeleton skeleton-title" style="width:50%"></div>
          <div v-for="i in 3" :key="i" class="skeleton skeleton-text" style="width:90%"></div>
        </div>
        <div class="card">
          <div class="skeleton skeleton-title" style="width:50%"></div>
          <div v-for="i in 3" :key="i" class="skeleton skeleton-text" style="width:90%"></div>
        </div>
      </div>
    </div>

    <template v-else>
      <!-- 会员等级 -->
      <div class="card tier-card">
        <div class="tier-main">
          <div class="tier-icon">{{ g.member_tier?.icon }}</div>
          <div>
            <div class="tier-label">{{ g.member_tier?.label }} 会员</div>
            <div class="tier-sub text-muted">当前等级权益：{{ (g.member_tier?.perks || []).join(' · ') }}</div>
            <div v-if="g.member_tier?.next" class="tier-next text-muted">升级到 {{ g.member_tier.next.label }} 还需再组队 {{ g.member_tier.next.min - (g.summary?.team_count || 0) }} 次</div>
          </div>
        </div>
      </div>

      <!-- 成绩单 -->
      <div class="metric-grid mt-16">
        <div class="metric card"><div class="m-num">{{ g.summary?.team_count || 0 }}</div><div class="m-label">累计组队</div></div>
        <div class="metric card"><div class="m-num">{{ g.summary?.done_team_count || 0 }}</div><div class="m-label">完成活动</div></div>
        <div class="metric card"><div class="m-num">{{ g.summary?.activity_count || 0 }}</div><div class="m-label">校园活动</div></div>
        <div class="metric card"><div class="m-num">{{ g.summary?.story_count || 0 }}</div><div class="m-label">发布故事</div></div>
        <div class="metric card"><div class="m-num">{{ g.summary?.good_count || 0 }}</div><div class="m-label">获得好评</div></div>
        <div class="metric card"><div class="m-num">{{ (g.summary?.credit_score ?? 0).toFixed(1) }}</div><div class="m-label">信誉分 · {{ g.summary?.credit_status }}</div></div>
      </div>

      <!-- 勋章 -->
      <div class="card mt-16">
        <div class="sec-title">我的勋章（{{ g.badges?.length || 0 }}）</div>
        <div v-if="!g.badges?.length" class="text-muted mt-8" style="font-size:15px; color: var(--text-secondary)">还没有勋章，多去组队解锁吧</div>
        <div v-else class="badge-list mt-8 stagger-enter">
          <div v-for="b in g.badges" :key="b.type" class="badge-item ani-fade-in-up" :title="b.desc">
            <span class="badge-emoji">🏅</span>
            <span class="badge-label">{{ b.label }}</span>
          </div>
        </div>
      </div>

      <div class="two-col mt-16">
        <!-- 老搭子 -->
        <div class="card">
          <div class="sec-title">老搭子</div>
          <div v-if="!g.old_dazis?.length" class="text-muted mt-8" style="font-size:15px; color: var(--text-secondary)">和多搭几次，TA 就会出现在这里</div>
          <div v-else class="mt-8 stagger-enter">
            <div v-for="o in g.old_dazis" :key="o.id" class="odz-row ani-fade-in-up" @click="$router.push('/user/' + o.id)">
              <el-avatar :size="36" :src="o.avatar || undefined" style="background: var(--brand); font-size:15px">{{ o.nickname.slice(0, 1) }}</el-avatar>
              <div class="odz-body">
                <span class="odz-name">{{ o.nickname }}</span>
                <span class="odz-meta">{{ o.college || '' }} {{ o.grade || '' }}</span>
              </div>
              <span class="rel-badge" :class="relClass(o.rel_level)">{{ o.rel_level }} · {{ o.times }} 次</span>
            </div>
          </div>
        </div>

        <!-- 往期纪念 -->
        <div class="card">
          <div class="sec-title">往期纪念</div>
          <div v-if="!g.memories?.length" class="text-muted mt-8" style="font-size:15px; color: var(--text-secondary)">完成的活动会在这里留作纪念</div>
          <div v-else class="mt-8 mem-list stagger-enter">
            <div v-for="(m, i) in g.memories" :key="i" class="mem-row ani-fade-in-up">
              <span class="mem-emoji">{{ catEmoji(m.category) }}</span>
              <div class="mem-body">
                <div class="mem-title">{{ m.title }}</div>
                <div class="mem-time text-muted">{{ fmtDate(m.activity_start) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import api from '../api/index.js'
import { catEmoji, fmtDate } from '../utils.js'

const g = ref({})
const loading = ref(true)

function relClass(level) {
  return { '老搭子': 'rel-old', '熟悉': 'rel-fam', '初识': 'rel-new' }[level] || 'rel-new'
}

onMounted(async () => {
  try {
    g.value = await api.growth()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.tier-card { background: linear-gradient(120deg, #fff7e6, #fff); }
.tier-main { display: flex; align-items: center; gap: 16px; }
.tier-icon { font-size: 44px; }
.tier-label { font-size: 20px; font-weight: 800; }
.tier-sub { font-size: 15px; color: var(--ink); margin-top: 6px; }
.tier-next { font-size: 15.5px; color: var(--ink); margin-top: 4px; }
.metric-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
@media (max-width: 700px) { .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.metric-grid .metric { margin-top: 0; text-align: center; padding: 16px; }
.m-num { font-size: 30px; font-weight: 800; color: var(--brand-text); }
.m-label { font-size: 15px; color: var(--ink); margin-top: 4px; }
.sec-title { font-size: 18px; font-weight: 700; color: var(--ink); }
.mt-8 { margin-top: 8px; } .mt-16 { margin-top: 16px; }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 700px) { .two-col { grid-template-columns: 1fr; } }
.two-col > .card { margin-top: 0; }
.badge-list { display: flex; flex-wrap: wrap; gap: 8px; }
.badge-item { display: flex; align-items: center; gap: 6px; background: var(--surface); border-radius: 10px; padding: 6px 10px; font-size: 13.5px; }
.badge-emoji { font-size: 22px; }
.badge-label { font-weight: 700; color: var(--ink); font-size: 15px; }
.odz-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--surface-muted); cursor: pointer; }
.odz-row:last-child { border-bottom: none; }
.odz-body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.odz-name { font-weight: 700; font-size: 16px; color: var(--ink); }
.odz-meta { font-size: 15px; color: var(--ink); }
.rel-badge { font-size: 14px; border-radius: 6px; padding: 2px 8px; white-space: nowrap; }
.rel-old { background: #e3f7ec; color: #0a7a4e; }
.rel-fam { background: #fff4e0; color: #b25e09; }
.rel-new { background: #eef2f0; color: #3b4c44; }
.mem-list { max-height: 340px; overflow-y: auto; }
.mem-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--surface-muted); }
.mem-row:last-child { border-bottom: none; }
.mem-emoji { font-size: 22px; }
.mem-body { flex: 1; min-width: 0; }
.mem-title { font-weight: 700; font-size: 15px; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mem-time { font-size: 14px; color: var(--text-secondary); }
</style>