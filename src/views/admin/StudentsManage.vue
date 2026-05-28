<template>
  <div class="admin-page">
    <div class="page-toolbar">
      <div class="toolbar-info">
        <h2>学员管理</h2>
        <p class="hint">共 {{ tableData.length }} 条记录</p>
      </div>
      <div class="toolbar-actions">
        <select v-model="filterExamPlan" @change="loadData">
          <option value="">全部考试计划</option>
          <option v-for="p in examPlans" :key="p.id" :value="p.id">{{ p.title }}</option>
        </select>
        <select v-model="filterOrg" @change="loadData">
          <option value="">全部机构</option>
          <option v-for="o in orgs" :key="o.id" :value="o.id">{{ o.name }}</option>
        </select>
        <div class="source-tabs">
          <button :class="['tab-btn', { active: filterSource === '' }]" @click="filterSource = ''; loadData()">全部</button>
          <button :class="['tab-btn', { active: filterSource === 'manual' }]" @click="filterSource = 'manual'; loadData()">手动录入</button>
          <button :class="['tab-btn', { active: filterSource === 'sheet' }]" @click="filterSource = 'sheet'; loadData()">数据表来源</button>
        </div>
        <button class="btn-primary" @click="openAddModal">+ 添加学员</button>
        <button class="btn-secondary" @click="$refs.importInput.click()">导入</button>
        <button class="btn-secondary" @click="exportExcel">导出</button>
        <input class="search-input" type="text" placeholder="搜索..." v-model="searchKeyword" @input="doSearch" />
        <input ref="importInput" type="file" accept=".xlsx,.xls,.csv" @change="handleImport" style="display:none" />
        <span class="saving-hint saving" v-if="saving">保存中...</span>
        <span class="saving-hint saved" v-if="saveStatus === 'saved'">已保存</span>
        <span class="saving-hint error" v-if="saveStatus === 'error'">保存失败</span>
      </div>
    </div>

    <div id="students-hot-container" class="hot-container"></div>

    <!-- 手动添加学员弹窗 -->
    <Teleport to="body">
      <div class="modal-overlay" v-if="showAddModal" @click.self="showAddModal = false">
        <div class="modal-card modal-lg">
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
              <div class="form-group">
                <label>性别</label>
                <select v-model="addForm.gender">
                  <option value="">请选择</option>
                  <option value="男">男</option>
                  <option value="女">女</option>
                </select>
              </div>
              <div class="form-group">
                <label>年龄</label>
                <input v-model="addForm.age" type="number" placeholder="年龄" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>学历</label>
                <select v-model="addForm.education">
                  <option value="">请选择</option>
                  <option v-for="opt in ['初中', '高中', '大专', '本科', '硕士', '博士']" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>专业</label>
                <input v-model="addForm.major" placeholder="专业" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>工作年限</label>
                <input v-model="addForm.work_years" type="number" placeholder="工作年限" />
              </div>
              <div class="form-group">
                <label>社保年限</label>
                <input v-model="addForm.social_security_years" type="number" placeholder="社保年限" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>目标等级</label>
                <select v-model="addForm.target_level">
                  <option value="">请选择</option>
                  <option v-for="opt in ['初级', '中级', '高级']" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>来源渠道</label>
                <select v-model="addForm.source">
                  <option value="">请选择</option>
                  <option v-for="opt in ['网站', '微信', '电话', '机构', '其他']" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>所属机构</label>
                <input v-model="addForm.organization" placeholder="所属机构" />
              </div>
              <div class="form-group">
                <label>初始状态</label>
                <select v-model="addForm.status">
                  <option value="">请选择</option>
                  <option v-for="opt in STAGES" :key="opt" :value="opt">{{ opt }}</option>
                </select>
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
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { workflowAPI, api } from '../../api'
import Handsontable from 'handsontable'
import 'handsontable/styles/handsontable.min.css'
import 'handsontable/styles/ht-theme-main.min.css'
import * as XLSX from 'xlsx'

