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
          <button class="tool-btn secondary" @click="exportExcel">导出 Excel</button>
        </div>

        <div class="hot-wrapper">
          <hot-table ref="hotRef" :settings="hotSettings"></hot-table>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { orgAPI } from '../../api'
import { HotTable } from '@handsontable/vue3'
import { registerAllModules } from 'handsontable/registry'
import 'handsontable/styles/handsontable.min.css'
import 'handsontable/styles/ht-theme-main.min.css'
import 'handsontable-languages/zh-CN'
import * as XLSX from 'xlsx'

registerAllModules()

const router = useRouter()
const orgUser = ref(JSON.parse(localStorage.getItem('org_user') || '{}'))
const sheets = ref([])
const currentSheet = ref(null)
const tableData = ref([])
const selectedRows = ref([])
const hotRef = ref(null)
const showAddCol = ref(false)
const newColName = ref('')
const customCols = ref([])

const BASE_COLS = [
  { key: 'name', label: '姓名', width: 90 },
  { key: 'phone', label: '电话', width: 120 },
  { key: 'id_card', label: '身份证号', width: 170 },
  { key: 'job_type', label: '工种', width: 120 },
  { key: 'level', label: '级别', width: 70 },
  { key: 'reg_date', label: '报名日期', width: 110 },
  { key: 'exam_date', label: '考试日期', width: 110 },
  { key: 'condition', label: '报考条件', width: 120 },
  { key: 'major', label: '专业/岗位', width: 120 }
]

const allCols = computed(() => [...BASE_COLS, ...customCols.value])

const buildSettings = () => {
  const sheetId = currentSheet.value?.id
  const cols = [...BASE_COLS, ...customCols.value]
  const customKeys = customCols.value.map(c => c.key)

  return {
    data: tableData.value,
    colHeaders: cols.map(c => c.label),
    columns: cols.map(c => ({
      data: c.key,
      type: 'text',
      width: c.width
    })),
    rowHeaders: true,
    height: Math.max(500, window.innerHeight - 200),
    minRows: 30,
    stretchH: 'all',
    language: 'zh-CN',
    contextMenu: {
      items: {
        'row_above': { name: '在上方插入行' },
        'row_below': { name: '在下方插入行' },
        'remove_row': { name: '删除行' },
        'sep1': '---------',
        'copy': { name: '复制' },
        'cut': { name: '剪切' },
        'sep2': '---------',
        'col_left': { name: '在左侧插入列' },
        'col_right': { name: '在右侧插入列' },
        'remove_col': { name: '删除列' }
      }
    },
    manualColumnResize: true,
    manualRowResize: true,
    filters: true,
    dropdownMenu: true,
    licenseKey: 'non-commercial-and-evaluation',
    afterChange(changes, source) {
      if (source === 'loadData' || !changes || !sheetId) return
      changes.forEach(([row, prop, oldVal, newVal]) => {
        const rowData = this.getSourceDataAtRow(row)
        if (!rowData || !rowData.id) return
        if (customKeys.includes(prop)) {
          const extra = JSON.parse(rowData.extra_data || '{}')
          extra[prop] = newVal
          orgAPI.updateStudent(sheetId, rowData.id, { extra_data: JSON.stringify(extra) })
          rowData.extra_data = JSON.stringify(extra)
        } else {
          orgAPI.updateStudent(sheetId, rowData.id, { [prop]: newVal })
        }
      })
    },
    afterRemoveRow(index, amount, physicalRows) {
      if (!sheetId) return
      physicalRows.forEach(ri => {
        const rowData = this.getSourceDataAtRow(ri)
        if (rowData && rowData.id) {
          orgAPI.deleteStudent(sheetId, rowData.id)
        }
      })
    }
  }
}

const hotSettings = ref({})

const applySettings = () => {
  hotSettings.value = buildSettings()
}

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
  await loadSheetData()
}

const loadSheetData = async () => {
  if (!currentSheet.value) return
  try {
    const res = await orgAPI.getSheetStudents(currentSheet.value.id)
    tableData.value = res.data?.students || []
    // 展开自定义列数据
    tableData.value.forEach(row => {
      if (row.extra_data) {
        try {
          const extra = JSON.parse(row.extra_data)
          Object.assign(row, extra)
        } catch {}
      }
    })
    // 从 localStorage 恢复自定义列配置
    const saved = localStorage.getItem(`custom_cols_${currentSheet.value.id}`)
    if (saved) {
      try { customCols.value = JSON.parse(saved) } catch {}
    } else {
      customCols.value = []
    }
    applySettings()
  } catch (e) {
    console.error('加载表格数据失败', e)
  }
}

const closeSheet = () => {
  currentSheet.value = null
  tableData.value = []
  selectedRows.value = []
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
      nextTick(() => {
        const hot = hotRef.value?.hotInstance
        if (hot) hot.selectCell(tableData.value.length - 1, 0)
      })
    }
  } catch (e) {
    console.error('添加失败', e)
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
}

const exportExcel = () => {
  const data = tableData.value.map(r => {
    const row = {}
    allCols.value.forEach(c => { row[c.label] = r[c.key] || '' })
    return row
  })
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '学员数据')
  XLSX.writeFile(wb, `${currentSheet.value.sheet_name || '数据表'}.xlsx`)
}

const confirmAddCol = () => {
  if (!newColName.value.trim()) return
  const key = 'custom_' + Date.now()
  customCols.value.push({ key, label: newColName.value.trim(), width: 120 })
  localStorage.setItem(`custom_cols_${currentSheet.value.id}`, JSON.stringify(customCols.value))
  newColName.value = ''
  showAddCol.value = false
  applySettings()
}

const removeCol = (idx) => {
  customCols.value.splice(idx, 1)
  localStorage.setItem(`custom_cols_${currentSheet.value.id}`, JSON.stringify(customCols.value))
  applySettings()
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
  padding: 16px;
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

.tool-btn.secondary {
  background: #10b981;
}

.tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hot-wrapper {
  background: white;
  border-radius: 12px;
  border: 1px solid #eee;
  overflow: hidden;
}
</style>

<style>
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-card-sm {
  background: white;
  border-radius: 12px;
  padding: 24px;
  width: 400px;
  max-width: 90vw;
}

.modal-card-sm h3 {
  margin: 0 0 16px;
  font-size: 18px;
}

.modal-card-sm .form-group {
  margin-bottom: 12px;
}

.modal-card-sm .form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 6px;
}

.modal-card-sm .form-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.tool-btn.outline {
  background: white;
  color: #667eea;
  border: 1px solid #667eea;
}

.col-list {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #eee;
}

.col-list h4 {
  margin: 0 0 8px;
  font-size: 14px;
  color: #666;
}

.col-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  font-size: 14px;
}

.col-del {
  background: none;
  border: none;
  color: #e74c3c;
  cursor: pointer;
  font-size: 12px;
}
</style>
