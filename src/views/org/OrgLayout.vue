<template>
  <div class="org-layout">
    <!-- 顶栏 -->
    <header class="org-header">
      <div class="header-left">
        <h1>{{ orgUser.org_name || '机构管理平台' }}</h1>
      </div>
      <div class="header-right">
        <span class="user-info">{{ orgUser.contact_name || orgUser.username }}</span>
        <button class="logout-btn" @click="handleLogout">退出登录</button>
      </div>
    </header>

    <!-- 内容区 -->
    <main class="org-main">
      <!-- 数据表列表 -->
      <div v-if="!currentSheet" class="sheets-view">
        <h2>我的数据表</h2>
        <div class="sheets-grid">
          <div class="sheet-card" v-for="sheet in sheets" :key="sheet.id" @click="openSheet(sheet)">
            <div class="sheet-icon">📊</div>
            <div class="sheet-info">
              <h3>{{ sheet.sheet_name }}</h3>
              <p>{{ sheet.description || '暂无描述' }}</p>
            </div>
            <span class="sheet-status" :class="sheet.status === 'active' ? 'active' : 'archived'">
              {{ sheet.status === 'active' ? '使用中' : '已归档' }}
            </span>
          </div>
          <div class="empty-state" v-if="sheets.length === 0">
            <p>暂无数据表</p>
            <p class="hint">请等待管理员为您创建数据表</p>
          </div>
        </div>
      </div>

      <!-- 表格编辑视图 -->
      <div v-else class="editor-view">
        <div class="editor-header">
          <button class="back-btn" @click="closeSheet">← 返回列表</button>
          <h2>{{ currentSheet.sheet_name }}</h2>
        </div>

        <div class="table-toolbar">
          <button class="tool-btn" @click="addRow">+ 添加学员</button>
          <button class="tool-btn danger" @click="batchDelete" :disabled="selectedRows.length === 0">
            删除选中 ({{ selectedRows.length }})
          </button>
        </div>

        <div class="table-wrapper">
          <table class="editable-table">
            <thead>
              <tr>
                <th class="check-col">
                  <input type="checkbox" v-model="selectAll" @change="toggleSelectAll" />
                </th>
                <th v-for="col in columns" :key="col.key" :style="{ width: col.width }">
                  {{ col.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in tableData" :key="row.id"
                  :class="{ selected: selectedRows.includes(row.id) }">
                <td class="check-col">
                  <input type="checkbox" :value="row.id" v-model="selectedRows" />
                </td>
                <td v-for="col in columns" :key="col.key"
                    :class="{ editing: editingCell === `${row.id}-${col.key}` }"
                    @dblclick="startEdit(row.id, col.key, row[col.key])">
                  <template v-if="editingCell === `${row.id}-${col.key}`">
                    <input v-if="col.type === 'text'"
                      v-model="editValue"
                      @blur="saveEdit(row.id, col.key)"
                      @keyup.enter="saveEdit(row.id, col.key)"
                      @keyup.escape="cancelEdit"
                      ref="editInput"
                      class="cell-input" />
                    <input v-else-if="col.type === 'date'"
                      v-model="editValue"
                      type="date"
                      @blur="saveEdit(row.id, col.key)"
                      @keyup.escape="cancelEdit"
                      ref="editInput"
                      class="cell-input" />
                  </template>
                  <template v-else>
                    <span>{{ row[col.key] || '' }}</span>
                  </template>
                </td>
              </tr>
              <tr v-if="tableData.length === 0">
                <td :colspan="columns.length + 1" class="empty-row">暂无数据，双击单元格或点击"添加学员"</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { orgAPI } from '../../api'

const router = useRouter()
const orgUser = ref(JSON.parse(localStorage.getItem('org_user') || '{}'))
const sheets = ref([])
const currentSheet = ref(null)
const tableData = ref([])
const selectedRows = ref([])
const selectAll = ref(false)

const editingCell = ref(null)
const editValue = ref('')
const editInput = ref(null)

const columns = [
  { key: 'name', label: '姓名', type: 'text', width: '80px' },
  { key: 'phone', label: '电话', type: 'text', width: '120px' },
  { key: 'id_card', label: '身份证号', type: 'text', width: '180px' },
  { key: 'job_type', label: '工种', type: 'text', width: '140px' },
  { key: 'level', label: '级别', type: 'text', width: '60px' },
  { key: 'reg_date', label: '报名日期', type: 'date', width: '120px' },
  { key: 'exam_date', label: '考试日期', type: 'date', width: '120px' },
  { key: 'condition', label: '报考条件', type: 'text', width: '140px' },
  { key: 'major', label: '专业/岗位', type: 'text', width: '120px' }
]

const loadSheets = async () => {
  try {
    const res = await orgAPI.getSheets()
    sheets.value = res.data || []
  } catch (e) {
    console.error('加载数据表失败', e)
  }
}

const openSheet = async (sheet) => {
  currentSheet.value = sheet
  selectedRows.value = []
  selectAll.value = false
  await loadSheetData()
}

const loadSheetData = async () => {
  if (!currentSheet.value) return
  try {
    const res = await orgAPI.getSheetStudents(currentSheet.value.id)
    tableData.value = res.data?.students || []
  } catch (e) {
    console.error('加载表格数据失败', e)
  }
}

const closeSheet = () => {
  currentSheet.value = null
  tableData.value = []
  selectedRows.value = []
}

const startEdit = (rowId, colKey, value) => {
  editingCell.value = `${rowId}-${colKey}`
  editValue.value = value || ''
  nextTick(() => {
    // focus input
    const inputs = document.querySelectorAll('.cell-input')
    if (inputs.length > 0) inputs[inputs.length - 1].focus()
  })
}

const saveEdit = async (rowId, colKey) => {
  editingCell.value = null
  if (!currentSheet.value) return
  try {
    await orgAPI.updateStudent(currentSheet.value.id, rowId, { [colKey]: editValue.value })
    const row = tableData.value.find(r => r.id === rowId)
    if (row) row[colKey] = editValue.value
  } catch (e) {
    console.error('保存失败', e)
  }
}

const cancelEdit = () => {
  editingCell.value = null
}

const addRow = async () => {
  if (!currentSheet.value) return
  try {
    const res = await orgAPI.addStudent(currentSheet.value.id, {})
    if (res.data) {
      tableData.value.push({
        id: res.data.id,
        sheet_id: currentSheet.value.id,
        name: '', phone: '', id_card: '', job_type: '', level: '',
        reg_date: null, exam_date: null, condition: '', major: ''
      })
    }
  } catch (e) {
    console.error('添加失败', e)
  }
}

const toggleSelectAll = () => {
  if (selectAll.value) {
    selectedRows.value = tableData.value.map(r => r.id)
  } else {
    selectedRows.value = []
  }
}

const batchDelete = async () => {
  if (selectedRows.value.length === 0) return
  if (!confirm(`确定删除 ${selectedRows.value.length} 条记录？`)) return
  if (!currentSheet.value) return

  for (const rowId of selectedRows.value) {
    await orgAPI.deleteStudent(currentSheet.value.id, rowId)
  }
  tableData.value = tableData.value.filter(r => !selectedRows.value.includes(r.id))
  selectedRows.value = []
  selectAll.value = false
}

const handleLogout = () => {
  localStorage.removeItem('org_token')
  localStorage.removeItem('org_user')
  router.push('/org/login')
}

onMounted(() => {
  loadSheets()
})
</script>

<style scoped>
.org-layout {
  min-height: 100vh;
  background: #f5f6fa;
}

.org-header {
  background: white;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.org-header h1 {
  font-size: 18px;
  color: #1a1a2e;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-info {
  font-size: 14px;
  color: #666;
}

.logout-btn {
  padding: 6px 16px;
  background: #f0f0f0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #666;
}

.logout-btn:hover { background: #e0e0e0; }

.org-main {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.sheets-view h2 {
  margin-bottom: 20px;
  color: #1a1a2e;
}

.sheets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.sheet-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.1s;
  border: 1px solid #eee;
}

.sheet-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}

.sheet-icon {
  font-size: 32px;
}

.sheet-info {
  flex: 1;
}

.sheet-info h3 {
  margin: 0 0 4px;
  font-size: 16px;
  color: #333;
}

.sheet-info p {
  margin: 0;
  font-size: 13px;
  color: #999;
}

.sheet-status {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 12px;
}

.sheet-status.active {
  background: #d1fae5;
  color: #065f46;
}

.sheet-status.archived {
  background: #f3f4f6;
  color: #9ca3af;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.empty-state .hint {
  font-size: 13px;
  margin-top: 8px;
}

.editor-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.back-btn {
  padding: 8px 16px;
  background: #f0f0f0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.back-btn:hover { background: #e0e0e0; }

.editor-header h2 {
  margin: 0;
  font-size: 20px;
  color: #1a1a2e;
}

.table-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

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

.tool-btn.danger {
  background: #e74c3c;
}

.tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.table-wrapper {
  background: white;
  border-radius: 12px;
  overflow: auto;
  border: 1px solid #eee;
}

.editable-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.editable-table th {
  background: #f8f9fa;
  padding: 12px 8px;
  text-align: left;
  font-weight: 600;
  color: #555;
  border-bottom: 2px solid #e5e7eb;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 1;
}

.editable-table td {
  padding: 8px;
  border-bottom: 1px solid #f0f0f0;
  cursor: default;
  white-space: nowrap;
}

.editable-table tr:hover td {
  background: #f8f9ff;
}

.editable-table tr.selected td {
  background: #ede9fe;
}

.check-col {
  width: 40px;
  text-align: center;
}

.cell-input {
  width: 100%;
  padding: 4px 6px;
  border: 2px solid #667eea;
  border-radius: 4px;
  font-size: 14px;
  outline: none;
}

.empty-row {
  text-align: center;
  padding: 40px !important;
  color: #999;
}
</style>
