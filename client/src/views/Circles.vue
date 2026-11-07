<template>
  <div>
    <div class="bar">
      <div>
        <div class="page-title">兴趣圈 🏕️</div>
        <div class="page-sub">找到同好部落，进圈才可发帖，保持圈内纯粹</div>
      </div>
      <div class="bar-actions">
        <el-button class="action-btn" @click="showMine = !showMine">{{ showMine ? '全部圈子' : '我的圈子' }}</el-button>
        <el-button type="primary" class="create-btn" @click="openCreate">创建圈子</el-button>
      </div>
    </div>

    <div v-if="circles.length || keyword" class="filter-bar">
      <el-input v-model="keyword" placeholder="搜索圈名 / 简介 / 分类" clearable size="large" style="width: 300px" :prefix-icon="Search" />
    </div>

    <div v-if="loading" class="skeleton-list">
      <div class="circle-grid" style="margin-top:12px">
        <div v-for="i in 6" :key="i" class="card circle-card" style="cursor:default; pointer-events:none">
          <div class="cc-head">
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton" style="width:70px; height:28px; border-radius:8px; flex-shrink:0"></div>
          </div>
          <div class="skeleton skeleton-text" style="margin-top:10px"></div>
          <div class="skeleton skeleton-text short"></div>
          <div class="cc-foot" style="margin-top:14px">
            <div class="skeleton" style="width:70px; height:20px; border-radius:6px"></div>
          </div>
        </div>
      </div>
    </div>

    <template v-else>
      <div v-if="!displayCircles.length" class="empty" style="padding:32px 0"><p>{{ showMine ? '你还没有加入任何圈子' : '还没有圈子，来创建第一个吧' }}</p></div>
      <div v-else class="circle-grid stagger-enter">
        <div v-for="c in displayCircles" :key="c.id" class="card circle-card ani-fade-in-up" role="button" tabindex="0" @click="goDetail(c)" @keydown.enter="goDetail(c)">
          <div class="cc-head">
            <div class="cc-name">{{ c.name }}<span class="cc-cat">{{ c.category || '未分类' }}</span></div>
            <el-button size="small" class="cc-members-btn" @click.stop="openMembers(c)">查看圈友</el-button>
          </div>
          <div class="cc-desc">{{ c.description || '暂无简介' }}</div>
          <div class="cc-foot">
            <span class="cc-count">👥 {{ c.member_count }} 人</span>
            <span v-if="c.joined" class="joined">已加入</span>
          </div>
        </div>
      </div>
    </template>

    <el-dialog v-model="createOpen" title="创建兴趣圈" width="460px">
      <el-form :model="form" label-position="top">
        <el-form-item label="圈子名称" required>
          <el-input v-model="form.name" maxlength="20" placeholder="如：考研自习联盟" />
        </el-form-item>
        <el-form-item label="分类" required>
          <el-input v-model="form.category" maxlength="12" placeholder="如：学习 / 运动 / 游戏" />
        </el-form-item>
        <el-form-item label="简介">
          <el-input v-model="form.description" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" maxlength="80" show-word-limit placeholder="一句话介绍这个圈子" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createOpen = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitCreate">创建</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="membersOpen" :title="membersCircleName + ' · 圈友'" width="480px" class="members-dialog">
      <div v-if="!dialogMembers.length" class="empty" style="padding:20px 0"><p>暂无圈友</p></div>
      <div v-else class="member-list">
        <div v-for="m in dialogMembers" :key="m.id" class="member-row" role="button" tabindex="0" @click="m.id !== myId && $router.push('/user/' + m.id)" @keydown.enter="m.id !== myId && $router.push('/user/' + m.id)">
          <el-avatar :size="36" :src="m.avatar || undefined" style="background: var(--brand); flex-shrink: 0; font-size: 14px">{{ m.nickname.slice(0, 1) }}</el-avatar>
          <div class="mr-info">
            <div class="mr-name">
              <span>{{ m.nickname }}</span>
              <span v-if="m.id === myId" class="text-muted">(我)</span>
              <span class="mr-tier">{{ m.tier }}</span>
            </div>
            <div class="mr-meta-dlg" v-if="m.id !== myId">
              <span v-if="m.times >= 1">🤝 组过 {{ m.times }} 次</span>
              <span v-if="m.common_circles">🏕️ 共同圈 {{ m.common_circles }} 个</span>
              <span v-if="!m.times && !m.common_circles" class="text-muted">同圈新搭子</span>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import api from '../api/index.js'
import { useAuth } from '../store/auth.js'

const router = useRouter()
const auth = useAuth()
const myId = computed(() => auth.user?.id)

