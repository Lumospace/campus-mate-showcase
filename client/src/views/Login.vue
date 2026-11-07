<template>
  <div class="auth-page">
    <div class="auth-card card">
      <img src="/logo.png" class="auth-logo" alt="校遇" />
      <h2 class="auth-title">找到你的校园搭子</h2>
      <p class="auth-sub">不必独行，在校有遇</p>
      <el-form @submit.prevent="submit">
        <el-form-item>
          <el-input v-model="form.email" placeholder="校园邮箱（仅支持上财）" size="large" :prefix-icon="Message" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.password" type="password" placeholder="密码" size="large" :prefix-icon="Lock" show-password @keyup.enter="submit" />
        </el-form-item>
        <div class="forgot-row">
          <a class="forgot-link" @click="openForgot">忘记密码？</a>
        </div>
        <div class="agree-row">
          <el-checkbox v-model="agreed" />
          <span class="agree-text">
            我已阅读并同意
            <a href="/terms" target="_blank" @click.stop>《用户服务协议》</a>和
            <a href="/privacy" target="_blank" @click.stop>《隐私政策》</a>
          </span>
        </div>
        <el-button type="primary" size="large" style="width:100%" :loading="loading" @click="submit">登 录</el-button>
      </el-form>
      <div class="auth-link">还没有账号？<router-link to="/register">立即注册</router-link></div>
    </div>

    <el-dialog v-model="forgotVisible" width="540px" :close-on-click-modal="false">
      <template #header>
        <span class="forgot-title">忘记密码</span>
      </template>
      <el-form label-position="top" class="forgot-form" @submit.prevent="submitReset">
        <el-form-item label="校园邮箱">
          <el-input v-model="resetForm.email" placeholder="仅支持上财校园邮箱（如 xxx@stu.sufe.edu.cn）" :prefix-icon="Message" />
        </el-form-item>
        <el-form-item label="邮箱验证码">
          <div class="reset-code-row">
            <el-input v-model="resetForm.code" placeholder="6 位验证码" maxlength="6" />
            <el-button :disabled="resetCountdown > 0" @click="sendResetCode">{{ resetCountdown > 0 ? resetCountdown + 's' : '发送验证码' }}</el-button>
          </div>
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="resetForm.password" type="password" placeholder="8~20 位，含字母和数字" :prefix-icon="Lock" show-password />
        </el-form-item>
        <el-form-item label="确认新密码">
          <el-input v-model="resetForm.confirm_password" type="password" placeholder="再次输入新密码" :prefix-icon="Lock" show-password @keyup.enter="submitReset" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="large" @click="forgotVisible = false">取消</el-button>
        <el-button size="large" type="primary" :loading="resetLoading" @click="submitReset">重置密码</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Message, Lock } from '@element-plus/icons-vue'
import { useAuth } from '../store/auth.js'
import api from '../api/index.js'
import { isTrustedEmail } from '../emailDomains.js'

const auth = useAuth()
const router = useRouter()
const route = useRoute()
const form = ref({ email: '', password: '' })
const agreed = ref(false)
const loading = ref(false)

const forgotVisible = ref(false)
const resetForm = ref({ email: '', code: '', password: '', confirm_password: '' })
const resetLoading = ref(false)
const resetCountdown = ref(0)
let resetTimer = null

function startTimer() {
  resetCountdown.value = 60
  clearInterval(resetTimer)
  resetTimer = setInterval(() => {
    resetCountdown.value -= 1
    if (resetCountdown.value <= 0) clearInterval(resetTimer)
  }, 1000)
}

function openForgot() {
  resetForm.value = { email: form.value.email || '', code: '', password: '', confirm_password: '' }
  forgotVisible.value = true
}

