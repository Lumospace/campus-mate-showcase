<template>
  <div>
    <div class="page-title">校园活动</div>
    <div class="page-sub">查看校园内的大型活动与招募；发布须先申请资格，通过后自动发布至活动大厅</div>

    <!-- 发布说明 + 操作 -->
    <div class="card banner">
      <div class="banner-main">
        <div class="banner-title">📢 关于发布</div>
        <div class="banner-text">
          为保障大型活动信息的真实可靠，普通用户发布活动/招募需先向管理员提交申请，审核通过后自动发布至活动大厅。
        </div>
      </div>
      <div class="banner-actions">
        <template v-if="isAdmin">
          <el-button type="primary" size="large" @click="openPublish">直接发布活动</el-button>
        </template>
        <template v-else>
          <el-button type="primary" size="large" @click="openApply">申请发布</el-button>
        </template>
      </div>
    </div>

    <el-tabs v-model="tab" class="mt-16 tabs-lg">
      <el-tab-pane label="活动大厅" name="wall" />
      <el-tab-pane label="我的报名" name="signups" />
      <el-tab-pane label="我的申请/发布" name="mine" />
    </el-tabs>

    <!-- 活动大厅 -->
    <template v-if="tab === 'wall'">
      <div class="filter-bar">
        <el-input v-model="keyword" placeholder="搜索活动 / 主办方" clearable size="large" style="width: 360px" @keyup.enter="loadWall" @clear="loadWall" />
        <el-select v-model="category" placeholder="全部分类" clearable size="large" style="width: 260px" @change="loadWall">
          <el-option v-for="c in ACTIVITY_CATEGORIES" :key="c.key" :label="`${c.emoji} ${c.label}`" :value="c.key" />
        </el-select>
        <el-select v-model="statusFilter" placeholder="全部状态" size="large" style="width: 220px" @change="loadWall">
          <el-option label="全部" value="all" />
          <el-option label="未开始" value="upcoming" />
          <el-option label="进行中" value="ongoing" />
          <el-option label="已结束" value="ended" />
          <el-option label="已下架" value="off" />
        </el-select>
        <el-checkbox v-model="signupOnly" size="large" @change="loadWall">报名中</el-checkbox>
      </div>

      <div v-if="loading" class="act-list">
        <div v-for="i in 4" :key="i" class="act-item" style="cursor:default; pointer-events:none">
          <div class="skeleton" style="width:60px; height:60px; border-radius:12px; flex-shrink:0"></div>
          <div class="act-body">
            <div class="skeleton skeleton-title" style="width:55%"></div>
            <div class="skeleton skeleton-text" style="width:85%; margin-top:10px"></div>
            <div class="skeleton skeleton-text short" style="margin-top:8px"></div>
          </div>
        </div>
      </div>
      <div v-else-if="!activities.length" class="empty">
        <p>暂无校园活动</p>
        <p class="text-muted" style="font-size:16px">有大型活动想发布？点击上方按钮申请发布资格</p>
      </div>
      <div v-else class="act-list stagger-enter">
        <div v-for="a in activities" :key="a.id" class="act-item ani-fade-in-up" role="button" tabindex="0" @click="$router.push(`/activity/${a.id}`)" @keydown.enter="$router.push(`/activity/${a.id}`)">
          <div class="act-emoji">{{ a.category_emoji }}</div>
          <div class="act-body">
            <div class="act-title">
              {{ a.title }}
              <span class="badge-teal" style="font-size:16px">{{ a.category_label }}</span>
              <el-tag v-if="a.activity_format" size="default" type="info" effect="plain" class="ml-6">{{ a.activity_format === 'offline' ? '线下' : '线上' }}</el-tag>
              <el-tag v-if="a.signup_open" size="default" type="success" effect="plain" class="ml-6">报名中</el-tag>
              <el-tag v-if="a.status === 'off'" size="default" type="danger" effect="plain" class="ml-6">已下架</el-tag>
            </div>
            <div class="act-meta">
              <span v-if="a.start_time">🕐 {{ fmtTime(a.start_time) }}{{ a.end_time ? ' ~ ' + fmtTime(a.end_time) : '' }}</span>
              <span v-if="a.location_name">📍 {{ a.location_name }}</span>
              <span v-if="a.quota">👥 名额 {{ a.quota }} 人</span>
              <span v-else>👥 名额不限</span>
            </div>
            <div class="act-desc" v-if="a.description">{{ a.description }}</div>
          </div>
          <div class="act-side">
            <span class="badge-teal" style="font-size:16px">查看详情 →</span>
          </div>
        </div>
      </div>
    </template>

    <!-- 我的报名 -->
    <template v-else-if="tab === 'signups'">
      <div class="filter-bar">
        <el-input v-model="signupKeyword" placeholder="搜索活动 / 主办方" clearable size="large" style="width: 360px" @keyup.enter="loadSignups" @clear="loadSignups" />
        <el-select v-model="signupCategory" placeholder="全部分类" clearable size="large" style="width: 260px" @change="loadSignups">
          <el-option v-for="c in ACTIVITY_CATEGORIES" :key="c.key" :label="`${c.emoji} ${c.label}`" :value="c.key" />
        </el-select>
        <el-select v-model="signupStatusFilter" placeholder="全部状态" size="large" style="width: 220px" @change="loadSignups">
          <el-option label="全部" value="all" />
          <el-option label="未开始" value="upcoming" />
          <el-option label="进行中" value="ongoing" />
          <el-option label="已结束" value="ended" />
          <el-option label="已下架" value="off" />
        </el-select>
      </div>
      <div v-if="!signups.length" class="text-muted mt-8" style="font-size:16px">还没有报名任何校园活动</div>
      <div v-else class="signup-list mt-8">
        <div v-for="s in signups" :key="s.id" class="signup-item" role="button" tabindex="0" @click="$router.push(`/activity/${s.id}`)" @keydown.enter="$router.push(`/activity/${s.id}`)">
          <div class="su-emoji">{{ s.category_emoji }}</div>
          <div class="su-body">
            <div class="su-title">{{ s.title }}
              <el-tag v-if="s.activity_format" size="default" type="info" effect="plain" class="ml-6">{{ s.activity_format === 'offline' ? '线下' : '线上' }}</el-tag>
            </div>
            <div class="su-meta">
              <span v-if="s.start_time">🕐 {{ fmtTime(s.start_time) }}</span>
              <span v-if="s.location_name">📍 {{ s.location_name }}</span>
            </div>
          </div>
          <div class="su-side">
            <el-tag size="default" type="warning" effect="dark">已报名</el-tag>
          </div>
        </div>
      </div>
    </template>

    <!-- 我的申请 / 发布 -->
    <template v-else>
      <div class="card">
        <div class="flex-between">
          <div class="sec-title">申请发布记录</div>
          <el-button size="large" @click="openApply">新增申请</el-button>
        </div>
        <div v-if="!requests.length" class="text-muted mt-8" style="font-size:16px">还没有申请记录</div>
        <div v-else class="req-list mt-8">
          <div v-for="q in requests" :key="q.id" class="req-item">
            <div class="req-head">
              <span class="req-title">{{ q.title || '（未填写名称）' }}</span>
              <div class="req-head-side">
                <el-tag size="default" :type="reqStatus(q.status).type">{{ reqStatus(q.status).label }}</el-tag>
                <el-button v-if="q.status === 'pending'" size="small" type="danger" plain @click.stop="cancelRequest(q)">撤销申请</el-button>
              </div>
            </div>
            <div class="req-meta text-muted">{{ fmtTime(q.created_at) }} 提交</div>
            <div class="req-purpose" v-if="q.purpose">{{ q.purpose }}</div>
            <div class="req-note" v-if="q.admin_note" :class="{ rejected: q.status === 'rejected' }">管理员备注：{{ q.admin_note }}</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="sec-title">我发布的活动</div>
        <div v-if="!myActivities.length" class="text-muted mt-8" style="font-size:16px">暂无发布记录</div>
        <div v-else class="act-list mt-8">
          <div v-for="a in myActivities" :key="a.id" class="act-item" role="button" tabindex="0" @click="$router.push(`/activity/${a.id}`)" @keydown.enter="$router.push(`/activity/${a.id}`)">
            <div class="act-emoji">{{ a.category_emoji }}</div>
            <div class="act-body">
              <div class="act-title">{{ a.title }} <span class="badge-teal" style="font-size:16px">{{ a.category_label }}</span><el-tag v-if="a.status === 'off'" size="default" type="danger" effect="plain" class="ml-6">已下架</el-tag></div>
              <div class="act-meta">
                <span v-if="a.start_time">🕐 {{ fmtTime(a.start_time) }}</span>
                <span v-if="a.location_name">📍 {{ a.location_name }}</span>
              </div>
            </div>
            <div class="act-side"><span class="badge-teal" style="font-size:16px">详情 →</span></div>
          </div>
        </div>
      </div>
    </template>

    <!-- 申请发布弹窗 - 5 模块逐步解锁 -->
    <el-dialog v-model="applyOpen" title="申请发布" width="680px" :close-on-click-modal="false" destroy-on-close @closed="resetApply">
      <div class="dialog-tip">请依次完成以下 5 个模块，带 <span style="color:var(--danger)">*</span> 为必填项。完成上一模块后方可进入下一模块。</div>

      <!-- 模块进度指示 -->
      <div class="step-indicator mt-16">
        <div v-for="(s, i) in steps" :key="i" class="step-item" :class="{ active: moduleIndex === i, done: moduleIndex > i }" @click="moduleIndex >= i && (moduleIndex = i)">
          <div class="step-circle">{{ moduleIndex > i ? '✓' : i + 1 }}</div>
          <div class="step-label">{{ s }}</div>
        </div>
      </div>

      <!-- ===== 模块① 基本信息 ===== -->
      <template v-if="moduleIndex === 0">
        <div class="module-title">模块一：基本信息</div>
        <el-form label-position="top" class="mt-8">
          <el-form-item class="custom-label">
            <template #label>活动名称 <span style="color:var(--danger)">*</span></template>
            <el-input v-model="applyForm.title" maxlength="50" show-word-limit placeholder="拟举办的活动/招募名称" />
          </el-form-item>
          <el-form-item class="custom-label">
            <template #label>申请主体 <span style="color:var(--danger)">*</span></template>
            <el-radio-group v-model="applyForm.org_type">
              <el-radio value="personal">个人</el-radio>
              <el-radio value="club">社团</el-radio>
              <el-radio value="student_union">学生会</el-radio>
              <el-radio value="other">其他</el-radio>
            </el-radio-group>
            <el-input v-if="applyForm.org_type === 'other'" v-model="applyForm.custom_org" maxlength="40" placeholder="请具体说明" class="mt-8" />
          </el-form-item>
          <el-form-item class="custom-label">
            <template #label>活动分类 <span style="color:var(--danger)">*</span></template>
            <el-select v-model="applyForm.category" placeholder="选择活动分类" style="width:100%">
              <el-option v-for="c in ACTIVITY_CATEGORIES" :key="c.key" :label="`${c.emoji} ${c.label}`" :value="c.key" />
            </el-select>
          </el-form-item>
        </el-form>
      </template>

      <!-- ===== 模块② 活动详情 ===== -->
      <template v-if="moduleIndex === 1">
        <div class="module-title">模块二：活动详情</div>
        <el-form label-position="top" class="mt-8">
          <el-form-item class="custom-label">
            <template #label>活动描述 / 用途 <span style="color:var(--danger)">*</span></template>
            <el-input v-model="applyForm.purpose" type="textarea" :autosize="{ minRows: 4, maxRows: 8 }" maxlength="500" show-word-limit placeholder="请描述活动内容、目的、面向人群、预计规模等，便于管理员审核" />
          </el-form-item>
          <el-form-item class="custom-label">
            <template #label>拟举办时间 <span style="color:var(--danger)">*</span></template>
            <el-date-picker v-model="applyForm.range" type="datetimerange" style="width:100%" start-placeholder="开始时间" end-placeholder="结束时间" value-format="YYYY-MM-DDTHH:mm:ss" />
          </el-form-item>
          <el-form-item class="custom-label">
            <template #label>活动形式 <span style="color:var(--danger)">*</span></template>
            <el-radio-group v-model="applyForm.activity_format">
              <el-radio value="online">线上</el-radio>
              <el-radio value="offline">线下</el-radio>
            </el-radio-group>
          </el-form-item>
          <template v-if="applyForm.activity_format === 'offline'">
            <el-form-item class="custom-label">
              <template #label>线下区域 <span style="color:var(--danger)">*</span></template>
              <el-radio-group v-model="applyForm.activity_region">
                <el-radio value="campus">校内</el-radio>
                <el-radio value="off_campus">校外</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item class="custom-label">
              <template #label>具体地点 <span style="color:var(--danger)">*</span></template>
              <el-input v-model="applyForm.detail_location" maxlength="100" placeholder="如：大学生活动中心 301 / 某某公园南门" />
            </el-form-item>
          </template>
        </el-form>
      </template>

      <!-- ===== 模块③ 身份与安全验证 ===== -->
      <template v-if="moduleIndex === 2">
        <div class="module-title">模块三：身份与安全验证</div>
        <el-form label-position="top" class="mt-8">

          <!-- 身份证明材料 -->
          <el-form-item class="custom-label">
            <template #label>身份证明材料 <span style="color:var(--danger)">*</span></template>
            <div class="ev-list">
              <div v-for="(img, i) in applyForm.identity_images" :key="i" class="ev-item">
                <img :src="img" class="ev-img" />
                <span class="ev-del" @click="applyForm.identity_images.splice(i, 1)">✕</span>
              </div>
              <label v-if="applyForm.identity_images.length < 3" class="ev-add">
                <input type="file" accept="image/*" hidden @change="onPickImages($event, 'identity_images')" />
                <span>+</span>
              </label>
            </div>
            <div style="font-size:13px; color:var(--text-secondary); margin-top:6px">请上传学生卡 / 工作证等，1 ~ 3 张，单张不超过 1MB</div>
          </el-form-item>

          <!-- 活动真实性证明材料 -->
          <el-form-item class="custom-label">
            <template #label>活动真实性证明材料</template>
            <el-input v-model="applyForm.real_proofs" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" maxlength="500" placeholder="如：活动通知链接、活动宣传海报、活动策划书摘要、相关批文编号等（选填）" />
            <div class="ev-list mt-8">
              <div v-for="(img, i) in applyForm.real_proof_images" :key="i" class="ev-item">
                <img :src="img" class="ev-img" />
                <span class="ev-del" @click="applyForm.real_proof_images.splice(i, 1)">✕</span>
              </div>
              <label v-if="applyForm.real_proof_images.length < 3" class="ev-add">
                <input type="file" accept="image/*" hidden @change="onPickImages($event, 'real_proof_images')" />
                <span>+</span>
              </label>
            </div>
            <div style="font-size:13px; color:var(--text-secondary); margin-top:6px">上传活动通知、宣传海报、策划截图等证明材料，最多 3 张（选填）</div>
          </el-form-item>

          <!-- 安全预案（仅线下） -->
          <template v-if="applyForm.activity_format === 'offline'">
            <div class="sec-divider">安全预案（线下活动必填）</div>
            <el-form-item class="custom-label">
              <template #label>预计参与人数 <span style="color:var(--danger)">*</span></template>
              <el-input-number v-model="applyForm.expected_people" :min="1" :max="100000" style="width:100%" />
            </el-form-item>
            <el-form-item class="custom-label">
              <template #label>场地安全措施 <span style="color:var(--danger)">*</span></template>
              <el-input v-model="applyForm.safety_measures" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" maxlength="500" placeholder="如：场地消防检查、通道疏散标识、现场秩序维护人员安排等" />
            </el-form-item>
            <el-form-item class="custom-label">
              <template #label>应急预案 <span style="color:var(--danger)">*</span></template>
              <el-input v-model="applyForm.emergency_plan" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" maxlength="500" placeholder="如：突发疾病、恶劣天气、安全事故等情况的应急处理方案" />
            </el-form-item>
            <el-form-item label="是否购买责任险">
              <el-switch v-model="applyForm.has_insurance" />
              <el-input v-if="applyForm.has_insurance" v-model="applyForm.insurance_desc" maxlength="200" placeholder="保险类型与保额说明" class="mt-8" />
            </el-form-item>
          </template>

          <!-- 校内负责人 -->
          <div class="sec-divider">校内负责人 <span style='color:var(--danger)'>*</span>（至少 1 人验证通过）</div>
          <div style="font-size:14px; color:var(--text-secondary); margin-bottom:12px">请填写活动校内负责人信息，每位负责人需通过邮箱验证码验证，仅验证通过的负责人会被记录。</div>
          <div v-for="(c, ci) in contacts" :key="ci" class="contact-card">
            <div class="contact-header">
              <span class="contact-num">负责人 {{ ci + 1 }}</span>
              <el-button v-if="contacts.length > 1" size="small" text type="danger" @click="removeContact(ci)">移除</el-button>
            </div>
            <div class="contact-fields">
              <el-input v-model="c.name" maxlength="20" placeholder="姓名" style="width:120px" />
              <el-input v-model="c.phone" maxlength="11" placeholder="电话" style="width:140px" />
              <el-input v-model="c.student_id" maxlength="20" placeholder="学号（工号）" style="width:140px" />
              <el-input v-model="c.college" maxlength="30" placeholder="学院（部门）" style="width:150px" />
            </div>
            <div class="contact-verify-row">
              <el-input v-model="c.email" maxlength="60" placeholder="校园邮箱（用于接收验证码）" style="width:260px" :disabled="c.verified" />
              <el-button size="small" :loading="c.sending" :disabled="!c.email || c.verified || c.countdown > 0" @click="sendContactCode(ci)">
                <template v-if="c.verified">已验证</template>
                <template v-else-if="c.countdown > 0">{{ c.countdown }}s</template>
                <template v-else>发送验证码</template>
              </el-button>
              <template v-if="!c.verified">
                <el-input v-model="c.code" maxlength="6" placeholder="验证码" style="width:120px" />
                <el-button size="small" type="primary" :disabled="!c.code" @click="verifyContactCode(ci)">验证</el-button>
              </template>
              <el-tag v-if="c.verified" size="small" type="success" effect="dark">已验证通过</el-tag>
            </div>
          </div>
          <el-button v-if="contacts.length < 5" size="small" class="mt-8" @click="addContact">+ 添加负责人</el-button>
        </el-form>
      </template>

      <!-- ===== 模块④ 完善发布信息 ===== -->
      <template v-if="moduleIndex === 3">
        <div class="module-title">模块四：完善发布信息</div>
        <div style="font-size:15px; color:var(--text-secondary); margin-top:10px; line-height:1.6">
          以下信息将展示在活动大厅中。前序模块已填写的信息自动继承且不可修改（如需调整请返回对应模块修改，系统将自动同步）。
        </div>

        <!-- 灰色继承区 -->
        <div class="inherited-info mt-16">
          <div class="ii-title">📋 已继承的活动信息</div>
          <div class="ii-grid">
            <div class="ii-field">
              <span class="ii-label">活动名称</span>
              <span class="ii-value">{{ applyForm.title || '—' }}</span>
            </div>
            <div class="ii-field">
              <span class="ii-label">主办方</span>
              <span class="ii-value">{{ orgLabel }}</span>
            </div>
            <div class="ii-field">
              <span class="ii-label">活动分类</span>
              <span class="ii-value">{{ catLabel }}</span>
            </div>
            <div class="ii-field">
              <span class="ii-label">活动形式</span>
              <span class="ii-value">{{ applyForm.activity_format === 'offline' ? '线下' : '线上' }}</span>
            </div>
            <div class="ii-field" v-if="applyForm.detail_location">
              <span class="ii-label">具体地点</span>
              <span class="ii-value">{{ applyForm.detail_location }}</span>
            </div>
            <div class="ii-field">
              <span class="ii-label">活动时间</span>
              <span class="ii-value">{{ applyForm.range?.[0] ? fmtTime(applyForm.range[0]) : '—' }}{{ applyForm.range?.[1] ? ' ~ ' + fmtTime(applyForm.range[1]) : '' }}</span>
            </div>
          </div>
        </div>

        <el-form label-position="top" class="mt-16">
          <el-form-item class="custom-label">
            <template #label>活动描述 <span style="color:var(--danger)">*</span></template>
            <el-input v-model="applyForm.description" type="textarea" :autosize="{ minRows: 4, maxRows: 10 }" maxlength="2000" show-word-limit placeholder="活动内容、流程、报名要求、面向人群等，将展示在活动大厅" />
          </el-form-item>

          <el-form-item class="custom-label">
            <template #label>报名截止时间 <span style="color:var(--danger)">*</span></template>
            <el-date-picker v-model="applyForm.signup_deadline" type="datetime" style="width:100%" placeholder="默认等于活动开始时间" value-format="YYYY-MM-DDTHH:mm:ss" />
            <div style="font-size:14px; color:var(--text-secondary); margin-top:6px">默认等于活动开始时间，不能晚于活动结束时间（{{ applyForm.range?.[1] ? fmtTime(applyForm.range[1]) : '—' }}）</div>
          </el-form-item>

          <div class="form-row">
            <el-form-item class="custom-label">
              <template #label>报名 / 联系方式</template>
              <el-input v-model="applyForm.contact" maxlength="100" placeholder="如：加群 123456 / 现场报名 / 联系邮箱" />
            </el-form-item>
            <el-form-item class="custom-label">
              <template #label>名额（留空不限）</template>
              <el-input-number v-model="applyForm.quota" :min="1" :max="10000" style="width:100%" />
            </el-form-item>
          </div>

          <el-form-item class="custom-label" label="相关标签">
            <el-select v-model="applyForm.tags" multiple filterable allow-create default-first-option placeholder="选择或输入标签" style="width:100%">
              <el-option v-for="t in tagOptions" :key="t" :label="t" :value="t" />
            </el-select>
          </el-form-item>

          <!-- 附图 -->
          <el-form-item class="custom-label">
            <template #label>附图（选填，最多 3 张）</template>
            <div class="ev-list">
              <div v-for="(img, i) in applyForm.publish_images" :key="i" class="ev-item">
                <img :src="img" class="ev-img" />
                <span class="ev-del" @click="applyForm.publish_images.splice(i, 1)">✕</span>
              </div>
              <label v-if="applyForm.publish_images.length < 3" class="ev-add">
                <input type="file" accept="image/*" hidden @change="onPickImages($event, 'publish_images')" />
                <span>+</span>
              </label>
            </div>
            <div style="font-size:13px; color:var(--text-secondary); margin-top:6px">单张不超过 1MB，仅支持图片格式</div>
          </el-form-item>

          <!-- 附件 -->
          <el-form-item class="custom-label">
            <template #label>附件（选填，最多 5 个）</template>
            <div class="att-list">
              <div v-for="(att, i) in applyForm.publish_attachments" :key="i" class="att-item">
                <span class="att-icon">📎</span>
                <span class="att-name">{{ att.name }}</span>
                <span class="att-del" @click="applyForm.publish_attachments.splice(i, 1)">✕</span>
              </div>
              <label v-if="applyForm.publish_attachments.length < 5" class="att-add" @click="onPickAttachment">
                <span>+ 添加附件</span>
              </label>
            </div>
            <div style="font-size:13px; color:var(--text-secondary); margin-top:6px">单个不超过 5MB，支持 PDF、Word、Excel、图片等格式</div>
          </el-form-item>
        </el-form>
      </template>

      <!-- ===== 模块⑤ 最终确认 ===== -->
      <template v-if="moduleIndex === 4">
        <div class="module-title">模块五：最终确认</div>
        <el-form label-position="top" class="mt-8">
          <el-form-item label="申请人邮箱">
            <el-input :model-value="auth.user?.email" disabled style="width:100%">
              <template #append>
                <el-button :loading="applySending" :disabled="applyVerified || applyCountdown > 0" @click="sendApplyCode">
                  <template v-if="applyVerified">已验证</template>
                  <template v-else-if="applyCountdown > 0">{{ applyCountdown }}s</template>
                  <template v-else>发送验证码</template>
                </el-button>
              </template>
            </el-input>
            <div v-if="!applyVerified" class="mt-8" style="display:flex; gap:8px; align-items:center">
              <el-input v-model="applyCode" maxlength="6" placeholder="输入验证码" style="width:160px" />
              <el-button type="primary" :disabled="!applyCode" :loading="applyVerifying" @click="verifyApplyCode">验证</el-button>
            </div>
            <el-tag v-if="applyVerified" type="success" effect="dark" class="mt-8">邮箱已验证通过</el-tag>
          </el-form-item>

          <el-form-item label="发布承诺书">
            <div class="commitment-box">
              <div class="commitment-content">{{ commitmentTemplate || '正在加载承诺书内容...' }}</div>
            </div>
            <el-checkbox v-model="applyForm.commitment_checked" class="mt-8">
              我已阅读并同意以上<span class="hl">发布承诺书</span>的全部内容
            </el-checkbox>
          </el-form-item>
        </el-form>
      </template>

      <!-- 底部按钮 -->
      <template #footer>
        <div class="dialog-footer-flex">
          <div>
            <el-button v-if="moduleIndex > 0" size="large" @click="moduleIndex--">上一步</el-button>
          </div>
          <div>
            <el-button size="large" @click="applyOpen = false">取消</el-button>
            <el-button v-if="moduleIndex < 4" size="large" type="primary" @click="nextModule">
              {{ moduleIndex === 3 ? '下一步（最终确认）' : '下一步' }}
            </el-button>
            <el-button v-else size="large" type="primary" :loading="submitting" :disabled="!applyVerified || !applyForm.commitment_checked" @click="submitApply">提交申请</el-button>
          </div>
        </div>
      </template>
    </el-dialog>

    <!-- 发布活动弹窗 -->
    <el-dialog v-model="publishOpen" title="发布校园活动" width="660px">
      <div class="dialog-tip" v-if="!isAdmin">本次发布将消耗一次发布机会，请认真填写。</div>
      <el-form label-position="top" class="mt-8">
        <el-form-item label="活动标题" required>
          <el-input v-model="pubForm.title" maxlength="60" show-word-limit placeholder="一句话说明活动/招募内容" />
        </el-form-item>
        <el-form-item label="主办方">
          <el-input v-model="pubForm.organization" maxlength="40" placeholder="如：校学生会 / 某社团" />
        </el-form-item>
        <el-form-item label="活动分类" required>
          <div class="cat-select">
            <div v-for="c in ACTIVITY_CATEGORIES" :key="c.key" class="cat-option" :class="{ active: pubForm.category === c.key }" role="button" tabindex="0" @click="pubForm.category = c.key" @keydown.enter="pubForm.category = c.key">
              <div class="co-emoji">{{ c.emoji }}</div>
              <div class="co-label">{{ c.label }}</div>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="活动形式" required>
          <el-radio-group v-model="pubForm.activity_format">
            <el-radio value="online">线上</el-radio>
            <el-radio value="offline">线下</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="报名截止时间">
          <el-date-picker v-model="pubForm.signup_deadline" type="datetime" style="width:100%" placeholder="默认等于活动开始时间" value-format="YYYY-MM-DDTHH:mm:ss" />
        </el-form-item>
        <el-form-item label="活动详情">
          <el-input v-model="pubForm.description" type="textarea" :autosize="{ minRows: 4, maxRows: 10 }" maxlength="2000" show-word-limit placeholder="活动内容、流程、报名要求等" />
        </el-form-item>
        <el-form-item label="活动时间">
          <el-date-picker v-model="pubForm.range" type="datetimerange" style="width:100%" start-placeholder="开始时间" end-placeholder="结束时间" value-format="YYYY-MM-DDTHH:mm:ss" />
        </el-form-item>
        <el-form-item label="活动地点">
          <el-input v-model="pubForm.location_name" placeholder="如：大学生活动中心" />
        </el-form-item>
        <el-form-item label="报名/联系方式">
          <el-input v-model="pubForm.contact" placeholder="如：加群 123456 / 现场报名" />
        </el-form-item>
        <div class="form-row">
          <el-form-item label="名额（留空为不限）">
            <el-input-number v-model="pubForm.quota" :min="1" :max="10000" style="width:100%" />
          </el-form-item>
          <el-form-item label="相关标签">
            <el-select v-model="pubForm.tags" multiple filterable allow-create default-first-option placeholder="选择或输入标签" style="width:100%">
              <el-option v-for="t in tagOptions" :key="t" :label="t" :value="t" />
            </el-select>
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button size="large" @click="publishOpen = false">取消</el-button>
        <el-button size="large" type="primary" :loading="submitting" @click="submitPublish">确认发布</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api/index.js'
