<template>
  <div v-if="team">
    <div class="chat-wrap">
      <div class="chat-head">
        <el-button text @click="$router.push('/teams')"><el-icon><ArrowLeft /></el-icon></el-button>
        <div class="ch-info">
          <div class="ch-title-row">
            <div class="ch-title">{{ team.demand?.title }}</div>
            <el-tag class="ch-status" :type="statusType(team.status)">{{ statusLabel(team.status) }}</el-tag>
          </div>
          <div class="ch-sub">
            <span class="ch-meta">👥 {{ team.members.length }} 人 · {{ catEmoji(team.demand?.category) }} {{ team.demand?.category_label }}</span>
          </div>
        </div>
        <div class="ch-actions">
          <el-button size="small" @click="showActivity = !showActivity">{{ showActivity ? '收起活动' : '活动详情' }}</el-button>
          <el-tooltip v-if="isOwner && !isFlash" :disabled="!inviteDisabledReason" :content="inviteDisabledReason" placement="bottom">
            <span class="invite-entry">
              <el-button size="small" :disabled="!!inviteDisabledReason" @click="openInvite">邀请成员</el-button>
            </span>
          </el-tooltip>
          <el-button v-if="isOwner && canComplete && !completed" size="small" type="primary" @click="complete">完成活动</el-button>
          <el-button v-if="completed" size="small" type="warning" @click="openReview">搭后互评 🌟</el-button>
          <el-button v-if="isOwner" size="small" text type="danger" @click="dismiss">解散</el-button>
          <el-button v-else-if="!completed" size="small" text type="info" @click="leave">退出</el-button>
        </div>
      </div>

      <div v-if="showActivity" class="activity-card">
        <div class="ac-row"><span class="cat-tag">{{ team.demand?.category_label }}</span><span>🕐 {{ fmtTime(team.demand?.activity_start) }} ~ {{ fmtTime(team.demand?.activity_end) }}</span><span>📍 {{ team.demand?.location_name || '未填地点' }}</span></div>
        <div class="ac-desc" v-if="team.demand?.description">{{ team.demand?.description }}</div>
        <div v-if="team.break_ice" class="ice-banner"><span>💬 破冰话题：{{ team.break_ice }}</span><el-button size="small" text type="primary" @click="openQuiz">快问快答 🎲</el-button></div>
        <div class="ac-members">
          <div v-for="m in team.members" :key="m.id" class="member-chip" @click="m.id !== auth.user?.id && $router.push('/user/' + m.id)">
            <el-avatar :size="22" :src="m.avatar || undefined" style="background: var(--brand); font-size:13px">{{ m.nickname.slice(0, 1) }}</el-avatar>
            <span>{{ m.nickname }}</span>
            <el-tag v-if="m.role === 'owner'" size="small" type="warning" effect="plain">队长</el-tag>
            <div v-if="isOwner && m.id !== auth.user?.id" class="member-actions" @click.stop>
              <el-button v-if="!isFlash" size="small" text type="primary" @click="openTransfer(m)">转让</el-button>
              <el-button size="small" text type="danger" @click="removeMember(m)">移除</el-button>
            </div>
          </div>
        </div>
      </div>

      <div class="safety-banner">⚠️ 行前安全提醒：线下见面请选择公共场所，提前告知亲友行程；如对方提出转账、借贷或前往偏僻地点，请立即拒绝并举报。</div>

      <div class="chat-body" ref="bodyEl">
        <div v-if="!messages.length" class="empty" style="padding:24px 0"><p>还没有消息，打个招呼吧 👋</p></div>
        <template v-for="(m, idx) in messages" :key="m.seq">
          <div v-if="showTime(idx)" class="time-divider">{{ fmtChatTime(m.created_at) }}</div>
          <!-- 系统消息：居中灰色小胶囊 -->
          <div v-if="m.msg_type === 'system'" class="chat-msg system">
            <div class="bubble">{{ m.content }}</div>
          </div>
          <!-- 已撤回：与微信一致，居中灰色小字，无头像/气泡/昵称占位（仅文字可重新编辑） -->
          <div v-else-if="m.recalled" class="chat-msg recalled">
            <div class="recalled-line">
              {{ m.sender_id === auth.user?.id ? '你撤回了一条消息' : '“' + m.sender_nickname + '”撤回了一条消息' }}
              <span v-if="canReEdit(m)" class="re-edit" @click="reEdit(m)">重新编辑</span>
            </div>
          </div>
          <!-- 普通消息：微信式 头像 + 昵称 + 带尾巴气泡（头像统一在 DOM 首位；mine 用 row-reverse 翻转到右侧） -->
          <div v-else class="chat-msg" :class="m.sender_id === auth.user?.id ? 'mine' : ''">
            <el-avatar class="msg-avatar" :size="38" :src="avatarOf(m) || undefined" style="background: var(--brand); font-size: 17px">
              {{ (m.sender_nickname || '?').slice(0, 1) }}
            </el-avatar>
            <div class="msg-col">
              <div v-if="m.sender_id !== auth.user?.id" class="who">{{ m.sender_nickname }}</div>
              <div v-if="m.msg_type === 'sticker'" class="sticker-msg">
                <img :src="m.content" class="sticker-img-lg" alt="表情包" />
              </div>
              <div v-else class="bubble">
                <img v-if="m.msg_type === 'image'" :src="m.content" class="sticker-img" alt="表情包" />
                <div v-else class="txt">{{ m.content }}</div>
              </div>
            </div>
            <button v-if="canRecall(m)" class="recall-btn" @click="recall(m)">撤回</button>
          </div>
        </template>
      </div>

      <div class="chat-input">
        <div v-if="readOnly" class="readonly-tip">该队伍已结束，聊天室为只读模式</div>
        <div class="ci-toolbar">
          <el-button text size="small" class="ci-emoji-btn" :class="{ active: emojiOpen }" @click="emojiOpen = !emojiOpen; stickerOpen = false">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="8" cy="10" r="1.2" fill="currentColor" stroke="none"/>
              <circle cx="16" cy="10" r="1.2" fill="currentColor" stroke="none"/>
              <path d="M8 15c1.5 2 4.5 2 6 0"/>
            </svg>
          </el-button>
          <el-button text size="small" class="ci-sticker-btn" :class="{ active: stickerOpen }" @click="stickerOpen = !stickerOpen; emojiOpen = false">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.8 11.5c1.5-2 2.5-4 2.5-6.5A6.5 6.5 0 0 0 16.5 0 6.5 6.5 0 0 0 12 3 6.5 6.5 0 0 0 7.5 0 6.5 6.5 0 0 0 1 6.5c0 2.5 1 4.5 2.5 6.5L12 22Z"/>
            </svg>
          </el-button>
        </div>
        <div class="ci-picker" v-show="emojiOpen || stickerOpen">
          <template v-if="emojiOpen">
            <div class="emoji-grid">
              <span v-for="e in EMOJIS" :key="e" class="emoji-cell" @click="insertEmoji(e)">{{ e }}</span>
            </div>
          </template>
          <template v-if="stickerOpen">
            <div class="sticker-grid">
              <div v-for="s in STICKERS" :key="s.emoji" class="sticker-cell" @click="sendSticker(s)">
                <div class="sticker-emoji">{{ s.emoji }}</div>
                <div class="sticker-label">{{ s.label }}</div>
              </div>
            </div>
          </template>
        </div>
        <div class="ci-row">
          <el-input
            ref="inputRef"
            v-model="draft"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 5 }"
            resize="none"
            placeholder="输入消息…（Enter 发送，Shift+Enter 换行，敏感词将自动脱敏）"
            :disabled="!canChat || readOnly"
            @keydown.enter.exact.prevent="send"
          />
          <el-button type="primary" size="large" class="send-btn" :disabled="!canChat || readOnly" :loading="sending" @click="send">发送</el-button>
        </div>
      </div>
    </div>

    <!-- 邀请成员弹窗（仅队长；满员/活动开始后禁止发起） -->
    <el-dialog v-model="inviteOpen" title="邀请成员" width="520px">
      <div class="invite-tip">邀请发出后，对方在「申请中心 - 我收到的」同意即可入队；邀请与申请、蹲补共用需求人数名额。</div>
      <el-input v-model="inviteKeyword" placeholder="输入昵称或校园邮箱（至少 2 个字）" clearable @input="onInviteKeyword" />
      <div v-if="inviteLoading" class="invite-empty">搜索中…</div>
      <div v-else-if="inviteKeyword.trim().length >= 2 && !inviteResults.length" class="invite-empty">没有找到可邀请的用户</div>
      <div v-else-if="inviteResults.length" class="invite-list">
        <div v-for="u in inviteResults" :key="u.id" class="invite-item">
          <el-avatar :size="36" :src="u.avatar || undefined" style="background: var(--brand); font-size: 14px">{{ u.nickname.slice(0, 1) }}</el-avatar>
          <div class="ii-body">
            <div class="ii-name">{{ u.nickname }} <el-tag v-if="u.student_verified" size="small" type="success" effect="plain">认证</el-tag></div>
            <div class="ii-meta">{{ u.college || '未填学院' }}<span v-if="u.grade"> · {{ u.grade }}</span> · 信誉 {{ u.credit_score.toFixed(1) }} 分</div>
          </div>
          <el-button size="small" type="primary" :loading="invitingId === u.id" :disabled="invitedIds.includes(u.id)" @click="sendInvite(u)">
            {{ invitedIds.includes(u.id) ? '已邀请' : '邀请' }}
          </el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 搭后互评弹窗 -->
    <el-dialog v-model="reviewOpen" title="搭后互评 🌟" width="560px" :close-on-click-modal="false">
      <p class="review-tip">评价为<b>记名</b>评价，星级与标签会同步给对方，并直接影响其信誉档案。你的每一票都将成为其他搭子选择队友时的参考，请对彼此负责、如实评价。</p>
      <div class="review-progress">已评 {{ reviewedCount }}/{{ otherMembers.length }}</div>
      <div v-for="m in otherMembers" :key="m.id" class="review-item" :class="{ done: reviews[m.id]?.done }">
        <div class="ri-head">
          <el-avatar :size="40" :src="m.avatar || undefined" style="background: var(--brand); font-size:16px">{{ m.nickname.slice(0, 1) }}</el-avatar>
          <div class="ri-who">
            <div class="ri-name">{{ m.nickname }}<el-tag v-if="m.role === 'owner'" size="small" type="warning" effect="plain">队长</el-tag></div>
            <div class="ri-meta">{{ m.tier }}<span v-if="m.college"> · {{ m.college }}</span></div>
          </div>
          <el-tag v-if="reviews[m.id]?.done" size="small" type="success" effect="plain">已评 ✓</el-tag>
          <el-rate v-model="reviews[m.id].rating" :disabled="reviews[m.id]?.done" @change="onRatingChange(m.id)" />
        </div>
        <div v-if="!reviews[m.id]?.done && tagsFor(m.id).length" class="ri-tags">
          <el-check-tag v-for="t in tagsFor(m.id)" :key="t" :checked="reviews[m.id].tags.includes(t)" @change="toggleTag(m.id, t)">{{ t }}</el-check-tag>
        </div>
        <div v-if="reviews[m.id]?.done" class="ri-done-tags">
          <el-tag v-for="t in reviews[m.id].tags" :key="t" size="small" effect="plain">{{ t }}</el-tag>
          <span v-if="!reviews[m.id].tags.length" class="text-muted">未选标签</span>
        </div>
      </div>
      <template #footer>
        <el-button @click="reviewOpen = false">稍后再评</el-button>
        <el-button type="primary" :loading="reviewing" @click="submitReviews">提交评价</el-button>
      </template>
    </el-dialog>

    <!-- 行前安全提醒弹窗（首次进入该聊天室时弹出，3s后可关闭） -->
    <el-dialog v-model="safetyAlertOpen" title="行前安全提醒" width="520px" :close-on-click-modal="false" :close-on-press-escape="false" :show-close="safetyAlertClosable">
      <div class="safety-tip-box">行前安全提醒：线下见面请选择公共场所，提前告知亲友行程；如对方提出转账、借贷或前往偏僻地点，请立即拒绝并举报。</div>
      <template #footer>
        <el-button v-if="safetyAlertClosable" type="primary" @click="closeSafetyAlert">我知道了</el-button>
        <el-button v-else disabled>请仔细阅读（3秒后可关闭）</el-button>
      </template>
    </el-dialog>

    <!-- 破冰快问快答 -->
    <el-dialog v-model="quizOpen" title="破冰快问快答 🎲" width="420px" :close-on-click-modal="false">
      <div class="quiz-card">
        <div class="quiz-q">{{ quizQuestion }}</div>
        <div class="quiz-tip">发到聊天室里，和大家一起说说看</div>
        <div class="quiz-btns">
          <el-button @click="nextQuiz">换一题</el-button>
          <el-button type="primary" @click="sendQuiz">发到聊天室</el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 申请退出弹窗 -->
    <el-dialog v-model="exitOpen" title="申请退出" width="420px">
      <p class="text-muted mb-16">当前已锁定，退出需队长同意（24 小时未处理将自动同意）</p>
      <el-alert v-if="started" type="warning" :closable="false" show-icon title="活动已开局，退出后队伍不会补充新人，请谨慎申请。" style="margin-bottom:12px" />
      <el-form label-position="top">
        <el-form-item label="退出原因">
          <el-select v-model="exitForm.reason" placeholder="请选择原因" style="width:100%">
            <el-option v-for="r in EXIT_REASONS" :key="r" :label="r" :value="r" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="exitForm.reason === '其他'" label="补充说明">
          <el-input v-model="exitForm.other" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" placeholder="请填写补充说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="exitOpen = false">取消</el-button>
        <el-button type="primary" :loading="exitSubmitting" @click="submitExitRequest">提交申请</el-button>
      </template>
    </el-dialog>

    <!-- 解散理由弹窗 -->
    <el-dialog v-model="dismissOpen" title="解散队伍" width="440px">
      <p class="text-muted mb-16">当前队伍已锁定，解散需其他所有成员同意，请填写解散理由</p>
      <el-form label-position="top">
        <el-form-item label="解散理由">
          <el-input v-model="dismissForm.reason" type="textarea" :autosize="{ minRows: 2, maxRows: 5 }" placeholder="请填写解散理由" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dismissOpen = false">取消</el-button>
        <el-button type="danger" :loading="dismissSubmitting" @click="submitDismiss">确认发起解散申请</el-button>
      </template>
    </el-dialog>

    <!-- 转让队长弹窗 -->
    <el-dialog v-model="transferOpen" title="转让队长" width="440px">
      <p class="text-muted mb-16">将队长转让给 <b>{{ transferTarget?.nickname }}</b>，对方同意后生效</p>
      <el-form label-position="top">
        <el-form-item label="转让理由">
          <el-select v-model="transferForm.reason" placeholder="请选择理由" style="width:100%">
            <el-option v-for="r in TRANSFER_REASONS" :key="r" :label="r" :value="r" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="transferForm.reason === '其他'" label="补充说明">
          <el-input v-model="transferForm.other" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" placeholder="请填写补充说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="transferOpen = false">取消</el-button>
        <el-button type="primary" :loading="transferSubmitting" @click="submitTransfer">发起转让申请</el-button>
      </template>
    </el-dialog>
  </div>
  <div v-else-if="loading" style="cursor:default; pointer-events:none; padding:20px">
    <div v-for="i in 3" :key="i" class="chat-msg" :class="i % 2 === 0 ? 'mine' : ''">
      <div class="skeleton" style="width:38px;height:38px;flex-shrink:0;border-radius:8px"></div>
      <div style="display:flex;flex-direction:column;align-items:flex-start;gap:6px;max-width:70%">
        <div class="skeleton" style="width:96px;height:14px;border-radius:6px"></div>
        <div class="skeleton" style="width:220px;height:44px;border-radius:10px"></div>
      </div>
    </div>
  </div>
  <div v-else class="empty"><p>队伍不存在或无权限</p><el-button @click="$router.push('/teams')">返回我的搭子</el-button></div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api/index.js'
