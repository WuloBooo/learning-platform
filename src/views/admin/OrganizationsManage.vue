<template>
  <div class="admin-page">
    <div class="page-toolbar">
      <div class="toolbar-info">
        <h2>机构管理</h2>
        <p class="hint">管理合作机构信息，查看推人统计</p>
      </div>
      <button class="btn-primary" @click="openAddModal">+ 添加机构</button>
    </div>

    <div class="data-table" v-if="!loading">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>机构名称</th>
            <th>联系人</th>
            <th>联系电话</th>
            <th>合作类型</th>
            <th>学员数</th>
            <th>状态</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="o in organizations" :key="o.id">
            <td>{{ o.id }}</td>
            <td>{{ o.name }}</td>
            <td>{{ o.contact_person || '-' }}</td>
            <td>{{ o.contact_phone || '-' }}</td>
            <td>{{ o.cooperation_type || '-' }}</td>
            <td>{{ o.student_count || 0 }}</td>
            <td><span :class="['status-badge', o.status === 'active' ? 'active' : 'inactive']">{{ o.status === 'active' ? '启用' : '停用' }}</span></td>
            <td>{{ formatDate(o.created_at) }}</td>
            <td class="actions">
              <button class="btn-view" @click="openEditModal(o)">编辑</button>
              <button class="btn-delete" @click="deleteOrg(o)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="empty-state" v-if="organizations.length === 0">暂无机构数据，点击"添加机构"开始</div>
    </div>
    <div class="loading-state" v-else>加载中...</div>

    <!-- 添加/编辑弹窗 -->
    <div class="exam-modal" v-if="showModal" @click.self="showModal = false">
      <div class="exam-modal-content">
        <div class="exam-modal-header">
          <h3>{{ isEdit ? '编辑机构' : '添加机构' }}</h3>
          <button class="exam-modal-close" @click="showModal = false">&times;</button>
        </div>
        <div class="exam-modal-body">
          <div class="form-group">
            <label>机构名称 <span class="required">*</span></label>
            <input v-model="form.name" placeholder="如：XX培训学校" />
          </div>
          <div class="form-group">
            <label>联系人</label>
            <input v-model="form.contact_person" placeholder="联系人姓名" />
          </div>
          <div class="form-group">
            <label>联系电话</label>
            <input v-model="form.contact_phone" placeholder="联系电话" />
          </div>
          <div class="form-group">
            <label>地址</label>
            <input v-model="form.address" placeholder="机构地址" />
          </div>
          <div class="form-group">
            <label>合作类型</label>
            <select v-model="form.cooperation_type">
              <option value="">请选择</option>
              <option value="渠道合作">渠道合作</option>
              <option value="直营">直营</option>
              <option value="代理">代理</option>
              <option value="其他">其他</option>
            </select>
          </div>
          <div class="form-group">
            <label>状态</label>
            <select v-model="form.status">
              <option value="active">启用</option>
              <option value="inactive">停用</option>
            </select>
          </div>
        </div>
        <div class="exam-modal-footer">
          <button class="btn-cancel" @click="showModal = false">取消</button>
          <button class="btn-primary" @click="submitForm">{{ isEdit ? '保存' : '添加' }}</button>
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

const organizations = ref([])
const loading = ref(false)
const showModal = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const form = ref({ name: '', contact_person: '', contact_phone: '', address: '', cooperation_type: '', status: 'active' })

const loadOrganizations = async () => {
  loading.value = true
  try {
    const res = await fetch(`${API_BASE}/admin/organizations`, { headers: headers() })
    const data = await res.json()
    organizations.value = data.data || []
  } catch (e) {
    console.error(e)
  }
  loading.value = false
}

const openAddModal = () => {
  isEdit.value = false
  editId.value = null
  form.value = { name: '', contact_person: '', contact_phone: '', address: '', cooperation_type: '', status: 'active' }
  showModal.value = true
}

const openEditModal = (o) => {
  isEdit.value = true
  editId.value = o.id
  form.value = { name: o.name, contact_person: o.contact_person || '', contact_phone: o.contact_phone || '', address: o.address || '', cooperation_type: o.cooperation_type || '', status: o.status }
  showModal.value = true
}

const submitForm = async () => {
  if (!form.value.name) { alert('请填写机构名称'); return }
  try {
    const url = isEdit.value ? `${API_BASE}/admin/organizations/${editId.value}` : `${API_BASE}/admin/organizations`
    const method = isEdit.value ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers: headers(), body: JSON.stringify(form.value) })
    if (res.ok) {
      showModal.value = false
      await loadOrganizations()
    } else {
      alert('操作失败')
    }
  } catch (e) {
    alert('操作失败')
  }
}

const deleteOrg = async (o) => {
  if (!confirm(`确定删除机构「${o.name}」？`)) return
  try {
    const res = await fetch(`${API_BASE}/admin/organizations/${o.id}`, { method: 'DELETE', headers: headers() })
    if (res.ok) await loadOrganizations()
  } catch (e) {
    alert('删除失败')
  }
}

const formatDate = (d) => {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN')
}

onMounted(loadOrganizations)
</script>

<style scoped>
.hint { color: var(--text-secondary); font-size: 14px; margin-top: 4px; }
.toolbar-info h2 { margin: 0; font-size: 18px; }
.status-badge { padding: 2px 10px; border-radius: 10px; font-size: 12px; }
.status-badge.active { background: #d1fae5; color: #065f46; }
.status-badge.inactive { background: #f3f4f6; color: #6b7280; }
.required { color: #ef4444; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 6px; }
.form-group input, .form-group select { width: 100%; padding: 10px 14px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 14px; }
.exam-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.exam-modal-content { background: var(--bg-primary); border-radius: var(--radius-lg); width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
.exam-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid var(--border-color); }
.exam-modal-header h3 { font-size: 18px; font-weight: 600; margin: 0; }
.exam-modal-close { background: none; border: none; font-size: 24px; color: var(--text-secondary); cursor: pointer; }
.exam-modal-body { padding: 24px; }
.exam-modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 24px; border-top: 1px solid var(--border-color); }
.btn-cancel { padding: 8px 20px; border: 1px solid var(--border-color); background: var(--bg-primary); border-radius: var(--radius-md); cursor: pointer; }
.btn-view { padding: 4px 10px; border: 1px solid var(--primary-color); background: transparent; color: var(--primary-color); border-radius: 4px; cursor: pointer; font-size: 12px; }
.btn-view:hover { background: var(--primary-color); color: white; }
</style>
