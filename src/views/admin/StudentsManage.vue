<template>
  <div class="admin-page">
    <div class="page-toolbar">
      <div class="toolbar-info">
        <h2>学员管理</h2>
        <p class="hint">双击单元格编辑 | 共 {{ filteredStudents.length }} 条记录</p>
      </div>
      <div class="toolbar-actions">
        <select v-model="filterStatus" @change="loadStudents">
          <option value="">全部状态</option>
          <option v-for="s in STAGES" :key="s" :value="s">{{ s }}</option>
        </select>
        <input v-model="searchKey" placeholder="搜索姓名/手机号" />
        <button class="btn-primary" @click="openAddModal">+ 添加学员</button>
        <button class="btn-secondary" @click="$refs.importInput.click()">导入</button>
        <button class="btn-secondary" @click="exportExcel">导出</button>
        <input ref="importInput" type="file" accept=".xlsx,.xls,.csv" @change="handleImport" style="display:none" />
      </div>
    </div>

    <!-- 批量操作栏 -->
    <div class="batch-bar" v-if="selectedIds.size > 0">
      <span>已选择 {{ selectedIds.size }} 条</span>
      <select v-model="batchStatus">
        <option value="">批量设置状态...</option>
        <option v-for="s in STAGES" :key="s" :value="s">{{ s }}</option>
      </select>
      <button class="btn-primary btn-sm" @click="batchUpdateStatus" :disabled="!batchStatus">确认更新</button>
      <button class="btn-delete btn-sm" @click="batchDelete">批量删除</button>
      <button class="btn-secondary btn-sm" @click="selectedIds.clear()">取消选择</button>
    </div>

    <div class="grid-wrapper" v-if="!loading">
      <table class="grid-table">
        <thead>
          <tr>
            <th class="col-check"><input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" /></th>
            <th class="col-id">ID</th>
            <th v-for="col in COLUMNS" :key="col.key" :style="{ minWidth: col.width }">{{ col.label }}</th>
            <th class="col-time">提交时间</th>
            <th class="col-actions">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in filteredStudents" :key="s.id" :class="{ selected: selectedIds.has(s.id) }">
            <td class="col-check"><input type="checkbox" :checked="selectedIds.has(s.id)" @change="toggleSelect(s.id)" /></td>
            <td class="col-id">{{ s.id }}</td>
            <td v-for="col in COLUMNS" :key="col.key"
                @dblclick="startEdit(s, col)"
                :class="{ editing: isEditing(s.id, col.key) }">
              <!-- 编辑模式 -->
              <template v-if="isEditing(s.id, col.key)">
                <select v-if="col.type === 'select'" v-model="editValue"
                        @blur="saveCell(s, col)" @change="saveCell(s, col)" ref="editEl" autofocus>
                  <option value="">-</option>
                  <option v-for="opt in col.options" :key="opt" :value="opt">{{ opt }}</option>
                </select>
                <input v-else v-model="editValue" :type="col.type || 'text'"
                       @blur="saveCell(s, col)" @keyup.enter="saveCell(s, col)" @keyup.escape="cancelEdit"
                       ref="editEl" autofocus />
              </template>
              <!-- 显示模式 -->
              <template v-else>
                <span v-if="col.key === 'status'" :class="['status-tag', getStatusClass(s.status)]">{{ s.status || '-' }}</span>
                <span v-else>{{ s[col.key] || '-' }}</span>
              </template>
            </td>
            <td class="col-time">{{ formatDate(s.created_at) }}</td>
            <td class="col-actions">
              <button class="btn-link" @click="viewDetail(s)">详情</button>
              <button class="btn-link danger" @click="deleteStudent(s)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="empty-state" v-if="filteredStudents.length === 0">暂无学员数据</div>
    </div>
    <div class="loading-state" v-else>加载中...</div>

    <!-- 详情弹窗 -->
    <Teleport to="body">
      <div class="modal-overlay" v-if="showDetail" @click.self="showDetail = false">
        <div class="modal-content modal-lg">
          <div class="modal-header">
            <h3>学员详情 - {{ detailData.name }}</h3>
            <button class="modal-close" @click="showDetail = false">&times;</button>
          </div>
          <div class="modal-body">
            <div class="detail-grid">
              <div class="detail-item" v-for="col in COLUMNS" :key="col.key">
                <label>{{ col.label }}</label>
                <span v-if="col.key === 'status'" :class="['status-tag', getStatusClass(detailData.status)]">{{ detailData[col.key] || '-' }}</span>
                <span v-else>{{ detailData[col.key] || '-' }}</span>
              </div>
              <div class="detail-item"><label>提交时间</label><span>{{ formatDate(detailData.created_at) }}</span></div>
            </div>
            <h4 class="history-title">状态变更记录</h4>
            <div class="timeline" v-if="statusHistory.length > 0">
              <div v-for="h in statusHistory" :key="h.id" class="timeline-item">
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                  <span class="timeline-stage">{{ h.stage }}</span>
                  <span class="timeline-operator">{{ h.operator }}</span>
                  <span class="timeline-note" v-if="h.note">{{ h.note }}</span>
                  <span class="timeline-time">{{ formatDate(h.created_at) }}</span>
                </div>
              </div>
            </div>
            <div v-else class="empty-state">暂无状态记录</div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 手动添加学员弹窗 -->
    <Teleport to="body">
      <div class="modal-overlay" v-if="showAddModal" @click.self="showAddModal = false">
        <div class="modal-content modal-lg">
          <div class="modal-header">
            <h3>手动添加学员</h3>
            <button class="modal-close" @click="showAddModal = false">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-row">
              <div class="form-group">
                <label>姓名 <span class="required">*</span></label>
                <input v-model="addForm.name" placeholder="学员姓名" />
              </div>
              <div class="form-group">
                <label>手机号 <span class="required">*</span></label>
                <input v-model="addForm.phone" placeholder="手机号" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group" v-for="col in ADD_FORM_COLS" :key="col.key">
                <label>{{ col.label }}</label>
                <select v-if="col.type === 'select'" v-model="addForm[col.key]">
                  <option value="">请选择</option>
                  <option v-for="opt in col.options" :key="opt" :value="opt">{{ opt }}</option>
                </select>
                <input v-else v-model="addForm[col.key]" :type="col.type || 'text'" :placeholder="col.label" />
              </div>
            </div>
            <div class="form-group">
              <label>备注</label>
              <textarea v-model="addForm.remark" placeholder="备注信息" rows="2"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" @click="showAddModal = false">取消</button>
            <button class="btn-primary" @click="submitAddStudent">添加学员</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import * as XLSX from 'xlsx'

