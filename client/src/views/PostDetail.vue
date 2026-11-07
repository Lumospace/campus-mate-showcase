<template>
  <div v-if="loading" style="cursor:default; pointer-events:none">
    <div class="card post-card">
      <div class="pc-head">
        <div class="skeleton skeleton-avatar" style="width:48px;height:48px;flex-shrink:0"></div>
        <div class="pc-head-info">
          <div class="skeleton skeleton-text" style="width:40%"></div>
          <div class="skeleton skeleton-text short"></div>
        </div>
      </div>
      <div class="skeleton skeleton-text" style="width:95%"></div>
      <div class="skeleton skeleton-text" style="width:85%"></div>
      <div class="skeleton skeleton-card" style="height:140px"></div>
    </div>
    <div class="card mt-8">
      <div v-for="i in 3" :key="i" class="reply-item">
        <div class="skeleton skeleton-avatar" style="width:36px;height:36px;flex-shrink:0"></div>
        <div class="ri-body">
          <div class="skeleton skeleton-text" style="width:30%"></div>
          <div class="skeleton skeleton-text" style="width:90%"></div>
        </div>
      </div>
    </div>
  </div>
  <div v-else-if="!post" class="empty" style="padding:40px 0"><p>帖子不存在</p></div>
  <div v-else>
    <div class="bar">
      <div class="back-btn" @click="$router.push('/circles/' + circleId)">← 返回圈子</div>
    </div>

    <div class="card post-card">
      <div class="pc-head">
        <el-avatar :size="48" :src="post.avatar || undefined" style="background: var(--brand); flex-shrink: 0; font-size: 18px; cursor: pointer" @click="$router.push('/user/' + post.user_id)">{{ post.nickname.slice(0, 1) }}</el-avatar>
        <div class="pc-head-info">
          <div class="pc-who" @click="$router.push('/user/' + post.user_id)">{{ post.nickname }}<span v-if="post.is_admin" class="admin-badge">管理员</span></div>
          <div class="pc-time">{{ fmtTime(post.created_at) }}</div>
        </div>
        <span class="pi-type" :class="post.type">{{ typeLabel(post.type) }}</span>
      </div>

      <div v-if="post.content" class="pc-content">{{ post.content }}</div>
      <div v-if="post.image_count" class="pc-ims">
        <div v-for="i in post.image_count" :key="i" class="pc-im-wrap" :ref="(el) => bind(el, post.id, i - 1)">
          <img v-if="urlOf(post.id, i - 1)" :src="urlOf(post.id, i - 1)" alt="帖子图片" role="button" tabindex="0" @click="openViewer(post.id, i - 1)" @keydown.enter="openViewer(post.id, i - 1)">
          <div v-else class="pc-im-ph">{{ failed[`${post.id}:${i - 1}`] ? '加载失败' : '' }}</div>
        </div>
      </div>
      <div v-if="post.linked_demand" class="pi-link" @click="$router.push('/demand/' + post.linked_demand.id)">
        🔗 关联需求：{{ post.linked_demand.title }}
      </div>
    </div>

    <div class="replies-bar mt-16">
      <div class="sec-title">回复（{{ replies.length }}）</div>
    </div>

    <div class="card mt-8">
      <div v-if="circle.joined" class="reply-box">
        <el-input v-model="draft" type="textarea" :autosize="{ minRows: 2, maxRows: 6 }" placeholder="写下你的回复…（敏感词将自动拦截）" maxlength="500" show-word-limit />
        <div class="reply-actions">
          <el-button type="primary" :loading="posting" @click="submitReply">发布回复</el-button>
        </div>
      </div>
      <el-alert v-else type="info" :closable="false" title="加入圈后即可回复" show-icon />
    </div>

    <div class="card mt-8" v-if="replies.length">
      <div class="reply-list stagger-enter">
        <div v-for="r in replies" :key="r.id" class="reply-item ani-fade-in-up">
          <el-avatar :size="36" :src="r.avatar || undefined" style="background: var(--brand); flex-shrink: 0; font-size: 15px; cursor: pointer" @click="$router.push('/user/' + r.user_id)">{{ r.nickname.slice(0, 1) }}</el-avatar>
          <div class="ri-body">
            <div class="ri-head">
              <span class="ri-who" @click="$router.push('/user/' + r.user_id)">{{ r.nickname }}</span>
              <span v-if="r.is_admin" class="admin-badge">管理员</span>
              <span v-if="r.user_id === myId" class="text-muted">(我)</span>
              <span class="ri-time">{{ fmtTime(r.created_at) }}</span>
            </div>
            <div class="ri-content">{{ r.content }}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="card mt-8" v-else>
      <div class="empty" style="padding:20px 0"><p>还没有回复，来抢沙发吧</p></div>
    </div>
    <ImageViewer v-model="viewerOpen" :images="viewerImages" :initial-index="viewerIndex" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '../api/index.js'
