import { io } from 'socket.io-client'

let socket = null
let currentTeamId = null

export function connectSocket() {
  const token = localStorage.getItem('dazi_token')
  if (!token) return null
  if (socket) return socket
  socket = io('/', {
    path: '/socket.io',
    auth: { token }
  })
  socket.on('connect', () => {
    console.log('[socket] connected')
    // 断线重连后自动回到当前聊天室
    if (currentTeamId) socket.emit('joinTeam', currentTeamId, () => {})
  })
  socket.on('disconnect', () => console.log('[socket] disconnected'))
  return socket
}

export function getSocket() {
  return socket
}

// 当前所在聊天室（用于判断是否需要在别处提醒）
export function getCurrentTeamId() {
  return currentTeamId
}

export function disconnectSocket() {
  if (socket) { socket.disconnect(); socket = null }
}

// 进入聊天室
export function joinTeam(teamId) {
  currentTeamId = teamId
  return new Promise((resolve, reject) => {
    const s = connectSocket()
    if (!s) return reject(new Error('未登录'))
    s.emit('joinTeam', teamId, (res) => {
      if (res?.ok) resolve()
      else reject(new Error(res?.error || '加入失败'))
    })
  })
}

// 离开当前聊天室（页面卸载时调用）
export function leaveTeam() {
  if (!currentTeamId) return
  const s = getSocket()
  if (s) s.emit('leaveTeam', currentTeamId)
  currentTeamId = null
}

// 发送消息（返回 Promise，resolve 服务端 ack）
export function sendMessage(payload) {
  return new Promise((resolve, reject) => {
    const s = getSocket()
    if (!s) return reject(new Error('连接未建立'))
    s.emit('sendMessage', payload, (res) => {
      if (res?.ok) resolve(res)
      else reject(new Error(res?.error || '发送失败'))
    })
  })
}

// 撤回消息（返回 Promise，resolve 服务端 ack）
export function recallMessage(payload) {
  return new Promise((resolve, reject) => {
    const s = getSocket()
    if (!s) return reject(new Error('连接未建立'))
    s.emit('recallMessage', payload, (res) => {
      if (res?.ok) resolve(res)
      else reject(new Error(res?.error || '撤回失败'))
    })
  })
}

// 监听事件
export function onMessage(handler) {
  const s = getSocket()
  if (!s) return
  s.on('message', handler)
}
export function offMessage(handler) {
  const s = getSocket()
  if (s) s.off('message', handler)
}

// 监听消息撤回
export function onRecall(handler) {
  const s = getSocket()
  if (!s) return
  s.on('recall', handler)
}
export function offRecall(handler) {
  const s = getSocket()
  if (s) s.off('recall', handler)
}

// 监听站内通知实时推送
export function onNotification(handler) {
  const s = getSocket()
  if (s) s.on('notification', handler)
}
export function offNotification(handler) {
  const s = getSocket()
  if (s) s.off('notification', handler)
}

// 监听聊天新消息提醒（未进入该聊天室时由服务端推送）
export function onTeamNotice(handler) {
  const s = getSocket()
  if (s) s.on('teamNotice', handler)
}
export function offTeamNotice(handler) {
  const s = getSocket()
  if (s) s.off('teamNotice', handler)
}

// 监听被踢出队伍（自动离开房间）
let kickedHandler = null
export function onKicked(handler) {
  kickedHandler = handler
  const s = getSocket()
  if (s) s.off('kicked')
  if (s) s.on('kicked', (payload) => {
    leaveTeam()
    if (kickedHandler) kickedHandler(payload)
  })
}
export function offKicked() {
  kickedHandler = null
  const s = getSocket()
  if (s) s.off('kicked')
}

// 监听账号被封禁（管理员强制下线：断开 socket、离开房间，交由上层清 token 跳登录）
let bannedHandler = null
export function onBanned(handler) {
  bannedHandler = handler
  const s = getSocket()
  if (s) s.off('banned')
  if (s) s.on('banned', (payload) => {
    disconnectSocket()
    leaveTeam()
    if (bannedHandler) bannedHandler(payload)
  })
}
export function offBanned() {
  bannedHandler = null
  const s = getSocket()
  if (s) s.off('banned')
}