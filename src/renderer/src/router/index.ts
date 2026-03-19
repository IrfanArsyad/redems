import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@renderer/App.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