import { fmtTime } from '../utils.js'
import { useAuth } from '../store/auth.js'
import { useCircleImages } from '../composables/circleImages.js'
import ImageViewer from '../components/ImageViewer.vue'

const route = useRoute()
const auth = useAuth()
const myId = computed(() => auth.user?.id)

const circleId = route.params.id
const circle = ref({})
const post = ref(null)
const replies = ref([])
const loading = ref(true)
const posting = ref(false)
const draft = ref('')

const viewerOpen = ref(false)
const viewerImages = ref([])
const viewerIndex = ref(0)

const { urlOf, failed, bind, loadAll, dispose } = useCircleImages(circleId)

async function openViewer(postId, index) {
  const list = await loadAll({ id: postId, image_count: post.value?.image_count || 0 })
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
    const res = await api.circlePostDetail(circleId, route.params.postId)
    circle.value = res.circle
    post.value = res.post
    replies.value = res.replies || []
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

async function submitReply() {
  if (!draft.value.trim()) return ElMessage.warning('写点什么再回复吧')
  posting.value = true
  try {
    await api.createCirclePostReply(circleId, route.params.postId, { content: draft.value })
    draft.value = ''
    ElMessage.success('回复成功')
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
.mt-8 { margin-top: 8px; } .mt-16 { margin-top: 16px; }
.post-card { display: flex; flex-direction: column; gap: 12px; }
.pc-head { display: flex; align-items: center; gap: 12px; }
.pc-head-info { flex: 1; min-width: 0; }
.pc-who { font-size: 18px; color: var(--ink); font-weight: 700; cursor: pointer; }
.pc-who:hover { color: var(--brand); }
.admin-badge { display: inline-block; font-size: 12px; font-weight: 700; color: #fff; background: linear-gradient(135deg, #f6a821, #e07b0c); border-radius: 6px; padding: 1px 7px; margin-left: 6px; line-height: 1.5; vertical-align: middle; }
.pc-time { font-size: 15px; color: var(--text-secondary); margin-top: 2px; }

.pc-content { font-size: 17px; color: var(--ink); white-space: pre-wrap; word-break: break-word; line-height: 1.6; }
.pc-ims { display: flex; flex-wrap: wrap; gap: 6px; }
.pc-ims img { width: 96px; height: 96px; object-fit: cover; border-radius: 8px; cursor: pointer; }
.pc-im-wrap { width: 96px; height: 96px; border-radius: 8px; overflow: hidden; }
.pc-im-ph { width: 96px; height: 96px; border-radius: 8px; background: var(--surface); color: var(--text-secondary); display: flex; align-items: center; justify-content: center; font-size: 13px; }
.pi-type { font-size: 15.5px; font-weight: 600; color: var(--brand-text); background: var(--brand-soft); border-radius: 6px; padding: 2px 9px; flex-shrink: 0; }
.pi-type.teamup { background: #fff4e0; color: #b25e09; }
.pi-type.help { background: #eef2f7; color: #40506b; }
.pi-link { font-size: 15px; color: var(--brand-text); background: var(--brand-soft); border-radius: 6px; padding: 5px 9px; cursor: pointer; display: inline-block; align-self: flex-start; }
.pi-link:hover { text-decoration: underline; }
.replies-bar { display: flex; align-items: center; justify-content: space-between; padding: 0 4px; }
.sec-title { font-size: 26px; font-weight: 800; color: var(--ink); }
.reply-box { display: flex; flex-direction: column; gap: 8px; }
.reply-box :deep(.el-textarea__inner) { font-size: 16.5px; color: var(--ink); }
.reply-box :deep(.el-textarea__inner::placeholder) { color: var(--text-secondary); }
.reply-box :deep(.el-input__count) { font-size: 14.5px; color: var(--text-secondary); }
.reply-actions { display: flex; align-items: center; justify-content: flex-end; }
.reply-actions :deep(.el-button) { font-size: 16px; font-weight: 700; }
.reply-list { display: flex; flex-direction: column; gap: 12px; }
.reply-item { display: flex; gap: 10px; }
.ri-body { flex: 1; min-width: 0; background: var(--surface); border-radius: 10px; padding: 10px 14px; }
.ri-head { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.ri-who { font-size: 16px; color: var(--ink); font-weight: 700; cursor: pointer; }
.ri-who:hover { color: var(--brand); }
.ri-time { font-size: 14px; color: var(--text-secondary); margin-left: auto; }
.ri-content { font-size: 16px; color: var(--ink); margin-top: 4px; white-space: pre-wrap; word-break: break-word; }
.empty { color: var(--ink); } .empty p { font-size: 18px; } .text-muted { color: var(--text-secondary); }
</style>