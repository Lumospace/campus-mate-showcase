<template>
  <div>
    <div class="flex-between">
      <div>
        <div class="page-title">活动日历</div>
        <div class="page-sub">仅展示本周未满员的需求</div>
      </div>
      <div class="flex gap-8 week-nav">
        <el-button @click="shift(-1)">‹ 上一周</el-button>
        <el-button type="primary" @click="shift(1)">下一周 ›</el-button>
      </div>
    </div>

    <div v-if="loading" class="cal-grid">
      <div v-for="i in 7" :key="i" class="cal-day">
        <div class="skeleton skeleton-text" style="width:70%; margin:0 auto 14px"></div>
        <div v-for="j in 3" :key="j" class="cal-event" style="cursor:default; pointer-events:none">
          <div class="skeleton skeleton-text" style="width:55%"></div>
          <div class="skeleton skeleton-text" style="width:88%"></div>
          <div class="skeleton" style="width:70px; height:20px; border-radius:8px"></div>
        </div>
      </div>
    </div>
    <div v-else class="cal-grid stagger-enter">
      <div v-for="d in days" :key="d.date" class="cal-day" :class="{ today: d.date === todayStr }">
        <div class="cd-head">{{ d.weekday }} {{ d.date.slice(5).replace('-', '/') }}</div>
        <div v-if="!d.items.length" class="cal-empty">—</div>
        <div v-for="it in d.items" :key="it.id" class="cal-event ani-fade-in-up" @click="$router.push(`/demand/${it.id}`)">
          <div class="ce-time">{{ fmtHM(it.activity_start) }} {{ catEmoji(it.category) }}</div>
          <div class="ce-title">{{ it.title }}</div>
          <div class="ce-count" :class="{ full: it.applicant_count >= it.need_count }">👥 {{ it.applicant_count }}/{{ it.need_count }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import api from '../api/index.js'
import { catEmoji, fmtHM } from '../utils.js'

const days = ref([])
const week = ref(0)
const loading = ref(true)
const now = new Date()
const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

async function load() {
  loading.value = true
  try {
    const res = await api.calendar(week.value)
    days.value = (res.days || []).map((d) => ({ ...d, items: (d.items || []).filter((it) => it.applicant_count < it.need_count) }))
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}
function shift(n) { week.value = Math.max(-52, Math.min(52, week.value + n)); load() }
onMounted(load)
</script>

<style scoped>
.cal-empty { color: var(--muted); font-size: 15px; text-align: center; padding: 20px 0; }
.ce-time { font-size: 14px; color: var(--brand-text); font-weight: 600; }
.ce-title { font-size: 15px; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ce-count { font-size: 14px; color: var(--ink); }
.ce-count.full { color: var(--success); }

.page-title{font-size:30px}
.page-sub{font-size:17px;color:var(--text-secondary)}
.cd-head{font-size:15px;color:var(--ink)}
.page-sub{font-size:19px}
.week-nav :deep(.el-button){font-size:18px;font-weight:700;height:44px;padding:0 22px}
.cd-head{font-size:19px;font-weight:800;color:var(--ink);text-align:center;margin-bottom:10px;position:sticky;top:0;background:inherit;z-index:1;padding-bottom:6px}
.cal-grid{height:calc(100vh - 250px);min-height:560px}
.cal-day{display:flex;flex-direction:column;min-height:0;overflow-y:auto;padding:14px}
@media (max-width:768px){.cal-grid{height:auto;min-height:0}.cal-day{height:auto;overflow-y:visible}}
</style>