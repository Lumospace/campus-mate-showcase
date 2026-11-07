<template>
  <div>
    <div class="page-title">信誉与勋章</div>
    <div class="page-sub">信誉分由组队履约与互评动态累积，是搭子互信的核心依据</div>
    <div class="restrict-hint">信誉分低于 1.8 时，会触发账号限制，请保持良好信誉状态。</div>

    <div v-if="loading" class="two-col">
      <div class="card score-card">
        <div class="skeleton" style="width:44px; height:44px; border-radius:10px; margin:0 auto"></div>
        <div class="skeleton skeleton-title" style="width:90px; margin:14px auto 12px"></div>
        <div class="skeleton skeleton-text" style="width:120px; margin:0 auto 12px"></div>
        <div class="skeleton" style="width:100%; height:10px; border-radius:999px"></div>
        <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-top:16px">
          <div v-for="k in 4" :key="k" class="skeleton" style="height:56px; border-radius:8px"></div>
        </div>
      </div>
      <div class="card badge-card">
        <div class="skeleton skeleton-title" style="width:80px"></div>
        <div v-for="k in 3" :key="k" class="skeleton" style="height:44px; border-radius:10px; margin-top:10px"></div>
      </div>
    </div>
    <template v-else>
      <div class="two-col stagger-enter">
        <div class="card score-card ani-fade-in-up">
          <div class="sc-icon">{{ cp.tier_icon }}</div>
          <div class="sc-score">{{ (cp.credit_score ?? 0).toFixed(1) }}</div>
          <div class="sc-tier">{{ cp.tier_label }} · {{ cp.credit_status }}</div>
          <el-progress :percentage="(cp.credit_score ?? 0) * 20" :stroke-width="10" :show-text="false" color="#12b886" />
          <div class="sc-stats">
            <div class="stat"><div class="stat-num">{{ cp.team_count }}</div><div class="stat-label">组队</div></div>
            <div class="stat"><div class="stat-num good">{{ cp.good_count }}</div><div class="stat-label">好评</div></div>
            <div class="stat"><div class="stat-num bad">{{ cp.bad_count }}</div><div class="stat-label">差评</div></div>
            <div class="stat"><div class="stat-num warn">{{ cp.no_show_count }}</div><div class="stat-label">履约失信</div></div>
          </div>
        </div>

        <div class="card badge-card ani-fade-in-up">
          <div class="sec-title">我的勋章</div>
          <div v-if="!badges.length" class="text-muted mt-8">暂无勋章，多组队、多获好评即可解锁</div>
          <div v-else class="badge-list mt-8 stagger-enter">
            <div v-for="b in badges" :key="b.type" class="badge-item ani-fade-in-up">
              <div class="badge-icon">🏅</div>
              <div>
                <div class="badge-name">{{ b.label }}</div>
                <div class="text-muted" style="font-size:15px; color: var(--text-secondary); font-weight: 600">{{ b.desc }} · {{ fmtDate(b.earned_at) }}</div>
              </div>
            </div>
          </div>
          <div class="rules">
            星级（每票）：5星 +0.15 · 4星 +0.1 · 3星 0 · 2星 −0.15 · 1星 −0.2<br>
            正面标签：每票每标签 +0.05（每票最多 +0.1）<br>
            负面标签：无故爽约 −0.5 · 严重迟到 −0.4（每队一次，互斥）<br>
            举报成立 −1.0 · 老搭子复搭 +0.05/次 · 信誉分 1~5 封顶
          </div>
        </div>
      </div>

      <div class="card ani-fade-in-up" style="margin-top: 20px">
        <div class="sec-title">评价标签云</div>
        <div v-if="!tagCloud.length" class="text-muted mt-8">暂无评价标签，多获好评即可积累</div>
        <div v-else class="cloud mt-8">
          <span v-for="t in tagCloud" :key="t.tag" class="cloud-tag" :style="{ fontSize: 15 + Math.min(t.count, 4) * 2 + 'px' }">{{ t.tag }}<span class="cloud-cnt">{{ t.count }}</span></span>
        </div>
      </div>

      <div class="card ani-fade-in-up">
        <div class="sec-title">信誉流水</div>
        <el-table :data="cp.logs || []" style="width:100%" size="default">
          <el-table-column label="行为" prop="action" />
          <el-table-column label="分值变化" width="120">
            <template #default="{ row }">
              <span :class="row.delta > 0 ? 'delta-pos' : 'delta-neg'">{{ row.delta > 0 ? '+' : '' }}{{ row.delta.toFixed(2) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="时间" width="180">
            <template #default="{ row }">{{ fmtTime(row.created_at) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button v-if="row.delta < 0" size="small" type="warning" plain @click="appeal(row)">申诉</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div v-if="!(cp.logs || []).length" class="empty" style="padding:16px 0"><p>暂无信誉记录</p></div>
      </div>
    </template>

    <el-dialog v-model="appealOpen" title="申诉误判扣分" width="440px">
      <el-form label-position="top">
        <el-form-item label="申诉理由（必填）">
          <el-input v-model="appealForm.reason" type="textarea" :autosize="{ minRows: 3, maxRows: 8 }" placeholder="简述你认为误判的原因" />
        </el-form-item>
        <el-form-item label="图片证明（必填，1-3 张）">
          <div class="ev-list">
            <div v-for="(img, i) in appealForm.images" :key="i" class="ev-item">
              <img :src="img" class="ev-img" />
              <span class="ev-del" @click="appealForm.images.splice(i, 1)">✕</span>
            </div>
            <label v-if="appealForm.images.length < 3" class="ev-add">
              <input type="file" accept="image/*" hidden @change="onPickAppealImages" />
              <span>+</span>
            </label>
          </div>
          <div style="font-size:13px; color:var(--text-secondary); margin-top:6px">单张不超过 1MB，最多 3 张</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="appealOpen = false">取消</el-button>
        <el-button type="primary" :loading="appealing" @click="submitAppeal">提交申诉</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import api from '../api/index.js'
import { fmtTime, fmtDate } from '../utils.js'

const cp = ref(null)
const badges = ref([])
const loading = ref(true)
const appealOpen = ref(false)
const appealing = ref(false)
const appealForm = reactive({ ref_id: null, reason: '', images: [] })
const tagCloud = computed(() => {
  return Object.entries(cp.value?.tag_cloud || {}).map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count)
})

async function load() {
  loading.value = true
  try {
    const [c, b] = await Promise.all([api.credit(), api.badges()])
    cp.value = c ?? {}
    badges.value = b.badges || []
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}
onMounted(load)

async function appeal(row) {
  appealForm.ref_id = row.id
  appealForm.reason = ''
  appealForm.images = []
  appealOpen.value = true
}

function onPickAppealImages(e) {
  const files = Array.from(e.target.files || [])
  for (const f of files) {
    if (appealForm.images.length >= 3) { ElMessage.warning('最多上传 3 张图片'); break }
    if (f.size > 1024 * 1024) { ElMessage.warning('单张图片不能超过 1MB'); continue }
    const reader = new FileReader()
    reader.onload = () => { if (appealForm.images.length < 3) appealForm.images.push(reader.result) }
    reader.readAsDataURL(f)
  }
  e.target.value = ''
}

async function submitAppeal() {
  if (!appealForm.reason.trim()) return ElMessage.warning('请填写申诉理由')
  if (!appealForm.images.length) return ElMessage.warning('请上传图片证明（至少 1 张）')
  appealing.value = true
  try {
    await api.createAppeal({ ref_id: appealForm.ref_id, reason: appealForm.reason, images: appealForm.images })
    ElMessage.success('申诉已提交，管理员核实后将处理')
    appealOpen.value = false
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    appealing.value = false
  }
}
</script>

<style scoped>
.two-col { grid-template-columns: repeat(2, 1fr); gap: 20px; }
.two-col > .card { margin-top: 0; }
.score-card { text-align: center; }
.sc-icon { font-size: 44px; }
.sc-score { font-size: 52px; font-weight: 800; color: var(--brand); line-height: 1.1; }
.sc-tier { font-size: 15px; color: var(--brand-text); font-weight: 600; margin: 4px 0 12px; }
.sc-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 16px; }
.stat { background: var(--surface); border-radius: 8px; padding: 10px 8px; }
.stat-num { font-size: 22px; font-weight: 800; color: var(--ink); }
.stat-num.good { color: var(--success); }
.stat-num.bad { color: var(--danger); }
.stat-num.warn { color: var(--warning); }
.stat-label { font-size: 15px; font-weight: 700; color: var(--ink); }
.sec-title { font-size: 18px; font-weight: 700; }
.mt-8 { margin-top: 8px; } .mt-16 { margin-top: 16px; }
.cloud { display: flex; flex-wrap: wrap; gap: 12px; }
.cloud-tag { color: var(--brand-text); font-weight: 800; }
.cloud-cnt { color: var(--text-secondary); font-size: 15px; margin-left: 3px; }
.restrict-hint { margin-top: 14px; padding: 10px 14px; border-radius: 8px; background: #fff4e0; color: var(--warning); font-size: 15px; font-weight: 600; }
.badge-card { display: flex; flex-direction: column; }
.badge-list { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.badge-item { display: flex; gap: 10px; align-items: center; background: var(--surface); border-radius: 10px; padding: 10px 12px; }
.badge-icon { font-size: 28px; }
.badge-name { font-size: 16px; font-weight: 700; color: var(--ink); }
.rules { margin-top: auto; padding-top: 16px; font-size: 15px; font-weight: 600; color: var(--ink); line-height: 1.7; border-top: 1px dashed var(--border); }
.delta-pos { color: var(--success); font-weight: 600; }
.delta-neg { color: var(--danger); font-weight: 600; }
.ev-list { display: flex; flex-wrap: wrap; gap: 8px; }
.ev-item { position: relative; }
.ev-img { width: 64px; height: 64px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border); display: block; }
.ev-del { position: absolute; top: -6px; right: -6px; width: 18px; height: 18px; border-radius: 50%; background: var(--danger); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; cursor: pointer; line-height: 1; }
.ev-add { width: 64px; height: 64px; border: 1px dashed var(--border); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 26px; color: var(--text-secondary); cursor: pointer; }
.ev-add:hover { border-color: var(--brand); color: var(--brand); }
:deep(.el-table){font-size:15px}
</style>