// 上财校园邮箱后缀（唯一支持的后缀集合，精确匹配，不接受其他子域）
export const EMAIL_SUFFIXES = [
  'stu.sufe.edu.cn',
  'sufe.edu.cn',
  'mail.sufe.edu.cn',
  'msg.sufe.edu.cn',
  '163.sufe.edu.cn',
  'shufe.edu.cn',
  'mail.shufe.edu.cn'
]

// 前端校验与后端 config.EMAIL_WHITELIST 保持一致（唯一真源在后端）
export function isTrustedEmail(email) {
  const domain = String(email || '').trim().toLowerCase().split('@')[1] || ''
  return EMAIL_SUFFIXES.includes(domain)
}