const API_BASE = '/api/workflow'
const token = () => localStorage.getItem('token')
const headers = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` })

const STAGES = ['意向', '已报名', '资料审核', '实名认证', '已缴费', '学习中', '已考试', '已拿证']

const COLUMNS = [
  { key: 'name', label: '姓名', width: '70px' },
  { key: 'phone', label: '手机号', width: '110px' },
  { key: 'gender', label: '性别', width: '50px', type: 'select', options: ['男', '女'] },
  { key: 'age', label: '年龄', width: '50px', type: 'number' },
  { key: 'education', label: '学历', width: '60px', type: 'select', options: ['初中', '高中', '大专', '本科', '硕士', '博士'] },
  { key: 'major', label: '专业', width: '90px' },
  { key: 'work_years', label: '工作年限', width: '65px', type: 'number' },
  { key: 'social_security_years', label: '社保年限', width: '65px', type: 'number' },
  { key: 'target_level', label: '目标等级', width: '70px', type: 'select', options: ['初级', '中级', '高级'] },
  { key: 'organization', label: '机构', width: '80px' },
  { key: 'source', label: '来源', width: '60px', type: 'select', options: ['网站', '微信', '电话', '机构', '导入', '其他'] },
  { key: 'status', label: '状态', width: '70px', type: 'select', options: STAGES },
  { key: 'remark', label: '备注', width: '100px' },
]

const ADD_FORM_COLS = [
  { key: 'gender', label: '性别', type: 'select', options: ['男', '女'] },
  { key: 'age', label: '年龄', type: 'number' },
  { key: 'education', label: '学历', type: 'select', options: ['初中', '高中', '大专', '本科', '硕士', '博士'] },
  { key: 'major', label: '专业' },
  { key: 'work_years', label: '工作年限', type: 'number' },
  { key: 'social_security_years', label: '社保年限', type: 'number' },
  { key: 'target_level', label: '目标等级', type: 'select', options: ['初级', '中级', '高级'] },
  { key: 'source', label: '来源渠道', type: 'select', options: ['网站', '微信', '电话', '机构', '其他'] },
  { key: 'organization', label: '所属机构' },
  { key: 'status', label: '初始状态', type: 'select', options: ['意向', '已报名', '资料审核', '实名认证', '已缴费'] },
]

// 数据
const students = ref([])
const loading = ref(false)
const filterStatus = ref('')
const searchKey = ref('')

const filteredStudents = computed(() => {
  let list = students.value
  if (filterStatus.value) list = list.filter(s => s.status === filterStatus.value)
  if (searchKey.value) {
    const key = searchKey.value.toLowerCase()
    list = list.filter(s => s.name?.toLowerCase().includes(key) || s.phone?.includes(key))
  }
  return list
})

const loadStudents = async () => {
  loading.value = true
  try {
    const res = await fetch(`${API_BASE}/admin/students`, { headers: headers() })
    const data = await res.json()
    students.value = data.data || []
  } catch (e) { console.error(e) }
  loading.value = false
}

// 内联编辑
const editingCell = ref(null)
const editValue = ref('')

const isEditing = (id, key) => editingCell.value?.rowId === id && editingCell.value?.colKey === key

const startEdit = (s, col) => {
  editingCell.value = { rowId: s.id, colKey: col.key }
  editValue.value = s[col.key] || ''
  nextTick(() => {
    const el = document.querySelector('.grid-table td.editing input, .grid-table td.editing select')
    if (el) el.focus()
  })
}

const saveCell = async (student, col) => {
  if (!editingCell.value) return
  const oldValue = student[col.key] || ''
  const newValue = typeof editValue.value === 'string' ? editValue.value.trim() : editValue.value
  editingCell.value = null

  if (String(newValue) === String(oldValue)) return

  try {
    await fetch(`${API_BASE}/admin/students/${student.id}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ [col.key]: newValue || null })
    })
    student[col.key] = newValue || null

    // 状态变更时记录历史
    if (col.key === 'status' && newValue) {
      await fetch(`${API_BASE}/admin/students/${student.id}/status`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ stage: newValue, operator: '管理员', note: '表格编辑' })
      })
    }
  } catch (e) {
    alert('更新失败')
    student[col.key] = oldValue
  }
}