import { useAuth } from '../store/auth.js'
import { useUnread } from '../store/unread.js'
import { connectSocket, joinTeam, sendMessage, recallMessage, onMessage, offMessage, onRecall, offRecall, leaveTeam, onKicked, offKicked } from '../socket.js'
import { catEmoji, fmtTime, parseLocalTime, QUIZ_QUESTIONS } from '../utils.js'

const EMOJIS = [
  '😀','😆','😅','😂','🤣','😊','😇','🙂',
  '😉','😍','🥰','😘','😋','😛','🤪','🤨',
  '🧐','🤓','😎','🤩','🥳','😏','😒','😞','😟',
  '🙁','😣','😩','🥺','😢','😭','😤',
  '😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰',
  '😥','🤗','🤔','🤭','🤫','😑','😬',
  '🙄','😲','🥱','😴','🤤','😪','😵','🤐','🥴',
  '🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','🤡','💩',
  '👻','💀','👽','🤖','🎃',
  '👍','👎','👌','✌️','🤞','✊','👊','👏','🙌','🤝','🙏','✍️','💅','🤳','💪',
  '❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','💕',
  '💗','💖','💘','💝','💟','💋','💌',
  '🔥','💯','❗','❓','💢','⚠️','🚫',
  '🔞','📵','🚭','❌','✅','🛑','⛔','💤','💦',
  '💨','⭐','🌟','✨','🎉','🎁','🎈','🎂','🔔',
  '🔒','🔓','🔑','📌','📎','✂️',
  '💡','🔦','🔋','🔌','💻','📱','📷','🎥','🎵',
  '🔊','📢','📣','💿',
]

