import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/projects' },
    { path: '/sources', name: 'sources', component: () => import('@/views/SourcesView.vue') },
    { path: '/sources/new', name: 'source-create', component: () => import('@/views/SourceCreateView.vue') },
    { path: '/projects/:projectId/claims/new', name: 'claim-create', component: () => import('@/views/ClaimCreateView.vue'), props: true },
    { path: '/projects/:projectId/evidences', name: 'project-evidences', component: () => import('@/views/EvidencesView.vue'), props: true },
    { path: '/projects/:projectId/evidences/new', name: 'evidence-create', component: () => import('@/views/EvidenceCreateView.vue'), props: true },
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
