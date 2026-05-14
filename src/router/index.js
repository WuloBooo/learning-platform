import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import Downloads from '../views/Downloads.vue'
import Exams from '../views/Exams.vue'
import WebBrowser from '../views/WebBrowser.vue'
import PracticeCenter from '../views/PracticeCenter.vue'
import ExamPage from '../views/ExamPage.vue'
import WrongQuestions from '../views/WrongQuestions.vue'
import SurveyChat from '../views/SurveyChat.vue'
import SurveyForm from '../views/SurveyForm.vue'
import MajorCheck from '../views/MajorCheck.vue'
import StudentRegister from '../views/StudentRegister.vue'
import MajorJudge from '../views/MajorJudge.vue'

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
import ExamRoomsManage from '../views/admin/ExamRoomsManage.vue'
import StudentsManage from '../views/admin/StudentsManage.vue'
import MajorsManage from '../views/admin/MajorsManage.vue'
import OrganizationsManage from '../views/admin/OrganizationsManage.vue'
import CertificatesManage from '../views/admin/CertificatesManage.vue'
import OrgUsersManage from '../views/admin/OrgUsersManage.vue'
import ExamPlansManage from '../views/admin/ExamPlansManage.vue'
import DataSheetsManage from '../views/admin/DataSheetsManage.vue'

import OrgLogin from '../views/org/OrgLogin.vue'
import OrgLayout from '../views/org/OrgLayout.vue'

import WorkflowLogin from '../views/workflow/WorkflowLogin.vue'
import WorkflowLayout from '../views/workflow/WorkflowLayout.vue'
import WorkflowDashboard from '../views/workflow/WorkflowDashboard.vue'

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
    path: '/survey',
    name: 'SurveyChat',
    component: SurveyChat
  },
  {
    path: '/survey/form',
    name: 'SurveyForm',
    component: SurveyForm
  },
  {
    path: '/major-check',
    name: 'MajorCheck',
    component: MajorCheck
  },
  {
    path: '/student-register',
    name: 'StudentRegister',
    component: StudentRegister
  },
  {
    path: '/major-judge',
    name: 'MajorJudge',
    component: MajorJudge
  },
  {
    path: '/admin/login',
    name: 'AdminLogin',
    component: AdminLogin
  },
  {
    path: '/org/login',
    name: 'OrgLogin',
    component: OrgLogin
  },
  {
    path: '/org/dashboard',
    name: 'OrgDashboard',
    component: OrgLayout,
    meta: { requiresOrg: true }
  },
  {
    path: '/workflow/login',
    name: 'WorkflowLogin',
    component: WorkflowLogin
  },
  {
    path: '/workflow',
    component: WorkflowLayout,
    meta: { requiresWorkflow: true },
    children: [
      {
        path: '',
        name: 'WorkflowDashboard',
        component: WorkflowDashboard
      },
      {
        path: 'org-users',
        name: 'WorkflowOrgUsers',
        component: OrgUsersManage
      },
      {
        path: 'exam-plans',
        name: 'WorkflowExamPlans',
        component: ExamPlansManage
      },
      {
        path: 'data-sheets',
        name: 'WorkflowDataSheets',
        component: DataSheetsManage
      },
      {
        path: 'organizations',
        name: 'WorkflowOrganizations',
        component: OrganizationsManage
      },
      {
        path: 'students',
        name: 'WorkflowStudents',
        component: StudentsManage
      },
      {
        path: 'majors',
        name: 'WorkflowMajors',
        component: MajorsManage
      },
      {
        path: 'certificates',
        name: 'WorkflowCertificates',
        component: CertificatesManage
      }
    ]
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
      },
      {
        path: 'exam-rooms',
        name: 'ExamRoomsManage',
        component: ExamRoomsManage
      },
      {
        path: 'students',
        name: 'StudentsManage',
        component: StudentsManage
      },
      {
        path: 'majors',
        name: 'MajorsManage',
        component: MajorsManage
      },
      {
        path: 'organizations',
        name: 'OrganizationsManage',
        component: OrganizationsManage
      },
      {
        path: 'certificates',
        name: 'CertificatesManage',
        component: CertificatesManage
      },
      {
        path: 'org-users',
        name: 'OrgUsersManage',
        component: OrgUsersManage
      },
      {
        path: 'exam-plans',
        name: 'ExamPlansManage',
        component: ExamPlansManage
      },
      {
        path: 'data-sheets',
        name: 'DataSheetsManage',
        component: DataSheetsManage
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || 'null')

  // 管理员登录页始终放行，不跳转
  if (to.path === '/admin/login') {
    return next()
  }

  // 机构登录页始终放行
  if (to.path === '/org/login') {
    return next()
  }

  // 数据管理中心登录页始终放行
  if (to.path === '/workflow/login') {
    return next()
  }

  // 检查 token 是否过期
  const isTokenExpired = () => {
    if (!token) return true
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.exp * 1000 < Date.now()
    } catch {
      return true
    }
  }

  // Token 过期则清除
  if (token && isTokenExpired()) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  if (to.meta.requiresAdmin) {
    if (!token || isTokenExpired() || user?.role !== 'admin') {
      return next('/admin/login')
    }
  } else if (to.meta.requiresWorkflow) {
    if (!token || isTokenExpired() || user?.role !== 'admin') {
      return next('/workflow/login')
    }
  } else if (to.meta.requiresOrg) {
    const orgToken = localStorage.getItem('org_token')
    if (!orgToken) {
      return next('/org/login')
    }
    try {
      const payload = JSON.parse(atob(orgToken.split('.')[1]))
      if (payload.exp * 1000 < Date.now()) {
        localStorage.removeItem('org_token')
        localStorage.removeItem('org_user')
        return next('/org/login')
      }
    } catch {
      localStorage.removeItem('org_token')
      localStorage.removeItem('org_user')
      return next('/org/login')
    }
  } else if (to.meta.requiresAuth) {
    if (!token || isTokenExpired()) {
      return next('/login')
    }
  }

  next()
})

export default router
