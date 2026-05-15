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
          <button class="tool-btn" @click="addRow">+ 添加空行</button>
          <button class="tool-btn danger" @click="deleteSelectedRows" v-if="selectedRows.length > 0">删除选中行</button>
          <button class="tool-btn secondary" @click="exportExcel">导出 Excel</button>
          <button class="tool-btn outline" @click="loadSheetData">刷新数据</button>
        </div>

        <div id="hot-container" class="table-scroll"></div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { orgAPI } from '../../api'
import Handsontable from 'handsontable'
import 'handsontable/styles/handsontable.min.css'
import 'handsontable/styles/ht-theme-main.min.css'
import * as XLSX from 'xlsx'

const router = useRouter()
const orgUser = ref(JSON.parse(localStorage.getItem('org_user') || '{}'))
const sheets = ref([])
const currentSheet = ref(null)
const tableData = ref([])
const selectedRows = ref([])
let hot = null

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

// 机构可编辑列（前9列：name~exam_date, condition, major）
const editableKeys = new Set([
  'name', 'phone', 'id_card', 'job_type', 'level', 'reg_date', 'exam_date',
  'condition', 'major'
])

const hotColumns = colKeys.map(key => ({
  data: key,
  type: 'text',
  readOnly: !editableKeys.has(key),
  className: editableKeys.has(key) ? '' : 'htReadOnly'
}))

// 确保粘贴/新增的行在数据库中有 id
const rowCreating = new Map()
async function ensureRowCreated(row, rowData) {
  if (rowData.id) return
  if (rowCreating.has(row)) return rowCreating.get(row)

  const promise = (async () => {
    try {
      const res = await orgAPI.addStudent(currentSheet.value.id, {})
      if (res.data?.id) {
        rowData.id = res.data.id
        rowData.sheet_id = currentSheet.value.id
      }
    } catch (e) {
      console.error('创建行失败:', e)
    } finally {
      rowCreating.delete(row)
    }
  })()
  rowCreating.set(row, promise)
  return promise
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
  await loadSheetData()
  await nextTick()
  initHot()
}

const loadSheetData = async () => {
  if (!currentSheet.value) return
  try {
    const res = await orgAPI.getSheetStudents(currentSheet.value.id)
    tableData.value = (res.data?.students || []).map(r => ({ ...r }))
    if (hot) {
      hot.loadData(tableData.value)
    }
  } catch (e) {
    console.error('加载失败', e)
  }
}

const closeSheet = () => {
  if (hot) {
    hot.destroy()
    hot = null
  }
  currentSheet.value = null
  tableData.value = []
  selectedRows.value = []
}

const initHot = () => {
  const container = document.getElementById('hot-container')
  if (!container) return
  if (hot) {
    hot.destroy()
    hot = null
  }

  hot = new Handsontable(container, {
    data: tableData.value,
    colHeaders,
    columns: hotColumns,
    rowHeaders: true,
    height: Math.max(400, window.innerHeight - 220),
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
        const rowData = hot.getSourceDataAtRow(row)
        if (!rowData) continue
        if (oldVal === newVal) continue
        if (!rowData.id) {
          // 新粘贴的行还没有 id，先创建再更新
          ensureRowCreated(row, rowData).then(() => {
            orgAPI.updateStudent(currentSheet.value.id, rowData.id, { [prop]: newVal || '' })
              .catch(e => console.error('保存失败:', e))
          })
        } else {
          orgAPI.updateStudent(currentSheet.value.id, rowData.id, { [prop]: newVal || '' })
            .catch(e => console.error('保存失败:', e))
        }
      }
    },
    afterRemoveRow(index, amount, physicalRows) {
      for (const r of physicalRows) {
        const rowData = hot.getSourceDataAtRow(r)
        if (rowData && rowData.id) {
          orgAPI.deleteStudent(currentSheet.value.id, rowData.id)
            .catch(e => console.error('删除失败:', e))
        }
      }
    },
    afterSelectionEnd(r1) {
      const selected = hot.getSelected()
      if (!selected) { selectedRows.value = []; return }
      const rows = new Set()
      for (const [startRow, , endRow] of selected) {
        const from = Math.min(startRow, endRow)
        const to = Math.max(startRow, endRow)
        for (let i = from; i <= to; i++) rows.add(i)
      }
      selectedRows.value = [...rows]
    }
  })
}

