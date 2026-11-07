<template>
  <span class="ai-trigger" @click="openAi" title="AI 助手">
    <span class="ai-icon">🤖</span>
    <span class="ai-label">AI助手</span>
  </span>

  <el-dialog v-model="aiOpen" title="小遇 · AI 助手" width="560px" :close-on-click-modal="false" append-to-body>
    <div class="ai-hint">可以问我破冰话题、安全建议、组队技巧或信誉说明，也可以聊聊搭子需求、兴趣圈、校园活动、组队相关的问题～</div>
    <div class="ai-msgs">
      <div v-for="(m, i) in aiMsgs" :key="i" class="ai-msg" :class="m.role">
        <div class="ai-avatar" :class="m.role">{{ m.role === 'ai' || m.role === 'assistant' ? '🤖' : '我' }}</div>
        <div class="ai-bubble" v-if="m.text" v-html="m.role === 'ai' || m.role === 'assistant' ? renderMarkdown(m.text) : escapeHtml(m.text).replace(/\n/g, '<br>')"></div>
        <div class="ai-bubble ai-typing" v-else><span></span><span></span><span></span></div>
      </div>
    </div>
    <div class="ai-input">
      <el-input ref="aiInputRef" v-model="aiDraft" placeholder="提问…" :disabled="aiLoading" @keyup.enter="aiSend" />
      <el-button v-if="!aiLoading" type="primary" @click="aiSend">发送</el-button>
      <el-button v-else type="danger" plain @click="aiStop">停止</el-button>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const aiOpen = ref(false)
const aiMsgs = ref([])
const aiDraft = ref('')
const aiLoading = ref(false)
const aiInputRef = ref(null)
let aiAbort = null

async function openAi() {
  aiOpen.value = true
  if (!aiMsgs.value.length) {
    aiMsgs.value.push({ role: 'ai', text: '你好呀，我是校遇 AI 助手「小遇」，可以问我破冰话题、安全建议、组队技巧或信誉说明～' })
    try {
      const token = localStorage.getItem('dazi_token')
      const resp = await fetch('/api/ai/history', {
        headers: { Authorization: `Bearer ${token || ''}` }
      })
      if (resp.ok) {
        const history = await resp.json()
        if (history.length) {
          aiMsgs.value = history
        }
      }
    } catch { /* 静默失败 */ }
  }
  nextTick(() => aiInputRef.value?.focus?.())
}

function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function inlineMd(s) {
  let t = escapeHtml(s)
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>')
  t = t.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  return t
}

// 轻量 Markdown 渲染：加粗/斜体/行内代码/标题/列表/代码块（先整体转义再解析，防 XSS）
function renderMarkdown(src) {
  const lines = String(src ?? '').replace(/\r\n/g, '\n').split('\n')
  const out = []
  let inCode = false
  let code = []
  let para = []
  let ulItems = []
  let olItems = []
  const flushPara = () => { if (para.length) { out.push('<p>' + para.join('<br>') + '</p>'); para = [] } }
  const flushUl = () => { if (ulItems.length) { out.push('<ul>' + ulItems.map(i => '<li>' + i + '</li>').join('') + '</ul>'); ulItems = [] } }
  const flushOl = () => { if (olItems.length) { out.push('<ol>' + olItems.map(i => '<li>' + i + '</li>').join('') + '</ol>'); olItems = [] } }
  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      flushPara(); flushUl(); flushOl()
      if (inCode) { out.push('<pre><code>' + escapeHtml(code.join('\n')) + '</code></pre>'); code = []; inCode = false }
      else inCode = true
      continue
    }
    if (inCode) { code.push(line); continue }
    if (!line.trim()) { flushPara(); flushUl(); flushOl(); continue }
    const h = line.match(/^(#{1,4})\s+(.*)$/)
    if (h) { flushPara(); flushUl(); flushOl(); const lv = h[1].length; out.push('<h' + lv + '>' + inlineMd(h[2]) + '</h' + lv + '>'); continue }
    const ul = line.match(/^\s*[-*+]\s+(.*)$/)
    if (ul) { flushPara(); flushOl(); ulItems.push(inlineMd(ul[1])); continue }
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/)
    if (ol) { flushPara(); flushUl(); olItems.push(inlineMd(ol[1])); continue }
    para.push(inlineMd(line))
  }
  flushPara(); flushUl(); flushOl()
  if (inCode && code.length) out.push('<pre><code>' + escapeHtml(code.join('\n')) + '</code></pre>')
  return out.join('')
}

function buildHistory() {
  const arr = []
  for (const m of aiMsgs.value) {
    if (m.role === 'user' && m.text) arr.push({ role: 'user', content: m.text })
    else if ((m.role === 'ai' || m.role === 'assistant') && m.text) arr.push({ role: 'assistant', content: m.text })
  }
  return arr.slice(-6)
}

