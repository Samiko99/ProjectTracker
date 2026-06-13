import { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/stavby',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: 'stavby',
        component: () => import('pages/StavbyPage.vue'),
      },
      {
        path: 'stavba/:id',
        component: () => import('pages/StavbaDetail.vue'),
      },
      {
        path: 'kalendar',
        component: () => import('pages/KalendarPage.vue'),
      },
      {
        path: 'nastaveni',
        component: () => import('pages/NastaveniPage.vue'),
      },
    ],
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
