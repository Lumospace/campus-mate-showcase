<template>
  <div>
    <div class="page-title">我的收藏</div>
    <div class="page-sub">收藏过的需求与活动都在这里，随时一键查看</div>

    <el-tabs v-model="tab">
      <el-tab-pane :label="`搭子需求（${list.length}）`" name="demands">
        <div v-if="loading" style="cursor:default; pointer-events:none">
          <div v-for="i in 4" :key="i" class="demand-item" style="cursor:default">
            <div class="skeleton" style="width:54px;height:54px;border-radius:12px;flex-shrink:0"></div>
            <div class="di-body">
              <div class="skeleton skeleton-title" style="width:60%"></div>
              <div class="skeleton skeleton-text" style="width:80%"></div>
              <div class="skeleton skeleton-text short"></div>
            </div>
            <div class="di-side">
              <div class="skeleton" style="width:88px;height:32px;border-radius:8px"></div>
            </div>
          </div>
        </div>
        <div v-else-if="!list.length" class="empty">
          <p>还没有收藏任何需求</p>
          <el-button type="primary" @click="$router.push('/hall')">去大厅逛逛</el-button>
        </div>
        <div v-else class="stagger-enter">
          <div v-for="d in list" :key="d.id" class="demand-item ani-fade-in-up" role="button" tabindex="0" @click="$router.push('/demand/' + d.id)" @keydown.enter="$router.push('/demand/' + d.id)">
            <div class="di-emoji">{{ d.category_emoji }}</div>
            <div class="di-body">
              <div class="di-title-row"><div class="di-title">{{ d.title }}</div><span class="owner-inline"><span class="badge-teal">{{ d.owner?.credit_score?.toFixed(1) }} 分</span><span class="credit-tier">{{ d.owner?.nickname }}</span></span></div><div class="di-meta"><span>{{ d.category_label }}</span><span v-if="d.activity_start">🕒 {{ d.activity_start.slice(5, 16).replace('T', ' ') }}</span><span v-if="d.location_name">📍 {{ d.location_name }}</span><span class="people-count">👥 {{ d.applicant_count }}/{{ d.need_count }}</span></div>
              <div class="di-tags" v-if="d.tags?.length">
                <el-tag v-for="t in d.tags" :key="t" size="small" type="info" effect="plain">{{ t }}</el-tag>
              </div>
            </div>
            <div class="di-side">
              <el-button size="default" plain type="danger" @click.stop="unfav(d)">取消收藏</el-button>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane :label="`校园活动（${actFavs.length}）`" name="activities">
        <div v-if="loadingActs" style="cursor:default; pointer-events:none">
          <div v-for="i in 3" :key="i" class="act-fav-item" style="cursor:default">
            <div class="skeleton" style="width:54px;height:54px;border-radius:12px;flex-shrink:0"></div>
            <div class="afi-body">
              <div class="skeleton skeleton-title" style="width:60%"></div>
              <div class="skeleton skeleton-text" style="width:80%"></div>
            </div>
          </div>
        </div>
        <div v-else-if="!actFavs.length" class="empty">
          <p>还没有收藏任何校园活动</p>
          <el-button type="primary" @click="$router.push('/activities')">去活动大厅逛逛</el-button>
        </div>
        <div v-else class="act-fav-list">
          <div v-for="a in actFavs" :key="a.id" class="act-fav-item ani-fade-in-up" role="button" tabindex="0" @click="$router.push(`/activity/${a.id}`)" @keydown.enter="$router.push(`/activity/${a.id}`)">
            <div class="di-emoji">{{ a.category_emoji }}</div>
            <div class="afi-body">
              <div class="afi-title">{{ a.title }} <span class="badge-teal">{{ a.category_label }}</span><el-tag v-if="a.activity_format" size="small" type="info" effect="plain" class="ml-6">{{ a.activity_format === 'offline' ? '线下' : '线上' }}</el-tag></div>
              <div class="afi-meta">
                <span v-if="a.start_time">🕐 {{ fmtTime(a.start_time) }}</span>
                <span v-if="a.location_name">📍 {{ a.location_name }}</span>
              </div>
            </div>
            <div class="di-side">
              <el-button size="default" plain type="danger" @click.stop="unfavAct(a)">取消收藏</el-button>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import api from '../api/index.js'
import { fmtTime } from '../utils.js'

const tab = ref('demands')
const list = ref([])
const loading = ref(true)
const actFavs = ref([])
const loadingActs = ref(true)

function alignNames() {
  document.querySelectorAll('.demand-item').forEach((card) => {
    const body = card.querySelector('.di-body')
    const pc = card.querySelector('.people-count')
    const owner = card.querySelector('.owner-inline')
    if (!body || !pc || !owner) return
    owner.style.marginRight = Math.max(0, body.getBoundingClientRect().right - pc.getBoundingClientRect().right) + 'px'
  })
}

async function load() {
  loading.value = true
  try {
    const res = await api.myFavorites()
    list.value = res.demands || []
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
    await nextTick()
    alignNames()
  }
}

async function loadActs() {
  loadingActs.value = true
  try {
    const res = await api.myActivityFavorites()
    actFavs.value = res.activities || []
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loadingActs.value = false
  }
}

async function unfav(d) {
  try {
    await api.unfavorite(d.id)
    list.value = list.value.filter((x) => x.id !== d.id)
    ElMessage.success('已取消收藏')
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function unfavAct(a) {
  try {
    await api.unfavoriteActivity(a.id)
    actFavs.value = actFavs.value.filter((x) => x.id !== a.id)
    ElMessage.success('已取消收藏')
  } catch (e) {
    ElMessage.error(e.message)
  }
}

function onResize() { alignNames() }

onMounted(() => {
  load()
  loadActs()
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => window.removeEventListener('resize', onResize))
</script>

<style scoped>
.demand-item .di-body { display: flex; flex-direction: column; gap: 8px; }
.demand-item .di-title-row { display: flex; align-items: center; gap: 6px; }
.demand-item .di-title { font-size: 20px; color: var(--ink); }
.owner-inline { display: inline-flex; align-items: center; gap: 6px; margin-left: auto; flex-shrink: 0; }
.owner-inline .badge-teal { font-size: 15px; }
.demand-item .credit-tier { font-size: 16px; color: var(--ink); }
.demand-item .di-meta { font-size: 16px; color: var(--ink); margin-top: 0; }
.demand-item .di-tags { margin-top: 0; }
.demand-item .di-tags .el-tag { font-size: 15px; color: var(--ink); }
.di-side { align-self: center; }
.people-count { font-size: 15.5px; color: var(--ink); white-space: nowrap; }


.act-fav-list { display: flex; flex-direction: column; gap: 14px; }
.act-fav-item { display: flex; gap: 16px; align-items: center; background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 16px 18px; cursor: pointer; transition: box-shadow .18s, border-color .18s; }
.act-fav-item:hover { box-shadow: var(--shadow-lg); border-color: var(--brand-soft-strong); }
.afi-body { flex: 1; min-width: 0; }
.afi-title { font-size: 19px; font-weight: 700; color: var(--ink); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.afi-meta { color: var(--text-secondary); font-size: 16px; margin-top: 6px; display: flex; flex-wrap: wrap; gap: 14px; }
.ml-6 { margin-left: 8px; }
</style>