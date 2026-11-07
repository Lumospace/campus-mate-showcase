<template>
  <div>
    <div class="page-title">搭子周报</div>
    <div class="page-sub">过去 7 天你的搭子足迹与信誉动态</div>

    <div v-if="loading" style="cursor:default; pointer-events:none">
      <div class="card hero">
        <div class="skeleton skeleton-title" style="width:30%;margin:0 auto 14px"></div>
        <div class="week-grid">
          <div v-for="i in 4" :key="i" class="wk">
            <div class="skeleton" style="width:52%;height:30px;margin:0 auto 12px"></div>
            <div class="skeleton skeleton-text short" style="margin:0 auto"></div>
          </div>
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
      <div class="card hero">
        <div class="hero-tag">📅 本周小结</div>

        <div class="week-grid">
          <div class="wk"><div class="wk-num">{{ week.team_count }}</div><div class="wk-label">新组队</div></div>
          <div class="wk"><div class="wk-num">{{ week.message_count }}</div><div class="wk-label">消息</div></div>
          <div class="wk"><div class="wk-num">{{ (week.credit_score ?? 0).toFixed(1) }}</div><div class="wk-label">当前信誉分</div></div>
          <div class="wk"><div class="wk-num wk-status">{{ week.credit_status }}</div><div class="wk-label">信誉状态</div></div>
        </div>
      </div>

      <div class="two-col mt-16">
        <div class="card">
          <div class="sec-title">近期信誉动态</div>
          <div v-if="!perks.length" class="text-muted mt-8" style="font-size:15px; color: var(--text-secondary)">本周暂无信誉变化</div>
          <div v-else class="mt-8 perk-list stagger-enter">
            <div v-for="(p, i) in perks" :key="i" class="perk-row ani-fade-in-up">
              <span :class="p.delta > 0 ? 'delta-pos' : 'delta-neg'">{{ p.delta > 0 ? '+' : '' }}{{ p.delta.toFixed(2) }}</span>
              <span class="perk-action">{{ p.action }}</span>
              <span class="text-muted ml-auto" style="font-size:15px; color: var(--ink)">{{ fmtTime(p.created_at) }}</span>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="sec-title">值得续约的搭子</div>
          <div v-if="!renew_hint.length" class="text-muted mt-8" style="font-size:15px; color: var(--text-secondary)">暂无可续约搭子</div>
          <div v-else class="mt-8 renew-list stagger-enter">
            <div v-for="r in renew_hint" :key="r.id" class="od-item ani-fade-in-up" @click="$router.push('/user/' + r.id)">
              <el-avatar :size="32" :src="r.avatar || undefined" style="background: var(--brand); font-size:14px">{{ r.nickname.slice(0, 1) }}</el-avatar>
              <span style="font-weight:700; font-size:16px; color: var(--ink)">{{ r.nickname }}</span>
              <span class="text-muted ml-auto" style="font-size:15px; color: var(--ink)">最近 {{ fmtDate(r.last) }}</span>
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

import { fmtTime, fmtDate } from '../utils.js'


const week = ref({ team_count: 0, message_count: 0, credit_score: 0, credit_status: '' })
const perks = ref([])
const renew_hint = ref([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const res = await api.weekly()
    week.value = res.week ?? {}
    perks.value = res.perks || []
    renew_hint.value = res.renew_hint || []
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>

<style scoped>
.two-col { grid-template-columns: repeat(2, 1fr); gap: 20px; }
.two-col > .card { margin-top: 0; }
.perk-list, .renew-list { max-height: 280px; overflow-y: auto; }
.hero { padding: 24px; background: linear-gradient(140deg, #e9f7f2, #fff); }
.hero-tag { color: var(--ink); font-size: 22px; font-weight: 700; text-align: center; margin-bottom: 14px; }

.week-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.wk { background: #fff; border: 1px solid var(--border); border-radius: 10px; padding: 14px; text-align: center; }
.wk-num { font-size: 30px; font-weight: 800; color: var(--ink); }
.wk-num.wk-status { font-size: 30px; }
.wk-label { font-size: 15px; color: var(--ink); margin-top: 4px; }
.sec-title { font-size: 18px; font-weight: 700; color: var(--ink); }
.mt-8 { margin-top: 8px; } .mt-16 { margin-top: 16px; } .ml-auto { margin-left: auto; }
.perk-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--surface-muted); }
.perk-action { font-size: 15.5px; color: var(--ink); }
.delta-pos { color: var(--success); font-weight: 700; font-size: 15.5px; }
.delta-neg { color: var(--danger); font-weight: 700; font-size: 15.5px; }
.od-item { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--surface-muted); cursor: pointer; }
</style>