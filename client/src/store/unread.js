import { defineStore } from 'pinia'

// 未读计数：站内通知 + 各队伍聊天（顶栏「消息」红点为两者合计）
export const useUnread = defineStore('unread', {
  state: () => ({ notice: 0, byTeam: {} }),
  getters: {
    chat: (state) => Object.values(state.byTeam).reduce((a, b) => a + (Number(b) || 0), 0),
    total() { return this.notice + this.chat }
  },
  actions: {
    setNotice(n) { this.notice = Math.max(0, Number(n) || 0) },
    bumpNotice() { this.notice += 1 },
    clearNotice() { this.notice = 0 },
    // 初始化/覆盖全部队伍未读（键为队伍 id）
    setByTeam(map) { this.byTeam = { ...(map || {}) } },
    setTeam(id, n) { this.byTeam = { ...this.byTeam, [id]: Math.max(0, Number(n) || 0) } },
    bumpTeam(id) { this.setTeam(id, (this.byTeam[id] || 0) + 1) },
    clearTeam(id) { this.setTeam(id, 0) }
  }
})
