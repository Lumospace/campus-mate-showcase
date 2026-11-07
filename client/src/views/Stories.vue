<template>
  <div>
    <div class="page-title">故事墙</div>
    <div class="page-sub">搭子们的真实故事，分享你的组队经历与感悟</div>

    <div class="card story-form" ref="formEl">
      <div class="sf-head">
        <span class="sf-title">分享新故事</span>
        <span class="sf-toggle" role="button" tabindex="0" @click="showForm = !showForm" @keydown.enter="showForm = !showForm">{{ showForm ? '−' : '+' }}</span>
      </div>
      <el-form v-if="showForm" label-position="top">
        <div class="form-row">
          <el-form-item label="标题">
            <el-input v-model="form.title" maxlength="60" show-word-limit placeholder="一句话概括你的故事" />
          </el-form-item>
          <el-form-item label="心情（可多选）">
            <div class="mood-chips">
              <button v-for="m in MOODS" :key="m.key" type="button" class="mood-chip" :class="{ on: form.moods.includes(m.key) }" @click="toggleMood(m.key)">
                {{ m.emoji }} {{ m.key }}
              </button>
            </div>
          </el-form-item>
        </div>
        <el-form-item label="关联搭子类型（可选，方便他人一键组同款局）">
          <el-select v-model="form.category" clearable placeholder="不选也没关系" style="width:100%">
            <el-option v-for="c in CATEGORIES" :key="c.key" :label="`${c.emoji} ${c.label}`" :value="c.key" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <template #label>
            <div class="content-label">
              <span>正文</span>
              <el-button class="ai-assist-btn" size="small" text type="primary" @click="openAiAssist">✨ AI 辅助</el-button>
            </div>
          </template>
          <el-input v-model="form.content" type="textarea" :autosize="{ minRows: 4, maxRows: 10 }" maxlength="2000" show-word-limit placeholder="讲讲你们怎么认识的、一起完成了什么、有什么收获……" />
        </el-form-item>
        <el-form-item :label="`配图（可多张，本地存储，单张 ≤1MB，最多 6 张）`">
          <div class="img-uploader">
            <div v-for="(img, i) in form.images" :key="i" class="img-cell">
              <img :src="img" alt="配图" />
              <span class="img-remove" role="button" tabindex="0" @click="form.images.splice(i, 1)" @keydown.enter="form.images.splice(i, 1)">×</span>
            </div>
            <label v-if="form.images.length < MAX_IMAGES" class="img-add">
              <input type="file" accept="image/*" multiple hidden @change="onPickImages" />
              <span>＋</span>
            </label>
          </div>
        </el-form-item>
        <div class="form-actions">
          <el-button :loading="posting && pendingStatus === 'draft'" @click="submit('draft')">保存</el-button>
          <el-button type="primary" :loading="posting && pendingStatus === 'published'" @click="submit('published')">保存并发布</el-button>
        </div>
      </el-form>
    </div>

    <div class="tabs-bar mt-16">
      <el-tabs v-model="tab">
      <el-tab-pane label="故事墙" name="wall" />
      <el-tab-pane label="我的故事" name="mine" />
      </el-tabs>
      <el-input v-model="searchQuery" clearable :prefix-icon="Search" placeholder="搜索标题 / 内容 / 作者" class="search-input" />
    </div>

    <div v-if="loading" class="story-list" style="cursor:default; pointer-events:none">
      <div v-for="i in 4" :key="i" class="story-card card">
        <div class="sc-head">
          <div class="skeleton skeleton-avatar" style="width:36px;height:36px;flex-shrink:0"></div>
          <div class="sc-author">
            <div class="skeleton skeleton-text" style="width:55%"></div>
            <div class="skeleton skeleton-text short"></div>
          </div>
        </div>
        <div class="sc-body">
          <div class="skeleton skeleton-title" style="width:80%;margin-top:12px"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text" style="width:92%"></div>
          <div class="skeleton skeleton-card" style="margin-top:12px"></div>
        </div>
      </div>
    </div>
    <div v-else-if="!list.length" class="empty">
      <p>{{ tab === 'mine' ? '你还没有故事，来分享第一篇吧 ✍️' : '还没有公开的故事，来写下第一篇吧 ✍️' }}</p>
    </div>
    <div v-else class="story-list stagger-enter">
      <div v-for="s in list" :key="s.id" class="story-card card ani-fade-in-up">
        <div class="sc-head">
          <el-avatar :size="36" :src="s.author.avatar || undefined" style="background: var(--brand); font-size:15px" @click="$router.push('/user/' + s.author.id)">{{ s.author.nickname.slice(0, 1) }}</el-avatar>
          <div class="sc-author">
            <div class="sc-name" role="button" tabindex="0" @click="$router.push('/user/' + s.author.id)" @keydown.enter="$router.push('/user/' + s.author.id)">{{ s.author.nickname }} <el-tag v-if="s.author.tier" size="small" effect="plain">{{ s.author.tier }}</el-tag></div>
            <div class="sc-meta text-muted">{{ s.author.college || '未填学校' }} · {{ fmtTime(s.created_at) }}</div>
          </div>
          <div class="sc-head-right">
            <el-tag v-if="s.status === 'draft'" size="small" type="info" effect="plain">草稿</el-tag>
            
          </div>
        </div>
        <div class="sc-body">
        <div v-if="s.moods?.length" class="sc-moods">
          <span v-for="m in s.moods" :key="m" class="mood-tag">{{ moodEmoji(m) }} {{ m }}</span>
        </div>
        <div v-if="s.title" class="sc-title">{{ s.title }}</div>
        <div v-if="s.content" class="sc-content">{{ s.content }}</div>
        <div v-if="s.images?.length" class="sc-imgs">
          <img v-for="(img, i) in s.images" :key="i" :src="img" alt="故事配图" class="sc-img" role="button" tabindex="0" @click="openViewer(s.images, i)" @keydown.enter="openViewer(s.images, i)" />
        </div>
        </div>
        <div class="sc-foot">
          <div class="sc-foot-left">
            <button v-if="s.status === 'published'" class="like-btn" :class="{ liked: s.liked }" @click="like(s)">
              {{ s.liked ? '❤️' : '🤍' }} {{ s.like_count }}
            </button>
            <button v-if="s.status === 'published'" class="comment-btn" @click="openComments(s)">
              <el-icon style="vertical-align: -2px"><ChatDotRound /></el-icon> 评论 {{ s.comment_count }}
            </button>
            <el-button v-if="s.status === 'draft' && s.author.id === myId" size="small" type="primary" @click="publish(s)">发布</el-button>
            <el-button v-if="s.status === 'published' && s.category" size="small" text type="primary" @click="goPublish(s)">{{ catEmoji(s.category) }} 发起同类组局</el-button>
          </div>
          <el-button v-if="s.author.id === myId || auth.user?.is_admin" size="small" text type="danger" @click="remove(s)">删除</el-button>
        </div>
      </div>
    </div>
    <!-- AI 辅助写作弹窗 -->
    <el-dialog v-model="aiOpen" title="AI 辅助写作 ✨" width="520px" :close-on-click-modal="false">
      <p class="ai-tip">用几句话描述你想分享的经历（和谁、做了什么、有什么感受），AI 会帮你写成一篇完整的故事。</p>
      <el-input v-model="aiDesc" type="textarea" :autosize="{ minRows: 3, maxRows: 6 }" maxlength="500" show-word-limit placeholder="例如：和搭子一起去图书馆自习，互相监督，最后都完成了复习计划，感觉特别充实" />
      <div class="ai-tone">
        <span class="text-muted">风格：</span>
        <el-select v-model="aiTone" size="small" style="width: 120px">
          <el-option label="自然" value="" />
          <el-option label="简洁" value="简洁" />
          <el-option label="走心" value="走心" />
          <el-option label="幽默" value="幽默" />
        </el-select>
      </div>
      <p class="ai-note">生成结果会填入上方表单，请核对修改后再发布；内容需符合社区规范。每日最多使用 5 次。</p>
      <template #footer>
        <el-button @click="aiOpen = false">取消</el-button>
        <el-button type="primary" :loading="aiLoading" @click="generateStoryAi">生成</el-button>
      </template>
    </el-dialog>

    <ImageViewer v-model="viewerOpen" :images="viewerImages" :initial-index="viewerIndex" />
    <el-dialog v-model="commentOpen" :title="commentDialogTitle" width="560px" :close-on-click-modal="false">
      <div class="cmt-list">
        <div v-if="!commentLoading && !comments.length" class="cmt-empty">还没有评论</div>
        <div v-for="c in comments" :key="c.id" class="cmt-item">
          <el-avatar :size="32" :src="c.avatar || undefined" style="background:#0fb57e; font-size:14px">{{ c.nickname.slice(0, 1) }}</el-avatar>
          <div class="cmt-main">
            <div class="cmt-head">
              <span class="cmt-name">{{ c.nickname }}</span>
              <span class="cmt-time">{{ fmtTime(c.created_at) }}</span>
            </div>
            <div class="cmt-content">{{ c.content }}</div>
          </div>
        </div>
      </div>
      <div class="cmt-input">
        <el-input v-model="commentText" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" maxlength="500" show-word-limit placeholder="写下你的评论" />
        <div class="cmt-actions">
          <el-button type="primary" :loading="commentSending" @click="submitComment">发表</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api/index.js'
