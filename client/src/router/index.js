import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../store/auth.js'

const routes = [
  { path: '/login', name: 'login', component: () => import('../views/Login.vue'), meta: { public: true, guestOnly: true } },
  { path: '/register', name: 'register', component: () => import('../views/Register.vue'), meta: { public: true, guestOnly: true } },
  { path: '/terms', name: 'terms', component: () => import('../views/Legal.vue'), props: { doc: 'terms' }, meta: { public: true } },
  { path: '/privacy', name: 'privacy', component: () => import('../views/Legal.vue'), props: { doc: 'privacy' }, meta: { public: true } },
  {
    path: '/',
    component: () => import('../layout/AppLayout.vue'),
    children: [
      { path: '', name: 'home', component: () => import('../views/Home.vue') },
      { path: 'hall', name: 'hall', component: () => import('../views/Hall.vue') },
      { path: 'my-demands', name: 'my-demands', component: () => import('../views/MyDemands.vue') },
      { path: 'calendar', name: 'calendar', component: () => import('../views/Calendar.vue') },
      { path: 'publish', name: 'publish', component: () => import('../views/Publish.vue') },
      { path: 'demand/:id', name: 'demand', component: () => import('../views/DemandDetail.vue') },
      { path: 'chat/:teamId', name: 'chat', component: () => import('../views/Chat.vue') },
      { path: 'teams', name: 'teams', component: () => import('../views/MyTeams.vue') },
      { path: 'applications', name: 'applications', component: () => import('../views/Applications.vue') },
      { path: 'favorites', name: 'favorites', component: () => import('../views/Favorites.vue') },
      { path: 'me', name: 'me', component: () => import('../views/Profile.vue') },
      { path: 'user/:id', name: 'user', component: () => import('../views/UserProfile.vue') },
      { path: 'credit', name: 'credit', component: () => import('../views/Credit.vue') },
      { path: 'weekly', name: 'weekly', component: () => import('../views/Weekly.vue') },
      { path: 'settings', name: 'settings', component: () => import('../views/Settings.vue') },
      { path: 'notifications', name: 'notifications', component: () => import('../views/Notifications.vue') },
      { path: 'stories', name: 'stories', component: () => import('../views/Stories.vue') },
      { path: 'flash', name: 'flash', component: () => import('../views/Flash.vue') },
      { path: 'circles', name: 'circles', component: () => import('../views/Circles.vue') },
      { path: 'circles/:id', name: 'circle-detail', component: () => import('../views/CircleDetail.vue') },
      { path: 'circles/:id/posts/:postId', name: 'post-detail', component: () => import('../views/PostDetail.vue') },
      { path: 'growth', name: 'growth', component: () => import('../views/Growth.vue') },
      { path: 'activities', name: 'activities', component: () => import('../views/Activities.vue') },
      { path: 'activity/:id', name: 'activity', component: () => import('../views/ActivityDetail.vue') },
      { path: 'admin', name: 'admin', component: () => import('../views/Admin.vue'), meta: { admin: true } }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to) => {
  const auth = useAuth()
  if (!to.meta.public && !auth.isLogin) return { name: 'login', query: { redirect: to.fullPath } }
  if (to.meta.guestOnly && auth.isLogin) return { name: 'home' }
  if (to.meta.admin && !auth.user?.is_admin) return { name: 'home' }
  return true
})

export default router