const cancelEdit = () => { editingCell.value = null }

// 选择与批量操作
const selectedIds = ref(new Set())
const batchStatus = ref('')

const toggleSelect = (id) => {
  const s = new Set(selectedIds.value)
  s.has(id) ? s.delete(id) : s.add(id)
  selectedIds.value = s
}

const toggleSelectAll = () => {
  if (selectedIds.value.size === filteredStudents.value.length) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(filteredStudents.value.map(s => s.id))
  }
}

const isAllSelected = computed(() => filteredStudents.value.length > 0 && selectedIds.value.size === filteredStudents.value.length)

const batchUpdateStatus = async () => {
  if (!batchStatus.value) return
  try {
    await fetch(`${API_BASE}/admin/students/batch-status`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ ids: [...selectedIds.value], stage: batchStatus.value, note: '批量操作' })
    })
    selectedIds.value = new Set()
    batchStatus.value = ''
    await loadStudents()
  } catch (e) { alert('批量更新失败') }
}

const batchDelete = async () => {
  if (!confirm(`确定删除 ${selectedIds.value.size} 条记录？`)) return
  try {
    await fetch(`${API_BASE}/admin/students/batch-delete`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ ids: [...selectedIds.value] })
    })
    selectedIds.value = new Set()
    await loadStudents()
  } catch (e) { alert('批量删除失败') }
}

// 导出
const exportExcel = () => {
  const data = filteredStudents.value.map(s => ({
    'ID': s.id, '姓名': s.name, '手机号': s.phone, '邮箱': s.email || '',
    '性别': s.gender || '', '年龄': s.age || '', '学历': s.education || '',
    '专业': s.major || '', '工作年限': s.work_years || '', '社保年限': s.social_security_years || '',
    '身份证号': s.id_card || '', '目标等级': s.target_level || '', '机构': s.organization || '',
    '来源': s.source || '', '状态': s.status, '备注': s.remark || '', '提交时间': formatDate(s.created_at)
  }))
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '学员数据')
  XLSX.writeFile(wb, `学员数据_${new Date().toLocaleDateString('zh-CN')}.xlsx`)
}

