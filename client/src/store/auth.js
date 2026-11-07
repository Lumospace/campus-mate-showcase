import { defineStore } from 'pinia'
import api from '../api/index.js'
import { clearHallFilters } from './hall.js'

function safeParseUser(raw) {
  try {
    return JSON.parse(raw || 'null')
  } catch {
    return null
  }
}

export const useAuth = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('dazi_token') || '',
    user: safeParseUser(localStorage.getItem('dazi_user'))
  }),
  getters: {
    isLogin: (s) => !!s.token,
    nickname: (s) => s.user?.nickname || '同学'
  },
  actions: {
    setAuth(token, user) {
      this.token = token
      this.user = user
      localStorage.setItem('dazi_token', token)
      localStorage.setItem('dazi_user', JSON.stringify(user))
    },
    async login(email, password, agreed) {
      const res = await api.login({ email, password, agreed })
      this.setAuth(res.token, res.user)
      return res.user
    },
    async refresh() {
      try {
        const res = await api.me()
        this.user = res.user
        localStorage.setItem('dazi_user', JSON.stringify(res.user))
      } catch { /* noop */ }
    },
    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem('dazi_token')
      localStorage.removeItem('dazi_user')
      clearHallFilters()
    }
  }
})