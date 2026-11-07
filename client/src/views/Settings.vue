<template>
  <div>
    <div class="page-title">设置</div>
    <div class="page-sub">隐私、认证、黑名单与账号管理</div>

    <div class="card">
      <div class="sec-title">账号认证</div>
      <div class="verify-row mt-8">
        <div class="vr-body">
          <div class="vr-name">校园邮箱认证 <el-tag v-if="auth.user?.email_verified" size="small" type="success">已认证</el-tag></div>
          <div class="vr-sub text-muted">认证后可获得「已认证」标识，提升匹配可信度</div>
        </div>
        <el-button v-if="!auth.user?.email_verified" size="small" type="primary" @click="verifyEmail">立即认证</el-button>
      </div>
      <div class="verify-row">
        <div class="vr-body">
          <div class="vr-name">学生证认证 <el-tag v-if="auth.user?.student_verified" size="small" type="success">已认证</el-tag></div>
          <div class="vr-sub text-muted">人工审核通过后展示学生身份标识</div>
        </div>
        <el-button v-if="!auth.user?.student_verified" size="small" type="primary" @click="studentVerify">立即认证</el-button>
      </div>
    </div>

    <div class="card">
      <div class="sec-title">隐私设置</div>
      <div class="privacy-row mt-8">
        <div class="pr-body">
          <div class="vr-name">展示学校 / 学院</div>
          <div class="vr-sub text-muted">关闭后他人看不到你的学校信息</div>
        </div>
        <el-switch :model-value="showCollege" @change="setPrivacy('show_college', $event)" />
      </div>
      <div class="privacy-row">
        <div class="pr-body">
          <div class="vr-name">展示年级</div>
          <div class="vr-sub text-muted">关闭后他人看不到你的年级信息</div>
        </div>
        <el-switch :model-value="showGrade" @change="setPrivacy('show_grade', $event)" />
      </div>
      <div class="privacy-row">
        <div class="pr-body">
          <div class="vr-name">展示兴趣圈</div>
          <div class="vr-sub text-muted">关闭后他人看不到你加入的兴趣圈</div>
        </div>
        <el-switch :model-value="showCircles" @change="setPrivacy('show_circles', $event)" />
      </div>
      <div v-if="auth.user?.is_admin" class="privacy-row">
        <div class="pr-body">
          <div class="vr-name">展示管理员身份标识</div>
          <div class="vr-sub text-muted">关闭后你的昵称旁不展示管理员徽章</div>
        </div>
        <el-switch :model-value="showAdmin" @change="setPrivacy('show_admin', $event)" />
      </div>
    </div>

    <div class="card">
      <div class="sec-title">消息提醒</div>
      <div class="privacy-row mt-8">
        <div class="pr-body">
          <div class="vr-name">新消息提示音</div>
          <div class="vr-sub text-muted">收到通知或聊天消息时播放提示音</div>
        </div>
        <el-switch :model-value="soundOn" @change="setSound" />
      </div>
      <div class="privacy-row">
        <div class="pr-body">
          <div class="vr-name">桌面通知</div>
          <div class="vr-sub text-muted">页面在后台时通过系统通知提醒新消息（需浏览器授权）</div>
        </div>
        <el-switch :model-value="desktopOn" @change="setDesktop" />
      </div>
    </div>

    <div class="card">
      <div class="sec-title">协议与隐私</div>
      <a class="legal-row mt-8" href="/terms" target="_blank">
        <div class="lr-body">
          <div class="vr-name">《用户服务协议》</div>
          <div class="vr-sub text-muted">查看平台服务条款与用户行为规范</div>
        </div>
        <span class="lr-arrow">›</span>
      </a>
      <a class="legal-row" href="/privacy" target="_blank">
        <div class="lr-body">
          <div class="vr-name">《隐私政策》</div>
          <div class="vr-sub text-muted">了解我们如何收集、使用与保护你的个人信息</div>
        </div>
        <span class="lr-arrow">›</span>
      </a>
    </div>

    <div class="card">
      <div class="sec-title">黑名单（{{ blocks.length }}）</div>
      <div v-if="!blocks.length" class="text-muted mt-8">暂无拉黑用户</div>
      <div v-else class="mt-8">
        <div v-for="b in blocks" :key="b.id" class="block-row" @click="$router.push('/user/' + b.blocked_id)">
          <el-avatar :size="28" :src="b.avatar || undefined" style="background: var(--brand); font-size:14px">{{ b.nickname?.slice(0, 1) }}</el-avatar>
          <div class="br-body">
            <span style="font-weight:700;font-size:15px">{{ b.nickname }}</span>
            <span class="text-muted" style="font-size:14.5px; font-weight:500">{{ b.college || '' }} · 拉黑于 {{ fmtDate(b.created_at) }}</span>
          </div>
          <el-button size="small" text @click.stop="unblock(b)">解除</el-button>
        </div>
      </div>
    </div>

    <div class="card danger-card">
      <div class="danger-info">
        <div class="sec-title">账号注销</div>
        <div class="text-muted mt-8" style="font-size:15px">注销后将删除账号及全部数据，不可恢复</div>
      </div>
      <el-button type="danger" plain @click="deleteAccount">注销账号</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api/index.js'
