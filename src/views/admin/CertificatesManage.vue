<template>
  <div class="admin-page">
    <div class="page-toolbar">
      <div class="toolbar-info">
        <h2>证书管理</h2>
        <p class="hint">管理学员工证书信息</p>
      </div>
      <button class="btn-primary" @click="openAddModal">+ 添加证书</button>
    </div>

    <div class="data-table" v-if="!loading">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>学员姓名</th>
            <th>证书类型</th>
            <th>证书等级</th>
            <th>证书编号</th>
            <th>发证日期</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in certificates" :key="c.id">
            <td>{{ c.id }}</td>
            <td>{{ c.student_name || '-' }}</td>
            <td>{{ c.cert_type || '-' }}</td>
            <td>{{ c.cert_level || '-' }}</td>
            <td>{{ c.cert_number || '-' }}</td>
            <td>{{ c.issue_date || '-' }}</td>
            <td><span :class="['status-badge', c.status === 'issued' ? 'active' : 'pending']">{{ c.status === 'issued' ? '已发放' : '待发放' }}</span></td>
            <td class="actions">
              <button class="btn-view" @click="openEditModal(c)">编辑</button>
              <button class="btn-delete" @click="deleteCert(c)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="empty-state" v-if="certificates.length === 0">暂无证书记录，点击"添加证书"开始</div>
    </div>
    <div class="loading-state" v-else>加载中...</div>

    <!-- 添加/编辑弹窗 -->
    <Teleport to="body">
      <div class="exam-modal" v-if="showModal" @click.self="showModal = false">
        <div class="exam-modal-content">
          <div class="exam-modal-header">
            <h3>{{ isEdit ? '编辑证书' : '添加证书' }}</h3>
            <button class="exam-modal-close" @click="showModal = false">&times;</button>
          </div>
          <div class="exam-modal-body">
            <div class="form-group" v-if="!isEdit">
              <label>选择学员 <span class="required">*</span></label>
              <select v-model="form.student_id">
                <option value="">请选择学员</option>
                <option v-for="s in students" :key="s.id" :value="s.id">{{ s.name }}（{{ s.phone }}）</option>
              </select>
            </div>
            <div class="form-group" v-else>
              <label>学员</label>
              <input :value="editStudentName" disabled />
            </div>
            <div class="form-group">
              <label>证书类型</label>
              <input v-model="form.cert_type" placeholder="如：职业技能等级证书" />
            </div>
            <div class="form-group">
              <label>证书等级</label>
              <select v-model="form.cert_level">
                <option value="">请选择</option>
                <option value="初级">初级</option>
                <option value="中级">中级</option>
                <option value="高级">高级</option>
              </select>
            </div>
            <div class="form-group">
              <label>证书编号</label>
              <input v-model="form.cert_number" placeholder="证书编号" />
            </div>
            <div class="form-group">
              <label>发证日期</label>
              <input v-model="form.issue_date" type="date" />
            </div>
            <div class="form-group">
              <label>状态</label>
              <select v-model="form.status">
                <option value="pending">待发放</option>
                <option value="issued">已发放</option>
              </select>
            </div>
          </div>
          <div class="exam-modal-footer">
            <button class="btn-cancel" @click="showModal = false">取消</button>
            <button class="btn-primary" @click="submitForm">{{ isEdit ? '保存' : '添加' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const API_BASE = '/api/workflow'
const token = () => localStorage.getItem('token')
const headers = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` })

const certificates = ref([])
const students = ref([])
const loading = ref(false)
const showModal = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const editStudentName = ref('')
const form = ref({ student_id: '', cert_type: '', cert_level: '', cert_number: '', issue_date: '', status: 'pending' })

const loadCertificates = async () => {
  loading.value = true
  try {
    const res = await fetch(`${API_BASE}/admin/certificates`, { headers: headers() })
    const data = await res.json()
    certificates.value = data.data || []
  } catch (e) {
    console.error(e)
  }
  loading.value = false
}

const loadStudents = async () => {
  try {
    const res = await fetch(`${API_BASE}/admin/students`, { headers: headers() })
    const data = await res.json()
    students.value = data.data || []
  } catch (e) {
    console.error(e)
  }
}

const openAddModal = () => {
  isEdit.value = false
  editId.value = null
  editStudentName.value = ''
  form.value = { student_id: '', cert_type: '', cert_level: '', cert_number: '', issue_date: '', status: 'pending' }
  showModal.value = true
}

const openEditModal = (c) => {
  isEdit.value = true
  editId.value = c.id
  editStudentName.value = c.student_name || ''
  form.value = { student_id: c.student_id, cert_type: c.cert_type || '', cert_level: c.cert_level || '', cert_number: c.cert_number || '', issue_date: c.issue_date || '', status: c.status }
  showModal.value = true
}

const submitForm = async () => {
  if (!isEdit.value && !form.value.student_id) { alert('请选择学员'); return }
  try {
    const url = isEdit.value ? `${API_BASE}/admin/certificates/${editId.value}` : `${API_BASE}/admin/certificates`
    const method = isEdit.value ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers: headers(), body: JSON.stringify(form.value) })
    if (res.ok) {
      showModal.value = false
      await loadCertificates()
    } else {
      alert('操作失败')
    }
  } catch (e) {
    alert('操作失败')
  }
}

const deleteCert = async (c) => {
  if (!confirm(`确定删除该证书记录？`)) return
  try {
    const res = await fetch(`${API_BASE}/admin/certificates/${c.id}`, { method: 'DELETE', headers: headers() })
    if (res.ok) await loadCertificates()
  } catch (e) {
    alert('删除失败')
  }
}

onMounted(() => { loadCertificates(); loadStudents() })
</script>

<style scoped>
.hint { color: var(--text-secondary); font-size: 14px; margin-top: 4px; }
.toolbar-info h2 { margin: 0; font-size: 18px; }
.status-badge { padding: 2px 10px; border-radius: 10px; font-size: 12px; }
.status-badge.active { background: #d1fae5; color: #065f46; }
.status-badge.pending { background: #fef3c7; color: #92400e; }
.required { color: #ef4444; }
.btn-view { padding: 4px 10px; border: 1px solid var(--primary-color); background: transparent; color: var(--primary-color); border-radius: 4px; cursor: pointer; font-size: 12px; }
.btn-view:hover { background: var(--primary-color); color: white; }
</style>

<style>
.exam-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.exam-modal-content { background: var(--bg-primary); border-radius: var(--radius-lg); width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
.exam-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid var(--border-color); }
.exam-modal-header h3 { font-size: 18px; font-weight: 600; margin: 0; }
.exam-modal-close { background: none; border: none; font-size: 24px; color: var(--text-secondary); cursor: pointer; }
.exam-modal-body { padding: 24px; }
.exam-modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 24px; border-top: 1px solid var(--border-color); }
.exam-modal .form-group { margin-bottom: 16px; }
.exam-modal .form-group label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 6px; }
.exam-modal .form-group input, .exam-modal .form-group select { width: 100%; padding: 10px 14px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 14px; }
.exam-modal .btn-cancel { padding: 8px 20px; border: 1px solid var(--border-color); background: var(--bg-primary); border-radius: var(--radius-md); cursor: pointer; }
</style>
