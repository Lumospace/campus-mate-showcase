import axios from 'axios'
import { ElMessage } from 'element-plus'

const http = axios.create({ baseURL: '/api', timeout: 15000 })

// 封禁强制下线处理（避免重复弹窗/跳转）
let bannedHandling = false
function handleBanned(msg) {
  if (bannedHandling) return
  bannedHandling = true
  localStorage.removeItem('dazi_token')
  localStorage.removeItem('dazi_user')
  ElMessage.error(msg || '您的账号已被封禁')
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('dazi_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const data = err.response?.data
    const msg = data?.error || err.message || '请求失败'
    if (data?.code === 'ACCOUNT_BANNED') {
      handleBanned(msg)
      return Promise.reject(new Error(msg))
    }
    if (err.response?.status === 401) {
      localStorage.removeItem('dazi_token')
      localStorage.removeItem('dazi_user')
      // 登录态过期：跳转登录页并携带回跳地址（避免停留在原页持续报错且登录后丢失原页面）
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        const current = window.location.pathname + window.location.search
        window.location.href = '/login?redirect=' + encodeURIComponent(current)
      }
    }
    return Promise.reject(new Error(msg))
  }
)

export const api = {
  // meta（全局配置：搭后互评标签等）
  meta: () => http.get('/meta'),

  // auth
  register: (data) => http.post('/auth/register', data),
  login: (data) => http.post('/auth/login', data),
  me: () => http.get('/auth/me'),
  sendCode: (email, scene) => http.post('/auth/send-code', { email, scene }),
  resetPassword: (data) => http.post('/auth/reset-password', data),
  verifyEmail: (code) => http.post('/auth/verify-email', { code }),
  deleteAccount: () => http.delete('/auth/account'),

  // profile
  getProfile: (id) => http.get(`/users/${id}`),
  updateProfile: (data) => http.put('/users/me/profile', data),
  updatePrivacy: (data) => http.put('/users/me/privacy', data),
  credit: () => http.get('/users/me/credit'),
  badges: () => http.get('/users/me/badges'),
  oldDazis: () => http.get('/users/me/old-dazis'),
  weekly: () => http.get('/users/me/weekly'),

  // demands
  createDemand: (data) => http.post('/demands', data),
  offDemand: (id) => http.post(`/demands/${id}/off`),
  listDemands: (params) => http.get('/demands', { params }),
  recommended: () => http.get('/demands/recommended'),
  calendar: (week = 0) => http.get('/demands/calendar', { params: { week } }),
  myDemands: () => http.get('/demands/me'),
  getDemand: (id) => http.get(`/demands/${id}`),
  favorite: (id) => http.post(`/demands/${id}/favorite`),
  unfavorite: (id) => http.delete(`/demands/${id}/favorite`),
  myFavorites: () => http.get('/demands/fav/list'),

  // applications
  apply: (data) => http.post('/applications', data),
  myApplications: () => http.get('/applications/me'),
  incoming: (demandId) => http.get('/applications/incoming', { params: demandId ? { demand_id: demandId } : {} }),
  approve: (id) => http.post(`/applications/${id}/approve`),
  reject: (id) => http.post(`/applications/${id}/reject`),
  cancelApplication: (id) => http.post(`/applications/${id}/cancel`),
  standby: (demandId) => http.post('/applications/standby', { demand_id: demandId }),
  cancelStandby: (demandId) => http.post('/applications/standby/cancel', { demand_id: demandId }),

  // teams
  myTeams: () => http.get('/teams/me'),
  messagesSummary: () => http.get('/teams/summary'),
  getTeam: (id) => http.get(`/teams/${id}`),
  teamMessages: (id, after = 0) => http.get(`/teams/${id}/messages`, { params: { after_seq: after } }),
  markTeamRead: (id) => http.post(`/teams/${id}/read`),
  completeTeam: (id) => http.post(`/teams/${id}/complete`),
  leaveTeam: (id) => http.post(`/teams/${id}/leave`),
  exitRequestTeam: (id, reason) => http.post(`/teams/${id}/exit-request`, { reason }),
  removeMember: (id, memberId) => http.post(`/teams/${id}/remove`, { member_id: memberId }),
  transferTeam: (id, memberId, reason) => http.post(`/teams/${id}/transfer`, { member_id: memberId, reason }),
  dismissTeam: (id, reason) => http.post(`/teams/${id}/dismiss`, { reason }),
  approveExitRequest: (id) => http.post(`/teams/exit-requests/${id}/approve`),
  rejectExitRequest: (id) => http.post(`/teams/exit-requests/${id}/reject`),
  approveDisband: (id) => http.post(`/teams/disband-requests/${id}/approve`),
  rejectDisband: (id) => http.post(`/teams/disband-requests/${id}/reject`),
  approveTransfer: (id) => http.post(`/teams/transfer-requests/${id}/approve`),
  rejectTransfer: (id) => http.post(`/teams/transfer-requests/${id}/reject`),
  searchUsers: (keyword) => http.get('/users/search', { params: { keyword } }),
  inviteTeamMember: (id, userId) => http.post(`/teams/${id}/invites`, { user_id: userId }),
  receivedInvites: () => http.get('/invites/received'),
  acceptInvite: (id) => http.post(`/invites/${id}/accept`),
  rejectInvite: (id) => http.post(`/invites/${id}/reject`),

  // reviews
  submitReviews: (teamId, reviews) => http.post(`/teams/${teamId}/reviews`, { reviews }),

  // ai 助手（非流式备用；前端当前走 fetch 流式）
  aiChat: (teamId, message) => http.post('/ai/chat', { team_id: teamId, message }),

  // governance
  report: (data) => http.post('/governance/reports', data),
  block: (blockedId) => http.post('/governance/blocks', { blocked_id: blockedId }),
  unblock: (id) => http.delete(`/governance/blocks/${id}`),
  blocks: () => http.get('/governance/blocks'),
  dislike: (targetUserId) => http.post('/governance/dislikes', { target_user_id: targetUserId }),
  createAppeal: (data) => http.post('/governance/appeals', data),

  // notifications
  notifications: () => http.get('/notifications'),
  readAll: () => http.post('/notifications/read-all'),
  readOne: (id) => http.post(`/notifications/${id}/read`),

  // stories（成功故事墙）
  stories: () => http.get('/stories'),
  myStories: () => http.get('/stories/mine'),
  createStory: (data) => http.post('/stories', data),
  storyAiAssist: (data) => http.post('/stories/ai-assist', data, { timeout: 25000 }),
  publishStory: (id) => http.post(`/stories/${id}/publish`),
  likeStory: (id) => http.post(`/stories/${id}/like`),
  storyComments: (id) => http.get(`/stories/${id}/comments`),
  createStoryComment: (id, data) => http.post(`/stories/${id}/comments`, data),
  deleteStory: (id, reason) => http.delete(`/stories/${id}`, { data: { reason } }),

  // activities（校园活动）
  activities: (params) => http.get('/activities', { params }),
  getActivity: (id) => http.get(`/activities/${id}`),
  myActivities: () => http.get('/activities/mine'),
  commitmentTemplate: () => http.get('/activities/commitment-template'),
  requestActivityPublish: (data) => http.post('/activities/requests', data),
  myActivityRequests: () => http.get('/activities/my-requests'),
  createActivity: (data) => http.post('/activities', data),
  activityRequests: () => http.get('/activities/admin/requests'),
  reviewActivityRequest: (id, approved, note) => http.post(`/activities/admin/requests/${id}/review`, { approved, note }),
  signupActivity: (id) => http.post(`/activities/${id}/signup`),
  cancelActivitySignup: (id) => http.post(`/activities/${id}/cancel`),
  mySignups: (params) => http.get('/activities/my-signups', { params }),
  activitySignups: (id) => http.get(`/activities/${id}/signups`),
  completeActivity: (id) => http.post(`/activities/${id}/complete`),
  offActivity: (id, reason) => http.post(`/activities/${id}/off`, { reason }),
  cancelActivityRequest: (id) => http.delete(`/activities/requests/${id}`),
  favoriteActivity: (id) => http.post(`/activities/${id}/favorite`),
  unfavoriteActivity: (id) => http.delete(`/activities/${id}/favorite`),
  myActivityFavorites: () => http.get('/activities/my-favorites'),
  // 活动发布申请 · 邮箱验证码
  activitySendCode: (scene, email) => http.post('/auth/send-code', { scene, email }),
  activityVerifyCode: (scene, email, code) => http.post('/activities/verify-code', { scene, email, code }),

  // 学号核验（强化认证）
  verifyStudentSubmit: (data) => http.post('/users/me/verify-student', data),
  verifyStatus: () => http.get('/users/me/verify-status'),

  // 快闪组局
  flashes: () => http.get('/flash'),
  createFlash: (data) => http.post('/flash', data),
  joinFlash: (id) => http.post(`/flash/${id}/join`),
  closeFlash: (id, reason) => http.post(`/flash/${id}/close`, { reason }),

  // 兴趣圈
  circles: () => http.get('/circles'),
  createCircle: (data) => http.post('/circles', data),
  joinCircle: (id) => http.post(`/circles/${id}/join`),
  leaveCircle: (id) => http.post(`/circles/${id}/leave`),
  circlePosts: (id) => http.get(`/circles/${id}/posts`),
  circleMembers: (id) => http.get(`/circles/${id}/members`),
  createCirclePost: (id, data) => http.post(`/circles/${id}/posts`, data),
  circlePostDetail: (id, postId) => http.get(`/circles/${id}/posts/${postId}`),
  circlePostImage: (id, postId, idx) => http.get(`/circles/${id}/posts/${postId}/images/${idx}`, { responseType: 'blob', timeout: 30000 }),
  createCirclePostReply: (id, postId, data) => http.post(`/circles/${id}/posts/${postId}/replies`, data),
  deleteCirclePost: (id, postId, reason) => http.delete(`/circles/${id}/posts/${postId}`, { data: { reason } }),

  // 成长档案
  growth: () => http.get('/growth'),

  // feedback（意见反馈：草稿保存 + 提交 + 记录）
  feedbackDraft: () => http.get('/feedback/draft'),
  saveFeedbackDraft: (content) => http.post('/feedback/draft', { content }),
  submitFeedback: (content) => http.post('/feedback', { content }),
  feedbackHistory: () => http.get('/feedback/history'),

  // admin
  stats: () => http.get('/admin/stats'),
  reports: () => http.get('/admin/reports'),
  resolveReport: (id, approved, note) => http.post(`/admin/reports/${id}/resolve`, { approved, note }),
  adminAppeals: () => http.get('/admin/appeals'),
  resolveAppeal: (id, approved, note) => http.post(`/admin/appeals/${id}/resolve`, { approved, note }),
  verifications: () => http.get('/admin/verifications'),
  reviewVerification: (id, approved, note) => http.post(`/admin/verifications/${id}/review`, { approved, note }),
  // admin · 用户治理
  adminUsers: (keyword) => http.get('/admin/users', { params: keyword ? { keyword } : {} }),
  adminBanUser: (id, days, reason) => http.post(`/admin/users/${id}/ban`, { days, reason }),
  adminUnbanUser: (id, reason) => http.post(`/admin/users/${id}/unban`, { reason }),
  adminRestrictUser: (id, days, reason) => http.post(`/admin/users/${id}/restrict`, { days, reason }),
  adminUnrestrictUser: (id, reason) => http.post(`/admin/users/${id}/unrestrict`, { reason }),
  // admin · 内容治理（需求下架，支持按标题/发布者搜索）
  adminDemands: (keyword) => http.get('/admin/demands', { params: keyword ? { keyword } : {} }),
  adminTakedownDemand: (id, reason) => http.post(`/admin/demands/${id}/takedown`, { reason }),
  // admin · 意见反馈
  adminFeedback: () => http.get('/admin/feedback')
}

export default api