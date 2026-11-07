<template>
  <div class="auth-page">
    <div class="auth-card card">
      <img src="/logo.png" class="auth-logo" alt="校遇" />
      <h2 class="auth-title">注册账号</h2>
      <p class="auth-sub">为保证用户上财身份，仅支持上财校园邮箱登录，校园邮箱见上财门户-首页-我的邮箱，如学生校园邮箱账号通常为"学号@stu.sufe.edu.cn"</p>
      <el-form @submit.prevent="submit">
        <el-form-item>
          <el-input v-model="form.nickname" placeholder="昵称" size="large" :prefix-icon="User" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.email" placeholder="校园邮箱（仅支持上财校园邮箱）" size="large" :prefix-icon="Message" @keyup.enter="submit" />
        </el-form-item>
        <el-form-item>
          <div class="code-row">
            <el-input v-model="form.code" placeholder="邮箱验证码" size="large" :prefix-icon="Message" maxlength="6" />
            <el-button :disabled="countdown > 0" @click="sendCode">{{ countdown > 0 ? countdown + 's' : '发送验证码' }}</el-button>
          </div>
        </el-form-item>
        <el-form-item :error="passError">
          <el-input v-model="form.password" type="password" placeholder="设置密码（8~20 位，含字母和数字）" size="large" :prefix-icon="Lock" show-password />
        </el-form-item>
        <el-form-item :error="confirmError">
          <el-input v-model="form.confirm_password" type="password" placeholder="确认密码（再次输入）" size="large" :prefix-icon="Lock" show-password @keyup.enter="submit" />
        </el-form-item>
        <div class="agree-row">
          <el-checkbox v-model="agreed" />
          <span class="agree-text">
            我已阅读并同意
            <a href="/terms" target="_blank" @click.stop>《用户服务协议》</a>和
            <a href="/privacy" target="_blank" @click.stop>《隐私政策》</a>
          </span>
        </div>
        <el-button type="primary" size="large" style="width:100%" :loading="loading" @click="submit">注 册</el-button>
      </el-form>
      <div class="auth-link">已有账号？<router-link to="/login">返回登录</router-link></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Message, Lock, User } from '@element-plus/icons-vue'
import { useAuth } from '../store/auth.js'
import api from '../api/index.js'
import { isTrustedEmail } from '../emailDomains.js'

const auth = useAuth()
const router = useRouter()
const form = ref({ nickname: '', email: '', code: '', password: '', confirm_password: '' })
const agreed = ref(false)
const loading = ref(false)
const countdown = ref(0)
let timer = null

const passError = computed(() => {
  const p = form.value.password
  if (!p) return ''
  if (p.length < 8 || p.length > 20) return '密码需 8~20 位'
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return '密码需同时包含字母和数字'
  return ''
})
const confirmError = computed(() => {
  const c = form.value.confirm_password
  return c && c !== form.value.password ? '两次输入的密码不一致' : ''
})

function startCountdown() {
  countdown.value = 60
  clearInterval(timer)
  timer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) clearInterval(timer)
  }, 1000)
}

async function sendCode() {
  if (!form.value.email.trim()) return ElMessage.warning('请先填写校园邮箱')
  if (!isTrustedEmail(form.value.email)) return ElMessage.warning('仅支持上财校园邮箱')
  try {
    const res = await api.sendCode(form.value.email, 'register')
    startCountdown()
    if (res.dev_code) ElMessage.success(`开发模式验证码：${res.dev_code}`)
    else ElMessage.success('验证码已发送，请查收邮件')
  } catch (e) {
    if (e.message.includes('已注册')) {
      ElMessage.warning('该邮箱已注册，可直接登录')
      router.push({ path: '/login', query: { email: form.value.email } })
      return
    }
    ElMessage.error(e.message)
  }
}

async function submit() {
  if (!form.value.nickname || !form.value.email || !form.value.code || !form.value.password || !form.value.confirm_password)
    return ElMessage.warning('请完整填写注册信息')
  if (!isTrustedEmail(form.value.email)) return ElMessage.warning('仅支持上财校园邮箱')
  if (!/^\d{6}$/.test(form.value.code.trim())) return ElMessage.warning('请输入 6 位验证码')
  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,20}$/.test(form.value.password)) return ElMessage.warning('密码需 8~20 位，且同时包含字母和数字')
  if (form.value.password !== form.value.confirm_password) return ElMessage.warning('两次输入的密码不一致')
  if (!agreed.value) return ElMessage.warning('请先阅读并勾选同意《用户服务协议》和《隐私政策》')
  loading.value = true
  try {
    const res = await api.register({ ...form.value, agreed: agreed.value })
    auth.setAuth(res.token, res.user)
    ElMessage.success('注册成功，校园邮箱已认证')
    router.push('/me')
  } catch (e) {
    if (e.message.includes('已注册')) {
      ElMessage.warning('该邮箱已注册，可直接登录')
      router.push({ path: '/login', query: { email: form.value.email } })
    } else {
      ElMessage.error(e.message)
    }
  } finally {
    loading.value = false
  }
}

onBeforeUnmount(() => clearInterval(timer))
</script>

<style scoped>
.auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(160deg, #e9f7f2, #f0f7f4); padding: 20px; }
.auth-card { width: 100%; max-width: 520px; padding: 48px 44px; }
.auth-logo { width: 210px; max-width: 70%; height: auto; display: block; margin: 0 auto; }
.auth-title { text-align: center; font-size: 32px; margin: 18px 0 8px; }
.auth-sub { text-align: center; color: var(--text-secondary); font-size: 15px; line-height: 1.7; margin-bottom: 32px; }
.auth-link { text-align: center; font-size: 18px; margin-top: 20px; color: var(--text-secondary); }
.code-row { display: flex; gap: 10px; align-items: stretch; width: 100%; }
.code-row :deep(.el-input) { flex: 1; }
.auth-card .code-row :deep(.el-button) { height: 56px; font-size: 19px; letter-spacing: 0; white-space: nowrap; }
.agree-row { display: flex; align-items: center; gap: 8px; font-size: 18px; color: var(--text-secondary); margin-bottom: 20px; }
.agree-row :deep(.el-checkbox) { transform: scale(1.25); }
.agree-row :deep(.el-checkbox__label) { font-size: 18px; }
.agree-text { line-height: 1.6; white-space: nowrap; }
.agree-text a { color: var(--brand); text-decoration: underline; }
.agree-text a:hover { color: var(--brand-hover); }
.auth-card :deep(.el-input__inner) { height: 56px; font-size: 19px; }
.auth-card :deep(.el-input__icon) { font-size: 21px; height: 56px; line-height: 56px; }
.auth-card :deep(.el-button) { height: 58px; font-size: 21px; letter-spacing: 2px; }
</style>