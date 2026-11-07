# 接口清单

统一前缀 `/api`，请求与响应均为 JSON（图片接口返回二进制）。鉴权使用 `Authorization: Bearer <token>`。

权限标记：🔓 游客可用 · 🔒 需登录 · 🛡️ 需管理员

---

## 账号 `/auth`

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| POST | `/auth/register` | 校园邮箱注册 | 🔓 |
| POST | `/auth/login` | 登录，返回 token | 🔓 |
| GET | `/auth/me` | 当前登录用户信息 | 🔒 |
| POST | `/auth/send-code` | 发送邮箱验证码（按场景区分） | 🔓 |
| POST | `/auth/reset-password` | 验证码重置密码 | 🔓 |
| POST | `/auth/verify-email` | 邮箱验证 | 🔒 |
| DELETE | `/auth/account` | 注销账号并清理数据 | 🔒 |

## 用户 `/users`

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| GET | `/users/search` | 按昵称搜索用户（脱敏） | 🔒 |
| GET | `/users/:id` | 他人公开主页 | 🔓 |
| PUT | `/users/me/profile` | 更新画像 | 🔒 |
| PUT | `/users/me/privacy` | 隐私开关 | 🔒 |
| GET | `/users/me/credit` | 信誉明细 | 🔒 |
| GET | `/users/me/badges` | 勋章列表 | 🔒 |
| POST | `/users/me/verify-student` | 提交学号核验 | 🔒 |
| GET | `/users/me/verify-status` | 核验状态 | 🔒 |
| GET | `/users/me/old-dazis` | 老搭子列表 | 🔒 |
| GET | `/users/me/weekly` | 搭子周报 | 🔒 |

## 需求 `/demands`

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| POST | `/demands` | 发布需求 | 🔒 |
| GET | `/demands` | 大厅列表（分类/关键词/状态筛选） | 🔓 |
| GET | `/demands/recommended` | 五维匹配推荐 | 🔒 |
| GET | `/demands/calendar` | 周历视图 | 🔓 |
| GET | `/demands/me` | 我发布的需求 | 🔒 |
| GET | `/demands/:id` | 需求详情 | 🔓 |
| POST | `/demands/:id/off` | 下架需求 | 🔒 |
| POST / DELETE | `/demands/:id/favorite` | 收藏 / 取消收藏 | 🔒 |
| GET | `/demands/fav/list` | 我的收藏 | 🔒 |

## 申请与蹲补 `/applications`

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| POST | `/applications` | 申请加入 | 🔒 |
| GET | `/applications/me` | 我发出的申请 | 🔒 |
| GET | `/applications/incoming` | 我收到的申请 | 🔒 |
| POST | `/applications/:id/approve` | 通过申请 | 🔒 |
| POST | `/applications/:id/reject` | 拒绝申请 | 🔒 |
| POST | `/applications/:id/cancel` | 撤回申请 | 🔒 |
| POST | `/applications/standby` | 加入蹲补 | 🔒 |
| POST | `/applications/standby/cancel` | 取消蹲补 | 🔒 |

## 队伍 `/teams`

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| GET | `/teams/me` | 我的队伍 | 🔒 |
| GET | `/teams/summary` | 队伍概览与未读汇总 | 🔒 |
| GET | `/teams/:id` | 队伍详情 | 🔒 |
| GET | `/teams/:id/messages` | 聊天记录 | 🔒 |
| POST | `/teams/:id/read` | 已读游标上移 | 🔒 |
| POST | `/teams/:id/invites` | 队长邀请用户 | 🔒 |
| POST | `/teams/:id/complete` | 完成活动 | 🔒 |
| POST | `/teams/:id/leave` | 退出队伍 | 🔒 |
| POST | `/teams/:id/dismiss` | 解散队伍 | 🔒 |
| POST | `/teams/:id/transfer` | 转让队长 | 🔒 |
| POST | `/teams/:id/exit-request` | 发起退出申请 | 🔒 |
| POST | `/teams/exit-requests/:id/approve` / `reject` | 审批退出申请 | 🔒 |
| POST | `/teams/disband-requests/:id/approve` / `reject` | 审批解散申请 | 🔒 |
| POST | `/teams/transfer-requests/:id/approve` / `reject` | 审批转让申请 | 🔒 |

## 邀请 `/invites`

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| GET | `/invites/received` | 我收到的邀请 | 🔒 |
| POST | `/invites/:id/accept` | 接受邀请（事务内二次校验） | 🔒 |
| POST | `/invites/:id/reject` | 拒绝邀请 | 🔒 |

## 互评 `/teams`

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| POST | `/teams/:id/reviews` | 提交搭后互评 | 🔒 |

## 治理 `/governance`

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| POST | `/governance/reports` | 提交举报 | 🔒 |
| POST | `/governance/appeals` | 提交申诉 | 🔒 |
| GET / POST / DELETE | `/governance/blocks` | 拉黑名单管理 | 🔒 |
| POST | `/governance/dislikes` | 标记不感兴趣 | 🔒 |