import { fmtTime, ACTIVITY_CATEGORIES, ACTIVITY_REQ_STATUS } from '../utils.js'
import { useAuth } from '../store/auth.js'

const auth = useAuth()
const isAdmin = computed(() => !!auth.user?.is_admin)

const tab = ref('wall')
const activities = ref([])
const requests = ref([])
const myActivities = ref([])
const signups = ref([])
const signupStatusFilter = ref('all')
const signupKeyword = ref('')
const signupCategory = ref('')
const loading = ref(true)
const submitting = ref(false)

const keyword = ref('')
const category = ref('')
const statusFilter = ref('all')
const signupOnly = ref(false)

const applyOpen = ref(false)
const publishOpen = ref(false)
const applyForm = reactive({
  title: '', org_type: 'personal', custom_org: '', category: '',
  purpose: '', range: null, activity_format: '', activity_region: '', detail_location: '',
  identity_images: [], real_proofs: '', real_proof_images: [],
  expected_people: 1, safety_measures: '', emergency_plan: '', has_insurance: false, insurance_desc: '',
  commitment: '', commitment_checked: false,
  description: '', contact: '', quota: null, tags: [],
  signup_deadline: null,
  publish_images: [], publish_attachments: []
})
const pubForm = reactive({ title: '', organization: '', category: 'lecture', description: '', range: null, location_name: '', contact: '', quota: null, tags: [], activity_format: '', signup_deadline: null })