const NOTO_BASE = 'https://fonts.gstatic.com/s/e/notoemoji/latest/'

const STICKERS = [
  { emoji: '😀', label: '微笑', code: '1f600', bg: '#fff3e0', border: '#ffcc80' },
  { emoji: '😂', label: '笑哭', code: '1f602', bg: '#e3f2fd', border: '#90caf9' },
  { emoji: '🤣', label: '笑死', code: '1f923', bg: '#fce4ec', border: '#f48fb1' },
  { emoji: '😍', label: '色', code: '1f60d', bg: '#fbe9e7', border: '#ffab91' },
  { emoji: '🥰', label: '爱你', code: '1f970', bg: '#fff0f6', border: '#f783ac' },
  { emoji: '😘', label: '亲亲', code: '1f618', bg: '#f8f0ff', border: '#ce93d8' },
  { emoji: '😜', label: '调皮', code: '1f61c', bg: '#e8f5e9', border: '#a5d6a7' },
  { emoji: '🤗', label: '抱抱', code: '1f917', bg: '#fff8e1', border: '#ffd54f' },
  { emoji: '😎', label: '酷', code: '1f60e', bg: '#e0f2f1', border: '#80cbc4' },
  { emoji: '🤩', label: '星星眼', code: '1f929', bg: '#e8eaf6', border: '#9fa8da' },
  { emoji: '😭', label: '流泪', code: '1f62d', bg: '#e3f2fd', border: '#64b5f6' },
  { emoji: '🥺', label: '委屈', code: '1f97a', bg: '#f3e5f5', border: '#ba68c8' },
  { emoji: '😤', label: '发怒', code: '1f624', bg: '#fbe9e7', border: '#e57373' },
  { emoji: '😡', label: '生气', code: '1f621', bg: '#ffebee', border: '#ef5350' },
  { emoji: '🤯', label: '震惊', code: '1f92f', bg: '#fff3e0', border: '#ff9800' },
  { emoji: '😴', label: '睡觉', code: '1f634', bg: '#e8eaf6', border: '#b39ddb' },
  { emoji: '🤔', label: '思考', code: '1f914', bg: '#f5f5f5', border: '#bdbdbd' },
  { emoji: '🙄', label: '无语', code: '1f644', bg: '#eceff1', border: '#90a4ae' },
  { emoji: '👍', label: '赞', code: '1f44d', bg: '#e8f5e9', border: '#66bb6a' },
  { emoji: '👎', label: '弱', code: '1f44e', bg: '#fce4ec', border: '#ef9a9a' },
  { emoji: '👏', label: '鼓掌', code: '1f44f', bg: '#fff8e1', border: '#ffd54f' },
  { emoji: '🙏', label: '祈祷', code: '1f64f', bg: '#f3e5f5', border: '#ce93d8' },
  { emoji: '💪', label: '加油', code: '1f4aa', bg: '#e8f5e9', border: '#81c784' },
  { emoji: '❤️', label: '爱心', code: '2764_fe0f', bg: '#ffebee', border: '#ef5350' },
  { emoji: '💔', label: '心碎', code: '1f494', bg: '#fce4ec', border: '#f06292' },
  { emoji: '💯', label: '满分', code: '1f4af', bg: '#fff3e0', border: '#ffb74d' },
  { emoji: '🔥', label: '火热', code: '1f525', bg: '#fbe9e7', border: '#ff7043' },
]

