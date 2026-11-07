<template>
  <div>
    <div class="page-title">运营看板</div>
    <div class="page-sub">平台核心指标与举报治理工作台</div>

    <div v-if="loading" class="empty"><el-icon class="is-loading"><Loading /></el-icon></div>
    <template v-else>
      <div class="metric-grid">
        <div v-for="m in metricCards" :key="m.label" class="metric card">
          <div class="m-num">{{ m.value }}</div>
          <div class="m-label">{{ m.label }}</div>
        </div>
      </div>

      <div class="two-col mt-16">
        <div class="card">
          <div class="sec-title">转化漏斗</div>
          <div class="mt-8 funnel">
            <div v-for="(f, i) in funnelItems" :key="f.key" class="funnel-row">
              <span class="f-label">{{ f.label }}</span>
              <div class="f-bar-wrap">
                <div class="f-bar" :style="{ width: (f.value / maxFunnel) * 100 + '%' }"></div>
              </div>
              <span class="f-value">{{ f.value }}</span>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="sec-title">搭子类型分布</div>
          <div class="mt-8">
            <div v-for="c in categoryDist" :key="c.key" class="dist-row">
              <span class="dist-label">{{ c.label }}</span>
              <div class="dist-bar-wrap">
                <div class="dist-bar" :style="{ width: (c.count / maxCat) * 100 + '%' }"></div>
              </div>
              <span class="dist-value">{{ c.count }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card mt-16">
        <div class="flex-between">
          <div class="sec-title">举报工作台（{{ reports.length }} 待处理）</div>
        </div>
        <div v-if="!reports.length" class="text-muted mt-8">暂无待处理举报</div>
        <el-table v-else :data="reports" style="width:100%; margin-top:12px" size="default">
          <el-table-column label="对象" width="120">
            <template #default="{ row }">{{ targetTypeLabel(row.target_type) }}</template>
          </el-table-column>
          <el-table-column label="内容" prop="target" min-width="180" show-overflow-tooltip />
          <el-table-column label="举报原因" prop="reason" width="120" />
          <el-table-column label="文字说明" prop="evidence" min-width="160" show-overflow-tooltip />
          <el-table-column label="图片证明" width="150">
            <template #default="{ row }">
              <template v-if="row.images && row.images.length">
                <el-image v-for="(img, i) in row.images" :key="i" :src="img" :preview-src-list="row.images" :initial-index="i" fit="cover" style="width:40px;height:40px;border-radius:6px;margin-right:4px" preview-teleported />
              </template>
              <span v-else class="text-muted">-</span>
            </template>
          </el-table-column>
          <el-table-column label="举报人" prop="reporter_name" width="100" />
          <el-table-column label="操作" width="160">
            <template #default="{ row }">
              <el-button size="small" type="success" @click="resolve(row, true)">成立</el-button>
              <el-button size="small" type="info" @click="resolve(row, false)">驳回</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="card mt-16">
        <div class="flex-between">
          <div class="sec-title">申诉工作台（{{ appeals.length }} 待处理）</div>
        </div>
        <div v-if="!appeals.length" class="text-muted mt-8">暂无待处理申诉</div>
        <el-table v-else :data="appeals" style="width:100%; margin-top:12px" size="default">
          <el-table-column label="申诉人" prop="user_nickname" width="100" />
          <el-table-column label="类型" width="100">
            <template #default="{ row }">{{ row.type === 'report' ? '举报' : '互评标签' }}</template>
          </el-table-column>
          <el-table-column label="原扣分记录" min-width="160">
            <template #default="{ row }">{{ row.log_action }}（{{ (row?.log_delta ?? 0).toFixed(2) }}）</template>
          </el-table-column>
          <el-table-column label="申诉理由" prop="reason" min-width="160" show-overflow-tooltip />
          <el-table-column label="图片证明" width="150">
            <template #default="{ row }">
              <template v-if="row.images && row.images.length">
                <el-image v-for="(img, i) in row.images" :key="i" :src="img" :preview-src-list="row.images" :initial-index="i" fit="cover" style="width:40px;height:40px;border-radius:6px;margin-right:4px" preview-teleported />
              </template>
              <span v-else class="text-muted">-</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="160">
            <template #default="{ row }">
              <el-button size="small" type="success" @click="resolveAppeal(row, true)">撤销</el-button>
              <el-button size="small" type="info" @click="resolveAppeal(row, false)">驳回</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="card mt-16">
        <div class="flex-between">
          <div class="sec-title">校园活动发布申请（{{ actReqs.length }} 条）</div>
        </div>
        <div v-if="!actReqs.length" class="text-muted mt-8">暂无申请记录</div>
        <el-table v-else :data="actReqs" style="width:100%; margin-top:12px" size="default">
          <el-table-column label="申请人" prop="applicant_name" width="100" />
          <el-table-column label="活动名称" prop="title" min-width="130" show-overflow-tooltip>
            <template #default="{ row }">{{ row.title || '（未填写）' }}</template>
          </el-table-column>
          <el-table-column label="申请主体" width="120" show-overflow-tooltip>
            <template #default="{ row }">
              {{ orgTypeLabel(row.org_type) }}{{ row.custom_org ? ' - ' + row.custom_org : '' }}
            </template>
          </el-table-column>
          <el-table-column label="活动形式" width="80">
            <template #default="{ row }">{{ row.activity_format === 'offline' ? '线下' : row.activity_format === 'online' ? '线上' : '—' }}</template>
          </el-table-column>
          <el-table-column label="活动地点" min-width="130" show-overflow-tooltip>
            <template #default="{ row }">
              {{ row.activity_region === 'campus' ? '校内' : row.activity_region === 'off_campus' ? '校外' : '' }}{{ row.detail_location ? ' · ' + row.detail_location : (row.location_name || '—') }}
            </template>
          </el-table-column>
          <el-table-column label="活动时间" min-width="150">
            <template #default="{ row }">
              <span v-if="row.start_time">{{ fmtTime(row.start_time) }}</span>
              <span v-if="row.end_time"> ~ {{ fmtTime(row.end_time) }}</span>
              <span v-else class="text-muted">—</span>
            </template>
          </el-table-column>
          <el-table-column label="身份证明" width="100">
            <template #default="{ row }">
              <template v-if="row.identity_images?.length">
                <el-image v-for="(img, i) in row.identity_images.slice(0, 3)" :key="i" :src="img" :preview-src-list="row.identity_images" :initial-index="i" fit="cover" style="width:36px;height:36px;border-radius:4px;margin-right:3px" preview-teleported />
              </template>
              <span v-else class="text-muted">-</span>
            </template>
          </el-table-column>
          <el-table-column label="活动描述" prop="purpose" min-width="150" show-overflow-tooltip />
          <el-table-column label="真实性说明" min-width="160" show-overflow-tooltip>
            <template #default="{ row }">
              <div v-if="row.real_proofs" style="margin-bottom:4px; font-size:13px">{{ row.real_proofs }}</div>
              <template v-if="row.real_proof_images?.length">
                <el-image v-for="(img, i) in row.real_proof_images.slice(0, 3)" :key="i" :src="img" :preview-src-list="row.real_proof_images" :initial-index="i" fit="cover" style="width:36px;height:36px;border-radius:4px;margin-right:3px" preview-teleported />
              </template>
              <span v-if="!row.real_proofs && !row.real_proof_images?.length" class="text-muted">-</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag size="small" :type="actReqStatusType(row.status)">{{ actReqStatusLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="负责人" min-width="120" show-overflow-tooltip>
            <template #default="{ row }">
              <template v-if="row.contacts?.length">
                <div v-for="(c, i) in row.contacts" :key="i" style="font-size:13px; line-height:1.6">
                  {{ c.name }} / {{ c.college }} / {{ c.email }}
                </div>
              </template>
              <span v-else class="text-muted">-</span>
            </template>
          </el-table-column>
          <el-table-column label="安全预案" min-width="140" show-overflow-tooltip>
            <template #default="{ row }">
              <template v-if="row.activity_format === 'offline'">
                <div style="font-size:13px">人数：{{ row.expected_people || '—' }}</div>
                <div style="font-size:13px">{{ row.safety_measures ? '有安全措施' : '—' }}</div>
                <div style="font-size:13px">{{ row.emergency_plan ? '有应急预案' : '—' }}</div>
                <div style="font-size:13px">{{ row.has_insurance ? '已购保险' : '未购保险' }}</div>
              </template>
              <span v-else class="text-muted">线上活动</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="170">
            <template #default="{ row }">
              <template v-if="row.status === 'pending'">
                <el-button size="small" type="success" @click="reviewActReq(row, true)">通过</el-button>
                <el-button size="small" type="danger" @click="reviewActReq(row, false)">驳回</el-button>
              </template>
              <span v-else class="text-muted">已处理</span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="card mt-16">
        <div class="flex-between">
          <div class="sec-title">学生认证核验（{{ verifications.length }} 待审核）</div>
        </div>
        <div v-if="!verifications.length" class="text-muted mt-8">暂无待审核的学生认证申请</div>
        <el-table v-else :data="verifications" style="width:100%; margin-top:12px" size="default">
          <el-table-column label="申请人" prop="nickname" width="100" />
          <el-table-column label="姓名" prop="real_name" width="100" />
          <el-table-column label="邮箱" prop="email" min-width="160" show-overflow-tooltip />
          <el-table-column label="学号" prop="student_id" width="130" />
          <el-table-column label="专业" prop="major" min-width="150" show-overflow-tooltip />
          <el-table-column label="学生证" width="90">
            <template #default="{ row }">
              <el-image v-if="row.photo" :src="row.photo" :preview-src-list="[row.photo]" fit="cover" style="width:52px;height:52px;border-radius:6px" preview-teleported />
              <span v-else class="text-muted">-</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="160">
            <template #default="{ row }">
              <el-button size="small" type="success" @click="reviewVerification(row, true)">通过</el-button>
              <el-button size="small" type="danger" @click="reviewVerification(row, false)">驳回</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="card mt-16">
        <div class="flex-between">
          <div class="sec-title">用户治理</div>
          <div style="display:flex; gap:8px">
            <el-input v-model="userKeyword" placeholder="搜索昵称 / 邮箱" clearable style="width:240px" @keyup.enter="loadUsers" @clear="loadUsers" />
            <el-button type="primary" @click="loadUsers">搜索</el-button>
          </div>
        </div>
        <div v-if="!users.length" class="text-muted mt-8">暂无用户，输入昵称或邮箱搜索</div>
        <el-table v-else :data="users" style="width:100%; margin-top:12px" size="default">
          <el-table-column label="用户" min-width="200">
            <template #default="{ row }">
              <div style="display:flex; align-items:center; gap:8px">
                <el-avatar :size="28" :src="row.avatar || undefined">{{ (row.nickname || '?').slice(0, 1) }}</el-avatar>
                <div>
                  <div style="font-weight:600">{{ row.nickname }}{{ row.is_admin ? '（管理员）' : '' }}</div>
                  <div class="text-muted" style="font-size:13px">{{ row.email }}</div>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="信誉分" width="80">
            <template #default="{ row }">{{ Number(row.credit_score).toFixed(1) }}</template>
          </el-table-column>
          <el-table-column label="受限来源" width="90">
            <template #default="{ row }">{{ row.restricted ? (row.restrict_source === 'manual' ? '手动' : '分数') : '—' }}</template>
          </el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag v-if="row.banned" size="small" type="danger">已封禁</el-tag>
              <el-tag v-else-if="row.restricted" size="small" type="warning">受限</el-tag>
              <el-tag v-else size="small" type="success">正常</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="250">
            <template #default="{ row }">
              <template v-if="row.banned">
                <el-button size="small" type="success" @click="unban(row)">解封</el-button>
              </template>
              <template v-else>
                <el-button size="small" type="danger" @click="openGovern(row, 'ban')">封禁</el-button>
              </template>
              <template v-if="row.restricted">
                <el-button size="small" type="warning" @click="unrestrict(row)">解除限制</el-button>
              </template>
              <template v-else>
                <el-button size="small" type="warning" plain @click="openGovern(row, 'restrict')">限制</el-button>
              </template>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="card mt-16">
        <div class="flex-between">
          <div class="sec-title">意见反馈（{{ feedbacks.length }} 条）</div>
          <el-button type="primary" plain @click="loadFeedbacks">刷新</el-button>
        </div>
        <div v-if="!feedbacks.length" class="text-muted mt-8">暂无反馈</div>
        <el-table v-else :data="feedbacks" style="width:100%; margin-top:12px" size="default">
          <el-table-column label="用户" width="150">
            <template #default="{ row }">
              <div style="display:flex; align-items:center; gap:8px">
                <el-avatar :size="28" :src="row.avatar || undefined">{{ (row.nickname || '?').slice(0, 1) }}</el-avatar>
                <span style="font-weight:600">{{ row.nickname }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="反馈内容" min-width="320">
            <template #default="{ row }"><div style="white-space:pre-wrap; word-break:break-word">{{ row.content }}</div></template>
          </el-table-column>
          <el-table-column label="提交时间" width="170">
            <template #default="{ row }">{{ fmtTime(row.created_at) }}</template>
          </el-table-column>
        </el-table>
      </div>
    </template>

    <el-dialog v-model="govVisible" width="460px" :close-on-click-modal="false">
      <template #header>
        <span class="gov-title">{{ govMode === 'ban' ? '封禁用户' : '限制用户' }}</span>
      </template>
      <div class="text-muted" style="margin-bottom:12px">目标：{{ govTarget?.nickname }}（{{ govTarget?.email }}）</div>
      <el-form label-position="top" class="gov-form">
        <el-form-item :label="govMode === 'ban' ? '封禁天数（1~3650）' : '限制天数（1~3650）'">
          <el-input-number v-model="govDays" :min="1" :max="3650" style="width:100%" />
        </el-form-item>
        <el-form-item :label="govMode === 'ban' ? '封禁缘由（必填，将同步告知用户）' : '限制缘由（必填，将同步告知用户）'">
          <el-input v-model="govReason" type="textarea" :rows="3" placeholder="请输入缘由，将作为通知内容发送给用户" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="large" @click="govVisible = false">取消</el-button>
        <el-button size="large" type="primary" :loading="govLoading" @click="submitGovern">{{ govMode === 'ban' ? '确认封禁' : '确认限制' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api/index.js'
import { fmtTime } from '../utils.js'

const overview = ref({})
const funnel = ref({})
const categoryDist = ref([])
const reports = ref([])
const appeals = ref([])
const actReqs = ref([])
const verifications = ref([])
const loading = ref(true)
const users = ref([])
const userKeyword = ref('')
const feedbacks = ref([])
const govVisible = ref(false)
const govMode = ref('ban')
const govTarget = ref(null)
const govDays = ref(7)
const govReason = ref('')
const govLoading = ref(false)

const metricCards = computed(() => {
  const o = overview.value
  return [
    { label: '注册用户', value: o.users ?? 0 },
    { label: '认证用户', value: o.verified ?? 0 },
    { label: '完善画像', value: o.profiled ?? 0 },
    { label: '需求总数', value: o.demands ?? 0 },
    { label: '活跃需求', value: o.active ?? 0 },
    { label: '队伍数', value: o.teams ?? 0 },
    { label: '已完成队伍', value: o.doneTeams ?? 0 },
    { label: '消息总数', value: o.messages ?? 0 },
    { label: '申请总数', value: o.applications ?? 0 },
    { label: '待处理举报', value: o.pending_reports ?? 0 },
    { label: '待处理申诉', value: o.pending_appeals ?? 0 },
    { label: '待审活动发布', value: o.pending_activity_requests ?? 0 },
    { label: '待审核认证', value: o.pending_verifications ?? 0 }
  ]
})

const funnelItems = computed(() => {
  const f = funnel.value
  return [
    { key: 'register', label: '注册', value: f.register ?? 0 },
    { key: 'profile', label: '完善画像', value: f.profile ?? 0 },
    { key: 'firstAction', label: '首次行动', value: f.firstAction ?? 0 },
    { key: 'applied', label: '发起申请', value: f.applied ?? 0 },
    { key: 'team', label: '组队', value: f.team ?? 0 },
    { key: 'done', label: '完成活动', value: f.done ?? 0 }
  ]
})

const maxFunnel = computed(() => Math.max(1, ...funnelItems.value.map((f) => f.value)))
const maxCat = computed(() => Math.max(1, ...categoryDist.value.map((c) => c.count)))

function targetTypeLabel(t) {
  return { user: '用户', demand: '需求', message: '消息' }[t] || t
}

function actReqStatusLabel(s) {
  return { pending: '审核中', published: '已发布', rejected: '已驳回' }[s] || s
}
function actReqStatusType(s) {
  return { pending: 'warning', published: 'success', rejected: 'info' }[s] || 'info'
}
function orgTypeLabel(t) {
  return { personal: '个人', club: '社团', student_union: '学生会', other: '其他' }[t] || t
}

async function load() {
  loading.value = true
  try {
    const res = await api.stats()
    overview.value = res.overview ?? {}
    funnel.value = res.funnel ?? {}
    categoryDist.value = res.categoryDist || []
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

async function loadReports() {
  try {
    const res = await api.reports()
    reports.value = res.reports || []
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function resolve(row, approved) {
  let note = ''
  if (!approved) {
    try {
      const r = await ElMessageBox.prompt('请输入驳回原因（可留空）', '驳回举报', {
        confirmButtonText: '确认驳回', cancelButtonText: '取消', inputValue: '', inputPlaceholder: '送给举报人的说明'
      })
      note = (r.value || '').trim()
    } catch { return }
  }
  try {
    await api.resolveReport(row.id, approved, note)
    ElMessage.success(approved ? '已成立并扣分' : '已驳回')
    reports.value = reports.value.filter((r) => r.id !== row.id)
    load()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function loadAppeals() {
  try {
    const res = await api.adminAppeals()
    appeals.value = res.appeals || []
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function resolveAppeal(row, approved) {
  let note = ''
  if (!approved) {
    try {
      const r = await ElMessageBox.prompt('请输入驳回原因（可留空）', '驳回申诉', {
        confirmButtonText: '确认驳回', cancelButtonText: '取消', inputValue: '', inputPlaceholder: '送给申诉人的说明'
      })
      note = (r.value || '').trim()
    } catch { return }
  }
  try {
    await api.resolveAppeal(row.id, approved, note)
    ElMessage.success(approved ? '已通过并撤销扣分' : '已驳回')
    appeals.value = appeals.value.filter((r) => r.id !== row.id)
    load()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function loadActReqs() {
  try {
    const res = await api.activityRequests()
    actReqs.value = res.requests || []
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function reviewActReq(row, approved) {
  let note = ''
  if (!approved) {
    try {
      const r = await ElMessageBox.prompt('请输入驳回原因（可留空）', '驳回发布申请', {
        confirmButtonText: '确认驳回', cancelButtonText: '取消', inputValue: '', inputPlaceholder: '送给申请人的说明'
      })
      note = (r.value || '').trim()
    } catch { return }
  }
  try {
    await api.reviewActivityRequest(row.id, approved, note)
    ElMessage.success(approved ? '已通过，活动已发布至活动大厅' : '已驳回')
    loadActReqs()
    load()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function loadVerifications() {
  try {
    const res = await api.verifications()
    verifications.value = res.verifications || []
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function reviewVerification(row, approved) {
  let note = ''
  if (!approved) {
    try {
      const r = await ElMessageBox.prompt('请输入驳回原因（可留空）', '驳回认证申请', {
        confirmButtonText: '确认驳回', cancelButtonText: '取消', inputValue: '', inputPlaceholder: '送给申请人的说明'
      })
      note = (r.value || '').trim()
    } catch { return }
  }
  try {
    await api.reviewVerification(row.id, approved, note)
    ElMessage.success(approved ? '已通过认证' : '已驳回')
    loadVerifications()
    load()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

// ---- 用户治理 ----
async function loadUsers() {
  try {
    const res = await api.adminUsers(userKeyword.value.trim())
    users.value = res.users || []
  } catch (e) {
    ElMessage.error(e.message)
  }
}

// ---- 意见反馈 ----
async function loadFeedbacks() {
  try {
    const res = await api.adminFeedback()
    feedbacks.value = res.items || []
  } catch (e) {
    ElMessage.error(e.message)
  }
}

function openGovern(row, mode) {
  govMode.value = mode
  govTarget.value = row
  govDays.value = 7
  govReason.value = ''
  govVisible.value = true
}

async function submitGovern() {
  const days = govDays.value
  const reason = govReason.value.trim()
  if (!reason) return ElMessage.warning('请填写缘由')
  govLoading.value = true
  try {
    if (govMode.value === 'ban') await api.adminBanUser(govTarget.value.id, days, reason)
    else await api.adminRestrictUser(govTarget.value.id, days, reason)
    ElMessage.success(govMode.value === 'ban' ? '已封禁，并完成联动清理' : '已限制')
    govVisible.value = false
    loadUsers()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    govLoading.value = false
  }
}

async function unban(row) {
  let reason = ''
  try {
    const r = await ElMessageBox.prompt('请输入解封说明（可留空，将作为通知内容告知用户）', '解除封禁', {
      confirmButtonText: '确认解封', cancelButtonText: '取消', inputValue: '', inputPlaceholder: '可留空'
    })
    reason = (r.value || '').trim()
  } catch { return }
  try {
    await api.adminUnbanUser(row.id, reason)
    ElMessage.success('已解除封禁')
    loadUsers()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function unrestrict(row) {
  let reason = ''
  try {
    const r = await ElMessageBox.prompt('请输入解除说明（可留空，将作为通知内容告知用户）', '解除限制', {
      confirmButtonText: '确认解除', cancelButtonText: '取消', inputValue: '', inputPlaceholder: '可留空'
    })
    reason = (r.value || '').trim()
  } catch { return }
  try {
    await api.adminUnrestrictUser(row.id, reason)
    ElMessage.success(row.restrict_source === 'manual' ? '已解除限制' : '已解除限制，信誉分恢复至 2.5')
    loadUsers()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

onMounted(() => { load(); loadReports(); loadAppeals(); loadActReqs(); loadVerifications(); loadUsers(); loadFeedbacks() })
</script>

<style scoped>
.metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
@media (max-width: 700px) { .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.metric-grid .metric { margin-top: 0; }
.two-col > .card { margin-top: 0; }
.metric { padding: 16px; text-align: center; min-width: 0; }
.m-num { font-size: 30px; font-weight: 800; color: var(--brand-text); }
.m-label { font-size: 15px; color: var(--ink); margin-top: 4px; }
.sec-title { font-size: 18px; font-weight: 700; }
.mt-8 { margin-top: 8px; } .mt-16 { margin-top: 16px; }
.funnel-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.f-label { width: 70px; font-size: 14px; color: var(--text-secondary); flex-shrink: 0; }
.f-bar-wrap { flex: 1; background: var(--surface-muted); border-radius: 999px; height: 14px; overflow: hidden; }
.f-bar { height: 100%; background: linear-gradient(90deg, #12b886, #5dd1ad); border-radius: 999px; transition: width .4s; }
.f-value { width: 40px; text-align: right; font-weight: 700; font-size: 14px; }
.dist-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.dist-label { width: 80px; font-size: 14px; color: var(--text-secondary); flex-shrink: 0; }
.dist-bar-wrap { flex: 1; background: var(--surface-muted); border-radius: 999px; height: 12px; overflow: hidden; }
.dist-bar { height: 100%; background: linear-gradient(90deg, #228be6, #5dd1ad); border-radius: 999px; }
.dist-value { width: 30px; text-align: right; font-weight: 700; font-size: 14px; }
:deep(.el-table){font-size:15px}
</style>