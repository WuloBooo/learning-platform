<template>
  <div class="admin-layout">
    <aside class="admin-sidebar">
      <div class="sidebar-header">
        <span class="logo">📚</span>
        <span class="title">管理后台</span>
      </div>
      <nav class="sidebar-nav">
        <router-link to="/admin" class="nav-item" exact-active-class="active">
          <span class="icon">📊</span>
          <span>仪表盘</span>
        </router-link>
        <router-link to="/admin/users" class="nav-item" active-class="active">
          <span class="icon">👥</span>
          <span>用户管理</span>
        </router-link>
        <router-link to="/admin/registrations" class="nav-item" active-class="active">
          <span class="icon">📝</span>
          <span>报名管理</span>
        </router-link>
        <router-link to="/admin/questions" class="nav-item" active-class="active">
          <span class="icon">❓</span>
          <span>题库管理</span>
        </router-link>
        <router-link to="/admin/papers" class="nav-item" active-class="active">
          <span class="icon">📄</span>
          <span>试卷管理</span>
        </router-link>
        <router-link to="/admin/exams" class="nav-item" active-class="active">
          <span class="icon">📅</span>
          <span>考试管理</span>
        </router-link>
        <router-link to="/admin/materials" class="nav-item" active-class="active">
          <span class="icon">📁</span>
          <span>资料管理</span>
        </router-link>
        <router-link to="/admin/banners" class="nav-item" active-class="active">
          <span class="icon">🖼️</span>
          <span>Banner管理</span>
        </router-link>
        <router-link to="/admin/news" class="nav-item" active-class="active">
          <span class="icon">📰</span>
          <span>新闻管理</span>
        </router-link>
        <router-link to="/admin/timelines" class="nav-item" active-class="active">
          <span class="icon">📅</span>
          <span>时间线管理</span>
        </router-link>
        <router-link to="/admin/programs" class="nav-item" active-class="active">
          <span class="icon">🎓</span>
          <span>培训项目管理</span>
        </router-link>
      </nav>
      <div class="sidebar-footer">
        <router-link to="/" class="back-link">← 返回前台</router-link>
        <button class="logout-btn" @click="logout">退出登录</button>
      </div>
    </aside>
    <main class="admin-main">
      <header class="admin-header">
        <h1>{{ pageTitle }}</h1>
        <div class="user-info">
          <span>{{ adminUser?.username }}</span>
          <span class="role-badge">管理员</span>
        </div>
      </header>
      <div class="admin-content">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../../stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const adminUser = computed(() => userStore.user)

const pageTitle = computed(() => {
  const titles = {
    '/admin': '仪表盘',
    '/admin/users': '用户管理',
    '/admin/exams': '考试管理',
    '/admin/materials': '资料管理',
    '/admin/registrations': '报名管理',
    '/admin/banners': 'Banner管理',
    '/admin/questions': '题库管理',
    '/admin/papers': '试卷管理',
    '/admin/news': '新闻管理',
    '/admin/timelines': '时间线管理',
    '/admin/programs': '培训项目管理'
  }
  return titles[route.path] || '管理后台'
})

const logout = () => {
  userStore.logout()
  router.push('/admin/login')
}
</script>