function stickerImg(code) {
  return NOTO_BASE + code + '/512.png'
}

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const unreadStore = useUnread()

const team = ref(null)
const messages = ref([])
const draft = ref('')
const sending = ref(false)
const loading = ref(true)
const showActivity = ref(true)
const reviewOpen = ref(false)
const reviewing = ref(false)
const bodyEl = ref(null)
const inputRef = ref(null)
const reviews = reactive({})
const reviewTags = ref([])
const reviewNegTags = ref([])
const safetyAlertOpen = ref(false)
const safetyAlertClosable = ref(false)
let safetyTimer = null
const emojiOpen = ref(false)
const stickerOpen = ref(false)
const quizOpen = ref(false)
const quizQuestion = ref('')

const isOwner = computed(() => team.value?.owner_id === auth.user?.id)
const isFlash = computed(() => team.value?.source === 'flash')
const canChat = computed(() => !!team.value)
const otherMembers = computed(() => team.value ? team.value.members.filter((m) => m.id !== auth.user?.id) : [])
const started = computed(() => team.value?.demand?.activity_start ? parseLocalTime(team.value.demand.activity_start) <= new Date() : false)
const canComplete = computed(() => {
  const s = team.value?.demand?.activity_start
  return !s || parseLocalTime(s) <= new Date()
})
const completed = computed(() => team.value?.status === 'done')
const readOnly = computed(() => !!team.value && ['done', 'dismissed'].includes(team.value.status))
const locked = computed(() => {
  const t = team.value?.demand?.lock_time || team.value?.demand?.activity_start
  return t ? parseLocalTime(t) <= new Date() : false
})
// 队伍容量 = 1(队长) + 需求人数（不含自己）；邀请入口在满员或活动已开始时禁用
const capacity = computed(() => 1 + (team.value?.demand?.need_count || 0))
const isFull = computed(() => (team.value?.members?.length || 0) >= capacity.value)
const inviteDisabledReason = computed(() => {
  if (isFlash.value) return '快闪团队暂不支持邀请'
  if (readOnly.value) return '活动已结束，无法邀请'
  if (started.value) return '活动已开始，无法邀请'
  if (isFull.value) return `队伍已满员（${team.value?.members?.length || 0}/${capacity.value}），无法邀请`
  return ''
})
const inviteOpen = ref(false)
const inviteKeyword = ref('')
const inviteResults = ref([])
const inviteLoading = ref(false)
const invitingId = ref(null)
const invitedIds = ref([])
let inviteSearchTimer = null
let inviteSearchSeq = 0