async function aiSend() {
  const text = aiDraft.value.trim()
  if (!text || aiLoading.value) return
  aiMsgs.value.push({ role: 'user', text })
  aiDraft.value = ''
  aiLoading.value = true
  aiMsgs.value.push({ role: 'ai', text: '' })
  const aiMsg = aiMsgs.value[aiMsgs.value.length - 1]
  aiAbort = new AbortController()
  try {
    const token = localStorage.getItem('dazi_token')
    const resp = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
      body: JSON.stringify({ message: text, history: buildHistory(), stream: true }),
      signal: aiAbort.signal
    })
    if (!resp.ok || !resp.body) throw new Error('请求失败')
    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop()
      for (const line of lines) {
        const s = line.trim()
        if (!s.startsWith('data:')) continue
        const payload = s.slice(5).trim()
        if (payload === '[DONE]') continue
        try {
          const data = JSON.parse(payload)
          if (data.delta) aiMsg.text += data.delta
        } catch { /* 忽略无法解析的行 */ }
      }
    }
    if (!aiMsg.text) aiMsg.text = '（无回复）'
  } catch (e) {
    if (e.name === 'AbortError') {
      if (!aiMsg.text) aiMsg.text = '已停止'
    } else {
      aiMsg.text = '抱歉，出错了：' + e.message
    }
  } finally {
    aiAbort = null
    aiLoading.value = false
  }
}

function aiStop() {
  if (aiAbort) aiAbort.abort()
}
</script>

<style scoped>
.ai-trigger { display: flex; align-items: center; gap: 5px; cursor: pointer; color: var(--ink); padding: 7px 10px; border-radius: 8px; }
.ai-trigger:hover { background: var(--surface); color: var(--brand-text); }
.ai-icon { font-size: 20px; line-height: 1; }
.ai-label { font-size: 19px; font-weight: 700; }

.ai-hint { padding: 12px 14px; background: var(--brand-soft); border: 1px solid #d8f0e6; border-radius: 12px; color: var(--brand-text); font-size: 16px; margin-bottom: 14px; line-height: 1.6; }

.ai-msgs { max-height: 420px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; padding: 16px 14px; background: #f4f8f6; border-radius: 16px; }
.ai-msgs::-webkit-scrollbar { width: 6px; }
.ai-msgs::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
.ai-msgs::-webkit-scrollbar-thumb:hover { background: var(--disabled); }

.ai-msg { display: flex; align-items: flex-start; gap: 10px; animation: fadeInUp var(--duration-normal) var(--ease-out) both; }
.ai-msg.user { flex-direction: row-reverse; }
.ai-avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; background: #fff; border: 1px solid var(--border); box-shadow: var(--shadow); }
.ai-avatar.user { background: var(--brand); color: #fff; font-size: 15px; font-weight: 700; border-color: var(--brand); }

.ai-bubble { max-width: 78%; padding: 12px 15px; border-radius: 16px; font-size: 17px; line-height: 1.6; color: var(--ink); box-shadow: 0 2px 8px rgba(9, 49, 38, 0.06); }
.ai-msg.ai .ai-bubble { background: #fff; border: 1px solid var(--border); border-bottom-left-radius: 6px; }
.ai-msg.user .ai-bubble { background: var(--brand); color: #fff; border-bottom-right-radius: 6px; }

.ai-input { display: flex; gap: 10px; margin-top: 14px; }
.ai-input :deep(input) { font-size: 17px; }

/* 输入三点跳动动画 */
.ai-typing { display: flex; align-items: center; gap: 5px; padding: 16px 18px; }
.ai-typing span { width: 7px; height: 7px; border-radius: 50%; background: var(--muted); animation: aiBlink 1.2s infinite; }
.ai-typing span:nth-child(2) { animation-delay: .2s; }
.ai-typing span:nth-child(3) { animation-delay: .4s; }
@keyframes aiBlink { 0%, 60%, 100% { opacity: .3; transform: scale(.8); } 30% { opacity: 1; transform: scale(1.1); } }

/* Markdown 轻渲染样式 */
.ai-bubble p { margin: 0 0 6px; }
.ai-bubble p:last-child { margin-bottom: 0; }
.ai-bubble ul, .ai-bubble ol { margin: 0 0 6px; padding-left: 20px; }
.ai-bubble li { margin: 3px 0; }
.ai-bubble pre { background: rgba(11, 18, 14, 0.06); padding: 9px 12px; border-radius: 10px; overflow-x: auto; margin: 6px 0; }
.ai-bubble code { background: rgba(11, 18, 14, 0.08); padding: 1px 6px; border-radius: 4px; font-size: 0.92em; }
.ai-bubble pre code { background: transparent; padding: 0; }
.ai-bubble h1, .ai-bubble h2, .ai-bubble h3, .ai-bubble h4 { margin: 6px 0; line-height: 1.35; }

:deep(.el-dialog__title) { font-size: 22px; font-weight: 700; }
:deep(.el-dialog) { max-width: 94vw; }
</style>