import { fmtTime, CATEGORIES, catEmoji } from '../utils.js'
import { useAuth } from '../store/auth.js'
import ImageViewer from '../components/ImageViewer.vue'
import { Search, ChatDotRound } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const auth = useAuth()
const myId = computed(() => auth.user?.id)

const MOODS = [
  { key: '开心', emoji: '😄' },
  { key: '收获', emoji: '🌱' },
  { key: '感动', emoji: '🥹' },
  { key: '成长', emoji: '🚀' },
  { key: '惊喜', emoji: '🎉' },
  { key: '怀念', emoji: '🍃' },
  { key: '其他', emoji: '✨' }
]
const MAX_MOODS = 5
const MAX_IMAGES = 6
const MAX_IMG = 1024 * 1024

function moodEmoji(m) { return (MOODS.find((x) => x.key === m) || {}).emoji || '✨' }

const tab = ref('wall')
const wall = ref([])
const mine = ref([])
const loading = ref(true)
const posting = ref(false)
const pendingStatus = ref('')
const showForm = ref(false)
const formEl = ref(null)
const editingId = ref(null)
const form = reactive({ title: '', content: '', moods: [], images: [], category: '' })

// AI 辅助写作
const aiOpen = ref(false)
const aiDesc = ref('')
const aiTone = ref('')
const aiLoading = ref(false)

