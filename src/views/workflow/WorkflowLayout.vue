<template>
  <div class="workflow-layout">
    <!-- 侧边栏 -->
    <aside class="workflow-sidebar">
      <div class="sidebar-header">
        <span class="logo">📊</span>
        <div>
          <span class="title">数据管理中心</span>
          <span class="subtitle">管理员</span>
        </div>
      </div>
      <nav class="sidebar-nav">
        <router-link to="/workflow" class="nav-item" exact-active-class="active">
          <span class="icon">📊</span>
          <span>概览</span>
        </router-link>
        <router-link to="/workflow/org-users" class="nav-item" active-class="active">
          <span class="icon">🔑</span>
          <span>机构账号</span>
        </router-link>
        <router-link to="/workflow/exam-plans" class="nav-item" active-class="active">
          <span class="icon">📋</span>
          <span>考试计划</span>
        </router-link>
        <router-link to="/workflow/data-sheets" class="nav-item" active-class="active">
          <span class="icon">📊</span>
          <span>数据表管理</span>
        </router-link>
        <router-link to="/workflow/organizations" class="nav-item" active-class="active">
          <span class="icon">🏢</span>
          <span>机构管理</span>
        </router-link>
        <router-link to="/workflow/students" class="nav-item" active-class="active">
          <span class="icon">👥</span>
          <span>学员管理</span>
        </router-link>
        <router-link to="/workflow/majors" class="nav-item" active-class="active">
          <span class="icon">🎓</span>
          <span>专业目录</span>
        </router-link>
        <router-link to="/workflow/certificates" class="nav-item" active-class="active">
          <span class="icon">📜</span>
          <span>证书管理</span>
        </router-link>
      </nav>
      <div class="sidebar-footer">
        <button class="logout-btn" @click="handleLogout">退出登录</button>
      </div>
    </aside>

    <!-- 主内容 -->
    <main class="workflow-main">
      <header class="workflow-header">
        <h1>{{ pageTitle }}</h1>
        <div class="header-right">
          <span class="user-name">{{ adminUser?.username || '管理员' }}</span>
        </div>
      </header>
      <div class="workflow-content">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const adminUser = computed(() => {
  try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
})

const pageTitle = computed(() => {
  const titles = {
    '/workflow': '概览',
    '/workflow/org-users': '机构账号管理',
    '/workflow/exam-plans': '考试计划',
    '/workflow/data-sheets': '数据表管理',
    '/workflow/organizations': '机构管理',
    '/workflow/students': '学员管理',
    '/workflow/majors': '专业目录',
    '/workflow/certificates': '证书管理'
  }
  return titles[route.path] || '数据管理中心'
})

const handleLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  localStorage.removeItem('workflow_auth')
  router.push('/workflow/login')
}
</script>

<style scoped>
.workflow-layout {
  display: flex;
  min-height: 100vh;
  background: #f5f6fa;
}

.workflow-sidebar {
  width: 220px;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  color: white;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.sidebar-header .logo { font-size: 28px; }
.sidebar-header .title { display: block; font-size: 16px; font-weight: 600; }
.sidebar-header .subtitle { display: block; font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 2px; }

.sidebar-nav {
  flex: 1;
  padding: 12px 0;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  color: rgba(255,255,255,0.7);
  text-decoration: none;
  font-size: 14px;
  transition: all 0.2s;
}

.nav-item:hover {
  background: rgba(255,255,255,0.08);
  color: white;
}

.nav-item.active {
  background: rgba(255,255,255,0.12);
  color: white;
  border-right: 3px solid #667eea;
}

.nav-item .icon { font-size: 18px; }

.sidebar-footer {
  padding: 16px 20px;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.logout-btn {
  width: 100%;
  padding: 10px;
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.7);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: rgba(255,255,255,0.2);
  color: white;
}

.workflow-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.workflow-header {
  background: white;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.workflow-header h1 {
  margin: 0;
  font-size: 20px;
  color: #1a1a2e;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-name {
  font-size: 14px;
  color: #666;
}

.workflow-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}
</style>