const circles = ref([])
const loading = ref(true)
const keyword = ref('')
const showMine = ref(false)
const createOpen = ref(false)
const submitting = ref(false)
const membersOpen = ref(false)
const membersCircleName = ref('')
const dialogMembers = ref([])

const displayCircles = computed(() => {
  let list = circles.value
  if (showMine.value) list = list.filter((c) => c.joined)
  const kw = keyword.value.trim().toLowerCase()
  if (kw) list = list.filter((c) => `${c.name} ${c.description || ''} ${c.category || ''}`.toLowerCase().includes(kw))
  return list
})

const form = reactive({ name: '', category: '', description: '' })

async function load() {
  loading.value = true
  try {
    const res = await api.circles()
    circles.value = res.circles || []
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

function goDetail(c) {
  router.push(`/circles/${c.id}`)
}

async function openMembers(c) {
  membersCircleName.value = c.name
  membersOpen.value = true
  try {
    const mr = await api.circleMembers(c.id)
    dialogMembers.value = mr.members || []
  } catch (e) {
    ElMessage.error(e.message)
  }
}

function openCreate() {
  Object.assign(form, { name: '', category: '', description: '' })
  createOpen.value = true
}

async function submitCreate() {
  if (!form.name.trim()) return ElMessage.warning('请填写圈子名称')
  if (!form.category.trim()) return ElMessage.warning('请填写分类')
  submitting.value = true
  try {
    await api.createCircle(form)
    ElMessage.success('圈子已创建')
    createOpen.value = false
    Object.assign(form, { name: '', category: '', description: '' })
    load()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    submitting.value = false
  }
}

onMounted(() => { load() })
</script>

<style scoped>
.bar { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-bottom: 24px; }
.page-sub { margin-bottom: 0; }
.bar-actions { display: flex; gap: 8px; flex-shrink: 0; }
.create-btn { font-size: 17px; font-weight: 700; }
.action-btn { font-size: 16px; font-weight: 600; }
.filter-bar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; background: linear-gradient(135deg, #eaf5f0 0%, #eef4ff 100%); border: 1px solid #cfe9de; border-radius: var(--radius); padding: 14px 18px; margin-top: 12px; }
.filter-bar :deep(.el-input__inner) { font-size: 15.5px; font-weight: 600; color: var(--ink); }
.filter-bar :deep(.el-input__inner::placeholder) { color: var(--text-secondary); }
.circle-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 12px; }
@media (max-width: 900px) { .circle-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 600px) { .circle-grid { grid-template-columns: 1fr; } }
.circle-card { margin-top: 0; cursor: pointer; border: 1px solid transparent; }
.circle-card:hover { border-color: var(--brand); }
.cc-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.cc-name { font-weight: 800; font-size: 22px; color: var(--ink); display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.cc-cat { font-size: 15px; font-weight: 600; color: var(--brand-text); background: var(--brand-soft); border-radius: 6px; padding: 2px 8px; line-height: 1.4; }
.cc-members-btn { flex-shrink: 0; font-size: 15px; font-weight: 600; }
.cc-desc { font-size: 16px; color: var(--ink); margin-top: 8px; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
.cc-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
.cc-count { font-size: 15px; color: var(--ink); font-weight: 600; }
.joined { font-size: 15px; color: var(--brand-text); font-weight: 700; }
.members-dialog :deep(.el-dialog__body) { max-height: 420px; overflow-y: auto; padding: 8px 16px 16px; }
.member-list { display: flex; flex-direction: column; gap: 8px; }
.member-row { display: flex; align-items: center; gap: 10px; background: var(--surface); border-radius: 10px; padding: 8px 12px; cursor: pointer; transition: box-shadow .15s; }
.member-row:hover { box-shadow: var(--shadow-lg); }
.mr-info { flex: 1; min-width: 0; }
.mr-name { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; font-weight: 700; font-size: 16px; color: var(--ink); }
.mr-tier { font-size: 15px; color: var(--brand-text); background: var(--brand-soft); border-radius: 6px; padding: 1px 6px; font-weight: 600; }
.mr-meta-dlg { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 3px; font-size: 15px; color: var(--ink); font-weight: 600; }
:deep(.el-dialog__title) { font-size: 20px; font-weight: 700; color: var(--ink); }
:deep(.el-form-item__label) { font-size: 15.5px; font-weight: 600; color: var(--ink); }
:deep(.el-input__inner) { font-size: 15px; color: var(--ink); }
:deep(.el-textarea__inner) { font-size: 15px; color: var(--ink); }
.page-title{font-size:30px}.page-sub{color:var(--ink);font-size:18px}.empty{color:var(--ink)}.empty p{font-size:18px}.text-muted{color:var(--text-secondary)}</style>