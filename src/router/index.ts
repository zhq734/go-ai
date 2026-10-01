/**
 * 路由配置：单页应用，对局状态由 Pinia 保持。
 * 创建者：zhenghq
 */
import { createRouter, createWebHashHistory } from 'vue-router'
import GameView from '@/views/GameView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'game', component: GameView },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

export default router