// 导入
const handleImport = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async (e) => {
    const base64 = e.target.result.split(',')[1]
    try {
      const res = await fetch(`${API_BASE}/admin/students/import`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ fileData: base64 })
      })
      const data = await res.json()
      if (res.ok) {
        alert(`导入完成：成功 ${data.success} 条，失败 ${data.failed} 条`)
        await loadStudents()
      } else {
        alert(data.message || '导入失败')
      }
    } catch (e) { alert('导入失败') }
  }
  reader.readAsDataURL(file)
  event.target.value = ''
}

// 详情
const showDetail = ref(false)
const detailData = ref({})
const statusHistory = ref([])

const viewDetail = async (s) => {
  try {
    const res = await fetch(`${API_BASE}/admin/students/${s.id}`, { headers: headers() })
    const data = await res.json()
    detailData.value = data.data
    statusHistory.value = data.data?.statusHistory || []
    showDetail.value = true
  } catch (e) { alert('获取详情失败') }
}

// 删除
const deleteStudent = async (s) => {
  if (!confirm(`确定删除学员「${s.name}」？`)) return
  try {
    await fetch(`${API_BASE}/admin/students/${s.id}`, { method: 'DELETE', headers: headers() })
    await loadStudents()
  } catch (e) { alert('删除失败') }
}

// 添加学员
const showAddModal = ref(false)
const addForm = ref({})

const openAddModal = () => {
  addForm.value = { name: '', phone: '', gender: '', age: '', id_card: '', email: '', education: '', major: '', work_years: '', social_security_years: '', target_level: '', source: '微信', organization: '', status: '意向', remark: '' }
  showAddModal.value = true
}

const submitAddStudent = async () => {
  if (!addForm.value.name || !addForm.value.phone) { alert('请填写姓名和手机号'); return }
  try {
    const res = await fetch(`${API_BASE}/student/submit`, {
      method: 'POST', headers: headers(), body: JSON.stringify(addForm.value)
    })
    if (res.ok) {
      const data = await res.json()
      if (addForm.value.status !== '意向' && data.data?.id) {
        await fetch(`${API_BASE}/admin/students/${data.data.id}/status`, {
          method: 'POST', headers: headers(),
          body: JSON.stringify({ stage: addForm.value.status, operator: '管理员', note: `手动添加：${addForm.value.status}` })
        })
      }
      showAddModal.value = false
      await loadStudents()
    } else { alert('添加失败') }
  } catch (e) { alert('添加失败') }
}

const getStatusClass = (status) => {
  const map = { '意向': 'pending', '已报名': 'info', '资料审核': 'warning', '实名认证': 'verify', '已缴费': 'success', '学习中': 'info', '已考试': 'success', '已拿证': 'complete' }
  return map[status] || 'pending'
}

const formatDate = (d) => { if (!d) return '-'; return new Date(d).toLocaleString('zh-CN') }

onMounted(loadStudents)
</script>

<style scoped>
.hint { color: var(--text-secondary); font-size: 13px; margin-top: 4px; }
.toolbar-info h2 { margin: 0; font-size: 18px; }
.toolbar-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.toolbar-actions select, .toolbar-actions input { padding: 6px 10px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 13px; }
.toolbar-actions input { width: 150px; }