const viewerOpen = ref(false)
const viewerImages = ref([])
const viewerIndex = ref(0)

const commentOpen = ref(false)
const commentStory = ref(null)
const commentText = ref('')
const commentSending = ref(false)
const commentLoading = ref(false)
const comments = ref([])

const commentDialogTitle = computed(() => (commentStory.value ? commentStory.value.title || '评论' : '评论'))

function openComments(s) {
  commentStory.value = s
  commentText.value = ''
  comments.value = []
  commentOpen.value = true
  loadComments(s.id)
}

async function loadComments(id) {
  commentLoading.value = true
  try {
    const res = await api.storyComments(id)
    comments.value = res.comments || []
  } catch (e) { ElMessage.error(e.message) } finally { commentLoading.value = false }
}

async function submitComment() {
  const t = commentText.value.trim()
  if (!t) { ElMessage.warning('评论内容不能为空'); return }
  commentSending.value = true
  try {
    const res = await api.createStoryComment(commentStory.value.id, { content: t })
    comments.value = res.comments || []
    commentText.value = ''
    if (commentStory.value) commentStory.value.comment_count = res.comment_count || 0
    ElMessage.success('评论成功')
  } catch (e) { ElMessage.error(e.message) } finally { commentSending.value = false }
}

function openViewer(images, index) {
  viewerImages.value = images
  viewerIndex.value = index
  viewerOpen.value = true
}

const searchQuery = ref('')