import { useAuth } from '../store/auth.js'
import { disconnectSocket } from '../socket.js'
import { fmtDate } from '../utils.js'

const auth = useAuth()
const router = useRouter()
const blocks = ref([])

const showCollege = computed(() => !!auth.user?.show_college)
const showGrade = computed(() => !!auth.user?.show_grade)
const showCircles = computed(() => !!auth.user?.show_circles)
const showAdmin = computed(() => !!auth.user?.show_admin)

// 消息提醒开关（仅本地偏好，存 localStorage）
const soundOn = ref(localStorage.getItem('msg_sound') === '1')
const desktopOn = ref(localStorage.getItem('msg_desktop') === '1' && 'Notification' in window && Notification.permission === 'granted')

function setSound(v) {
  soundOn.value = !!v
  localStorage.setItem('msg_sound', v ? '1' : '0')
}

async function setDesktop(v) {
  if (!v) {
    desktopOn.value = false
    localStorage.setItem('msg_desktop', '0')
    return
  }
  if (!('Notification' in window)) {
    ElMessage.warning('当前浏览器不支持桌面通知')
    return
  }
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') {
    ElMessage.warning('未获得通知权限，请在浏览器设置中允许本站发送通知')
    return
  }
  desktopOn.value = true
  localStorage.setItem('msg_desktop', '1')
  ElMessage.success('已开启桌面通知')
}

async function loadBlocks() {
  try {
    const res = await api.blocks()
    blocks.value = res.blocks || []
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function verifyEmail() {
  try {
    // 第一次请求：后端生成一次性验证码（演示态打印到服务端日志），从日志获取后输入
    const init = await api.verifyEmail()
    if (init.verified) {
      auth.user = init.user
      localStorage.setItem('dazi_user', JSON.stringify(init.user))
      ElMessage.success(init.hint)
      return
    }
    let code
    try {
      const { value } = await ElMessageBox.prompt(init.hint, '校园邮箱认证', {
        inputPattern: /^\d{6}$/,
        inputErrorMessage: '请输入 6 位数字验证码',
        confirmButtonText: '提交认证',
        cancelButtonText: '取消'
      })
      code = value
    } catch { return }
    const res = await api.verifyEmail(code)
    auth.user = res.user
    localStorage.setItem('dazi_user', JSON.stringify(res.user))
    ElMessage.success(res.hint)
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function studentVerify() {
  ElMessage.info('请前往「我的画像」填写学号并提交，管理员审核通过后即完成认证')
  router.push('/me')
}

async function setPrivacy(key, val) {
  try {
    await api.updatePrivacy({ [key]: val })
    await auth.refresh()
    ElMessage.success('已更新')
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function unblock(b) {
  try {
    await api.unblock(b.blocked_id)
    ElMessage.success('已解除拉黑')
    loadBlocks()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function deleteAccount() {
  try {
    await ElMessageBox.confirm('注销后账号与数据将永久删除，确认注销？', '危险操作', { type: 'error', confirmButtonText: '确认注销' })
  } catch { return }
  try {
    await api.deleteAccount()
    disconnectSocket()
    auth.logout()
    ElMessage.success('账号已注销')
    router.push('/login')
  } catch (e) {
    ElMessage.error(e.message)
  }
}

onMounted(() => {
  loadBlocks()
})
</script>

<style scoped>
.sec-title { font-size: 19px; font-weight: 800; color: var(--ink); }
.mt-8 { margin-top: 8px; } .mt-16 { margin-top: 16px; }
.verify-row { display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--surface-muted); }
.verify-row:last-child { border-bottom: none; }
.vr-body { flex: 1; }
.vr-name { font-weight: 700; font-size: 16.5px; color: var(--ink); display: flex; align-items: center; gap: 6px; }
.vr-sub { font-size: 15px; color: var(--ink); margin-top: 2px; }
.privacy-row { display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--surface-muted); }
.privacy-row:last-child { border-bottom: none; }
.pr-body { flex: 1; }
.legal-row { display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--surface-muted); text-decoration: none; color: var(--ink); }
.legal-row:last-child { border-bottom: none; }
.legal-row:hover .vr-name { color: var(--brand-text); }
.lr-body { flex: 1; }
.lr-arrow { font-size: 22px; color: var(--muted); font-weight: 700; }
.block-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--surface-muted); cursor: pointer; }
.br-body { flex: 1; display: flex; flex-direction: column; }
.danger-card { border-color: #ffd6d6; display: flex; align-items: center; justify-content: space-between; gap: 16px; }.danger-info { flex: 1; min-width: 0; }.text-muted { color: var(--ink); }
</style>