const tagOptions = ['招新', '志愿时长', '创新创业', '学术讲座', '体育竞赛', '文艺演出', '社会实践', '实习', '比赛报名', '公益']

// 模块化申请
const steps = ['基本信息', '活动详情', '身份与安全', '完善发布信息', '最终确认']
const moduleIndex = ref(0)
const contacts = ref([])
const commitmentTemplate = ref('')
const applySending = ref(false)
const applyVerified = ref(false)
const applyVerifying = ref(false)
const applyCode = ref('')
const applyCountdown = ref(0)
let applyCountdownTimer = null

const orgLabel = computed(() => {
  if (applyForm.org_type === 'personal') return '个人'
  if (applyForm.org_type === 'club') return '社团'
  if (applyForm.org_type === 'student_union') return '学生会'
  if (applyForm.org_type === 'other') return applyForm.custom_org || '其他'
  return '—'
})
const catLabel = computed(() => {
  const c = ACTIVITY_CATEGORIES.find((c) => c.key === applyForm.category)
  return c ? `${c.emoji} ${c.label}` : '—'
})

function reqStatus(s) {
  return ACTIVITY_REQ_STATUS[s] || { label: s, type: 'info' }
}

async function loadWall() {
  loading.value = true
  try {
    const params = {}
    if (category.value) params.category = category.value
    if (keyword.value) params.keyword = keyword.value
    if (statusFilter.value && statusFilter.value !== 'all') params.status = statusFilter.value
    if (signupOnly.value) params.signup = '1'
    const res = await api.activities(params)
    activities.value = res.activities || []
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

async function loadMine() {
  try {
    const [r, m] = await Promise.all([api.myActivityRequests(), api.myActivities()])
    requests.value = r.requests || []
    myActivities.value = m.activities || []
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function loadSignups() {
  try {
    const params = {}
    if (signupStatusFilter.value && signupStatusFilter.value !== 'all') params.status = signupStatusFilter.value
    if (signupKeyword.value) params.keyword = signupKeyword.value
    if (signupCategory.value) params.category = signupCategory.value
    const res = await api.mySignups(params)
    signups.value = res.signups || []
  } catch (e) {
    ElMessage.error(e.message)
  }
}

function openApply() {
  resetApply()
  moduleIndex.value = 0
  applyOpen.value = true
  loadCommitmentTemplate()
}

function openPublish() {
  if (!isAdmin.value) {
    ElMessage.info('请通过「申请发布」提交，审核通过后自动发布')
    return
  }
  Object.assign(pubForm, { title: '', organization: '', category: 'lecture', description: '', range: null, location_name: '', contact: '', quota: null, tags: [], activity_format: '', signup_deadline: null })
  publishOpen.value = true
}

function resetApply() {
  Object.assign(applyForm, {
    title: '', org_type: 'personal', custom_org: '', category: '',
    purpose: '', range: null, activity_format: '', activity_region: '', detail_location: '',
    identity_images: [], real_proofs: '', real_proof_images: [],
    expected_people: 1, safety_measures: '', emergency_plan: '', has_insurance: false, insurance_desc: '',
    commitment: '', commitment_checked: false,
    description: '', contact: '', quota: null, tags: [], signup_deadline: null,
    publish_images: [], publish_attachments: []
  })
  moduleIndex.value = 0
  contacts.value = [createEmptyContact()]
  commitmentTemplate.value = ''
  applyCode.value = ''
  applyVerified.value = false
  applySending.value = false
  applyVerifying.value = false
  if (applyCountdownTimer) { clearInterval(applyCountdownTimer); applyCountdownTimer = null }
  applyCountdown.value = 0
}

function createEmptyContact() {
  return { name: '', phone: '', student_id: '', college: '', email: '', code: '', sending: false, verified: false, countdown: 0 }
}

function addContact() {
  if (contacts.value.length < 5) contacts.value.push(createEmptyContact())
}

function removeContact(i) {
  contacts.value.splice(i, 1)
}

async function loadCommitmentTemplate() {
  try {
    const res = await api.commitmentTemplate()
    commitmentTemplate.value = res.template || ''
  } catch { }
}

// 图片上传
function onPickImages(event, key) {
  const files = event.target.files
  if (!files?.length) return
  const MAX_SIZE = 1024 * 1024
  const reader = new FileReader()
  const file = files[0]
  if (file.size > MAX_SIZE) {
    ElMessage.warning('单张图片不能超过 1MB')
    event.target.value = ''
    return
  }
  reader.onload = (e) => {
    applyForm[key].push(e.target.result)
    event.target.value = ''
  }
  reader.readAsDataURL(file)
}

// 附件上传（base64 + 文件名）
function onPickAttachment() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.zip'
  input.onchange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const MAX_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      ElMessage.warning('单个附件不能超过 5MB')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      applyForm.publish_attachments.push({ name: file.name, data: ev.target.result })
    }
    reader.readAsDataURL(file)
  }
  input.click()
}

// 模块验证 + 下一步
function nextModule() {
  if (moduleIndex.value === 0) {
    if (!applyForm.title.trim()) return ElMessage.warning('请填写活动名称')
    if (!applyForm.category) return ElMessage.warning('请选择活动分类')
    if (applyForm.org_type === 'other' && !applyForm.custom_org.trim()) return ElMessage.warning('请填写申请主体说明')
  } else if (moduleIndex.value === 1) {
    if (!applyForm.purpose.trim()) return ElMessage.warning('请填写活动描述/用途')
    if (!applyForm.range?.[0] || !applyForm.range?.[1]) return ElMessage.warning('请选择拟举办时间范围')
    if (new Date(applyForm.range[1]).getTime() <= Date.now()) return ElMessage.warning('结束时间需晚于当前时间，请重新选择')
    if (!applyForm.activity_format) return ElMessage.warning('请选择活动形式')
    if (applyForm.activity_format === 'offline') {
      if (!applyForm.activity_region) return ElMessage.warning('请选择线下活动区域')
      if (!applyForm.detail_location.trim()) return ElMessage.warning('请填写具体地点')
    }
  } else if (moduleIndex.value === 2) {
    if (!applyForm.identity_images.length) return ElMessage.warning('请上传至少 1 张身份证明材料')
    if (applyForm.activity_format === 'offline') {
      if (!applyForm.expected_people || applyForm.expected_people < 1) return ElMessage.warning('请填写预计参与人数')
      if (!applyForm.safety_measures.trim()) return ElMessage.warning('请填写场地安全措施')
      if (!applyForm.emergency_plan.trim()) return ElMessage.warning('请填写应急预案')
    }
    const verifiedCount = contacts.value.filter((c) => c.verified).length
    if (!verifiedCount) return ElMessage.warning('至少需要一位校内负责人完成邮箱验证')
    // 进入模块④前默认填充报名截止时间 = 活动开始时间（用户可在模块④中修改）
    if (!applyForm.signup_deadline) applyForm.signup_deadline = applyForm.range?.[0] || null
    // 模块④的活动描述默认取模块②的活动描述/用途内容，用户可修改
    if (!applyForm.description) applyForm.description = applyForm.purpose
  } else if (moduleIndex.value === 3) {
    if (!applyForm.description.trim()) return ElMessage.warning('请填写活动描述')
    if (!applyForm.signup_deadline) return ElMessage.warning('请选择报名截止时间')
    if (applyForm.range?.[1] && applyForm.signup_deadline > applyForm.range[1]) return ElMessage.warning('报名截止时间不能晚于活动结束时间')
  }
  moduleIndex.value++
}

// 负责人验证码发送
async function sendContactCode(i) {
  const c = contacts.value[i]
  if (!c.email || !c.email.includes('@')) return ElMessage.warning('请填写正确的邮箱')
  c.sending = true
  try {
    await api.activitySendCode('publish_contact', c.email)
    ElMessage.success('验证码已发送到 ' + c.email)
    c.countdown = 60
    const timer = setInterval(() => {
      c.countdown--
      if (c.countdown <= 0) { clearInterval(timer); c.countdown = 0 }
    }, 1000)
  } catch (e) {
    ElMessage.error(e.response?.data?.error || e.message)
  } finally {
    c.sending = false
  }
}

// 负责人验证码校验
async function verifyContactCode(i) {
  const c = contacts.value[i]
  if (!c.code) return ElMessage.warning('请输入验证码')
  try {
    await api.activityVerifyCode('publish_contact', c.email, c.code)
    c.verified = true
    c.code = ''
    ElMessage.success('负责人验证通过')
  } catch (e) {
    ElMessage.error(e.response?.data?.error || e.message)
  }
}

// 申请人邮箱验证码发送
async function sendApplyCode() {
  if (!auth.user?.email) return ElMessage.warning('无法获取邮箱信息')
  applySending.value = true
  try {
    await api.activitySendCode('publish_apply', auth.user.email)
    ElMessage.success('验证码已发送到你的注册邮箱')
    applyCountdown.value = 60
    if (applyCountdownTimer) clearInterval(applyCountdownTimer)
    applyCountdownTimer = setInterval(() => {
      applyCountdown.value--
      if (applyCountdown.value <= 0) { clearInterval(applyCountdownTimer); applyCountdownTimer = null; applyCountdown.value = 0 }
    }, 1000)
  } catch (e) {
    ElMessage.error(e.response?.data?.error || e.message)
  } finally {
    applySending.value = false
  }
}

// 申请人邮箱验证码校验
async function verifyApplyCode() {
  if (!applyCode.value) return ElMessage.warning('请输入验证码')
  applyVerifying.value = true
  try {
    await api.activityVerifyCode('publish_apply', auth.user.email, applyCode.value)
    applyVerified.value = true
    ElMessage.success('邮箱验证通过')
  } catch (e) {
    ElMessage.error(e.response?.data?.error || e.message)
  } finally {
    applyVerifying.value = false
  }
}

async function submitApply() {
  if (!applyVerified.value) return ElMessage.warning('请先完成申请人邮箱验证')
  if (!applyForm.commitment_checked) return ElMessage.warning('请阅读并同意发布承诺书')

  submitting.value = true
  try {
    await api.requestActivityPublish({
      title: applyForm.title,
      org_type: applyForm.org_type,
      custom_org: applyForm.custom_org,
      category: applyForm.category,
      purpose: applyForm.purpose,
      start_time: applyForm.range?.[0] || null,
      end_time: applyForm.range?.[1] || null,
      activity_format: applyForm.activity_format,
      activity_region: applyForm.activity_region,
      detail_location: applyForm.detail_location,
      identity_images: applyForm.identity_images,
      real_proofs: applyForm.real_proofs,
      real_proof_images: applyForm.real_proof_images,
      expected_people: applyForm.expected_people,
      safety_measures: applyForm.safety_measures,
      emergency_plan: applyForm.emergency_plan,
      has_insurance: applyForm.has_insurance,
      insurance_desc: applyForm.insurance_desc,
      contacts: contacts.value,
      commitment: commitmentTemplate.value,
      commitment_checked: applyForm.commitment_checked,
      description: applyForm.description,
      contact: applyForm.contact,
      quota: applyForm.quota,
      tags: applyForm.tags,
      signup_deadline: applyForm.signup_deadline,
      publish_images: applyForm.publish_images,
      publish_attachments: applyForm.publish_attachments
    })
    ElMessage.success('申请已提交，等待管理员审核')
    applyOpen.value = false
    loadMine()
  } catch (e) {
    ElMessage.error(e.response?.data?.error || e.message)
  } finally {
    submitting.value = false
  }
}

async function submitPublish() {
  if (!pubForm.title.trim()) return ElMessage.warning('请填写活动标题')
  if (!pubForm.category) return ElMessage.warning('请选择活动分类')
  submitting.value = true
  try {
    const res = await api.createActivity({
      title: pubForm.title,
      organization: pubForm.organization,
      category: pubForm.category,
      description: pubForm.description,
      start_time: pubForm.range?.[0] || null,
      end_time: pubForm.range?.[1] || null,
      signup_deadline: pubForm.signup_deadline || pubForm.range?.[0] || null,
      activity_format: pubForm.activity_format,
      location_name: pubForm.location_name,
      contact: pubForm.contact,
      quota: pubForm.quota,
      tags: pubForm.tags
    })
    ElMessage.success('活动发布成功')
    publishOpen.value = false
    await Promise.all([loadWall(), loadMine()])
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  loadWall()
  loadMine()
  loadSignups()
})

async function cancelRequest(q) {
  try {
    await ElMessageBox.confirm('确定撤销这条发布申请吗？撤销后需重新提交。', '撤销申请', { type: 'warning', confirmButtonText: '确定撤销', cancelButtonText: '取消' })
  } catch { return }
  try {
    await api.cancelActivityRequest(q.id)
    ElMessage.success('申请已撤销')
    loadMine()
  } catch (e) {
    ElMessage.error(e.message)
  }
}
</script>

<style scoped>
.banner { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.banner-main { flex: 1; min-width: 0; }
.banner-title { font-weight: 800; font-size: 21px; }
.banner-text { color: var(--ink); font-size: 17px; margin-top: 8px; line-height: 1.7; }
.banner-text .hl { color: var(--brand-text); font-weight: 700; }
.banner-actions { display: flex; gap: 12px; flex-shrink: 0; align-items: center; }
.filter-bar { display: flex; gap: 14px; margin-bottom: 16px; align-items: center; }
.act-list { display: flex; flex-direction: column; gap: 16px; }
.act-item {
  display: flex; gap: 18px; align-items: flex-start;
  background: #fff; border: 1px solid var(--border); border-radius: var(--radius);
  padding: 20px 24px; cursor: pointer; transition: box-shadow .18s, transform .18s, border-color .18s;
}
.act-item:hover { box-shadow: var(--shadow-lg); transform: translateY(-2px); border-color: var(--brand-soft-strong); }
.act-emoji { font-size: 44px; width: 60px; text-align: center; flex-shrink: 0; }
.act-body { flex: 1; min-width: 0; }
.act-title { font-size: 22px; font-weight: 700; color: var(--ink); line-height: 1.4; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.act-meta { color: var(--text-secondary); font-size: 17px; margin-top: 8px; display: flex; flex-wrap: wrap; gap: 14px; align-items: center; }
.act-desc { margin-top: 10px; color: var(--ink); font-size: 17px; line-height: 1.6; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.act-side { flex-shrink: 0; align-self: center; }
.ml-6 { margin-left: 8px; }
.dialog-tip { background: var(--brand-soft); border: 1px solid #bfe6d6; color: var(--brand-text); border-radius: 10px; padding: 12px 16px; font-size: 16px; line-height: 1.6; }
.cat-select { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; width: 100%; }
.cat-option { border: 1px solid var(--border); border-radius: 10px; padding: 14px; text-align: center; cursor: pointer; transition: all .15s; }
.cat-option:hover { border-color: var(--brand); }
.cat-option.active { border-color: var(--brand); background: var(--brand-soft); }
.co-emoji { font-size: 30px; }
.co-label { font-size: 16px; margin-top: 6px; color: var(--ink); font-weight: 700; }
.form-row { display: grid; grid-template-columns: 1.8fr 1fr; gap: 20px; align-items: start; }
@media (max-width: 768px) {
  .banner { flex-direction: column; align-items: stretch; }
  .cat-select { grid-template-columns: repeat(2, 1fr); }
  .form-row { grid-template-columns: 1fr; }
}
.req-list { display: flex; flex-direction: column; gap: 12px; }
.req-item { border: 1px solid var(--border); border-radius: 12px; padding: 16px 18px; }
.req-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.req-title { font-weight: 700; font-size: 17px; }
.req-meta { font-size: 16px; margin-top: 6px; }
.req-purpose { margin-top: 10px; color: var(--ink); font-size: 16px; line-height: 1.6; }
.req-note { margin-top: 10px; padding: 10px 14px; border-radius: 8px; background: var(--surface); color: var(--ink); font-size: 16px; }
.req-note.rejected { background: #fdecec; color: var(--danger); }
.signup-list { display: flex; flex-direction: column; gap: 14px; }
.signup-item { display: flex; gap: 16px; align-items: flex-start; background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 16px 18px; cursor: pointer; transition: box-shadow .18s, border-color .18s; }
.signup-item:hover { box-shadow: var(--shadow-lg); border-color: var(--brand-soft-strong); }
.su-emoji { font-size: 36px; width: 48px; text-align: center; flex-shrink: 0; }
.su-body { flex: 1; min-width: 0; }
.su-title { font-size: 19px; font-weight: 700; color: var(--ink); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.su-meta { color: var(--text-secondary); font-size: 16px; margin-top: 6px; display: flex; flex-wrap: wrap; gap: 14px; }
.su-proof { margin-top: 10px; padding: 10px 14px; background: var(--brand-soft); border: 1px solid #bfe6d6; border-radius: 8px; color: var(--brand-text); font-size: 16px; }
.su-side { flex-shrink: 0; }

/* 模块化申请样式 */
.step-indicator { display: flex; gap: 8px; align-items: center; justify-content: center; }
.step-item { display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: default; opacity: .5; transition: opacity .2s; }
.step-item.active { opacity: 1; }
.step-item.done { opacity: .8; cursor: pointer; }
.step-item.done:hover { opacity: 1; }
.step-item:not(.active):not(.done) { cursor: not-allowed; }
.step-circle { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px; background: var(--surface-muted); color: var(--text-secondary); transition: all .2s; }
.step-item.active .step-circle { background: var(--brand); color: #fff; }
.step-item.done .step-circle { background: var(--brand); color: #fff; }
.step-label { font-size: 13px; color: var(--text-secondary); white-space: nowrap; }
.module-title { font-size: 20px; font-weight: 700; color: var(--brand-text); margin-top: 16px; padding-bottom: 8px; border-bottom: 2px solid var(--brand-soft); }
.sec-divider { font-size: 17px; font-weight: 700; color: var(--ink); margin: 20px 0 12px; padding: 8px 12px; background: var(--surface-muted); border-radius: 8px; }
.dialog-footer-flex { display: flex; justify-content: space-between; align-items: center; width: 100%; }
.contact-card { border: 1px solid var(--border); border-radius: 10px; padding: 14px; margin-bottom: 12px; background: var(--surface); }
.contact-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.contact-num { font-weight: 600; font-size: 15px; color: var(--ink); }
.contact-fields { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
.contact-verify-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.commitment-box { width: 100%; max-height: 240px; overflow-y: auto; border: 1px solid var(--border); border-radius: 8px; padding: 14px; background: #fafafa; font-size: 14px; line-height: 1.8; color: var(--ink); white-space: pre-wrap; }
.commitment-content { white-space: pre-wrap; }
:deep(.custom-label .el-form-item__label) { white-space: normal; }
.mt-8 { margin-top: 8px; }
.hl { color: var(--brand-text); font-weight: 700; }
.ev-list { display: flex; flex-wrap: wrap; gap: 10px; }
.ev-item { position: relative; width: 90px; height: 90px; border-radius: 10px; overflow: hidden; border: 1px solid var(--border); flex-shrink: 0; }
.ev-img { width: 100%; height: 100%; object-fit: cover; }
.ev-del { position: absolute; top: 2px; right: 2px; width: 20px; height: 20px; background: rgba(0,0,0,.55); color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; cursor: pointer; line-height: 1; }
.ev-add { width: 90px; height: 90px; border: 2px dashed var(--border); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 28px; color: var(--text-secondary); cursor: pointer; transition: border-color .15s; flex-shrink: 0; }
.ev-add:hover { border-color: var(--brand); color: var(--brand); }

/* 灰色继承区 */
.inherited-info { background: var(--surface-muted); border: 1px solid var(--border); border-radius: 10px; padding: 16px; }
.ii-title { font-size: 15px; font-weight: 700; color: var(--ink); margin-bottom: 12px; }
.ii-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
@media (max-width: 600px) { .ii-grid { grid-template-columns: 1fr; } }
.ii-field { display: flex; flex-direction: column; gap: 2px; }
.ii-label { font-size: 12px; color: var(--text-secondary); font-weight: 600; text-transform: uppercase; letter-spacing: .3px; }
.ii-value { font-size: 15px; color: var(--ink); font-weight: 500; word-break: break-all; }

/* 附件列表 */
.att-list { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.att-item { display: flex; align-items: center; gap: 6px; padding: 6px 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; font-size: 14px; }
.att-icon { flex-shrink: 0; }
.att-name { max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; color: var(--ink); }
.att-del { cursor: pointer; color: var(--danger); font-weight: 700; font-size: 14px; flex-shrink: 0; }
.att-add { display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; border: 2px dashed var(--border); border-radius: 8px; cursor: pointer; color: var(--text-secondary); font-size: 14px; transition: border-color .15s; }
.att-add:hover { border-color: var(--brand); color: var(--brand); }

.page-title{font-size:30px}
.page-sub{font-size:17px;color:var(--text-secondary)}
.sec-title{font-size:22px}
.sub-sec-title{font-size:19px;font-weight:700;color:var(--ink);margin-top:20px;padding-bottom:6px;border-bottom:1px solid var(--border)}
.req-head-side{display:flex;align-items:center;gap:8px}
.badge-teal{font-size:16px}
.empty{font-size:17px;color:var(--text-secondary)}
.text-muted{color:var(--text-secondary)}

/* ===== 加大加深：Tab、筛选控件、按钮 ===== */
.tabs-lg :deep(.el-tabs__item) { font-size: 20px; font-weight: 700; padding: 0 24px; }
.filter-bar { display: flex; gap: 18px; margin-bottom: 20px; align-items: center; }
.filter-bar :deep(.el-checkbox__label) { font-size: 18px; font-weight: 700; color: var(--ink); }
.filter-bar :deep(.el-checkbox) { --el-checkbox-input-width: 22px; --el-checkbox-input-height: 22px; }
.filter-bar :deep(.el-select) { --el-select-input-font-size: 16px; }
.filter-bar :deep(.el-input__inner) { font-size: 16px; }
</style>