const list = computed(() => {
  const arr = tab.value === 'mine' ? mine.value : wall.value
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return arr
  return arr.filter((s) => {
    const name = (s.author.nickname || '').toLowerCase()
    const title = (s.title || '').toLowerCase()
    const content = (s.content || '').toLowerCase()
    return name.includes(q) || title.includes(q) || content.includes(q)
  })
})

function toggleMood(key) {
  const i = form.moods.indexOf(key)
  if (i >= 0) { form.moods.splice(i, 1); return }
  if (form.moods.length >= MAX_MOODS) { ElMessage.warning(`最多选择 ${MAX_MOODS} 个心情`); return }
  form.moods.push(key)
}

function onPickImages(e) {
  const files = Array.from(e.target.files || [])
  for (const file of files) {
    if (form.images.length >= MAX_IMAGES) { ElMessage.warning(`最多上传 ${MAX_IMAGES} 张图片`); break }
    if (file.size > MAX_IMG) { ElMessage.error('图片超过 1MB，已跳过：' + file.name); continue }
    const reader = new FileReader()
    reader.onload = () => { if (form.images.length < MAX_IMAGES) form.images.push(reader.result) }
    reader.readAsDataURL(file)
  }
  e.target.value = ''
}

function openAiAssist() {
  showForm.value = true
  aiOpen.value = true
}

async function generateStoryAi() {
  const description = aiDesc.value.trim()
  if (description.length < 5) { ElMessage.warning('请至少输入 5 个字描述你想分享的经历'); return }
  if (aiLoading.value) return
  aiLoading.value = true
  try {
    const res = await api.storyAiAssist({ description, tone: aiTone.value, category: form.category })
    if (res.title) form.title = String(res.title).slice(0, 60)
    if (res.content) form.content = String(res.content).slice(0, 2000)
    if (res.category) form.category = res.category
    if (Array.isArray(res.moods) && res.moods.length) form.moods = res.moods.slice(0, MAX_MOODS)
    aiOpen.value = false
    const left = typeof res.remaining === 'number' ? `，今日剩余 ${res.remaining} 次` : ''
    ElMessage.success(`已生成，请核对后发布${left}`)
  } catch (e) {
    ElMessage.error(e.message || '生成失败，请稍后再试')
  } finally {
    aiLoading.value = false
  }
}

async function submit(status) {
  const title = form.title.trim()
  const content = form.content.trim()
  if (status === 'published') {
    if (!content && !form.images.length) { ElMessage.warning('发布故事不能只填标题，请补充正文或配图'); return }
  } else if (!title && !content) {
    ElMessage.warning('标题与内容至少填写一项'); return
  }
  posting.value = true
  pendingStatus.value = status
  const editing = editingId.value
  try {
    if (editing) {
      try { await api.deleteStory(editing) } catch {}
      mine.value = mine.value.filter((x) => x.id !== editing)
    }
    const res = await api.createStory({ title: form.title, content: form.content, moods: form.moods, images: form.images, category: form.category, status })
    mine.value.unshift(res.story)
    if (status === 'published') wall.value.unshift(res.story)
    form.title = ''; form.content = ''; form.moods = []; form.images = []; form.category = ''
    tab.value = status === 'published' ? 'wall' : 'mine'
    ElMessage.success(status === 'published' ? '已发布' : '草稿已保存')
  } catch (e) { ElMessage.error(e.message) } finally { posting.value = false; pendingStatus.value = ''; editingId.value = null }
}

