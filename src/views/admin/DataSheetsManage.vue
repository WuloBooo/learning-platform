<template>
  <div class="manage-page">
    <div class="page-header">
      <div class="header-left">
        <select v-model="filterOrgId" @change="loadSheets" class="filter-select">
          <option value="">全部机构</option>
          <option v-for="org in organizations" :key="org.id" :value="org.id">{{ org.name }}</option>
        </select>
      </div>
      <div class="header-right">
        <button class="add-btn" @click="openCreate">创建数据表</button>
        <button class="add-btn batch" @click="openBatchCreate">批量为所有机构创建</button>
      </div>
    </div>

    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>机构</th>
            <th>表名</th>
            <th>关联考试计划</th>
            <th>学员数</th>
            <th>状态</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="sheet in sheets" :key="sheet.id">
            <td>{{ sheet.id }}</td>
            <td>{{ sheet.org_name }}</td>
            <td>{{ sheet.sheet_name }}</td>
            <td>{{ sheet.exam_plan_name || '-' }}</td>
            <td>{{ sheet.student_count }}</td>
            <td>
              <span :class="['status-badge', sheet.status === 'active' ? 'active' : 'archived']">
                {{ sheet.status === 'active' ? '使用中' : '已归档' }}
              </span>
            </td>
            <td>{{ formatDate(sheet.created_at) }}</td>
            <td class="actions">
              <button class="action-btn edit" @click="openSheetEditor(sheet)">编辑数据</button>
              <button class="action-btn" @click="openEdit(sheet)">编辑</button>
              <button class="action-btn delete" @click="handleDelete(sheet)">删除</button>
            </td>
          </tr>
          <tr v-if="sheets.length === 0">
            <td colspan="8" class="empty-row">暂无数据表</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Handsontable 编辑弹窗 -->
    <Teleport to="body">
      <div class="modal-overlay large" v-if="editorSheet" @click.self="closeSheetEditor">
        <div class="modal-card large-modal">
          <div class="modal-header">
            <h3>{{ editorSheet.sheet_name }} — {{ editorSheet.org_name }}</h3>
            <button class="close-btn" @click="closeSheetEditor">✕</button>
          </div>
          <div class="editor-toolbar">
            <button class="tool-btn" @click="adminAddRow">+ 添加空行</button>
            <button class="tool-btn danger" @click="adminDeleteRows" v-if="adminSelectedRows.length > 0">删除选中行</button>
            <button class="tool-btn secondary" @click="adminExportExcel">导出 Excel</button>
            <button class="tool-btn outline" @click="loadEditorData">刷新数据</button>
          </div>
          <div :id="'admin-hot-' + editorSheet.id" class="admin-hot-container"></div>
        </div>
      </div>
    </Teleport>

    <!-- 创建弹窗 -->
    <Teleport to="body">
      <div class="modal-overlay" v-if="showModal" @click.self="showModal = false">
        <div class="modal-card">
          <h3>{{ editing ? '编辑数据表' : '创建数据表' }}</h3>
          <div class="form-group" v-if="!editing">
            <label>所属机构 *</label>
            <select v-model="form.org_id">
              <option value="">请选择机构</option>
              <option v-for="org in organizations" :key="org.id" :value="org.id">{{ org.name }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>关联考试计划</label>
            <select v-model="form.exam_plan_id">
              <option value="">无</option>
              <option v-for="plan in examPlans" :key="plan.id" :value="plan.id">{{ plan.title }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>表名 *</label>
            <input v-model="form.sheet_name" placeholder="如：3月报名表" />
          </div>
          <div class="form-group">
            <label>描述</label>
            <input v-model="form.description" placeholder="表格描述" />
          </div>
          <div class="form-group" v-if="editing">
            <label>状态</label>
            <select v-model="form.status">
              <option value="active">使用中</option>
              <option value="archived">已归档</option>
            </select>
          </div>
          <div class="modal-actions">
            <button class="cancel-btn" @click="showModal = false">取消</button>
            <button class="confirm-btn" @click="handleSubmit">{{ editing ? '保存' : '创建' }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 批量创建弹窗 -->
    <Teleport to="body">
      <div class="modal-overlay" v-if="showBatchModal" @click.self="showBatchModal = false">
        <div class="modal-card">
          <h3>批量为所有机构创建数据表</h3>
          <p class="hint">将为所有启用的机构创建相同名称的数据表</p>
          <div class="form-group">
            <label>关联考试计划</label>
            <select v-model="batchForm.exam_plan_id">
              <option value="">无</option>
              <option v-for="plan in examPlans" :key="plan.id" :value="plan.id">{{ plan.title }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>表名 *</label>
            <input v-model="batchForm.sheet_name" placeholder="如：5月报名表" />
          </div>
          <div class="form-group">
            <label>描述</label>
            <input v-model="batchForm.description" placeholder="表格描述" />
          </div>
          <div class="modal-actions">
            <button class="cancel-btn" @click="showBatchModal = false">取消</button>
            <button class="confirm-btn" @click="handleBatchCreate">批量创建</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, onBeforeUnmount } from 'vue'
import { workflowAPI, api } from '../../api'
import Handsontable from 'handsontable'
import 'handsontable/styles/handsontable.min.css'
import 'handsontable/styles/ht-theme-main.min.css'
import * as XLSX from 'xlsx'

const sheets = ref([])
const organizations = ref([])
const examPlans = ref([])
const filterOrgId = ref('')
const showModal = ref(false)
const showBatchModal = ref(false)
const editing = ref(null)

// Handsontable editor state
const editorSheet = ref(null)
const adminTableData = ref([])
const adminSelectedRows = ref([])
let adminHot = null

const form = ref({ org_id: '', exam_plan_id: '', sheet_name: '', description: '', status: 'active' })
const batchForm = ref({ exam_plan_id: '', sheet_name: '', description: '' })

const colHeaders = [
  '姓名', '电话', '身份证号', '工种', '级别', '报名日期', '考试日期',
  '是否提交资料', '审核结果', '是否实名', '支付情况', '审核不通过理由',
  '是否开通学习账号', '报考条件', '专业/岗位', '备注', '是否补考', '线下集训'
]
const colKeys = [
  'name', 'phone', 'id_card', 'job_type', 'level', 'reg_date', 'exam_date',
  'submitted', 'audit_result', 'verified', 'payment_status', 'reject_reason',
  'account_opened', 'condition', 'major', 'remark', 'is_retest', 'offline_training'
]

const hotColumns = colKeys.map(key => ({ data: key, type: 'text' }))

const formatDate = (d) => d ? new Date(d).toLocaleDateString('zh-CN') : '-'

const loadSheets = async () => {
  try {
    const params = filterOrgId.value ? { org_id: filterOrgId.value } : {}
    const res = await workflowAPI.getSheets(params)
    sheets.value = res.data || []
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

const loadExamPlans = async () => {
  try {
    const res = await workflowAPI.getExamPlans()
    examPlans.value = res.data || []
  } catch (e) {
    console.error('加载考试计划失败', e)
  }
}

// ===== Handsontable editor =====

const openSheetEditor = async (sheet) => {
  editorSheet.value = sheet
  await loadEditorData()
  await nextTick()
  initAdminHot()
}

const loadEditorData = async () => {
  if (!editorSheet.value) return
  try {
    const res = await workflowAPI.getSheetStudents(editorSheet.value.id)
    adminTableData.value = (res.data?.students || []).map(r => ({ ...r }))
    if (adminHot) {
      adminHot.loadData(adminTableData.value)
    }
  } catch (e) {
    console.error('加载学员数据失败', e)
  }
}

const closeSheetEditor = () => {
  if (adminHot) {
    adminHot.destroy()
    adminHot = null
  }
  editorSheet.value = null
  adminTableData.value = []
  adminSelectedRows.value = []
}

const initAdminHot = () => {
  const container = document.getElementById('admin-hot-' + editorSheet.value.id)
  if (!container) return
  if (adminHot) {
    adminHot.destroy()
    adminHot = null
  }

  adminHot = new Handsontable(container, {
    data: adminTableData.value,
    colHeaders,
    columns: hotColumns,
    rowHeaders: true,
    height: Math.max(400, window.innerHeight - 280),
    stretchH: 'all',
    language: 'zh-CN',
    licenseKey: 'non-commercial-and-evaluation',
    contextMenu: {
      items: {
        'row_above': { name: '在上方插入行' },
        'row_below': { name: '在下方插入行' },
        'sep1': '---------',
        'remove_row': { name: '删除该行' },
        'sep2': '---------',
        'copy': { name: '复制' },
        'cut': { name: '剪切' }
      }
    },
    manualColumnResize: true,
    autoWrapRow: true,
    autoWrapCol: true,
    afterChange(changes, source) {
      if (source === 'loadData') return
      if (!changes) return
      for (const [row, prop, oldVal, newVal] of changes) {
        const rowData = adminHot.getSourceDataAtRow(row)
        if (!rowData || !rowData.id) continue
        if (oldVal === newVal) continue
        workflowAPI.updateSheetStudent(editorSheet.value.id, rowData.id, { [prop]: newVal || '' })
          .catch(e => console.error('保存失败:', e))
      }
    },
    afterRemoveRow(index, amount, physicalRows) {
      for (const r of physicalRows) {
        const rowData = adminHot.getSourceDataAtRow(r)
        if (rowData && rowData.id) {
          workflowAPI.removeSheetStudent(editorSheet.value.id, rowData.id)
            .catch(e => console.error('删除失败:', e))
        }
      }
    },
    afterSelectionEnd() {
      const selected = adminHot.getSelected()
      if (!selected) { adminSelectedRows.value = []; return }
      const rows = new Set()
      for (const [startRow, , endRow] of selected) {
        const from = Math.min(startRow, endRow)
        const to = Math.max(startRow, endRow)
        for (let i = from; i <= to; i++) rows.add(i)
      }
      adminSelectedRows.value = [...rows]
    }
  })
}

const adminAddRow = async () => {
  if (!editorSheet.value) return
  try {
    const res = await workflowAPI.addSheetStudent(editorSheet.value.id, {})
    if (res.data?.id) {
      const newRow = {
        id: res.data.id,
        sheet_id: editorSheet.value.id,
        name: '', phone: '', id_card: '', job_type: '', level: '',
        reg_date: '', exam_date: '', submitted: '', audit_result: '',
        verified: '', payment_status: '', reject_reason: '',
        account_opened: '', condition: '', major: '', remark: '',
        is_retest: '', offline_training: ''
      }
      const rowIndex = adminHot.countRows()
      adminHot.alter('insert_row_below', rowIndex - 1)
      Object.assign(adminHot.getSourceDataAtRow(rowIndex), newRow)
      adminHot.render()
      adminHot.selectCell(rowIndex, 0)
    }
  } catch (e) {
    alert('添加失败: ' + e.message)
  }
}

const adminDeleteRows = async () => {
  if (adminSelectedRows.value.length === 0) return
  if (!confirm(`确定删除选中的 ${adminSelectedRows.value.length} 行？`)) return
  for (const idx of adminSelectedRows.value.sort((a, b) => b - a)) {
    const rowData = adminHot.getSourceDataAtRow(idx)
    if (rowData && rowData.id) {
      await workflowAPI.removeSheetStudent(editorSheet.value.id, rowData.id).catch(e => console.error(e))
    }
  }
  adminHot.alter('remove_row', adminSelectedRows.value.sort((a, b) => b - a))
  adminSelectedRows.value = []
}

const adminExportExcel = () => {
  const data = adminTableData.value.map(r => {
    const row = {}
    colKeys.forEach((key, i) => { row[colHeaders[i]] = r[key] || '' })
    return row
  })
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '学员数据')
  XLSX.writeFile(wb, `${editorSheet.value.sheet_name || '数据表'}.xlsx`)
}

// ===== Sheet CRUD =====

const openCreate = () => {
  editing.value = null
  form.value = { org_id: '', exam_plan_id: '', sheet_name: '', description: '', status: 'active' }
  showModal.value = true
}

const openEdit = (sheet) => {
  editing.value = sheet
  form.value = {
    org_id: sheet.org_id,
    exam_plan_id: sheet.exam_plan_id || '',
    sheet_name: sheet.sheet_name,
    description: sheet.description || '',
    status: sheet.status
  }
  showModal.value = true
}

const openBatchCreate = () => {
  batchForm.value = { exam_plan_id: '', sheet_name: '', description: '' }
  showBatchModal.value = true
}

const handleSubmit = async () => {
  if (!editing.value && !form.value.org_id) return alert('请选择机构')
  if (!form.value.sheet_name) return alert('请填写表名')
  try {
    if (editing.value) {
      await workflowAPI.updateSheet(editing.value.id, form.value)
    } else {
      await workflowAPI.createSheet(form.value)
    }
    showModal.value = false
    loadSheets()
  } catch (e) {
    alert(e.message || '操作失败')
  }
}

const handleBatchCreate = async () => {
  if (!batchForm.value.sheet_name) return alert('请填写表名')
  try {
    const res = await workflowAPI.batchCreateSheets(batchForm.value)
    alert(res.message || '批量创建成功')
    showBatchModal.value = false
    loadSheets()
  } catch (e) {
    alert(e.message || '批量创建失败')
  }
}

const handleDelete = async (sheet) => {
  if (!confirm(`确定删除"${sheet.sheet_name}"？关联的学员数据也会被删除。`)) return
  try {
    await workflowAPI.deleteSheet(sheet.id)
    loadSheets()
  } catch (e) {
    alert(e.message || '删除失败')
  }
}

onMounted(() => {
  loadSheets()
  loadOrganizations()
  loadExamPlans()
})

onBeforeUnmount(() => {
  if (adminHot) {
    adminHot.destroy()
    adminHot = null
  }
})
</script>

<style scoped>
.manage-page { padding: 0; }
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header-right { display: flex; gap: 8px; }

.filter-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.add-btn {
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.add-btn.batch {
  background: linear-gradient(135deg, #10b981, #059669);
}

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
.status-badge.active { background: #d1fae5; color: #065f46; }
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

.empty-row { text-align: center; padding: 40px !important; color: #999; }

.editor-toolbar { display: flex; gap: 8px; margin-bottom: 12px; }

.tool-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  background: #667eea;
  color: white;
}
.tool-btn:hover { opacity: 0.9; }
.tool-btn.secondary { background: #10b981; }
.tool-btn.outline { background: white; color: #667eea; border: 1px solid #667eea; }
.tool-btn.danger { background: #e74c3c; }

.admin-hot-container {
  background: white;
  border-radius: 8px;
  border: 1px solid #eee;
  overflow: hidden;
}
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

.modal-overlay .modal-card {
  position: relative;
  inset: auto;
  background: white;
  border-radius: 12px;
  padding: 32px;
  width: 600px;
  max-width: 90vw;
}

.modal-overlay .large-modal {
  width: 95vw;
  max-width: 1400px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

.modal-overlay .modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.modal-overlay .modal-header h3 { margin: 0; }

.modal-overlay .close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #999;
}

.modal-overlay .modal-card h3 { margin: 0 0 20px; font-size: 18px; }
.modal-overlay .hint { font-size: 13px; color: #999; margin: 0 0 16px; }

.modal-overlay .form-group { margin-bottom: 14px; }
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
  margin-top: 20px;
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