function openInvite() {
  if (inviteDisabledReason.value) return
  inviteKeyword.value = ''
  inviteResults.value = []
  invitedIds.value = []
  inviteOpen.value = true
}

// 输入防抖搜索：至少 2 个字，排除已在队伍中的成员
function onInviteKeyword() {
  if (inviteSearchTimer) clearTimeout(inviteSearchTimer)
  const kw = inviteKeyword.value.trim()
  if (kw.length < 2) {
    inviteResults.value = []
    inviteLoading.value = false
    return
  }
  inviteLoading.value = true
  const seq = ++inviteSearchSeq
  inviteSearchTimer = setTimeout(async () => {
    try {
      const res = await api.searchUsers(kw)
      if (seq !== inviteSearchSeq) return
      const memberIds = new Set((team.value?.members || []).map((m) => m.id))
      inviteResults.value = (res.users || []).filter((u) => !memberIds.has(u.id))
    } catch (e) {
      if (seq !== inviteSearchSeq) return
      ElMessage.error(e.message)
      inviteResults.value = []
    } finally {
      if (seq === inviteSearchSeq) inviteLoading.value = false
    }
  }, 300)
}

async function sendInvite(u) {
  if (invitingId.value || invitedIds.value.includes(u.id)) return
  invitingId.value = u.id
  try {
    await api.inviteTeamMember(team.value.id, u.id)
    invitedIds.value.push(u.id)
    ElMessage.success(`已向 ${u.nickname} 发出入队邀请`)
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    invitingId.value = null
  }
}
const exitOpen = ref(false)
const exitForm = reactive({ reason: '', other: '' })
const exitSubmitting = ref(false)
const dismissOpen = ref(false)
const dismissForm = reactive({ reason: '' })
const dismissSubmitting = ref(false)
const EXIT_REASONS = ['时间临时冲突', '身体不适无法参加', '有突发急事', '个人安排调整', '其他']
const TRANSFER_REASONS = ['临时有事无法继续带队', '时间安排冲突', '个人原因', '其他']
const transferOpen = ref(false)
const transferTarget = ref(null)
const transferForm = reactive({ reason: '', other: '' })
const transferSubmitting = ref(false)

function statusLabel(s) {
  return { forming: '组队中', active: '进行中', done: '已结束', dismissed: '已解散' }[s] || s
}
function statusType(s) {
  return { forming: 'warning', active: 'success', done: 'info', dismissed: 'info' }[s] || 'info'
}

// ===== 微信式消息时间分割线 =====
// 与上一条消息间隔超过 5 分钟（或首条）时，在消息上方显示居中灰色时间小字
const TIME_GAP_MS = 5 * 60 * 1000
function showTime(idx) {
  const m = messages.value[idx]
  if (!m || !m.created_at) return false
  if (idx === 0) return true
  const prev = messages.value[idx - 1]
  const cur = parseLocalTime(m.created_at).getTime()
  const before = prev?.created_at ? parseLocalTime(prev.created_at).getTime() : NaN
  if (!cur || isNaN(before)) return true
  return cur - before > TIME_GAP_MS
}
function fmtChatTime(s) {
  const t = parseLocalTime(s)
  if (isNaN(t.getTime())) return ''
  const now = new Date()
  const hm = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (sameDay(t, now)) return hm
  const yest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  if (sameDay(t, yest)) return `昨天 ${hm}`
  if (now.getTime() - t.getTime() < 7 * 24 * 3600 * 1000) return `${['周日', '周一', '周二', '周三', '周四', '周五', '周六'][t.getDay()]} ${hm}`
  const md = `${t.getMonth() + 1}月${t.getDate()}日`
  return t.getFullYear() === now.getFullYear() ? `${md} ${hm}` : `${t.getFullYear()}年${md} ${hm}`
}

// 消息发送者头像（自己的取当前登录用户，他人取队伍成员资料；找不到回退为首字母占位）
function avatarOf(m) {
  if (m.sender_id === auth.user?.id) return auth.user?.avatar || ''
  const mem = team.value?.members?.find((x) => x.id === m.sender_id)
  return mem?.avatar || ''
}

// ===== 消息撤回（微信式：仅自己发送、2 分钟内、非系统消息可撤回）=====
const RECALL_LIMIT_MS = 2 * 60 * 1000
function canRecall(m) {
  if (!m || m.recalled) return false
  if (m.sender_id !== auth.user?.id || m.msg_type === 'system') return false
  if (!['text', 'image', 'sticker'].includes(m.msg_type)) return false
  const t = m.created_at ? parseLocalTime(m.created_at).getTime() : NaN
  if (!t || isNaN(t)) return false
  return Date.now() - t <= RECALL_LIMIT_MS
}
async function recall(m) {
  try {
    await recallMessage({ team_id: Number(route.params.teamId), msg_id: m.id })
    const t = messages.value.find((x) => x.id === m.id)
    if (t) t.recalled = true
    ElMessage.success('已撤回')
  } catch (e) {
    ElMessage.error(e.message)
  }
}
function onRecallEvt(payload) {
  if (!payload || payload.team_id !== Number(route.params.teamId)) return
  const t = messages.value.find((x) => x.id === payload.id)
  if (t) t.recalled = true
}

