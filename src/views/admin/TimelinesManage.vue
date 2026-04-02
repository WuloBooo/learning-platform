<template>
  <div class="admin-page">
    <div class="page-toolbar">
      <button class="btn-primary" @click="showAddModal = true">
        + 添加时间线
      </button>
    </div>

    <div class="timeline-list" v-if="!loading">
      <div class="timeline-item" v-for="timeline in timelines" :key="timeline.id">
        <div class="timeline-header">
          <div class="timeline-info">
            <span class="timeline-icon">{{ timeline.icon }}</span>
            <div class="timeline-title">
              <h4>{{ timeline.name }}</h4>
              <span class="period">{{ timeline.period || '-' }}</span>
            </div>
          </div>
          <div class="timeline-meta">
            <span :class="['status-tag', timeline.status]">{{ timeline.status_label }}</span>
            <div class="actions">
              <button class="btn-edit" @click="editTimeline(timeline)">编辑</button>
              <button class="btn-delete" @click="deleteTimeline(timeline)">删除</button>
            </div>
          </div>
        </div>

        <div class="milestones-section" v-if="timeline.parsedMilestones && timeline.parsedMilestones.length > 0">
          <h5>里程碑节点：</h5>
          <div class="milestone-list">
            <div class="milestone" v-for="(m, idx) in timeline.parsedMilestones" :key="idx">
              <span class="milestone-icon">{{ m.icon }}</span>
              <span class="milestone-title">{{ m.title }}</span>
              <span class="milestone-date">{{ m.date }}</span>
              <span class="milestone-countdown" v-if="m.countdown">{{ m.countdown }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="empty-state" v-if="timelines.length === 0">
        暂无时间线数据
      </div>
    </div>

    <div class="loading-state" v-if="loading">
      加载中...
    </div>

    <div class="modal" v-if="showAddModal || editingTimeline">
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h3>{{ editingTimeline ? '编辑时间线' : '添加时间线' }}</h3>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        <form @submit.prevent="saveTimeline">
          <div class="form-row">
            <div class="form-group">
              <label>考试名称 *</label>
              <input type="text" v-model="timelineForm.name" required />
            </div>
            <div class="form-group">
              <label>图标</label>
              <input type="text" v-model="timelineForm.icon" placeholder="如: 📝" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>时间段</label>
              <input type="text" v-model="timelineForm.period" placeholder="如: 2024年3月-5月" />
            </div>
            <div class="form-group">
              <label>状态标签</label>
              <input type="text" v-model="timelineForm.status_label" placeholder="如: 报名中" />
            </div>
          </div>
          <div class="form-group">
            <label>状态</label>
            <select v-model="timelineForm.status">
              <option value="upcoming">即将开始</option>
              <option value="ongoing">进行中</option>
              <option value="ended">已结束</option>
            </select>
          </div>

          <div class="milestones-editor">
            <div class="milestones-header">
              <label>里程碑节点</label>
              <button type="button" class="btn-add-milestone" @click="addMilestone">+ 添加节点</button>
            </div>
            <div class="milestone-item" v-for="(m, idx) in timelineForm.milestones" :key="idx">
              <input type="text" v-model="m.icon" placeholder="图标" class="milestone-icon-input" />
              <input type="text" v-model="m.title" placeholder="节点名称" class="milestone-title-input" />
              <input type="text" v-model="m.date" placeholder="日期" class="milestone-date-input" />
              <input type="text" v-model="m.countdown" placeholder="倒计时(可选)" class="milestone-countdown-input" />
              <select v-model="m.status" class="milestone-status-input">
                <option value="pending">待开始</option>
                <option value="ongoing">进行中</option>
                <option value="completed">已完成</option>
              </select>
              <button type="button" class="btn-remove-milestone" @click="removeMilestone(idx)">×</button>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="closeModal">取消</button>
            <button type="submit" class="btn-primary" :disabled="saving">
              {{ saving ? '保存中...' : '保存' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { adminAPI } from '../../api'

const loading = ref(false)
const saving = ref(false)
const showAddModal = ref(false)
const editingTimeline = ref(null)

const timelines = ref([])

const timelineForm = reactive({
  name: '',
  icon: '📝',
  period: '',
  status: 'upcoming',
  status_label: '即将开始',
  milestones: []
})

const loadTimelines = async () => {
  loading.value = true
  try {
    const response = await adminAPI.getTimelines()
    timelines.value = (response.timelines || []).map(t => ({
      ...t,
      parsedMilestones: t.milestones ? JSON.parse(t.milestones) : []
    }))
  } catch (error) {
    console.error('加载时间线数据失败:', error)
    alert(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const addMilestone = () => {
  timelineForm.milestones.push({
    id: Date.now(),
    icon: '📌',
    title: '',
    date: '',
    countdown: '',
    status: 'pending',
    statusLabel: '待开始'
  })
}

const removeMilestone = (idx) => {
  timelineForm.milestones.splice(idx, 1)
}

const editTimeline = (timeline) => {
  editingTimeline.value = timeline
  const milestones = timeline.parsedMilestones || []
  Object.assign(timelineForm, {
    name: timeline.name,
    icon: timeline.icon || '📝',
    period: timeline.period || '',
    status: timeline.status || 'upcoming',
    status_label: timeline.status_label || '即将开始',
    milestones: milestones.map(m => ({ ...m }))
  })
}

const deleteTimeline = async (timeline) => {
  if (!confirm(`确定要删除时间线 "${timeline.name}" 吗？`)) return

  try {
    await adminAPI.deleteTimeline(timeline.id)
    loadTimelines()
  } catch (error) {
    alert(error.message || '删除失败')
  }
}

const closeModal = () => {
  showAddModal.value = false
  editingTimeline.value = null
  Object.assign(timelineForm, {
    name: '',
    icon: '📝',
    period: '',
    status: 'upcoming',
    status_label: '即将开始',
    milestones: []
  })
}

const saveTimeline = async () => {
  saving.value = true
  try {
    const data = {
      ...timelineForm,
      milestones: timelineForm.milestones.map(m => ({
        ...m,
        statusLabel: m.status === 'pending' ? '待开始' : m.status === 'ongoing' ? '进行中' : '已完成'
      }))
    }

    if (editingTimeline.value) {
      await adminAPI.updateTimeline(editingTimeline.value.id, data)
    } else {
      await adminAPI.createTimeline(data)
    }
    closeModal()
    loadTimelines()
  } catch (error) {
    alert(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadTimelines()
})
</script>

<style scoped>
.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.timeline-item {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.timeline-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.timeline-icon {
  font-size: 32px;
}

.timeline-title h4 {
  margin: 0;
  font-size: 16px;
}

.timeline-title .period {
  color: #666;
  font-size: 14px;
}

.timeline-meta {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-tag {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
}

.status-tag.upcoming {
  background: #e3f2fd;
  color: #1976d2;
}

.status-tag.ongoing {
  background: #fff3e0;
  color: #f57c00;
}

.status-tag.ended {
  background: #f5f5f5;
  color: #999;
}

.milestones-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.milestones-section h5 {
  margin: 0 0 12px;
  color: #666;
  font-size: 14px;
}

.milestone-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.milestone {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 6px;
  font-size: 13px;
}

.milestone-icon {
  font-size: 16px;
}

.milestone-date {
  color: #666;
}

.milestone-countdown {
  color: #f57c00;
  font-weight: 500;
}

.modal-large {
  max-width: 700px;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-row .form-group {
  flex: 1;
}

.milestones-editor {
  margin-top: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.milestones-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.btn-add-milestone {
  padding: 6px 12px;
  background: #4F46E5;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.milestone-item {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.milestone-icon-input {
  width: 50px;
}

.milestone-title-input {
  flex: 1;
}

.milestone-date-input {
  width: 100px;
}

.milestone-countdown-input {
  width: 100px;
}

.milestone-status-input {
  width: 90px;
}

.btn-remove-milestone {
  width: 28px;
  height: 28px;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 4px;
  color: #c00;
  cursor: pointer;
}
</style>
