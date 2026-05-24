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

    <!-- 图表区域 -->
    <div class="charts-row">
      <!-- 最近7天新增学员 -->
      <div class="chart-card">
        <h3>最近7天新增学员</h3>
        <div class="bar-chart" v-if="dailyData.length > 0">
          <div class="bar-item" v-for="d in dailyData" :key="d.date">
            <div class="bar-wrapper">
              <div class="bar" :style="{ height: getBarHeight(d.count) + '%' }">
                <span class="bar-val" v-if="d.count > 0">{{ d.count }}</span>
              </div>
            </div>
            <span class="bar-label">{{ d.label }}</span>
          </div>
        </div>
        <div class="empty-chart" v-else>暂无数据</div>
      </div>

      <!-- 各机构学员排行 -->
      <div class="chart-card">
        <h3>机构学员排行</h3>
        <div class="rank-list" v-if="orgData.length > 0">
          <div class="rank-item" v-for="(o, i) in orgData" :key="o.org_name">
            <span class="rank-num" :class="{ top3: i < 3 }">{{ i + 1 }}</span>
            <span class="rank-name">{{ o.org_name }}</span>
            <div class="rank-bar-wrapper">
              <div class="rank-bar" :style="{ width: getRankWidth(o.count) + '%' }"></div>
            </div>
            <span class="rank-count">{{ o.count }}</span>
          </div>
        </div>
        <div class="empty-chart" v-else>暂无数据</div>
      </div>

      <!-- 审核状态分布 -->
      <div class="chart-card">
        <h3>审核状态分布</h3>
        <div class="audit-stats" v-if="auditTotal > 0">
          <div class="audit-item" v-for="a in auditDisplay" :key="a.label">
            <div class="audit-color" :style="{ background: a.color }"></div>
            <span class="audit-label">{{ a.label }}</span>
            <span class="audit-count">{{ a.count }}</span>
            <span class="audit-pct">{{ a.pct }}%</span>
          </div>
        </div>
        <div class="empty-chart" v-else>暂无数据</div>
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
import { ref, computed, onMounted } from 'vue'
import { workflowAPI, api } from '../../api'

const stats = ref({
  orgCount: 0, orgUserCount: 0, examPlanCount: 0,
  sheetCount: 0, studentCount: 0, certCount: 0
})
const recentPlans = ref([])
const dailyData = ref([])
const orgData = ref([])
const auditRaw = ref([])

const auditTotal = computed(() => auditRaw.value.reduce((s, a) => s + a.count, 0))

const auditDisplay = computed(() => {
  const total = auditTotal.value
  if (total === 0) return []
  const colorMap = { '通过': '#10b981', '不通过': '#ef4444', '待审核': '#f59e0b' }
  return auditRaw.value.map(a => ({
    label: a.audit_result || '未填写',
    count: a.count,
    pct: Math.round(a.count / total * 100),
    color: colorMap[a.audit_result] || '#94a3b8'
  }))
})

const getBarHeight = (count) => {
  const max = Math.max(...dailyData.value.map(d => d.count), 1)
  return Math.max(count / max * 80, count > 0 ? 8 : 2)
}

const getRankWidth = (count) => {
  const max = Math.max(...orgData.value.map(o => o.count), 1)
  return Math.max(count / max * 100, 5)
}

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

const loadCharts = async () => {
  try {
    const res = await workflowAPI.getDashboardStats()
    const d = res.data || {}

    // 处理7天数据，补全没有数据的天
    const raw = d.dailyStats || []
    const days = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().slice(0, 10)
      const label = `${date.getMonth() + 1}/${date.getDate()}`
      const found = raw.find(r => r.date === dateStr)
      days.push({ date: dateStr, label, count: found?.count || 0 })
    }
    dailyData.value = days

    orgData.value = d.orgStats || []
    auditRaw.value = d.auditStats || []
  } catch (e) {
    console.error('加载图表失败', e)
  }
}

onMounted(() => {
  loadStats()
  loadCharts()
})
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

/* 图表区域 */
.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
}

.chart-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #eee;
}

.chart-card h3 {
  margin: 0 0 16px;
  font-size: 15px;
  color: #1a1a2e;
}

/* 柱状图 */
.bar-chart {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 160px;
}

.bar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}

.bar-wrapper {
  flex: 1;
  display: flex;
  align-items: flex-end;
  width: 100%;
}

.bar {
  width: 100%;
  background: linear-gradient(180deg, #667eea, #764ba2);
  border-radius: 4px 4px 0 0;
  min-height: 2px;
  position: relative;
  transition: height 0.3s;
}

.bar-val {
  position: absolute;
  top: -18px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  font-weight: 600;
  color: #667eea;
}

.bar-label {
  font-size: 11px;
  color: #999;
  margin-top: 6px;
}

/* 排行 */
.rank-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rank-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.rank-num {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  background: #f1f5f9;
  color: #94a3b8;
  flex-shrink: 0;
}

.rank-num.top3 { background: #667eea; color: white; }

.rank-name {
  width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 0;
  font-size: 13px;
  color: #333;
}

.rank-bar-wrapper {
  flex: 1;
  height: 16px;
  background: #f1f5f9;
  border-radius: 8px;
  overflow: hidden;
}

.rank-bar {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 8px;
  transition: width 0.3s;
}

.rank-count {
  font-weight: 600;
  color: #333;
  min-width: 30px;
  text-align: right;
}

/* 审核状态 */
.audit-stats {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.audit-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.audit-color {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  flex-shrink: 0;
}

.audit-label { color: #333; flex: 1; }
.audit-count { font-weight: 600; color: #333; }
.audit-pct { color: #999; font-size: 12px; min-width: 36px; text-align: right; }

.empty-chart {
  text-align: center;
  padding: 40px 20px;
  color: #999;
  font-size: 14px;
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

@media (max-width: 900px) {
  .charts-row { grid-template-columns: 1fr; }
}
</style>
