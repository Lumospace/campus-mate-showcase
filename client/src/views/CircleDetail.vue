<template>
  <div v-if="loading" style="cursor:default; pointer-events:none">
    <div class="card detail-card">
      <div class="skeleton skeleton-title" style="width:50%"></div>
      <div class="skeleton skeleton-text" style="width:80%"></div>
      <div class="skeleton skeleton-text short"></div>
    </div>
    <div class="card mt-8">
      <div v-for="i in 3" :key="i" class="post-item">
        <div class="pi-head">
          <div class="skeleton skeleton-avatar" style="width:40px;height:40px;flex-shrink:0"></div>
          <div class="pi-head-info">
            <div class="skeleton skeleton-text" style="width:40%"></div>
          </div>
        </div>
        <div class="skeleton skeleton-text" style="width:92%;margin-top:8px"></div>
        <div class="skeleton skeleton-text short"></div>
      </div>
    </div>
  </div>
  <div v-else-if="!circle" class="empty" style="padding:40px 0"><p>圈子不存在</p></div>
  <div v-else>
    <div class="bar">
      <div class="back-btn" role="button" tabindex="0" @click="$router.push('/circles')" @keydown.enter="$router.push('/circles')">← 返回兴趣圈</div>
    </div>

    <div class="card detail-card">
      <div class="dc-head">
        <div class="dc-title">{{ circle.name }}<span class="dc-cat">{{ circle.category || '未分类' }}</span></div>
        <div class="dc-actions">
          <el-button v-if="!circle.joined" size="small" type="primary" class="join-btn" @click="joinCircle">加入圈子</el-button>
          <el-button v-else size="small" text type="info" class="leave-btn" @click="confirmLeave">退出圈子</el-button>
        </div>
      </div>
      <div class="dc-desc">{{ circle.description || '暂无简介' }}</div>
      <div class="dc-foot">
        <div class="dc-meta">👥 {{ circle.member_count }} 人 · 📝 {{ posts.length }} 帖</div>
        <el-button class="members-btn" @click="openMembers">查看圈友</el-button>
      </div>
    </div>

    <div class="posts-bar mt-16">
      <div class="sec-title">帖子区</div>
      <div class="posts-bar-right">
        <el-button v-if="circle.joined" size="small" :type="mineOnly ? 'primary' : 'default'" plain class="mine-btn" @click="mineOnly = !mineOnly">我发布的帖子</el-button>
        <el-input v-if="circle.joined" v-model="searchQuery" clearable :prefix-icon="Search" placeholder="搜索帖子内容 / 作者" class="search-input" />
        <el-button v-if="circle.joined && !postBoxOpen" type="primary" class="new-post-btn" @click="postBoxOpen = true">发布帖子</el-button>
      </div>
    </div>

    <div class="card mt-8" v-if="circle.joined && postBoxOpen">
      <div class="post-box">
        <div class="post-toolbar">
          <el-radio-group v-model="draftType" size="small">
            <el-radio-button label="discussion">💬 讨论</el-radio-button>
            <el-radio-button label="teamup">🤝 组局</el-radio-button>
            <el-radio-button label="help">🙋 求助</el-radio-button>
          </el-radio-group>
        </div>
        <el-input v-model="draft" type="textarea" :autosize="{ minRows: 2, maxRows: 6 }" placeholder="分享点什么…（敏感词将自动拦截）" maxlength="500" show-word-limit />
        <div v-if="draftImages.length" class="draft-ims">
          <div v-for="(img, i) in draftImages" :key="i" class="dim-item">
            <img :src="img" alt="">
            <span class="dim-del" role="button" tabindex="0" @click="removeImage(i)" @keydown.enter="removeImage(i)">✕</span>
          </div>
        </div>
        <div class="post-actions">
          <el-button size="small" @click="fileEl.click()">📷 图片（{{ draftImages.length }}/6）</el-button>
          <el-button size="small" @click="postBoxOpen = false">取消</el-button>
          <el-button type="primary" size="small" :loading="posting" @click="submitPost">发布</el-button>
        </div>
        <input ref="fileEl" type="file" accept="image/*" multiple hidden @change="onPickImages">
      </div>
    </div>

    <div class="card mt-8" v-if="!circle.joined && !postBoxOpen">
      <el-alert type="info" :closable="false" title="加入圈后即可发帖" show-icon />
    </div>

    <div class="card mt-8" v-if="circle.joined && filteredPosts.length">
      <div class="post-list stagger-enter">
        <div v-for="p in filteredPosts" :key="p.id" class="post-item ani-fade-in-up">
          <div class="pi-head">
            <el-avatar :size="40" :src="p.avatar || undefined" style="background: var(--brand); flex-shrink: 0; font-size: 16px; cursor: pointer" @click="$router.push('/user/' + p.user_id)">{{ p.nickname.slice(0, 1) }}</el-avatar>
            <div class="pi-head-info">
              <div class="pi-who-line">
                <span class="pi-who" role="button" tabindex="0" @click="$router.push('/user/' + p.user_id)" @keydown.enter="$router.push('/user/' + p.user_id)">{{ p.nickname }}</span>
                <span v-if="p.is_admin" class="pi-admin-badge" title="平台管理员">管理员</span>
              </div>
              <span class="pi-type" :class="p.type">{{ typeLabel(p.type) }}</span>
            </div>
          </div>
          <div v-if="p.content" class="pi-content">{{ p.content }}</div>
          <div v-if="p.image_count" class="pi-ims">
            <div v-for="i in p.image_count" :key="i" class="pi-im-wrap" :ref="(el) => bind(el, p.id, i - 1)">
              <img v-if="urlOf(p.id, i - 1)" :src="urlOf(p.id, i - 1)" alt="帖子图片" role="button" tabindex="0" @click="openViewer(p, i - 1)" @keydown.enter="openViewer(p, i - 1)">
              <div v-else class="pi-im-ph" :class="{ failed: failed[`${p.id}:${i - 1}`] }">{{ failed[`${p.id}:${i - 1}`] ? '加载失败' : '' }}</div>
            </div>
          </div>
          <div v-if="p.linked_demand" class="pi-link" role="button" tabindex="0" @click="$router.push('/demand/' + p.linked_demand.id)" @keydown.enter="$router.push('/demand/' + p.linked_demand.id)">
            🔗 关联需求：{{ p.linked_demand.title }}
          </div>
          <div class="pi-foot">
            <span class="pi-time">{{ fmtTime(p.created_at) }} · 浏览{{ p.views || 0 }} · 回复{{ p.reply_count }}</span>
            <div class="pi-foot-actions">
              <el-button v-if="p.user_id === myId || auth.user?.is_admin" size="small" text type="danger" @click="removePost(p)">删除</el-button>
              <el-button class="pi-reply-btn" @click="goPost(p)">
                <el-icon><ChatDotRound /></el-icon><span>回复</span>
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card mt-8" v-if="circle.joined && !filteredPosts.length">
      <div class="empty" style="padding:20px 0"><p>{{ mineOnly ? '你还没有在本圈发布过帖子' : (posts.length ? '没有匹配的帖子' : '还没有帖子，来发第一帖吧') }}</p></div>
    </div>

    <el-dialog v-model="membersOpen" :title="circle.name + ' · 圈友'" width="480px" class="members-dialog">
      <div v-if="!members.length" class="empty" style="padding:20px 0"><p>暂无圈友</p></div>
      <div v-else class="member-list">
        <div v-for="m in members" :key="m.id" class="member-row" role="button" tabindex="0" @click="m.id !== myId && $router.push('/user/' + m.id)" @keydown.enter="m.id !== myId && $router.push('/user/' + m.id)">
          <el-avatar :size="36" :src="m.avatar || undefined" style="background: var(--brand); flex-shrink: 0; font-size: 15px">{{ m.nickname.slice(0, 1) }}</el-avatar>
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
    <ImageViewer v-model="viewerOpen" :images="viewerImages" :initial-index="viewerIndex" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ChatDotRound, Search } from '@element-plus/icons-vue'
