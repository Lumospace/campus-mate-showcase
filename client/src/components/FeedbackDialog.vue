<template>
  <el-dialog v-model="visible" title="意见反馈" width="620px" :close-on-click-modal="false">
    <p class="fb-tip">您在使用过程中遇到了什么问题？您希望我们的产品做哪些改进？欢迎在此处留下您的反馈，我们将重视并认真考虑您的宝贵意见!</p>
    <el-input v-model="draft" type="textarea" :rows="6" maxlength="500" show-word-limit resize="none" placeholder="请写下您的反馈意见…" />
    <div class="fb-actions">
      <el-button :loading="saving" @click="save">保存</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">提交</el-button>
    </div>
    <div class="fb-record-toggle">
      <el-button text type="primary" @click="showHistory = !showHistory">
        {{ showHistory ? '收起' : '查看' }}我的反馈记录（{{ history.length }}）
      </el-button>
    </div>
    <div v-if="showHistory" class="fb-history">
      <div v-if="!history.length" class="empty fb-empty">暂无提交记录</div>
      <div v-for="h in history" :key="h.id" class="fb-item">
        <div class="fb-item-time">{{ fmtTime(h.created_at) }}</div>
        <div class="fb-item-content">{{ h.content }}</div>
      </div>
    </div>
    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import api from '../api/index.js'
import { fmtTime } from '../utils.js'

const props = defineProps({ modelValue: { type: Boolean, default: false } })
const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const draft = ref('')
const history = ref([])
const showHistory = ref(false)
const saving = ref(false)
const submitting = ref(false)

// 每次打开弹窗时加载最新草稿与提交记录（禁止保留上次打开时的残留数据）
watch(visible, (v) => { if (v) loadAll() })

async function loadAll() {
  try {
    const [d, h] = await Promise.all([api.feedbackDraft(), api.feedbackHistory()])
    draft.value = d.content || ''
    history.value = h.items || []
  } catch (e) {
    ElMessage.error(e.message || '反馈信息加载失败，请稍后重试')
  }
}

// 保存草稿：下次点开时显示最新保存内容
async function save() {
  const content = draft.value.trim()
  if (!content) return ElMessage.warning('反馈内容不能为空')
  if (saving.value) return
  saving.value = true
  try {
    await api.saveFeedbackDraft(content)
    ElMessage.success('草稿已保存')
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    saving.value = false
  }
}

// 提交：防重复提交（同一输入过程仅提交一次）；提交后清空输入框，再次提交需重新填写；提交不可撤销
async function submit() {
  const content = draft.value.trim()
  if (!content) return ElMessage.warning('反馈内容不能为空')
  if (submitting.value) return
  submitting.value = true
  try {
    await api.submitFeedback(content)
    draft.value = ''
    showHistory.value = true
    history.value = (await api.feedbackHistory()).items || []
    ElMessage.success('反馈已提交，感谢您的宝贵意见！（提交后不可撤销）')
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.fb-tip { margin: 0 0 12px; padding: 10px 12px; border-radius: 8px; background: #f5f7fa; color: var(--text-secondary); line-height: 1.7; }
.fb-actions { margin-top: 10px; display: flex; justify-content: flex-end; gap: 10px; }
.fb-record-toggle { margin-top: 8px; }
.fb-history { margin-top: 8px; border-top: 1px solid var(--border); padding-top: 8px; max-height: 260px; overflow-y: auto; }
.fb-item { padding: 10px 0; border-bottom: 1px dashed var(--border); }
.fb-item-time { font-size: 12px; color: var(--muted); }
.fb-item-content { margin-top: 4px; font-size: 14px; color: var(--ink); white-space: pre-wrap; word-break: break-word; }
.fb-empty { padding: 12px 0; }
</style>