async function sendResetCode() {
  if (!resetForm.value.email.trim()) return ElMessage.warning('请先填写校园邮箱')
  if (!isTrustedEmail(resetForm.value.email)) return ElMessage.warning('仅支持上财校园邮箱')
  try {
    const res = await api.sendCode(resetForm.value.email, 'reset')
    startTimer()
    if (res.dev_code) ElMessage.success(`开发模式验证码：${res.dev_code}`)
    else ElMessage.success('验证码已发送，请查收邮件')
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function submitReset() {
  if (!resetForm.value.email || !resetForm.value.code || !resetForm.value.password || !resetForm.value.confirm_password)
    return ElMessage.warning('请完整填写信息')
  if (!isTrustedEmail(resetForm.value.email)) return ElMessage.warning('仅支持上财校园邮箱')
  if (!/^\d{6}$/.test(resetForm.value.code.trim())) return ElMessage.warning('请输入 6 位验证码')
  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,20}$/.test(resetForm.value.password)) return ElMessage.warning('密码需 8~20 位，且同时包含字母和数字')
  if (resetForm.value.password !== resetForm.value.confirm_password) return ElMessage.warning('两次输入的密码不一致')
  resetLoading.value = true
  try {
    await api.resetPassword({ ...resetForm.value })
    ElMessage.success('密码已重置，请使用新密码重新登录')
    forgotVisible.value = false
    form.value.email = resetForm.value.email
    form.value.password = ''
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    resetLoading.value = false
  }
}

async function submit() {
  if (!form.value.email || !form.value.password) return ElMessage.warning('请输入邮箱和密码')
  if (!agreed.value) return ElMessage.warning('请先阅读并勾选同意《用户服务协议》和《隐私政策》')
  loading.value = true
  try {
    await auth.login(form.value.email, form.value.password, agreed.value)
    ElMessage.success('登录成功')
    router.push(route.query.redirect || '/')
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // 注册回退到登录时，携带已填写的邮箱自动预填
  if (route.query.email) form.value.email = String(route.query.email)
})

onBeforeUnmount(() => clearInterval(resetTimer))
</script>

<style scoped>
.auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(160deg, #e9f7f2, #f0f7f4); padding: 20px; }
.auth-card { width: 100%; max-width: 520px; padding: 48px 44px; }
.auth-logo { width: 210px; max-width: 70%; height: auto; display: block; margin: 0 auto; }
.auth-title { text-align: center; font-size: 32px; margin: 18px 0 8px; }
.auth-sub { text-align: center; color: var(--text-secondary); font-size: 18px; margin-bottom: 36px; }
.auth-link { text-align: center; font-size: 18px; margin-top: 20px; color: var(--text-secondary); }
.forgot-row { display: flex; justify-content: flex-end; margin: 4px 0 16px; }
.forgot-link { font-size: 16px; color: var(--brand); cursor: pointer; text-decoration: underline; }
.forgot-link:hover { color: var(--brand-hover); }
:global(.forgot-title) { font-size: 20px; font-weight: 700; color: var(--ink); }
:global(.forgot-form .el-form-item__label) { font-size: 17px; font-weight: 600; color: var(--ink); }
:global(.forgot-form .el-input__inner) { height: 48px; font-size: 17px; color: var(--ink); }
:global(.forgot-form .el-input__icon) { font-size: 18px; height: 48px; line-height: 48px; }
:global(.reset-code-row) { display: flex; gap: 10px; align-items: stretch; width: 100%; }
:global(.reset-code-row .el-input) { flex: 1; }
:global(.reset-code-row .el-button) { height: 48px; font-size: 16px; letter-spacing: 0; white-space: nowrap; }
.agree-row { display: flex; align-items: center; gap: 8px; font-size: 18px; color: var(--text-secondary); margin-bottom: 20px; }
.agree-row :deep(.el-checkbox) { transform: scale(1.25); }
.agree-row :deep(.el-checkbox__label) { font-size: 18px; }
.agree-text { line-height: 1.6; white-space: nowrap; }
.agree-text a { color: var(--brand); text-decoration: underline; }
.agree-text a:hover { color: var(--brand-hover); }
.auth-card :deep(.el-input__inner) { height: 56px; font-size: 19px; }
.auth-card :deep(.el-input__icon) { font-size: 21px; height: 56px; line-height: 56px; }
.auth-card :deep(.el-button) { height: 58px; font-size: 21px; letter-spacing: 2px; }
.ml-8 { margin-left: 8px; }
</style>