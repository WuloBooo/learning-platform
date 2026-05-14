<template>
  <div class="manage-page">
    <div class="page-header">
      <button class="add-btn" @click="showModal = true">+ 创建机构账号</button>
    </div>

    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>机构</th>
            <th>账号</th>
            <th>联系人</th>
            <th>状态</th>
            <th>最后登录</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in list" :key="user.id">
            <td>{{ user.id }}</td>
            <td>{{ user.org_name }}</td>
            <td>{{ user.username }}</td>
            <td>{{ user.contact_name || '-' }}</td>
            <td>
              <span :class="['status-badge', user.status === 'active' ? 'active' : 'disabled']">
                {{ user.status === 'active' ? '启用' : '禁用' }}
              </span>
            </td>
            <td>{{ user.last_login ? formatDate(user.last_login) : '未登录' }}</td>
            <td class="actions">
              <button class="action-btn edit" @click="openEdit(user)">编辑</button>
              <button class="action-btn" @click="resetPassword(user)">重置密码</button>
              <button class="action-btn delete" @click="handleDelete(user)">删除</button>
            </td>
          </tr>
          <tr v-if="list.length === 0">
            <td colspan="7" class="empty-row">暂无机构账号</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 创建/编辑弹窗 -->
    <Teleport to="body">
      <div class="modal-overlay" v-if="showModal" @click.self="showModal = false">
        <div class="modal">
          <h3>{{ editingUser ? '编辑机构账号' : '创建机构账号' }}</h3>
          <div class="form-group" v-if="!editingUser">
            <label>所属机构</label>
            <select v-model="form.org_id">
              <option value="">请选择机构</option>
              <option v-for="org in organizations" :key="org.id" :value="org.id">{{ org.name }}</option>
            </select>
          </div>
          <div class="form-group" v-if="!editingUser">
            <label>登录账号</label>
            <input v-model="form.username" placeholder="请输入登录账号" />
          </div>
          <div class="form-group">
            <label>{{ editingUser ? '新密码（留空不修改）' : '登录密码' }}</label>
            <input v-model="form.password" type="password" :placeholder="editingUser ? '留空不修改' : '请输入密码'" />
          </div>
          <div class="form-group">
            <label>联系人姓名</label>
            <input v-model="form.contact_name" placeholder="请输入联系人姓名" />
          </div>
          <div class="form-group">
            <label>状态</label>
            <select v-model="form.status">
              <option value="active">启用</option>
              <option value="disabled">禁用</option>
            </select>
          </div>
          <div class="modal-actions">
            <button class="cancel-btn" @click="showModal = false">取消</button>
            <button class="confirm-btn" @click="handleSubmit">{{ editingUser ? '保存' : '创建' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { workflowAPI, api } from '../../api'

const list = ref([])
const organizations = ref([])
const showModal = ref(false)
const editingUser = ref(null)
const form = ref({ org_id: '', username: '', password: '', contact_name: '', status: 'active' })

const formatDate = (d) => new Date(d).toLocaleString('zh-CN')

const loadList = async () => {
  try {
    const res = await workflowAPI.getOrgUsers()
    list.value = res.data || []
  } catch (e) {
    console.error('加载失败', e)
  }
}

const loadOrganizations = async () => {
  try {
    const res = await api.get('/workflow/admin/organizations')
    organizations.value = res.data || []
  } catch (e) {
    console.error('加载机构失败', e)
  }
}

const openEdit = (user) => {
  editingUser.value = user
  form.value = {
    org_id: user.org_id,
    username: user.username,
    password: '',
    contact_name: user.contact_name || '',
    status: user.status
  }
  showModal.value = true
}

const handleSubmit = async () => {
  try {
    if (editingUser.value) {
      await workflowAPI.updateOrgUser(editingUser.value.id, form.value)
    } else {
      if (!form.value.org_id || !form.value.username || !form.value.password) {
        alert('请填写完整信息')
        return
      }
      await workflowAPI.createOrgUser(form.value)
    }
    showModal.value = false
    editingUser.value = null
    form.value = { org_id: '', username: '', password: '', contact_name: '', status: 'active' }
    loadList()
  } catch (e) {
    alert(e.message || '操作失败')
  }
}

const resetPassword = async (user) => {
  const pwd = prompt('请输入新密码：')
  if (!pwd) return
  try {
    await workflowAPI.updateOrgUser(user.id, { password: pwd })
    alert('密码已重置')
  } catch (e) {
    alert(e.message || '重置失败')
  }
}

const handleDelete = async (user) => {
  if (!confirm(`确定删除账号 ${user.username}？`)) return
  try {
    await workflowAPI.deleteOrgUser(user.id)
    loadList()
  } catch (e) {
    alert(e.message || '删除失败')
  }
}

onMounted(() => {
  loadList()
  loadOrganizations()
})
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

.table-wrapper {
  background: white;
  border-radius: 12px;
  overflow: auto;
  border: 1px solid #eee;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.data-table th {
  background: #f8f9fa;
  padding: 12px;
  text-align: left;
  font-weight: 600;
  color: #555;
  border-bottom: 2px solid #e5e7eb;
  white-space: nowrap;
}

.data-table td {
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.data-table tr:hover td { background: #f8f9ff; }

.status-badge {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 10px;
}
.status-badge.active { background: #d1fae5; color: #065f46; }
.status-badge.disabled { background: #fee2e2; color: #991b1b; }

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

.empty-row { text-align: center; padding: 40px !important; color: #999; }
</style>

<style>
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-overlay .modal {
  background: white;
  border-radius: 12px;
  padding: 32px;
  width: 600px;
  max-width: 90vw;
}

.modal-overlay .modal h3 { margin: 0 0 20px; font-size: 18px; }

.modal-overlay .form-group { margin-bottom: 16px; }
.modal-overlay .form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}
.modal-overlay .form-group input,
.modal-overlay .form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
}

.modal-overlay .modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.modal-overlay .cancel-btn {
  padding: 10px 20px;
  background: #f0f0f0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.modal-overlay .confirm-btn {
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
</style>