async function publish(s) {
  if ((!s.content || !s.content.trim()) && !(s.images && s.images.length)) {
    form.title = s.title || ''
    form.content = s.content || ''
    form.moods = s.moods ? [...s.moods] : []
    form.images = s.images ? [...s.images] : []
    form.category = s.category || ''
    editingId.value = s.id
    showForm.value = true
    nextTick(() => formEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    ElMessage.warning('请补充正文或配图后再发布')
    return
  }
  try {
    const res = await api.publishStory(s.id)
    Object.assign(s, res.story)
    wall.value.unshift(res.story)
    ElMessage.success('已发布到故事墙')
  } catch (e) { ElMessage.error(e.message) }
}

async function like(s) {
  try {
    const res = await api.likeStory(s.id)
    s.liked = res.liked
    s.like_count = res.like_count
  } catch (e) { ElMessage.error(e.message) }
}

function goPublish(s) {
  router.push({ path: '/publish', query: { category: s.category, title: s.title || '' } })
}

async function remove(s) {
  if (s.author.id !== myId && auth.user?.is_admin) {
    // 管理员删除：必须填写缘由，同步告知作者
    const { value } = await ElMessageBox.prompt('请填写删除缘由（将同步告知作者）', '删除故事', {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      inputValidator: (v) => (v && v.trim() ? true : '请填写缘由'),
      inputErrorMessage: '请填写缘由'
    }).catch(() => ({}))
    if (!value) return
    try {
      await api.deleteStory(s.id, value.trim())
      wall.value = wall.value.filter((x) => x.id !== s.id)
      mine.value = mine.value.filter((x) => x.id !== s.id)
      ElMessage.success('已删除')
    } catch (e) { ElMessage.error(e.message) }
    return
  }
  try { await ElMessageBox.confirm('确定删除这篇故事吗？', '提示', { type: 'warning' }) } catch { return }
  try {
    await api.deleteStory(s.id)
    wall.value = wall.value.filter((x) => x.id !== s.id)
    mine.value = mine.value.filter((x) => x.id !== s.id)
    ElMessage.success('已删除')
  } catch (e) { ElMessage.error(e.message) }
}

async function load() {
  loading.value = true
  try {
    const [w, m] = await Promise.all([api.stories(), api.myStories()])
    wall.value = w.stories || []
    mine.value = m.stories || []
  } catch (e) { ElMessage.error(e.message) } finally { loading.value = false }
}
onMounted(() => {
  const author = route.query.author
  if (author) {
    searchQuery.value = String(author)
    tab.value = 'wall'
  }
  load()
})
</script>

<style scoped>
.mt-16 { margin-top: 16px; }
.story-form { padding: 20px; margin-bottom: 8px; scroll-margin-top: 80px; }
.sf-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.sf-title { font-weight: 700; font-size: 22px; line-height: 1; }
.sf-toggle { color: var(--brand); font-size: 26px; font-weight: 800; line-height: 1; cursor: pointer; user-select: none; transition: color .15s; }
.sf-toggle:hover { color: var(--brand-hover); }
.form-row { display: grid; grid-template-columns: 1fr 1.2fr; gap: 16px; align-items: start; }
@media (max-width: 760px) { .form-row { grid-template-columns: 1fr; } }
.mood-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.mood-chip { border: 1px solid #d8e4de; background: #fff; color: var(--text-secondary); border-radius: 999px; padding: 5px 12px; font-size: 14px; cursor: pointer; }
.mood-chip.on { background: var(--brand-soft); color: var(--brand-text); border-color: var(--brand-soft-strong); font-weight: 600; }
.img-uploader { display: flex; flex-wrap: wrap; gap: 10px; }
.img-cell { position: relative; width: 96px; height: 96px; }
.img-cell img { width: 100%; height: 100%; object-fit: cover; border-radius: 10px; }
.img-remove { position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; border-radius: 50%; background: var(--danger); color: #fff; font-size: 14px; line-height: 20px; text-align: center; cursor: pointer; }
.img-add { width: 96px; height: 96px; border: 1px dashed var(--brand-soft-strong); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 28px; color: var(--brand-text); cursor: pointer; }
.img-add:hover { background: var(--brand-soft); }
.form-actions { display: flex; gap: 12px; }

.story-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.story-list .story-card { margin-top: 0; }
@media (max-width: 760px) { .story-list { grid-template-columns: 1fr; } .story-card { height: auto; } }
.story-card { padding: 20px; height: 460px; display: flex; flex-direction: column; overflow: hidden; }
.sc-head { display: flex; align-items: flex-start; gap: 10px; }
.sc-author { flex: 1; min-width: 0; }
.sc-name { font-weight: 700; font-size: 18px; cursor: pointer; color: var(--ink); display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.sc-name:hover { color: var(--brand); }
.sc-meta { font-size: 15.5px; margin-top: 2px; }
.sc-head-right { display: flex; gap: 6px; }
.sc-body { flex: 1; min-height: 0; overflow-y: auto; }
.sc-moods { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 6px; }
.mood-tag { font-size: 15px; color: var(--brand-text); background: var(--brand-soft); border-radius: 6px; padding: 2px 8px; }
.sc-title { font-weight: 700; font-size: 22px; margin-top: 12px; color: var(--ink); }
.sc-content { margin-top: 8px; font-size: 17px; line-height: 1.7; color: var(--ink); white-space: pre-wrap; word-break: break-word; }
.sc-imgs { margin-top: 12px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.sc-img { width: 100%; aspect-ratio: 1 / 1; object-fit: cover; border-radius: 10px; cursor: zoom-in; display: block; }
.sc-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 14px; }
.sc-foot-left { display: flex; align-items: center; gap: 10px; }
.like-btn { border: none; background: var(--surface); padding: 5px 14px; border-radius: 999px; font-size: 15.5px; font-weight: 600; cursor: pointer; color: var(--text-secondary); transition: transform .1s; }
.like-btn:hover { transform: scale(1.05); }
.like-btn.liked { color: #e11d48; background: #fff1f2; }
.comment-btn { border: none; background: var(--surface); padding: 5px 14px; border-radius: 999px; font-size: 15.5px; font-weight: 600; cursor: pointer; color: var(--text-secondary); transition: transform .1s; }
.comment-btn:hover { transform: scale(1.05); }
.cmt-list { max-height: 320px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
.cmt-empty { text-align: center; color: var(--muted); padding: 24px 0; font-size: 15px; }
.cmt-item { display: flex; gap: 10px; align-items: flex-start; }
.cmt-main { flex: 1; min-width: 0; }
.cmt-head { display: flex; align-items: baseline; gap: 10px; }
.cmt-name { font-weight: 700; color: var(--ink); font-size: 15px; }
.cmt-time { color: var(--text-secondary); font-size: 14px; }
.cmt-content { margin-top: 2px; color: var(--ink); font-size: 15.5px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
.cmt-input { margin-top: 16px; }
.cmt-actions { margin-top: 10px; display: flex; justify-content: flex-end; }

.page-title{font-size:30px}
.page-sub{font-size:17px;color:var(--text-secondary)}
.empty{font-size:17px;color:var(--text-secondary)}
.sc-meta{color:var(--ink)}
.sf-title { font-size: 24px; font-weight: 800; color: var(--ink); }
.sf-toggle { font-size: 32px; font-weight: 800; color: var(--ink); }
.sf-toggle:hover { color: var(--brand); }
.tabs-bar { display: flex; align-items: center; gap: 16px; }
.tabs-bar .el-tabs { flex: 1; margin: 0; }
.tabs-bar :deep(.el-tabs__item) { font-size: 20px; font-weight: 800; color: var(--ink); }
.tabs-bar :deep(.el-tabs__item.is-active) { color: var(--brand-text); }
.tabs-bar :deep(.el-tabs__active-bar) { height: 3px; background-color: var(--brand); }
.search-input { width: 300px; }
.search-input :deep(.el-input__inner) { font-size: 16px; color: var(--ink); }
.story-form :deep(.el-form-item__label) { font-size: 17px; font-weight: 700; color: var(--ink); }
.story-form :deep(.el-input__inner),
.story-form :deep(.el-textarea__inner) { font-size: 16px; color: var(--ink); }
.story-form :deep(.el-select__placeholder),
.story-form :deep(.el-select__selected-item) { font-size: 16px; color: var(--ink); }
.mood-chip { font-size: 16px; font-weight: 600; color: var(--ink); padding: 6px 14px; }
.form-actions { justify-content: flex-end; }
.form-actions :deep(.el-button) { font-size: 17px; }
.content-label { display: flex; align-items: center; gap: 8px; }
.ai-assist-btn { font-size: 15px; font-weight: 700; padding: 0 6px; }
.ai-tip { color: var(--text-secondary); font-size: 15px; line-height: 1.6; margin-bottom: 10px; }
.ai-tone { display: flex; align-items: center; gap: 8px; margin-top: 12px; font-size: 15px; }
.ai-note { color: var(--muted); font-size: 14px; line-height: 1.6; margin-top: 12px; }
</style>