const API_BASE = '/api/workflow'
const token = () => localStorage.getItem('token')
const headers = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` })

const STAGES = ['意向', '已报名', '资料审核', '实名认证', '已缴费', '学习中', '已考试', '已拿证']

// 筛选
const examPlans = ref([])
const orgs = ref([])
const filterExamPlan = ref('')
const filterOrg = ref('')
const filterSource = ref('')
const searchKeyword = ref('')

// 数据
const tableData = ref([])
const saving = ref(false)
const saveStatus = ref('')
let saveStatusTimer = null
let hot = null

const setSaveStatus = (status) => {
  saveStatus.value = status
  if (saveStatusTimer) clearTimeout(saveStatusTimer)
  if (status === 'saved') {
    saveStatusTimer = setTimeout(() => { saveStatus.value = '' }, 2000)
  }
}

// 列定义
const colHeaders = [
  'ID', '来源', '所属机构', '数据表',
  '姓名', '电话', '身份证号', '性别', '年龄', '学历', '专业',
  '工作年限', '社保年限', '工种', '等级',
  '报名日期', '考试日期', '报考条件', '来源渠道', '状态',
  '是否提交资料🔒', '审核结果', '是否实名🔒', '支付情况',
  '审核不通过理由🔒', '是否开通学习账号', '是否补考', '线下集训', '备注'
]
const colKeys = [
  '_id', 'source_type', 'org_name', 'sheet_name',
  'name', 'phone', 'id_card', 'gender', 'age', 'education', 'major',
  'work_years', 'social_security_years', 'job_type', 'level',
  'reg_date', 'exam_date', 'condition', 'source', 'status',
  'submitted', 'audit_result', 'verified', 'payment_status',
  'reject_reason', 'account_opened', 'is_retest', 'offline_training', 'remark'
]

const metaKeys = new Set(['_id', 'source_type', 'org_name', 'sheet_name'])
const alwaysReadOnly = new Set(['submitted', 'verified', 'reject_reason'])
const manualOnly = new Set(['gender', 'age', 'education', 'work_years', 'social_security_years', 'source', 'status'])
const sheetOnly = new Set(['job_type', 'reg_date', 'exam_date', 'condition', 'audit_result', 'payment_status', 'account_opened', 'is_retest', 'offline_training'])

const hotColumns = colKeys.map(key => ({
  data: key,
  type: 'text',
  readOnly: metaKeys.has(key) || alwaysReadOnly.has(key),
}))

// 加载数据
const loadData = async () => {
  try {
    const params = {}
    if (filterExamPlan.value) params.exam_plan_id = filterExamPlan.value
    if (filterOrg.value) params.org_id = filterOrg.value
    if (filterSource.value) params.source_type = filterSource.value

    const res = await workflowAPI.getStudentsFiltered(params)
    const rows = (res.data || []).map(r => ({
      ...r,
      _id: r.source_type === 'sheet' ? `S${r.id}` : r.id,
      work_years: r.work_years ?? '',
      social_security_years: r.social_security_years ?? '',
      age: r.age ?? '',
    }))
    tableData.value = rows
    if (hot) {
      hot.loadData(tableData.value)
    } else {
      await nextTick()
      initHot()
    }
  } catch (e) {
    console.error('加载学员失败:', e)
  }
}

const loadFilters = async () => {
  try {
    const [plansRes, orgsRes] = await Promise.all([
      workflowAPI.getExamPlans(),
      api.get('/workflow/admin/organizations')
    ])
    examPlans.value = plansRes.data || []
    orgs.value = orgsRes.data || []
  } catch (e) {
    console.error('加载筛选条件失败:', e)
  }
}

const initHot = () => {
  const container = document.getElementById('students-hot-container')
  if (!container) return
  if (hot) { hot.destroy(); hot = null }

  hot = new Handsontable(container, {
    data: tableData.value,
    colHeaders,
    columns: hotColumns,
    rowHeaders: true,
    search: true,
    height: Math.max(400, window.innerHeight - 200),
    stretchH: 'all',
    language: 'zh-CN',
    licenseKey: 'non-commercial-and-evaluation',
    contextMenu: {
      items: {
        'copy': { name: '复制' },
        'cut': { name: '剪切' },
        'sep1': '---------',
        'remove_row': {
          name: '删除该行',
          callback(key, selection) {
            for (const { start, end } of selection) {
              for (let r = start.row; r <= end.row; r++) {
                const row = hot.getSourceDataAtRow(r)
                if (!row) continue
                if (row.source_type === 'sheet' && row.id) {
                  workflowAPI.removeSheetStudent(row.sheet_id, row.id).catch(e => console.error(e))
                } else if (row.source_type === 'manual' && row.id) {
                  fetch(`${API_BASE}/admin/students/${row.id}`, { method: 'DELETE', headers: headers() }).catch(e => console.error(e))
                }
              }
            }
            hot.alter('remove_row', selection[0].start.row, selection[0].end.row - selection[0].start.row + 1)
          }
        }
      }
    },
    manualColumnResize: true,
    autoWrapRow: true,
    autoWrapCol: true,
    cells(row, col) {
      const rowData = tableData.value[row]
      if (!rowData) return {}
      const prop = colKeys[col]
      const cellProps = {}
      if (metaKeys.has(prop) || alwaysReadOnly.has(prop)) {
        cellProps.readOnly = true
        cellProps.className = 'htReadOnly'
      } else if (rowData.source_type === 'sheet' && manualOnly.has(prop)) {
        cellProps.readOnly = true
        cellProps.className = 'htReadOnly'
      } else if (rowData.source_type === 'manual' && sheetOnly.has(prop)) {
        cellProps.readOnly = true
        cellProps.className = 'htReadOnly'
      }
      return cellProps
    },
    afterChange(changes, source) {
      if (source === 'loadData') return
      if (!changes) return

      const sheetUpdates = new Map()
      const manualUpdates = []

      for (const [row, prop, oldVal, newVal] of changes) {
        if (oldVal === newVal) continue
        const rowData = hot.getSourceDataAtRow(row)
        if (!rowData || !rowData.id) continue

        if (rowData.source_type === 'sheet') {
          if (!sheetUpdates.has(rowData.sheet_id)) sheetUpdates.set(rowData.sheet_id, [])
          sheetUpdates.get(rowData.sheet_id).push({ id: rowData.id, [prop]: newVal || '' })
        } else if (rowData.source_type === 'manual') {
          manualUpdates.push({ id: rowData.id, [prop]: newVal || '', _prop: prop, _row })
        }
      }

      if (sheetUpdates.size === 0 && manualUpdates.length === 0) return
      saving.value = true

      const promises = []

      // 数据表学员批量保存
      for (const [sheetId, updates] of sheetUpdates) {
        promises.push(workflowAPI.adminBatchSave(sheetId, updates).catch(e => console.error('批量保存失败:', e)))
      }

      // 手动学员逐条保存
      for (const u of manualUpdates) {
        const { id, _prop, _row, ...data } = u
        promises.push(
          fetch(`${API_BASE}/admin/students/${id}`, {
            method: 'PUT', headers: headers(), body: JSON.stringify(data)
          }).then(async r => {
            if (_prop === 'status' && data.status) {
              await fetch(`${API_BASE}/admin/students/${id}/status`, {
                method: 'POST', headers: headers(),
                body: JSON.stringify({ stage: data.status, operator: '管理员', note: '表格编辑' })
              })
            }
          }).catch(e => console.error('保存失败:', e))
        )
      }

      Promise.all(promises).then(() => {
        setSaveStatus('saved')
      }).catch(() => {
        setSaveStatus('error')
      }).finally(() => { saving.value = false })
    }
  })
}

const doSearch = () => {
  if (!hot) return
  const searchPlugin = hot.getPlugin('search')
  searchPlugin.query(searchKeyword.value)
  hot.render()
}

// 导出
const exportExcel = () => {
  const data = tableData.value.map(r => {
    const row = {}
    colKeys.forEach((key, i) => { row[colHeaders[i]] = r[key] || '' })
    return row
  })
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
        method: 'POST', headers: headers(), body: JSON.stringify({ fileData: base64 })
      })
      const data = await res.json()
      if (res.ok) {
        alert(`导入完成：成功 ${data.success} 条，失败 ${data.failed} 条`)
        await loadData()
      } else {
        alert(data.message || '导入失败')
      }
    } catch (e) { alert('导入失败') }
  }
  reader.readAsDataURL(file)
  event.target.value = ''
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
      await loadData()
    } else { alert('添加失败') }
  } catch (e) { alert('添加失败') }
}

onMounted(async () => {
  await loadFilters()
  await loadData()
})

onBeforeUnmount(() => {
  if (hot) { hot.destroy(); hot = null }
})
</script>

<style scoped>
.hint { color: var(--text-secondary); font-size: 13px; margin-top: 4px; }
.toolbar-info h2 { margin: 0; font-size: 18px; }
.toolbar-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.toolbar-actions select { padding: 6px 10px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 13px; }
.toolbar-actions .search-input { padding: 6px 10px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 13px; width: 150px; outline: none; }
.toolbar-actions .search-input:focus { border-color: #667eea; }

.hot-container {
  background: white;
  border-radius: var(--radius-lg);
  border: 1px solid #eee;
  overflow: hidden;
}

.btn-primary { padding: 7px 14px; background: var(--primary-color); color: white; border: none; border-radius: var(--radius-md); font-size: 13px; cursor: pointer; }
.btn-primary:hover { background: var(--primary-hover); }
.btn-secondary { padding: 7px 14px; background: #f8fafc; color: #475569; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 13px; cursor: pointer; }
.btn-secondary:hover { background: #f1f5f9; }

.saving-hint { font-size: 13px; }
.saving-hint.saving { color: #667eea; }
.saving-hint.saved { color: #10b981; }
.saving-hint.error { color: #ef4444; font-weight: 500; }

.source-tabs { display: flex; gap: 2px; background: #f1f5f9; border-radius: 6px; padding: 2px; }
.tab-btn { padding: 5px 12px; border: none; border-radius: 4px; font-size: 12px; cursor: pointer; background: transparent; color: #64748b; }
.tab-btn.active { background: white; color: #1e40af; font-weight: 600; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }

.required { color: #ef4444; }

:deep(.htReadOnly) {
  background: #f5f5f5 !important;
  color: #888;
}
</style>

<style>
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-overlay .modal-card {
  padding: 0; text-align: left; background: white; border-radius: var(--radius-lg);
  width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}
.modal-overlay .modal-lg { max-width: 700px; }
.modal-overlay .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid #e2e8f0; }
.modal-overlay .modal-header h3 { font-size: 17px; font-weight: 600; margin: 0; }
.modal-overlay .modal-close { background: none; border: none; font-size: 22px; color: #94a3b8; cursor: pointer; }
.modal-overlay .modal-body { padding: 24px; }
.modal-overlay .modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 24px; border-top: 1px solid #e2e8f0; }
.modal-overlay .form-group { margin-bottom: 14px; }
.modal-overlay .form-group label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 5px; }
.modal-overlay .form-group input, .modal-overlay .form-group select, .modal-overlay .form-group textarea { width: 100%; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: var(--radius-md); font-size: 13px; box-sizing: border-box; }
.modal-overlay .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

@media (max-width: 768px) {
  .modal-overlay .form-row { grid-template-columns: 1fr; }
}
</style>
