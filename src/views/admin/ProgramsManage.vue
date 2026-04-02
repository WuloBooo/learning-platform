<template>
  <div class="admin-page">
    <div class="page-toolbar">
      <button class="btn-primary" @click="showAddModal = true">
        + 添加培训项目
      </button>
    </div>

    <div class="program-list" v-if="!loading">
      <div class="program-item" v-for="program in programs" :key="program.id">
        <div class="program-icon" :style="{ background: program.gradient }">
          {{ program.icon }}
        </div>
        <div class="program-info">
          <h4>{{ program.name }}</h4>
          <p class="description">{{ program.description || '-' }}</p>
          <div class="meta">
            <span>分类: {{ getCategoryLabel(program.category) }}</span>
            <span>时长: {{ program.duration || '-' }}</span>
            <span>报名人数: {{ program.students || 0 }}</span>
          </div>
        </div>
        <div class="program-meta">
          <span :class="['status-tag', program.status]">{{ program.status_label }}</span>
          <div class="actions">
            <button class="btn-edit" @click="editProgram(program)">编辑</button>
            <button class="btn-delete" @click="deleteProgram(program)">删除</button>
          </div>
        </div>
      </div>

      <div class="empty-state" v-if="programs.length === 0">
        暂无培训项目数据
      </div>
    </div>

    <div class="loading-state" v-if="loading">
      加载中...
    </div>

    <div class="modal" v-if="showAddModal || editingProgram">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editingProgram ? '编辑培训项目' : '添加培训项目' }}</h3>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        <form @submit.prevent="saveProgram">
          <div class="form-group">
            <label>项目名称 *</label>
            <input type="text" v-model="programForm.name" required />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>分类</label>
              <select v-model="programForm.category">
                <option value="">无分类</option>
                <option value="ai">人工智能</option>
                <option value="data">数据分析</option>
                <option value="software">软件开发</option>
                <option value="other">其他</option>
              </select>
            </div>
            <div class="form-group">
              <label>时长</label>
              <input type="text" v-model="programForm.duration" placeholder="如: 3个月" />
            </div>
          </div>
          <div class="form-group">
            <label>描述</label>
            <textarea v-model="programForm.description" rows="3"></textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>图标</label>
              <input type="text" v-model="programForm.icon" placeholder="如: 🤖" />
            </div>
            <div class="form-group">
              <label>渐变色</label>
              <input type="text" v-model="programForm.gradient" placeholder="linear-gradient(...)" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>状态</label>
              <select v-model="programForm.status">
                <option value="open">报名中</option>
                <option value="ongoing">进行中</option>
                <option value="ended">已结束</option>
              </select>
            </div>
            <div class="form-group">
              <label>状态标签</label>
              <input type="text" v-model="programForm.status_label" placeholder="如: 热门报名中" />
            </div>
          </div>
          <div class="form-group">
            <label>报名人数</label>
            <input type="number" v-model.number="programForm.students" min="0" />
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
const editingProgram = ref(null)

const programs = ref([])

const programForm = reactive({
  name: '',
  category: '',
  description: '',
  icon: '📚',
  gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  duration: '',
  students: 0,
  status: 'open',
  status_label: '报名中'
})

const getCategoryLabel = (category) => {
  const labels = {
    ai: '人工智能',
    data: '数据分析',
    software: '软件开发',
    other: '其他'
  }
  return labels[category] || '未分类'
}

const loadPrograms = async () => {
  loading.value = true
  try {
    const response = await adminAPI.getPrograms({ pageSize: 50 })
    programs.value = response.programs || []
  } catch (error) {
    console.error('加载培训项目数据失败:', error)
    alert(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const editProgram = (program) => {
  editingProgram.value = program
  Object.assign(programForm, {
    name: program.name,
    category: program.category || '',
    description: program.description || '',
    icon: program.icon || '📚',
    gradient: program.gradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    duration: program.duration || '',
    students: program.students || 0,
    status: program.status || 'open',
    status_label: program.status_label || '报名中'
  })
}

const deleteProgram = async (program) => {
  if (!confirm(`确定要删除培训项目 "${program.name}" 吗？`)) return

  try {
    await adminAPI.deleteProgram(program.id)
    loadPrograms()
  } catch (error) {
    alert(error.message || '删除失败')
  }
}

const closeModal = () => {
  showAddModal.value = false
  editingProgram.value = null
  Object.assign(programForm, {
    name: '',
    category: '',
    description: '',
    icon: '📚',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    duration: '',
    students: 0,
    status: 'open',
    status_label: '报名中'
  })
}

const saveProgram = async () => {
  saving.value = true
  try {
    if (editingProgram.value) {
      await adminAPI.updateProgram(editingProgram.value.id, programForm)
    } else {
      await adminAPI.createProgram(programForm)
    }
    closeModal()
    loadPrograms()
  } catch (error) {
    alert(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadPrograms()
})
</script>

<style scoped>
.program-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.program-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.program-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  flex-shrink: 0;
}

.program-info {
  flex: 1;
}

.program-info h4 {
  margin: 0 0 6px;
  font-size: 16px;
}

.program-info .description {
  color: #666;
  font-size: 14px;
  margin: 0 0 8px;
}

.program-info .meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #888;
}

.program-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.status-tag {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
}

.status-tag.open {
  background: #e8f5e9;
  color: #388e3c;
}

.status-tag.ongoing {
  background: #fff3e0;
  color: #f57c00;
}

.status-tag.ended {
  background: #f5f5f5;
  color: #999;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-row .form-group {
  flex: 1;
}
</style>
