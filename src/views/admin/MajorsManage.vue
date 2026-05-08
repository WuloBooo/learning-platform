<template>
  <div class="admin-page">
    <div class="page-toolbar">
      <div class="toolbar-info">
        <h2>专业目录管理</h2>
        <p class="hint">管理可报考专业目录，学员可通过专业查询页面搜索</p>
      </div>
      <button class="btn-primary" @click="openAddModal">+ 添加专业</button>
    </div>

    <div class="data-table" v-if="!loading">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>专业名称</th>
            <th>学科分类</th>
            <th>可报考等级</th>
            <th>状态</th>
            <th>添加时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in majors" :key="m.id">
            <td>{{ m.id }}</td>
            <td>{{ m.major_name }}</td>
            <td>{{ m.category || '-' }}</td>
            <td>{{ m.allowed_levels || '-' }}</td>
            <td><span :class="['status-badge', m.status]">{{ m.status === 'active' ? '启用' : '停用' }}</span></td>
            <td>{{ formatDate(m.created_at) }}</td>
            <td class="actions">
              <button class="btn-delete" @click="deleteMajor(m)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="empty-state" v-if="majors.length === 0">暂无专业数据，点击"添加专业"开始</div>
    </div>
    <div class="loading-state" v-else>加载中...</div>

    <!-- 添加专业弹窗 -->
    <div class="exam-modal" v-if="showModal" @click.self="showModal = false">
      <div class="exam-modal-content">
        <div class="exam-modal-header">
          <h3>添加专业</h3>
          <button class="exam-modal-close" @click="showModal = false">&times;</button>
        </div>
        <div class="exam-modal-body">
          <div class="form-group">
            <label>专业名称 <span class="required">*</span></label>
            <input v-model="form.major_name" placeholder="如：计算机应用技术" />
          </div>
          <div class="form-group">
            <label>学科分类</label>
            <input v-model="form.category" placeholder="如：计算机类" />
          </div>
          <div class="form-group">
            <label>可报考等级</label>
            <input v-model="form.allowed_levels" placeholder="如：初级,中级（逗号分隔）" />
          </div>
          <div class="batch-tip">
            <p>批量添加：每行一个专业名称，其他字段相同</p>
            <textarea v-model="batchNames" rows="5" placeholder="计算机应用技术&#10;软件技术&#10;人工智能技术应用"></textarea>
          </div>
        </div>
        <div class="exam-modal-footer">
          <button class="btn-cancel" @click="showModal = false">取消</button>
          <button class="btn-primary" @click="submitMajor">添加</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const API_BASE = '/api/workflow'
const token = () => localStorage.getItem('token')
const headers = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` })

const majors = ref([])
const loading = ref(false)
const showModal = ref(false)
const form = ref({ major_name: '', category: '', allowed_levels: '' })
const batchNames = ref('')

const loadMajors = async () => {
  loading.value = true
  try {
    const res = await fetch(`${API_BASE}/major/list`, { headers: headers() })
    const data = await res.json()
    majors.value = data.data || []
  } catch (e) {
    console.error(e)
  }
  loading.value = false
}

const openAddModal = () => {
  form.value = { major_name: '', category: '', allowed_levels: '' }
  batchNames.value = ''
  showModal.value = true
}

const submitMajor = async () => {
  const names = batchNames.value.trim()
    ? batchNames.value.trim().split('\n').map(n => n.trim()).filter(n => n)
    : [form.value.major_name.trim()]

  if (names.length === 0 || (!batchNames.value.trim() && !form.value.major_name.trim())) {
    alert('请输入专业名称')
    return
  }

  try {
    for (const name of names) {
      await fetch(`${API_BASE}/admin/major`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          major_name: name,
          category: form.value.category,
          allowed_levels: form.value.allowed_levels
        })
      })
    }
    showModal.value = false
    await loadMajors()
  } catch (e) {
    alert('添加失败')
  }
}

const deleteMajor = async (m) => {
  if (!confirm(`确定删除专业「${m.major_name}」？`)) return
  try {
    const res = await fetch(`${API_BASE}/admin/major/${m.id}`, { method: 'DELETE', headers: headers() })
    if (res.ok) await loadMajors()
  } catch (e) {
    alert('删除失败')
  }
}

const formatDate = (d) => {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN')
}

onMounted(loadMajors)
</script>

<style scoped>
.hint { color: var(--text-secondary); font-size: 14px; margin-top: 4px; }
.toolbar-info h2 { margin: 0; font-size: 18px; }
.status-badge { padding: 2px 10px; border-radius: 10px; font-size: 12px; }
.status-badge.active { background: #d1fae5; color: #065f46; }
.required { color: #ef4444; }
.batch-tip { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color); }
.batch-tip p { font-size: 13px; color: var(--text-secondary); margin-bottom: 8px; }
.batch-tip textarea { width: 100%; padding: 10px 14px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 14px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 6px; }
.form-group input { width: 100%; padding: 10px 14px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 14px; }
.exam-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.exam-modal-content { background: var(--bg-primary); border-radius: var(--radius-lg); width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
.exam-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid var(--border-color); }
.exam-modal-header h3 { font-size: 18px; font-weight: 600; margin: 0; }
.exam-modal-close { background: none; border: none; font-size: 24px; color: var(--text-secondary); cursor: pointer; }
.exam-modal-body { padding: 24px; }
.exam-modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 24px; border-top: 1px solid var(--border-color); }
.btn-cancel { padding: 8px 20px; border: 1px solid var(--border-color); background: var(--bg-primary); border-radius: var(--radius-md); cursor: pointer; }
</style>
