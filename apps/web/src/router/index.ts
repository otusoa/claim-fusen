import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/projects' },
    {
      path: '/projects',
      name: 'projects',
      component: () => import('@/views/ProjectsView.vue'),
    },
    {
      path: '/projects/new',
      name: 'project-create',
      component: () => import('@/views/ProjectCreateView.vue'),
    },
    {
      path: '/projects/:projectId/claims',
      name: 'project-claims',
      component: () => import('@/views/ClaimsView.vue'),
      props: true,
    },
    {
      path: '/claims/:claimId',
      name: 'claim-detail',
      component: () => import('@/views/ClaimDetailView.vue'),
      props: true,
    },
    {
      path: '/:pathMatch(.*)*',
      component: () => import('@/views/NotFoundView.vue'),
    },
  ],
})

export default router
