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
              <button class="action-btn edit" @click="viewSheet(sheet)">查看数据</button>
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

    <!-- 查看表格数据弹窗 -->
    <div class="modal-overlay large" v-if="viewingSheet" @click.self="viewingSheet = null">
      <div class="modal large-modal">
        <div class="modal-header">
          <h3>{{ viewingSheet.sheet_name }} — {{ viewingSheet.org_name }}</h3>
          <button class="close-btn" @click="viewingSheet = null">✕</button>
        </div>
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>姓名</th>
                <th>电话</th>
                <th>身份证号</th>
                <th>工种</th>
                <th>级别</th>
                <th>报名日期</th>
                <th>考试日期</th>
                <th>报考条件</th>
                <th>专业/岗位</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in sheetStudents" :key="row.id">
                <td>{{ row.name }}</td>
                <td>{{ row.phone }}</td>
                <td>{{ row.id_card }}</td>
                <td>{{ row.job_type }}</td>
                <td>{{ row.level }}</td>
                <td>{{ row.reg_date || '-' }}</td>
                <td>{{ row.exam_date || '-' }}</td>
                <td>{{ row.condition }}</td>
                <td>{{ row.major }}</td>
              </tr>
              <tr v-if="sheetStudents.length === 0">
                <td colspan="9" class="empty-row">暂无学员数据</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 创建弹窗 -->
    <div class="modal-overlay" v-if="showModal" @click.self="showModal = false">
      <div class="modal">
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

    <!-- 批量创建弹窗 -->
    <div class="modal-overlay" v-if="showBatchModal" @click.self="showBatchModal = false">
      <div class="modal">
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { workflowAPI, api } from '../../api'

const sheets = ref([])
const organizations = ref([])
const examPlans = ref([])
const filterOrgId = ref('')
const showModal = ref(false)
const showBatchModal = ref(false)
const editing = ref(null)
const viewingSheet = ref(null)
const sheetStudents = ref([])

const form = ref({ org_id: '', exam_plan_id: '', sheet_name: '', description: '', status: 'active' })
const batchForm = ref({ exam_plan_id: '', sheet_name: '', description: '' })

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

const viewSheet = async (sheet) => {
  viewingSheet.value = sheet
  try {
    const res = await workflowAPI.getSheetStudents(sheet.id)
    sheetStudents.value = res.data?.students || []
  } catch (e) {
    console.error('加载学员数据失败', e)
  }
}

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
  width: 480px;
  max-width: 90vw;
}

.large-modal {
  width: 90vw;
  max-width: 1100px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.modal-header h3 { margin: 0; }

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #999;
}

.table-scroll { overflow: auto; }

.modal h3 { margin: 0 0 20px; font-size: 18px; }
.hint { font-size: 13px; color: #999; margin: 0 0 16px; }

.form-group { margin-bottom: 14px; }
.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}
.form-group input, .form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
}

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
