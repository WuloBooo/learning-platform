<template>
  <div class="manage-page">
    <div class="page-header">
      <button class="add-btn" @click="openCreate">+ 创建考试计划</button>
    </div>

    <!-- 日历视图 -->
    <div class="calendar-section">
      <div class="calendar-header">
        <button @click="prevMonth">◀</button>
        <h3>{{ currentYear }}年{{ currentMonth }}月</h3>
        <button @click="nextMonth">▶</button>
      </div>
      <div class="calendar-grid">
        <div class="calendar-week" v-for="d in weekDays" :key="d">{{ d }}</div>
        <div
          v-for="(day, idx) in calendarDays"
          :key="idx"
          :class="['calendar-day', { 'other-month': !day.current, 'today': day.isToday }]"
        >
          <span class="day-number">{{ day.day }}</span>
          <div class="day-events">
            <div
              v-for="evt in getEventsForDate(day.dateStr)"
              :key="evt.id + evt.type"
              :class="['event-dot', evt.type]"
              @click="showEventDetail(evt)"
            >
              {{ evt.label }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 列表视图 -->
    <div class="list-section">
      <h3>全部考试计划</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>计划名称</th>
              <th>考试类型</th>
              <th>等级</th>
              <th>报名时间</th>
              <th>考试日期</th>
              <th>地点</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="plan in plans" :key="plan.id">
              <td>{{ plan.title }}</td>
              <td>{{ plan.exam_type || '-' }}</td>
              <td>{{ plan.exam_level || '-' }}</td>
              <td>{{ formatDate(plan.reg_start) }} ~ {{ formatDate(plan.reg_end) }}</td>
              <td>{{ formatDate(plan.exam_date) }}</td>
              <td>{{ plan.location || '-' }}</td>
              <td>
                <span :class="['status-badge', getStatusClass(plan.status)]">{{ plan.status }}</span>
              </td>
              <td class="actions">
                <button class="action-btn edit" @click="openEdit(plan)">编辑</button>
                <button class="action-btn delete" @click="handleDelete(plan)">删除</button>
              </td>
            </tr>
            <tr v-if="plans.length === 0">
              <td colspan="8" class="empty-row">暂无考试计划</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 创建/编辑弹窗 -->
    <Teleport to="body">
      <div class="modal-overlay" v-if="showModal" @click.self="showModal = false">
        <div class="modal">
          <h3>{{ editing ? '编辑考试计划' : '创建考试计划' }}</h3>
          <div class="form-group">
            <label>计划名称 *</label>
            <input v-model="form.title" placeholder="如：2026年5月人工智能训练师考试" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>考试类型</label>
              <input v-model="form.exam_type" placeholder="如：人工智能训练师" />
            </div>
            <div class="form-group">
              <label>考试等级</label>
              <input v-model="form.exam_level" placeholder="如：初级/中级/高级" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>报名开始</label>
              <input v-model="form.reg_start" type="date" />
            </div>
            <div class="form-group">
              <label>报名截止</label>
              <input v-model="form.reg_end" type="date" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>考试日期</label>
              <input v-model="form.exam_date" type="date" />
            </div>
            <div class="form-group">
              <label>状态</label>
              <select v-model="form.status">
                <option value="报名中">报名中</option>
                <option value="已截止">已截止</option>
                <option value="已完成">已完成</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>考试地点</label>
            <input v-model="form.location" placeholder="考试地点" />
          </div>
          <div class="form-group">
            <label>备注说明</label>
            <textarea v-model="form.description" rows="3" placeholder="备注说明"></textarea>
          </div>
          <div class="modal-actions">
            <button class="cancel-btn" @click="showModal = false">取消</button>
            <button class="confirm-btn" @click="handleSubmit">{{ editing ? '保存' : '创建' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { workflowAPI } from '../../api'

const plans = ref([])
const showModal = ref(false)
const editing = ref(null)
const form = ref(getEmptyForm())

const weekDays = ['日', '一', '二', '三', '四', '五', '六']
const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth() + 1)

function getEmptyForm() {
  return { title: '', exam_type: '', exam_level: '', reg_start: '', reg_end: '', exam_date: '', location: '', description: '', status: '报名中' }
}

const formatDate = (d) => d ? new Date(d).toLocaleDateString('zh-CN') : '-'

const getStatusClass = (s) => {
  if (s === '报名中') return 'active'
  if (s === '已完成') return 'complete'
  return 'archived'
}

const prevMonth = () => {
  if (currentMonth.value === 1) {
    currentMonth.value = 12
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

const nextMonth = () => {
  if (currentMonth.value === 12) {
    currentMonth.value = 1
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

const calendarDays = computed(() => {
  const y = currentYear.value
  const m = currentMonth.value
  const firstDay = new Date(y, m - 1, 1).getDay()
  const daysInMonth = new Date(y, m, 0).getDate()
  const prevDays = new Date(y, m - 1, 0).getDate()
  const today = new Date()
  const days = []

  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ day: prevDays - i, current: false, dateStr: '' })
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    days.push({
      day: i,
      current: true,
      dateStr,
      isToday: today.getFullYear() === y && today.getMonth() + 1 === m && today.getDate() === i
    })
  }
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    days.push({ day: i, current: false, dateStr: '' })
  }
  return days
})

const getEventsForDate = (dateStr) => {
  if (!dateStr) return []
  const events = []
  for (const plan of plans.value) {
    if (plan.reg_start === dateStr) events.push({ id: plan.id, type: 'reg-start', label: '📢报名开始', plan })
    if (plan.reg_end === dateStr) events.push({ id: plan.id, type: 'reg-end', label: '⏰报名截止', plan })
    if (plan.exam_date === dateStr) events.push({ id: plan.id, type: 'exam', label: '📝考试', plan })
  }
  return events
}

const showEventDetail = (evt) => {
  const p = evt.plan
  alert(`${p.title}\n类型：${p.exam_type || '-'}\n等级：${p.exam_level || '-'}\n报名：${formatDate(p.reg_start)} ~ ${formatDate(p.reg_end)}\n考试：${formatDate(p.exam_date)}\n地点：${p.location || '-'}\n状态：${p.status}`)
}

const loadPlans = async () => {
  try {
    const res = await workflowAPI.getExamPlans()
    plans.value = res.data || []
  } catch (e) {
    console.error('加载失败', e)
  }
}

const openCreate = () => {
  editing.value = null
  form.value = getEmptyForm()
  showModal.value = true
}

const openEdit = (plan) => {
  editing.value = plan
  form.value = { ...plan }
  showModal.value = true
}

const handleSubmit = async () => {
  if (!form.value.title) return alert('请填写计划名称')
  try {
    if (editing.value) {
      await workflowAPI.updateExamPlan(editing.value.id, form.value)
    } else {
      await workflowAPI.createExamPlan(form.value)
    }
    showModal.value = false
    loadPlans()
  } catch (e) {
    alert(e.message || '操作失败')
  }
}

const handleDelete = async (plan) => {
  if (!confirm(`确定删除"${plan.title}"？`)) return
  try {
    await workflowAPI.deleteExamPlan(plan.id)
    loadPlans()
  } catch (e) {
    alert(e.message || '删除失败')
  }
}

onMounted(loadPlans)
</script>

<style scoped>
.manage-page { padding: 0; }
.page-header { display: flex; justify-content: flex-end; margin-bottom: 16px; }
.add-btn {
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.calendar-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  border: 1px solid #eee;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 16px;
}

.calendar-header h3 { margin: 0; font-size: 18px; }
.calendar-header button {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  cursor: pointer;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: #eee;
  border-radius: 8px;
  overflow: hidden;
}

.calendar-week {
  background: #f0f0f0;
  text-align: center;
  padding: 8px;
  font-weight: 600;
  font-size: 13px;
  color: #666;
}

.calendar-day {
  background: white;
  min-height: 80px;
  padding: 4px;
  position: relative;
}

.calendar-day.other-month { background: #fafafa; }
.calendar-day.today .day-number {
  background: #667eea;
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.day-number { font-size: 13px; color: #666; }

.day-events {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 4px;
}

.event-dot {
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 3px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.event-dot.reg-start { background: #dbeafe; color: #1e40af; }
.event-dot.reg-end { background: #fef3c7; color: #92400e; }
.event-dot.exam { background: #fee2e2; color: #991b1b; }

.list-section h3 { margin: 0 0 12px; font-size: 16px; }

.table-wrapper {
  background: white;
  border-radius: 12px;
  overflow: auto;
  border: 1px solid #eee;
}

.data-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.data-table th {
  background: #f8f9fa;
  padding: 12px;
  text-align: left;
  font-weight: 600;
  color: #555;
  border-bottom: 2px solid #e5e7eb;
  white-space: nowrap;
}
.data-table td { padding: 12px; border-bottom: 1px solid #f0f0f0; }
.data-table tr:hover td { background: #f8f9ff; }

.status-badge {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 10px;
}
.status-badge.active { background: #dbeafe; color: #1e40af; }
.status-badge.complete { background: #d1fae5; color: #065f46; }
.status-badge.archived { background: #f3f4f6; color: #9ca3af; }

.actions { display: flex; gap: 6px; }
.action-btn {
  padding: 4px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  background: white;
}
.action-btn.edit { color: #667eea; border-color: #667eea; }
.action-btn.delete { color: #e74c3c; border-color: #e74c3c; }

.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 12px;
  padding: 32px;
  width: 560px;
  max-width: 90vw;
  max-height: 85vh;
  overflow-y: auto;
}

.modal h3 { margin: 0 0 20px; font-size: 18px; }

.form-group { margin-bottom: 14px; }
.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}
.form-group input, .form-group select, .form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-row {
  display: flex;
  gap: 12px;
}
.form-row .form-group { flex: 1; }

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.cancel-btn {
  padding: 10px 20px;
  background: #f0f0f0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.confirm-btn {
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.empty-row { text-align: center; padding: 40px !important; color: #999; }
</style>
