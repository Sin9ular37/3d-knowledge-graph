import { createRouter, createWebHistory } from 'vue-router'
import KnowledgeGraphThree from '@/components/KnowledgeGraphThree.vue'

const routes = [
  {
    path: '/',
    redirect: '/graphview'
  },
  {
    path: '/graphview',
    name: 'graphview',
    component: KnowledgeGraphThree,
    meta: {
      title: '3D知识图谱'
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 设置页面标题
router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    document.title = to.meta.title
  }
  next()
})

export default router 