const addRow = async () => {
  if (!currentSheet.value) return
  try {
    const res = await orgAPI.addStudent(currentSheet.value.id, {})
    if (res.data?.id) {
      const newRow = {
        id: res.data.id,
        sheet_id: currentSheet.value.id,
        name: '', phone: '', id_card: '', job_type: '', level: '',
        reg_date: '', exam_date: '', submitted: '', audit_result: '',
        verified: '', payment_status: '', reject_reason: '',
        account_opened: '', condition: '', major: '', remark: '',
        is_retest: '', offline_training: ''
      }
      const rowIndex = hot.countRows()
      hot.alter('insert_row_below', rowIndex - 1)
      hot.getSourceDataAtRow(rowIndex).__proto__ = null
      Object.assign(hot.getSourceDataAtRow(rowIndex), newRow)
      hot.render()
      hot.selectCell(rowIndex, 0)
    } else {
      alert('添加失败: ' + (res.message || '未知错误'))
    }
  } catch (e) {
    console.error('添加失败', e)
    alert('添加失败: ' + e.message)
  }
}

const deleteSelectedRows = async () => {
  if (selectedRows.value.length === 0) return
  if (!confirm(`确定删除选中的 ${selectedRows.value.length} 行？`)) return
  for (const idx of selectedRows.value.sort((a, b) => b - a)) {
    const rowData = hot.getSourceDataAtRow(idx)
    if (rowData && rowData.id) {
      await orgAPI.deleteStudent(currentSheet.value.id, rowData.id).catch(e => console.error(e))
    }
  }
  hot.alter('remove_row', selectedRows.value.sort((a, b) => b - a))
  selectedRows.value = []
}

const exportExcel = () => {
  const data = tableData.value.map(r => {
    const row = {}
    colKeys.forEach((key, i) => { row[colHeaders[i]] = r[key] || '' })
    return row
  })
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '学员数据')
  XLSX.writeFile(wb, `${currentSheet.value.sheet_name || '数据表'}.xlsx`)
}

const handleLogout = () => {
  localStorage.removeItem('org_token')
  localStorage.removeItem('org_user')
  router.push('/org/login')
}

onMounted(() => {
  loadSheets()
})

onBeforeUnmount(() => {
  if (hot) {
    hot.destroy()
    hot = null
  }
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

.user-info { font-size: 14px; color: #666; }

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

.org-main { padding: 16px; }

.sheets-view h2 { margin-bottom: 20px; color: #1a1a2e; }

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
.sheet-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1); transform: translateY(-2px); }

.sheet-icon { font-size: 32px; }
.sheet-info { flex: 1; }
.sheet-info h3 { margin: 0 0 4px; font-size: 16px; color: #333; }
.sheet-info p { margin: 0; font-size: 13px; color: #999; }

.sheet-status { font-size: 12px; padding: 4px 10px; border-radius: 12px; }
.sheet-status.active { background: #d1fae5; color: #065f46; }
.sheet-status.archived { background: #f3f4f6; color: #9ca3af; }

.empty-state { text-align: center; padding: 60px 20px; color: #999; }
.empty-state .hint { font-size: 13px; margin-top: 8px; }

.editor-header { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }

.back-btn {
  padding: 8px 16px;
  background: #f0f0f0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}
.back-btn:hover { background: #e0e0e0; }

.editor-header h2 { margin: 0; font-size: 20px; color: #1a1a2e; }

.table-toolbar { display: flex; gap: 8px; margin-bottom: 12px; }

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

.table-scroll {
  background: white;
  border-radius: 12px;
  border: 1px solid #eee;
  overflow: hidden;
}

:deep(.htReadOnly) {
  background: #f5f5f5 !important;
  color: #888;
}
</style>