import api from '../api/index.js'
import { fmtTime, compressImageFile } from '../utils.js'
import { useAuth } from '../store/auth.js'
import { useCircleImages } from '../composables/circleImages.js'
import ImageViewer from '../components/ImageViewer.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const myId = computed(() => auth.user?.id)

const circle = ref(null)
const posts = ref([])
const searchQuery = ref('')
const mineOnly = ref(false)
const filteredPosts = computed(() => {
  let list = posts.value
  if (mineOnly.value) list = list.filter((p) => p.user_id === myId.value)
  const q = searchQuery.value.trim().toLowerCase()
  if (q) list = list.filter((p) => (p.content || '').toLowerCase().includes(q) || (p.nickname || '').toLowerCase().includes(q))
  return list
})
const members = ref([])
const loading = ref(true)
const postBoxOpen = ref(false)
const posting = ref(false)
const membersOpen = ref(false)
const draft = ref('')
const draftType = ref('discussion')
const draftImages = ref([])
const fileEl = ref(null)

const viewerOpen = ref(false)
const viewerImages = ref([])
const viewerIndex = ref(0)

// 帖子图片按需加载（进入视口才请求，避免一次性内联大体积 base64）
const { urlOf, failed, bind, loadAll, dispose } = useCircleImages(String(route.params.id))