/* 按钮 */
.btn-primary { padding: 7px 14px; background: var(--primary-color); color: white; border: none; border-radius: var(--radius-md); font-size: 13px; cursor: pointer; }
.btn-primary:hover { background: var(--primary-hover); }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-secondary { padding: 7px 14px; background: #f8fafc; color: #475569; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 13px; cursor: pointer; }
.btn-secondary:hover { background: #f1f5f9; }
.btn-sm { padding: 5px 10px; font-size: 12px; }
.btn-link { background: none; border: none; color: var(--primary-color); cursor: pointer; font-size: 12px; padding: 2px 6px; }
.btn-link:hover { text-decoration: underline; }
.btn-link.danger { color: #ef4444; }
.btn-delete { padding: 7px 14px; background: #ef4444; color: white; border: none; border-radius: var(--radius-md); font-size: 13px; cursor: pointer; }
.btn-delete:hover { background: #dc2626; }

/* 批量操作栏 */
.batch-bar { display: flex; align-items: center; gap: 10px; padding: 10px 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: var(--radius-md); margin-bottom: 12px; font-size: 13px; }
.batch-bar select { padding: 5px 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; }

/* 可编辑网格 */
.grid-wrapper { overflow-x: auto; border: 1px solid #e2e8f0; border-radius: var(--radius-lg); background: white; }
.grid-table { width: 100%; border-collapse: collapse; min-width: 1200px; }
.grid-table th { background: #f8fafc; padding: 10px 10px; font-size: 12px; font-weight: 600; color: #64748b; border-bottom: 2px solid #e2e8f0; white-space: nowrap; position: sticky; top: 0; z-index: 1; text-align: left; }
.grid-table td { padding: 8px 10px; font-size: 13px; border-bottom: 1px solid #f1f5f9; white-space: nowrap; cursor: default; vertical-align: middle; }
.grid-table tbody tr:nth-child(even) { background: #fafbfc; }
.grid-table tbody tr:hover { background: #f0f9ff; }
.grid-table tbody tr.selected { background: #eff6ff; }
.grid-table td.editing { padding: 4px; background: #fef3c7 !important; }
.grid-table td.editing input, .grid-table td.editing select { width: 100%; padding: 4px 6px; border: 1px solid #3b82f6; border-radius: 3px; font-size: 13px; outline: none; box-sizing: border-box; }
.col-check { width: 36px; text-align: center; }
.col-id { width: 45px; color: #94a3b8; }
.col-time { min-width: 130px; color: #94a3b8; font-size: 12px; }
.col-actions { width: 80px; }

/* 状态标签 */
.status-tag { display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 12px; font-weight: 500; }
.status-tag.pending { background: #fef3c7; color: #92400e; }
.status-tag.info { background: #dbeafe; color: #1e40af; }
.status-tag.warning { background: #fef3c7; color: #92400e; }
.status-tag.success { background: #d1fae5; color: #065f46; }
.status-tag.complete { background: #ede9fe; color: #5b21b6; }
.status-tag.verify { background: #e0e7ff; color: #4338ca; }

.required { color: #ef4444; }

@media (max-width: 768px) { .form-row { grid-template-columns: 1fr; } }
</style>

<style>
/* 弹窗（Teleport 到 body，不能用 scoped） */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-overlay .modal-content { background: white; border-radius: var(--radius-lg); width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
.modal-overlay .modal-lg { max-width: 700px; }
.modal-overlay .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid #e2e8f0; }
.modal-overlay .modal-header h3 { font-size: 17px; font-weight: 600; margin: 0; }
.modal-overlay .modal-close { background: none; border: none; font-size: 22px; color: #94a3b8; cursor: pointer; }
.modal-overlay .modal-body { padding: 24px; }
.modal-overlay .modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 24px; border-top: 1px solid #e2e8f0; }

/* 详情 */
.modal-overlay .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
.modal-overlay .detail-item { display: flex; flex-direction: column; gap: 2px; }
.modal-overlay .detail-item label { font-size: 11px; color: #94a3b8; }
.modal-overlay .detail-item span { font-size: 13px; }
.modal-overlay .history-title { font-size: 15px; margin: 16px 0 10px; padding-top: 14px; border-top: 1px solid #e2e8f0; }
.modal-overlay .timeline { padding-left: 18px; border-left: 2px solid #e2e8f0; }
.modal-overlay .timeline-item { position: relative; padding: 6px 0 6px 14px; }
.modal-overlay .timeline-dot { position: absolute; left: -7px; top: 12px; width: 10px; height: 10px; border-radius: 50%; background: var(--primary-color); }
.modal-overlay .timeline-content { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: 13px; }
.modal-overlay .timeline-stage { font-weight: 600; }
.modal-overlay .timeline-operator { color: #94a3b8; }
.modal-overlay .timeline-note { color: #94a3b8; font-style: italic; }
.modal-overlay .timeline-time { color: #cbd5e1; font-size: 12px; }
.modal-overlay .empty-state { text-align: center; padding: 20px; color: #999; }

/* 表单 */
.modal-overlay .form-group { margin-bottom: 14px; }
.modal-overlay .form-group label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 5px; }
.modal-overlay .form-group input, .modal-overlay .form-group select, .modal-overlay .form-group textarea { width: 100%; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: var(--radius-md); font-size: 13px; box-sizing: border-box; }
.modal-overlay .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

@media (max-width: 768px) {
  .modal-overlay .detail-grid { grid-template-columns: 1fr; }
  .modal-overlay .form-row { grid-template-columns: 1fr; }
}
</style>
