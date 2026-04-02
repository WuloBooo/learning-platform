import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import Registration from '../views/Registration.vue'
import Downloads from '../views/Downloads.vue'
import Exams from '../views/Exams.vue'
import WebBrowser from '../views/WebBrowser.vue'
import PracticeCenter from '../views/PracticeCenter.vue'
import ExamPage from '../views/ExamPage.vue'
import WrongQuestions from '../views/WrongQuestions.vue'

import AdminLayout from '../views/admin/AdminLayout.vue'
import AdminLogin from '../views/admin/AdminLogin.vue'
import Dashboard from '../views/admin/Dashboard.vue'
import UsersManage from '../views/admin/UsersManage.vue'
import ExamsManage from '../views/admin/ExamsManage.vue'
import MaterialsManage from '../views/admin/MaterialsManage.vue'
import RegistrationsManage from '../views/admin/RegistrationsManage.vue'
import BannersManage from '../views/admin/BannersManage.vue'
import QuestionsManage from '../views/admin/QuestionsManage.vue'
import PapersManage from '../views/admin/PapersManage.vue'
import NewsManage from '../views/admin/NewsManage.vue'
import TimelinesManage from '../views/admin/TimelinesManage.vue'
import ProgramsManage from '../views/admin/ProgramsManage.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/register',
    name: 'Register',
    component: Register
  },
  {
    path: '/registration',
    name: 'Registration',
    component: Registration
  },
  {
    path: '/downloads',
    name: 'Downloads',
    component: Downloads
  },
  {
    path: '/exams',
    name: 'Exams',
    component: Exams
  },
  {
    path: '/browser',
    name: 'WebBrowser',
    component: WebBrowser
  },
  {
    path: '/practice',
    name: 'PracticeCenter',
    component: PracticeCenter,
    meta: { requiresAuth: true }
  },
  {
    path: '/practice/exam/:id',
    name: 'ExamPage',
    component: ExamPage,
    meta: { requiresAuth: true }
  },
  {
    path: '/practice/wrong',
    name: 'WrongQuestions',
    component: WrongQuestions,
    meta: { requiresAuth: true }
  },
  {
    path: '/admin/login',
    name: 'AdminLogin',
    component: AdminLogin
  },
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAdmin: true },
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: Dashboard
      },
      {
        path: 'users',
        name: 'UsersManage',
        component: UsersManage
      },
      {
        path: 'exams',
        name: 'ExamsManage',
        component: ExamsManage
      },
      {
        path: 'materials',
        name: 'MaterialsManage',
        component: MaterialsManage
      },
      {
        path: 'registrations',
        name: 'RegistrationsManage',
        component: RegistrationsManage
      },
      {
        path: 'banners',
        name: 'BannersManage',
        component: BannersManage
      },
      {
        path: 'questions',
        name: 'QuestionsManage',
        component: QuestionsManage
      },
      {
        path: 'papers',
        name: 'PapersManage',
        component: PapersManage
      },
      {
        path: 'news',
        name: 'NewsManage',
        component: NewsManage
      },
      {
        path: 'timelines',
        name: 'TimelinesManage',
        component: TimelinesManage
      },
      {
        path: 'programs',
        name: 'ProgramsManage',
        component: ProgramsManage
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const publicPages = ['/', '/login', '/register', '/registration', '/browser', '/downloads', '/exams', '/admin/login']
  const authRequired = !publicPages.includes(to.path) || to.meta.requiresAuth
  
  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  
  if (to.meta.requiresAdmin) {
    if (!token || user?.role !== 'admin') {
      return next('/admin/login')
    }
  } else if (authRequired && !token) {
    return next('/login')
  }
  
  next()
})

export default router
