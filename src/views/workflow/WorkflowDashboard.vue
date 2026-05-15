<template>
  <div class="dashboard">
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon" style="background: #ede9fe; color: #7c3aed;">🏢</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.orgCount }}</div>
          <div class="stat-label">合作机构</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: #dbeafe; color: #2563eb;">🔑</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.orgUserCount }}</div>
          <div class="stat-label">机构账号</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: #d1fae5; color: #059669;">📋</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.examPlanCount }}</div>
          <div class="stat-label">考试计划</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: #fef3c7; color: #d97706;">📊</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.sheetCount }}</div>
          <div class="stat-label">数据表</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: #fce7f3; color: #db2777;">👥</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.studentCount }}</div>
          <div class="stat-label">学员总数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: #e0e7ff; color: #4f46e5;">📜</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.certCount }}</div>
          <div class="stat-label">证书记录</div>
        </div>
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="quick-actions">
      <h3>快捷操作</h3>
      <div class="actions-grid">
        <router-link to="/workflow/org-users" class="action-card">
          <span>🔑</span>
          <span>管理机构账号</span>
        </router-link>
        <router-link to="/workflow/exam-plans" class="action-card">
          <span>📋</span>
          <span>创建考试计划</span>
        </router-link>
        <router-link to="/workflow/data-sheets" class="action-card">
          <span>📊</span>
          <span>创建数据表</span>
        </router-link>
        <router-link to="/workflow/students" class="action-card">
          <span>👥</span>
          <span>查看学员</span>
        </router-link>
      </div>
    </div>

    <!-- 最近考试计划 -->
    <div class="dashboard-section">
      <h3>近期考试计划</h3>
      <div class="plan-list">
        <div class="plan-item" v-for="plan in recentPlans" :key="plan.id">
          <div class="plan-info">
            <span class="plan-title">{{ plan.title }}</span>
            <span class="plan-meta">{{ plan.exam_type || '-' }} · {{ plan.exam_level || '-' }}</span>
          </div>
          <div class="plan-dates">
            <span :class="['plan-status', plan.status === '报名中' ? 'active' : plan.status === '已完成' ? 'done' : 'closed']">{{ plan.status }}</span>
            <span class="plan-date">{{ plan.exam_date || '-' }}</span>
          </div>
        </div>
        <div class="empty" v-if="recentPlans.length === 0">暂无考试计划</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { workflowAPI, api } from '../../api'

const stats = ref({
  orgCount: 0,
  orgUserCount: 0,
  examPlanCount: 0,
  sheetCount: 0,
  studentCount: 0,
  certCount: 0
})

const recentPlans = ref([])

const loadStats = async () => {
  try {
    const [orgs, orgUsers, plans, sheets, students, certs] = await Promise.all([
      api.get('/workflow/admin/organizations'),
      workflowAPI.getOrgUsers(),
      workflowAPI.getExamPlans(),
      workflowAPI.getSheets(),
      api.get('/workflow/admin/students'),
      api.get('/workflow/admin/certificates')
    ])
    stats.value = {
      orgCount: orgs.data?.length || 0,
      orgUserCount: orgUsers.data?.length || 0,
      examPlanCount: plans.data?.length || 0,
      sheetCount: sheets.data?.length || 0,
      studentCount: students.data?.length || 0,
      certCount: certs.data?.length || 0
    }
    recentPlans.value = (plans.data || []).slice(0, 5)
  } catch (e) {
    console.error('加载统计失败', e)
  }
}

onMounted(loadStats)
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid #eee;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a2e;
}

.stat-label {
  font-size: 13px;
  color: #999;
  margin-top: 2px;
}

.quick-actions {
  margin-bottom: 24px;
}

.quick-actions h3 {
  margin: 0 0 12px;
  font-size: 16px;
  color: #1a1a2e;
}

.actions-grid {
  display: flex;
  gap: 12px;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: white;
  border-radius: 10px;
  text-decoration: none;
  color: #333;
  font-size: 14px;
  border: 1px solid #eee;
  transition: all 0.2s;
}

.action-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  transform: translateY(-1px);
}

.action-card span:first-child {
  font-size: 24px;
}

.dashboard-section h3 {
  margin: 0 0 12px;
  font-size: 16px;
  color: #1a1a2e;
}

.plan-list {
  background: white;
  border-radius: 12px;
  border: 1px solid #eee;
  overflow: hidden;
}

.plan-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid #f5f5f5;
}

.plan-item:last-child { border-bottom: none; }

.plan-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.plan-meta {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
  display: block;
}

.plan-dates {
  display: flex;
  align-items: center;
  gap: 12px;
}

.plan-status {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 10px;
}
.plan-status.active { background: #dbeafe; color: #1e40af; }
.plan-status.done { background: #d1fae5; color: #065f46; }
.plan-status.closed { background: #f3f4f6; color: #9ca3af; }

.plan-date {
  font-size: 13px;
  color: #666;
}

.empty {
  text-align: center;
  padding: 32px;
  color: #999;
  font-size: 14px;
}
</style>