// 重新编辑（与微信一致：仅自己的文字消息可重新编辑，原文放回输入框，发送后成为新消息）
function canReEdit(m) {
  if (!m || !m.recalled) return false
  if (m.sender_id !== auth.user?.id || m.msg_type !== 'text') return false
  return !!m.content
}
function reEdit(m) {
  draft.value = m.content
  if (inputRef.value?.focus) inputRef.value.focus()
}

function initReviews() {
  for (const m of otherMembers.value) {
    if (m.my_review) reviews[m.id] = { rating: m.my_review.rating, tags: [...m.my_review.tags], done: true }
    else if (!reviews[m.id]) reviews[m.id] = { rating: 5, tags: [], done: false }
  }
}
function openReview() {
  initReviews()
  reviewOpen.value = true
}
function onRatingChange(mid) {
  if (reviews[mid]) reviews[mid].tags = []
}
function tagsFor(mid) {
  const r = reviews[mid]?.rating ?? 5
  if (r >= 4) return reviewTags.value
  if (r <= 2) return reviewNegTags.value
  return []
}
function toggleTag(mid, tag) {
  const arr = reviews[mid].tags
  const i = arr.indexOf(tag)
  if (i >= 0) arr.splice(i, 1)
  else arr.push(tag)
}
const reviewedCount = computed(() => otherMembers.value.filter((m) => reviews[m.id]?.done).length)

function scrollBottom() {
  nextTick(() => { if (bodyEl.value) bodyEl.value.scrollTop = bodyEl.value.scrollHeight })
}

// 是否已滚动到底部（用于判断新消息到达时是自动跟到底还是保持上翻阅读）
function isNearBottom() {
  if (!bodyEl.value) return true
  return bodyEl.value.scrollHeight - bodyEl.value.scrollTop - bodyEl.value.clientHeight < 80
}

async function load() {
  loading.value = true
  try {
    const teamRes = await api.getTeam(route.params.teamId)
    team.value = teamRes.team
    const msgRes = await api.teamMessages(route.params.teamId)
    messages.value = msgRes.messages || []
    try { await joinTeam(route.params.teamId) } catch { /* 已在房间 */ }
    scrollBottom()
    // 进入聊天室即视为已读全部（清除「打开聊天室」按钮上的未读红圈角标）
    unreadStore.clearTeam(Number(route.params.teamId))
    api.markTeamRead(route.params.teamId).catch(() => {})
  } catch (e) {
    ElMessage.error(e.message)
    team.value = null
  } finally {
    loading.value = false
  }
}

function onMsg(msg) {
  if (msg.team_id !== Number(route.params.teamId)) return
  if (messages.value.some((x) => x.seq === msg.seq)) return
  const stick = isNearBottom()
  messages.value.push(msg)
  if (stick) scrollBottom()
  // 停留聊天室期间收到新消息即标记已读，避免返回列表后残留未读红圈
  unreadStore.clearTeam(Number(route.params.teamId))
  api.markTeamRead(route.params.teamId).catch(() => {})
}

function insertEmoji(e) {
  draft.value += e
  emojiOpen.value = false
}

const STICKER_MAP = new Map(STICKERS.map(s => [s.emoji, s]))

function stickerStyle(emoji) {
  const s = STICKER_MAP.get(emoji)
  return s ? `background:${s.bg};border-color:${s.border};` : ''
}

async function sendSticker(s) {
  if (sending.value || readOnly.value) return
  sending.value = true
  try {
    const url = stickerImg(s.code)
    await sendMessage({ team_id: Number(route.params.teamId), content: url, client_id: Date.now().toString(), msg_type: 'sticker' })
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    sending.value = false
  }
  stickerOpen.value = false
}

async function send() {
  if (sending.value || readOnly.value) return
  const content = draft.value.trim()
  if (!content) return
  sending.value = true
  try {
    await sendMessage({ team_id: Number(route.params.teamId), content, client_id: Date.now().toString() })
    draft.value = ''
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    sending.value = false
  }
}

