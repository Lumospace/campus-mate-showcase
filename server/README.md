# 服务端骨架说明

本目录**不包含**服务端实现代码，仅展示工程结构与依赖，供了解系统分层设计。

## 技术依赖

```json
{
  "express": "^5.1.0",
  "socket.io": "^4.8.1",
  "cors": "^2.8.5",
  "nodemailer": "^10.1.2"
}
```

数据库使用 Node 22.5+ 内置的 `node:sqlite`，不引入任何原生编译模块；认证使用 Node 内置 `crypto` 手写 JWT 与 scrypt 哈希，不依赖第三方鉴权库。

## 目录结构

```
server/
├── package.json
└── src/
    ├── index.js          # 入口：加载配置、注册路由、挂载静态资源、统一错误处理
    ├── config.js         # 常量与可运营调整的参数（匹配权重、信誉规则、分类模板）
    ├── db.js             # 数据层：建表、索引、幂等迁移、事务封装
    ├── auth.js           # 鉴权中间件：JWT 校验、封禁拦截、权限位判断
    ├── match.js          # 五维可解释匹配引擎
    ├── credit.js         # 信誉分状态机与勋章
    ├── filter.js         # DFA 敏感词过滤
    ├── notify.js         # 站内通知（含合并降频与跳转链接）
    ├── realtime.js       # Socket.IO 鉴权与房间广播
    ├── socket.js         # 实时事件注册
    ├── scheduler.js      # 定时任务（活动开始、封禁到期、通知清理等）
    ├── mailer.js         # 腾讯云 SES 邮件发送
    ├── serialize.js      # 响应序列化（统一字段口径与隐私开关）
    ├── seed.js           # 本地种子数据（不入库、不公开）
    ├── util.js           # 时间、JWT、密码哈希、错误包装等基础工具
    └── routes/           # 17 个业务路由模块
        ├── auth.js           # 注册登录、验证码、找回密码、注销
        ├── users.js          # 画像、隐私、信誉、勋章、学号核验
        ├── demands.js        # 需求发布、大厅、推荐、日历、收藏
        ├── applications.js   # 申请、审批、蹲补
        ├── teams.js          # 队伍、聊天、退出/解散/转让审批链
        ├── invites.js        # 队长邀请与接受
        ├── reviews.js        # 搭后互评
        ├── governance.js     # 举报、申诉、拉黑、不感兴趣
        ├── notifications.js  # 通知读写
        ├── admin.js          # 运营看板与治理操作
        ├── stories.js        # 故事墙
        ├── activities.js     # 校园活动与发布资格审核
        ├── flash.js          # 快闪组局
        ├── circles.js        # 兴趣圈
        ├── growth.js         # 成长档案
        ├── feedback.js       # 用户反馈
        └── ai.js             # AI 助手（流式）
```

## 为什么这里没有代码

服务端的匹配算法、信誉规则、风控策略与业务联动逻辑是这个产品的核心资产，因此本仓库只保留结构与职责说明。设计思路详见 [`docs/架构说明.md`](../docs/架构说明.md)，接口约定详见 [`docs/API清单.md`](../docs/API清单.md)。