async function openViewer(p, index) {
  const list = await loadAll(p)
  if (!list.length) return
  viewerImages.value = list
  viewerIndex.value = Math.min(index, list.length - 1)
  viewerOpen.value = true
}

function typeLabel(t) {
  return { discussion: '💬 讨论', teamup: '🤝 组局', help: '🙋 求助' }[t] || '💬 讨论'
}

async function load() {
  loading.value = true
  try {
    // 圈友仅在点击「查看圈友」时加载，避免首屏并发拉取大体积头像
    const pr = await api.circlePosts(route.params.id)
    circle.value = pr.circle
    posts.value = pr.posts || []
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

function goPost(p) {
  router.push(`/circles/${p.circle_id}/posts/${p.id}`)
}
// 删除帖子（作者本人确认删除；管理员需填写缘由，同步告知作者）
async function removePost(p) {
  if (p.user_id !== myId && auth.user?.is_admin) {
    const { value } = await ElMessageBox.prompt('请填写删除缘由（将同步告知作者）', '删除帖子', {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      inputValidator: (v) => (v && v.trim() ? true : '请填写缘由'),
      inputErrorMessage: '请填写缘由'
    }).catch(() => ({}))
    if (!value) return
    try {
      await api.deleteCirclePost(circle.value.id, p.id, value.trim())
      posts.value = posts.value.filter((x) => x.id !== p.id)
      ElMessage.success('帖子已删除')
    } catch (e) {
      ElMessage.error(e.message)
    }
    return
  }
  try {
    await ElMessageBox.confirm('确定删除这条帖子吗？删除后不可恢复。', '删除帖子', { type: 'warning' })
  } catch {
    return
  }
  try {
    await api.deleteCirclePost(circle.value.id, p.id)
    posts.value = posts.value.filter((x) => x.id !== p.id)
    ElMessage.success('帖子已删除')
  } catch (e) {
    ElMessage.error(e.message)
  }
}
async function openMembers() {
  membersOpen.value = true
  try {
    const mr = await api.circleMembers(route.params.id)
    members.value = (mr.members || []).slice().sort((a, b) => a.nickname.localeCompare(b.nickname, 'zh-Hans-CN'))
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function joinCircle() {
  try {
    await api.joinCircle(route.params.id)
    ElMessage.success('已加入圈子')
    await load()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function leaveCircle() {
  try {
    const res = await api.leaveCircle(route.params.id)
    if (res && res.dissolved) {
      ElMessage.success('已退出，圈子已解散')
      router.push('/circles')
      return
    }
    ElMessage.success('已退出圈子')
    await load()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

function confirmLeave() {
  const isLast = (circle.value?.member_count ?? 0) <= 1
  const msg = isLast
    ? '你是该圈子的最后一名成员，退出后圈子将自动解散，圈内所有帖子都会被删除，且无法恢复。确定退出吗？'
    : '确定要退出该圈子吗？退出后将无法在圈内发帖。'
  ElMessageBox.confirm(msg, isLast ? '退出并解散圈子' : '退出圈子', {
    confirmButtonText: isLast ? '确定退出并解散' : '确定退出',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    leaveCircle()
  }).catch(() => {})
}

async function onPickImages(e) {
  const files = Array.from(e.target.files || [])
  e.target.value = ''
  for (const f of files) {
    if (draftImages.value.length >= 6) { ElMessage.warning('最多上传 6 张图片'); break }
    if (f.size > 20 * 1024 * 1024) { ElMessage.warning('原始图片过大，请选择 20MB 以内的图片'); continue }
    try {
      // 上传前压缩，避免 base64 过大拖慢列表/详情加载
      const data = await compressImageFile(f)
      if (data.length > 1024 * 1024) { ElMessage.warning('图片压缩后仍超过 1MB，请换一张'); continue }
      draftImages.value.push(data)
    } catch {
      ElMessage.warning('图片处理失败，请重试')
    }
  }
}

function removeImage(i) {
  draftImages.value.splice(i, 1)
}

async function submitPost() {
  if (!draft.value.trim() && !draftImages.value.length) return ElMessage.warning('写点什么或传张图再发布吧')
  posting.value = true
  try {
    await api.createCirclePost(route.params.id, {
      content: draft.value,
      type: draftType.value,
      images: draftImages.value
    })
    draft.value = ''
    draftType.value = 'discussion'
    draftImages.value = []
    postBoxOpen.value = false
    await load()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    posting.value = false
  }
}

onMounted(load)
onUnmounted(dispose)
</script>

<style scoped>
.bar { display: flex; align-items: center; margin-bottom: 12px; }
.back-btn { font-size: 18px; font-weight: 700; color: var(--brand-text); cursor: pointer; }
.back-btn:hover { text-decoration: underline; }
.mt-8 { margin-top: 8px; } .mt-12 { margin-top: 12px; } .mt-16 { margin-top: 16px; }
.detail-card { display: flex; flex-direction: column; gap: 8px; }
.dc-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.dc-title { font-weight: 800; font-size: 24px; color: var(--ink); display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.dc-cat { font-size: 15px; font-weight: 600; color: var(--brand-text); background: var(--brand-soft); border-radius: 6px; padding: 2px 8px; line-height: 1.4; }
.dc-actions { display: flex; gap: 8px; flex-shrink: 0; }
.members-btn { font-size: 16px; font-weight: 700; }
.join-btn { font-size: 16px; font-weight: 600; }
.leave-btn { font-size: 16px; font-weight: 600; }
.dc-desc { font-size: 16px; color: var(--ink); }
.dc-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.dc-meta { font-size: 15.5px; color: var(--text-secondary); font-weight: 600; }
.flex-between { display: flex; align-items: center; justify-content: space-between; }
.posts-bar { display: flex; align-items: center; justify-content: space-between; padding: 0 4px; }
.sec-title { font-size: 26px; font-weight: 800; color: var(--ink); }
.new-post-btn { font-size: 18px; font-weight: 700; }
.mine-btn { font-size: 14px; font-weight: 700; flex-shrink: 0; }
.posts-bar-right { display: flex; align-items: center; gap: 10px; }
.search-input { width: 280px; }
.search-input :deep(.el-input__inner) { font-size: 16.5px; color: var(--ink); }
.search-input :deep(.el-input__inner::placeholder) { color: var(--text-secondary); }
.search-input :deep(.el-input__prefix) { color: var(--brand-text); }
.post-box { display: flex; flex-direction: column; gap: 8px; }
.post-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.post-toolbar :deep(.el-radio-button__inner) { font-size: 16px; font-weight: 600; color: var(--ink); }
.post-box :deep(.el-textarea__inner) { font-size: 17px; color: var(--ink); }
.post-box :deep(.el-textarea__inner::placeholder) { color: var(--text-secondary); }
.draft-ims { display: flex; flex-wrap: wrap; gap: 8px; }
.dim-item { position: relative; width: 72px; height: 72px; border-radius: 8px; overflow: hidden; }
.dim-item img { width: 100%; height: 100%; object-fit: cover; }
.dim-del { position: absolute; top: 2px; right: 2px; width: 18px; height: 18px; line-height: 18px; text-align: center; background: rgba(0,0,0,.55); color: #fff; border-radius: 50%; font-size: 13px; cursor: pointer; }
.post-actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
.post-actions :deep(.el-button) { font-size: 16.5px; font-weight: 600; }
.post-box :deep(.el-input__count) { font-size: 14.5px; color: var(--text-secondary); }
.post-list { display: flex; flex-direction: column; }
.post-item { padding: 14px 0; border-bottom: 1px solid var(--border); }
.post-item:first-child { padding-top: 0; }
.post-item:last-child { border-bottom: none; padding-bottom: 0; }
.pi-head { display: flex; align-items: center; gap: 10px; }
.pi-head-info { flex: 1; min-width: 0; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.pi-who-line { display: flex; align-items: center; gap: 6px; min-width: 0; }
.pi-who { font-size: 16px; color: var(--ink); font-weight: 700; cursor: pointer; }
.pi-who:hover { color: var(--brand); }
.pi-admin-badge { font-size: 12px; font-weight: 700; color: #fff; background: linear-gradient(135deg, #f6a821, #e07b0c); border-radius: 6px; padding: 1px 7px; line-height: 1.5; flex-shrink: 0; }
.pi-type { font-size: 15px; font-weight: 600; color: var(--brand-text); background: var(--brand-soft); border-radius: 6px; padding: 1px 8px; }
.pi-type.teamup { background: #fff4e0; color: #b25e09; }
.pi-type.help { background: #eef2f7; color: #40506b; }
.pi-content { font-size: 17px; color: var(--ink); margin-top: 6px; white-space: pre-wrap; word-break: break-word; }
.pi-ims { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.pi-ims img { width: 96px; height: 96px; object-fit: cover; border-radius: 8px; cursor: pointer; }
.pi-im-wrap { width: 96px; height: 96px; border-radius: 8px; overflow: hidden; }
.pi-im-ph { width: 96px; height: 96px; border-radius: 8px; background: var(--surface); color: var(--text-secondary); display: flex; align-items: center; justify-content: center; font-size: 13px; }
.pi-link { margin-top: 8px; font-size: 15px; color: var(--brand-text); background: var(--brand-soft); border-radius: 6px; padding: 5px 9px; cursor: pointer; display: inline-block; }
.pi-link:hover { text-decoration: underline; }
.pi-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
.pi-time { font-size: 14.5px; color: var(--text-secondary); }
.pi-foot-actions { display: flex; align-items: center; }
.pi-foot-actions :deep(.el-button + .el-button) { margin-left: 0; }
.pi-reply-btn { font-size: 15.5px; font-weight: 600; color: var(--brand-text); border-color: var(--brand); }
.pi-reply-btn:hover { background: var(--brand-soft); color: var(--brand-text); border-color: var(--brand); }
.members-dialog :deep(.el-dialog__body) { max-height: 420px; overflow-y: auto; padding: 8px 16px 16px; }
.member-list { display: flex; flex-direction: column; gap: 8px; }
.member-row { display: flex; align-items: center; gap: 10px; background: var(--surface); border-radius: 10px; padding: 8px 12px; cursor: pointer; transition: box-shadow .15s; }
.member-row:hover { box-shadow: var(--shadow-lg); }
.mr-info { flex: 1; min-width: 0; }
.mr-name { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; font-weight: 700; font-size: 16px; color: var(--ink); }
.mr-tier { font-size: 15px; color: var(--brand-text); background: var(--brand-soft); border-radius: 6px; padding: 1px 6px; font-weight: 600; }
.mr-meta-dlg { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 3px; font-size: 15px; color: var(--ink); font-weight: 600; }
:deep(.el-dialog__title) { font-size: 20px; font-weight: 700; color: var(--ink); }
.empty { color: var(--ink); } .empty p { font-size: 18px; } .text-muted { color: var(--text-secondary); }
</style>