## 通知 `/notifications`

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| GET | `/notifications` | 通知列表 | 🔒 |
| POST | `/notifications/:id/read` | 单条已读 | 🔒 |
| POST | `/notifications/read-all` | 全部已读 | 🔒 |

## 管理后台 `/admin`

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| GET | `/admin/stats` | 运营数据看板 | 🛡️ |
| GET / POST | `/admin/reports`、`/admin/reports/:id/resolve` | 举报工作台与处理 | 🛡️ |
| GET / POST | `/admin/appeals`、`/admin/appeals/:id/resolve` | 申诉工作台与处理 | 🛡️ |
| GET / POST | `/admin/verifications`、`/admin/verifications/:id/review` | 学号核验审核 | 🛡️ |
| GET | `/admin/users` | 用户检索 | 🛡️ |
| POST | `/admin/users/:id/ban` / `unban` / `restrict` / `unrestrict` | 封禁与限制 | 🛡️ |
| GET / POST | `/admin/demands`、`/admin/demands/:id/takedown` | 需求治理 | 🛡️ |
| GET | `/admin/feedback` | 用户反馈查看 | 🛡️ |

## 内容社区

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| GET | `/stories` | 故事墙列表 | 🔓 |
| POST | `/stories` | 发布故事 | 🔒 |
| POST | `/stories/:id/publish` | 审核后发布 | 🔒 |
| POST | `/stories/:id/like` | 点赞 | 🔒 |
| GET / POST | `/stories/:id/comments` | 评论列表 / 发表评论 | 🔓 / 🔒 |
| DELETE | `/stories/:id` | 删除故事 | 🔒 |
| POST | `/stories/ai-assist` | AI 文案辅助 | 🔒 |

## 校园活动 `/activities`

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| GET | `/activities` | 活动列表 | 🔓 |
| GET | `/activities/:id` | 活动详情 | 🔓 |
| POST | `/activities` | 发布活动 | 🛡️ |
| POST | `/activities/:id/signup` / `cancel` | 报名 / 取消报名 | 🔒 |
| GET | `/activities/:id/signups` | 报名名单 | 🔒 |
| POST | `/activities/:id/complete` / `off` | 结束 / 下架活动 | 🔒 |
| POST | `/activities/requests` | 申请发布资格 | 🔒 |
| GET | `/activities/my-requests` | 我的申请记录 | 🔒 |
| GET / POST | `/activities/admin/requests`、`/activities/admin/requests/:id/review` | 发布资格审核 | 🛡️ |
| POST | `/activities/verify-code` | 报名验证码 | 🔒 |

## 快闪组局 `/flash`

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| GET | `/flash` | 快闪列表 | 🔓 |
| POST | `/flash` | 发起快闪 | 🔒 |
| POST | `/flash/:id/join` | 加入快闪 | 🔒 |
| POST | `/flash/:id/close` | 关闭快闪 | 🔒 |

## 兴趣圈 `/circles`

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| GET | `/circles` | 圈子列表（成员数聚合） | 🔓 |
| POST | `/circles` | 创建圈子 | 🔒 |
| POST | `/circles/:id/join` / `leave` | 加入 / 退出 | 🔒 |
| GET | `/circles/:id/posts` | 帖子列表（只返回图片数量） | 🔓 |
| POST | `/circles/:id/posts` | 发帖 | 🔒 |
| GET | `/circles/:id/posts/:postId` | 帖子详情 | 🔓 |
| GET | `/circles/:id/posts/:postId/images/:idx` | 帖子图片二进制（带缓存头） | 🔓 |
| POST | `/circles/:id/posts/:postId/replies` | 回复帖子 | 🔒 |
| DELETE | `/circles/:id/posts/:postId` | 删除帖子 | 🔒 |
| GET | `/circles/:id/members` | 圈友列表（含共同圈数/组队次数） | 🔒 |

## 成长与反馈

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| GET | `/growth` | 成长档案 | 🔒 |
| GET | `/feedback/draft` | 读取反馈草稿 | 🔒 |
| POST | `/feedback/draft` | 保存反馈草稿 | 🔒 |
| POST | `/feedback` | 提交反馈 | 🔒 |
| GET | `/feedback/history` | 反馈历史 | 🔒 |

## AI 助手 `/ai`

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| GET | `/ai/history` | 历史会话 | 🔒 |
| POST | `/ai/chat` | 对话（SSE 流式返回） | 🔒 |

---

## 通用约定

- **错误响应**：`{ "error": "可直接展示给用户的中文提示" }`；封禁类错误附带 `code: "ACCOUNT_BANNED"` 与解封时间，前端据此强制下线。
- **分页**：列表类接口统一限制返回条数（如 100 条），通过筛选参数缩小范围。
- **体积控制**：大字段不走列表接口；图片走独立二进制接口并设置 `Cache-Control` 与 `ETag`。
- **敏感操作**：管理员操作需在请求体携带缘由，服务端记录操作人与时间。
