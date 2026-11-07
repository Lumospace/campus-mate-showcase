<template>
  <div>
    <div class="card hero">
      <h1 class="hero-title">👋 {{ auth.nickname }}，今天想找什么搭子？</h1>
      <p class="hero-sub">为你推荐 {{ list.length }} 个可能一拍即合的搭子，匹配分由五维可解释模型计算</p>
      <div class="hero-cats">
        <span v-for="c in CATEGORIES" :key="c.key" class="cat-chip" :class="{ active: cat === c.key }" role="button" tabindex="0" @click="toggleCat(c.key)" @keydown.enter="toggleCat(c.key)">{{ c.emoji }} {{ c.label }}</span>
      </div>
    </div>

    <div v-if="loading" class="skeleton-list">
      <div v-for="i in 4" :key="i" class="demand-item" style="cursor:default; pointer-events:none">
        <div class="skeleton" style="width:54px; height:54px; border-radius:12px; flex-shrink:0"></div>
        <div class="di-body">
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-text" style="width:75%"></div>
          <div class="skeleton skeleton-text short"></div>
          <div style="display:flex; gap:8px; margin-top:10px">
            <div class="skeleton" style="width:60px; height:26px; border-radius:999px"></div>
            <div class="skeleton" style="width:70px; height:26px; border-radius:999px"></div>
          </div>
        </div>
        <div class="di-side" style="gap:8px">
          <div class="skeleton" style="width:80px; height:28px; border-radius:8px"></div>
          <div class="skeleton" style="width:70px; height:32px; border-radius:8px"></div>
        </div>
      </div>
    </div>

    <div v-else-if="!list.length" class="empty">
      <el-icon><Search /></el-icon>
      <p>暂时没有匹配的需求，去大厅逛逛或发布一个吧</p>
      <el-button type="primary" @click="$router.push('/publish')">发布需求</el-button>
    </div>

    <div v-else class="stagger-enter">
      <div v-for="d in list" :key="d.id" class="demand-item ani-fade-in-up" role="button" tabindex="0" @click="$router.push(`/demand/${d.id}`)" @keydown.enter="$router.push(`/demand/${d.id}`)">
        <div class="di-emoji">{{ d.category_emoji }}</div>
        <div class="di-body">
          <div class="di-title">{{ d.title }}</div>
          <div class="di-meta">
            <span class="cat-tag">{{ d.category_label }}</span>
            <span>🕐 {{ fmtTime(d.activity_start) }}</span>
            <span>📍 {{ d.location_name }}</span>
            <span>👥 需 {{ d.need_count }} 人</span>
          </div>
          <div class="di-tags">
            <el-tag v-for="t in d.tags" :key="t" size="small" effect="plain">{{ t }}</el-tag>
          </div>
          <div v-if="d.summary" class="di-summary mt-8">💡 {{ d.summary }}</div>
          <div class="di-reason mt-8" v-if="d.explanation && d.explanation.length">
            <span class="reason-label">为什么推荐</span>
            <span v-for="(e, i) in d.explanation.slice(0, 3)" :key="i" class="reason-item">{{ e.hint }}</span>
          </div>
        </div>
        <div class="di-side">
          <div class="score-badge">{{ (d.score * 100).toFixed(0) }}%<span class="score-unit">匹配</span></div>
          <el-button size="small" text type="danger" @click.stop="hide(d)">不感兴趣</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import api from '../api/index.js'
import { useAuth } from '../store/auth.js'
import { CATEGORIES, fmtTime } from '../utils.js'

const auth = useAuth()
const router = useRouter()
const list = ref([])
const loading = ref(true)
const cat = ref('')

async function load() {
  loading.value = true
  try {
    const res = await api.recommended()
    list.value = cat.value ? (res.demands || []).filter((d) => d.category === cat.value) : (res.demands || [])
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

function toggleCat(key) {
  cat.value = cat.value === key ? '' : key
  load()
}

async function hide(d) {
  try { if (d.owner && d.owner.id) await api.dislike(d.owner.id) } catch {}
  list.value = list.value.filter((x) => x.id !== d.id)
}

onMounted(load)
</script>

<style scoped>
.hero { padding: 32px; background: linear-gradient(140deg, #e2f4ec, #fff); }
.hero-title { font-size: 30px; margin: 0; font-weight: 800; letter-spacing: .5px; }
.hero-sub { color: var(--ink); font-size: 17px; font-weight: 500; margin: 10px 0 20px; }
.hero-cats { display: flex; flex-wrap: wrap; gap: 10px; }
.cat-chip { padding: 9px 20px; border-radius: 999px; background: #fff; border: 1px solid var(--border); cursor: pointer; font-size: 16px; font-weight: 500; transition: all .15s; }
.cat-chip:hover { border-color: var(--brand); color: var(--brand-text); }
.cat-chip.active { background: var(--brand); color: #fff; border-color: var(--brand); font-weight: 700; }
.di-reason { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.reason-label { font-size: 15px; color: var(--brand-text); font-weight: 700; }
.reason-item { font-size: 15px; color: var(--ink); background: var(--surface); padding: 3px 10px; border-radius: 999px; }
.di-summary { font-size: 15.5px; color: var(--brand-text); font-weight: 600; }
.score-unit { font-size: 16px; color: var(--text-secondary); font-weight: 600; margin-left: 2px; }
.empty{font-size:17px;color:var(--text-secondary)}
.demand-item .di-title{font-size:20px;color:var(--ink)}
.demand-item .di-meta{font-size:16px;color:var(--ink)}
.demand-item .cat-tag{font-size:15px}
.demand-item .di-tags .el-tag{font-size:15px;color:var(--ink)}
.demand-item .score-badge{font-size:20px}
</style>