async function complete() {
  if (!canComplete.value) return ElMessage.warning('活动开始后方可确认完成')
  try {
    await ElMessageBox.confirm('确认活动已结束？确认后将发起搭后互评', '完成确认', { type: 'info' })
  } catch { return }
  try {
    await api.completeTeam(team.value.id)
    ElMessage.success('活动已结束')
    team.value.status = 'done'
    openReview()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function submitReviews() {
  const targets = otherMembers.value.filter((m) => reviews[m.id] && !reviews[m.id].done)
  if (!targets.length) { reviewOpen.value = false; return }
  reviewing.value = true
  try {
    const payload = targets.map((m) => ({ reviewee_id: m.id, rating: reviews[m.id].rating, tags: reviews[m.id].tags }))
    const res = await api.submitReviews(team.value.id, payload)
    for (const m of targets) reviews[m.id].done = true
    if (res.remaining > 0) ElMessage.success(`已提交，还剩 ${res.remaining} 位搭子待评`)
    else { ElMessage.success('已完成全部互评'); reviewOpen.value = false }
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    reviewing.value = false
  }
}

async function dismiss() {
  if (!isFlash.value && locked.value) {
    dismissForm.reason = ''
    dismissOpen.value = true
    return
  }
  try {
    await ElMessageBox.confirm('解散后需求将标记为过期，确认？', '解散队伍', { type: 'warning' })
  } catch { return }
  try {
    await api.dismissTeam(team.value.id)
    ElMessage.success('已解散')
    router.push('/teams')
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function submitDismiss() {
  dismissSubmitting.value = true
  try {
    const res = await api.dismissTeam(team.value.id, dismissForm.reason.trim())
    dismissOpen.value = false
    if (res.mode === 'vote') {
      ElMessage.success('解散申请已提交，等待其他成员全部同意后解散')
    } else {
      ElMessage.success('已解散')
      router.push('/teams')
    }
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    dismissSubmitting.value = false
  }
}

async function leave() {
  if (!isFlash.value && locked.value) {
    exitForm.reason = ''
    exitForm.other = ''
    exitOpen.value = true
    return
  }
  try {
    await ElMessageBox.confirm('确认退出该队伍？', '退出', { type: 'warning' })
  } catch { return }
  try {
    await api.leaveTeam(team.value.id)
    ElMessage.success('已退出')
    router.push('/teams')
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function submitExitRequest() {
  if (!exitForm.reason) return ElMessage.warning('请选择退出原因')
  exitSubmitting.value = true
  try {
    const reason = exitForm.reason === '其他' ? (exitForm.other || '其他') : exitForm.reason
    await api.exitRequestTeam(team.value.id, reason)
    ElMessage.success('退出申请已提交，等待队长处理')
    exitOpen.value = false
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    exitSubmitting.value = false
  }
}

function openTransfer(m) {
  transferTarget.value = m
  transferForm.reason = ''
  transferForm.other = ''
  transferOpen.value = true
}

async function submitTransfer() {
  if (!transferForm.reason) return ElMessage.warning('请选择转让理由')
  const reason = transferForm.reason === '其他' ? (transferForm.other || '其他') : transferForm.reason
  transferSubmitting.value = true
  try {
    await api.transferTeam(team.value.id, transferTarget.value.id, reason)
    ElMessage.success('转让申请已发出，等待对方同意')
    transferOpen.value = false
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    transferSubmitting.value = false
  }
}

async function removeMember(m) {
  try {
    await ElMessageBox.confirm('确定将 ' + m.nickname + ' 移出队伍？', '移除成员', { type: 'warning' })
  } catch { return }
  try {
    await api.removeMember(team.value.id, m.id)
    ElMessage.success('已移除')
    load()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

function closeSafetyAlert() {
  safetyAlertOpen.value = false
  localStorage.setItem('safety_alert_visited_' + route.params.teamId, '1')
  if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null }
}

function openQuiz() {
  quizOpen.value = true
  nextQuiz()
}
function nextQuiz() {
  quizQuestion.value = QUIZ_QUESTIONS[Math.floor(Math.random() * QUIZ_QUESTIONS.length)]
}
function sendQuiz() {
  draft.value = '快问快答：' + quizQuestion.value
  quizOpen.value = false
  ElMessage.success('已填入输入框，点击发送即可')
}

onMounted(() => {
  connectSocket()
  onMessage(onMsg)
  onRecall(onRecallEvt)
  onKicked(() => router.push('/teams'))
  load()
  api.meta().then((m) => { reviewTags.value = m.review_tags || []; reviewNegTags.value = m.review_neg_tags || [] }).catch(() => {})
  // 首次进入该聊天室时弹出安全提醒弹窗
  const visitedKey = 'safety_alert_visited_' + route.params.teamId
  if (!localStorage.getItem(visitedKey)) {
    safetyAlertOpen.value = true
    safetyAlertClosable.value = false
    safetyTimer = setTimeout(() => { safetyAlertClosable.value = true }, 3000)
  }
})
onBeforeUnmount(() => {
  offMessage(onMsg)
  offRecall(onRecallEvt)
  offKicked()
  leaveTeam()
  if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null }
  if (inviteSearchTimer) { clearTimeout(inviteSearchTimer); inviteSearchTimer = null }
})
</script>

<style scoped>
.ch-info { flex: 1; min-width: 0; }
.ch-title-row { display: flex; align-items: center; gap: 10px; }
.ch-title { font-size: 22px; font-weight: 800; color: var(--ink); }
.ch-status { font-size: 15px; font-weight: 700; height: auto; line-height: 1.4; padding: 2px 10px; }
.ch-sub { margin-top: 4px; display: flex; align-items: center; }
.ch-meta { font-size: 16px; font-weight: 600; color: var(--ink); }
.ch-actions { display: flex; gap: 4px; }
.activity-card { border-bottom: 1px solid var(--border); padding: 12px 16px; background: #fff; }
.ac-row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; font-size: 16px; font-weight: 600; color: var(--ink); }
.ac-desc { margin-top: 7px; font-size: 15px; font-weight: 500; color: var(--ink); white-space: pre-wrap; }
.ac-members { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px; }
.member-chip { display: flex; align-items: center; gap: 6px; font-size: 15px; font-weight: 600; color: var(--ink); background: var(--surface); border-radius: 999px; padding: 3px 12px 3px 3px; cursor: pointer; }
.member-actions { display: none; gap: 4px; align-items: center; margin-left: 4px; }
.member-chip:hover .member-actions { display: flex; }
.ice-banner { margin-top: 10px; padding: 10px 14px; background: #eef6ff; border: 1px solid #cfe3ff; border-radius: 10px; color: #163a63; font-size: 15px; font-weight: 600; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ice-banner .el-button { font-size: 15px; font-weight: 700; }
.quiz-card { padding: 8px 4px; }
.quiz-q { font-size: 16px; font-weight: 700; color: var(--ink); line-height: 1.5; text-align: center; padding: 16px; background: #fff7e6; border: 1px solid #ffe3b0; border-radius: 12px; }
.quiz-tip { text-align: center; color: var(--text-secondary); font-size: 13.5px; margin: 12px 0; }
.quiz-btns { display: flex; justify-content: center; gap: 8px; }
.sticker-msg { display: inline-block; }
.chat-msg.recalled { justify-content: center; }
.recalled-line { font-size: 13px; color: var(--text-secondary); font-weight: 600; opacity: .85; }
.re-edit { color: var(--brand); cursor: pointer; margin-left: 6px; font-weight: 600; }
.re-edit:hover { text-decoration: underline; }
.recall-btn { display: none; align-items: center; font-size: 13px; color: var(--text-secondary); background: transparent; border: none; cursor: pointer; padding: 0 6px; flex-shrink: 0; white-space: nowrap; }
.chat-msg:hover .recall-btn { display: inline-flex; }
.recall-btn:hover { color: var(--brand); }
.sticker-img-lg { display: block; width: 130px; height: 130px; object-fit: contain; user-select: none; }
.bubble .txt { font-size: 18px; line-height: 1.7; word-break: break-word; white-space: pre-wrap; }
.bubble .txt em { font-style: normal; font-size: 1.5em; }
.time-divider { text-align: center; font-size: 13px; font-weight: 600; color: var(--text-secondary); opacity: .8; margin: 2px 0 10px; }
.chat-input { display: flex; flex-direction: column; }
.invite-entry { display: inline-flex; }
.invite-tip { font-size: 13.5px; color: var(--text-secondary); background: #f7f9fc; border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px; margin-bottom: 12px; line-height: 1.6; }
.invite-list { margin-top: 12px; max-height: 320px; overflow-y: auto; }
.invite-item { display: flex; align-items: center; gap: 10px; padding: 10px 4px; border-bottom: 1px dashed var(--border); }
.ii-body { flex: 1; min-width: 0; }
.ii-name { font-size: 15px; font-weight: 700; color: var(--ink); display: flex; align-items: center; gap: 6px; }
.ii-meta { font-size: 13px; color: var(--text-secondary); margin-top: 2px; font-weight: 600; }
.invite-empty { text-align: center; color: var(--text-secondary); font-size: 14px; padding: 18px 0; }
.readonly-tip { padding: 8px 12px; margin-bottom: 4px; border-radius: 8px; background: #f5f7fa; color: #909399; font-size: 13px; text-align: center; }
.chat-input .send-btn { height: 48px; min-width: 88px; font-size: 16.5px; font-weight: 700; }
.ci-toolbar { display: flex; gap: 2px; padding: 4px 0 2px; }
.ci-toolbar .el-button { font-size: 20px; line-height: 1; height: 36px; width: 46px; padding: 0; border-radius: 8px; }
.ci-toolbar .el-button.active { background: var(--brand); color: #fff; }
.ci-picker { border-top: 1px solid var(--border); background: #fafafa; max-height: 200px; overflow-y: auto; }
.emoji-grid { display: flex; flex-wrap: wrap; gap: 2px; padding: 6px; }
.emoji-cell { font-size: 30px; cursor: pointer; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 6px; }
.emoji-cell:hover { background: #e8e8e8; transform: scale(1.15); }
.sticker-grid { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px; }
.sticker-cell { width: 82px; display: flex; flex-direction: column; align-items: center; gap: 2px; cursor: pointer; border-radius: 8px; padding: 6px 2px; background: #fff; border: 1px solid var(--border); }
.sticker-cell:hover { border-color: var(--brand); background: #f0f6ff; transform: scale(1.08); }
.sticker-emoji { font-size: 40px; line-height: 1.2; }
.sticker-label { font-size: 11px; color: var(--text-secondary); font-weight: 600; white-space: nowrap; }
.ci-row { display: flex; gap: 8px; align-items: flex-end; }
.review-tip { font-size: 15px; font-weight: 600; color: #6b4a1a; background: #fff7e6; border: 1px solid #ffe3b0; border-radius: 10px; padding: 10px 14px; margin-bottom: 8px; line-height: 1.5; }
.review-tip b { color: #d84315; }
.review-progress { text-align: right; color: #d84315; font-weight: 800; font-size: 14px; line-height: 1; margin: 0 4px 12px; }
.review-item { border: 1px solid var(--border); border-radius: 12px; padding: 14px; margin-bottom: 12px; background: #fff; }
.review-item.done { background: #f6f8fb; opacity: 0.85; }
.ri-head { display: flex; align-items: center; gap: 10px; }
.ri-head .el-rate { --el-rate-icon-size: 26px; }
.ri-who { flex: 1; min-width: 0; }
.ri-name { font-weight: 700; font-size: 16px; color: var(--ink); display: flex; align-items: center; gap: 6px; }
.ri-meta { font-size: 14px; color: var(--text-secondary); margin-top: 3px; font-weight: 600; }
.ri-tags { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px; }
.ri-tags .el-check-tag { font-size: 15px; font-weight: 600; padding: 6px 12px; height: auto; }
.ri-tags .el-check-tag.is-checked { background: var(--brand); border-color: var(--brand); color: #fff; }
.ri-done-tags { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.mb-16 { margin-bottom: 16px; }
.sec-title { font-size: 18px; font-weight: 700; }
.safety-tip-box { padding: 18px 20px; background: #fff7e6; border: 1px solid #ffe3b0; border-radius: 10px; color: #8a5b12; font-size: 16px; line-height: 1.7; font-weight: 600; }
.safety-banner { padding: 12px 16px; background: #fff7e6; border-bottom: 1px solid #ffe3b0; color: #8a5b12; font-size: 15px; line-height: 1.7; font-weight: 600; }
</style>