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
          <span class="saving-hint saving" v-if="saving">保存中...</span>
          <span class="saving-hint saved" v-if="saveStatus === 'saved'">已保存</span>
          <span class="saving-hint error" v-if="saveStatus === 'error'">保存失败，请刷新重试</span>
        </div>

        <div class="table-toolbar">
          <button class="tool-btn danger" @click="deleteSelectedRows" v-if="selectedRows.length > 0">删除选中行 ({{ selectedRows.length }})</button>
          <button class="tool-btn import" @click="triggerImport">导入 Excel</button>
          <button class="tool-btn secondary" @click="exportExcel">导出 Excel</button>
          <button class="tool-btn outline" @click="loadSheetData">刷新数据</button>
          <input ref="fileInput" type="file" accept=".xlsx,.xls,.csv" style="display:none" @change="handleImport" />
          <input class="search-input" type="text" placeholder="搜索..." v-model="searchKeyword" @input="doSearch" />
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
const saving = ref(false)
const saveStatus = ref('') // '' | 'saved' | 'error'
let saveStatusTimer = null

const setSaveStatus = (status) => {
  saveStatus.value = status
  if (saveStatusTimer) clearTimeout(saveStatusTimer)
  if (status === 'saved') {
    saveStatusTimer = setTimeout(() => { saveStatus.value = '' }, 2000)
  }
}
const fileInput = ref(null)
const searchKeyword = ref('')
let hot = null
let savePromise = Promise.resolve()

const MIN_EMPTY_ROWS = 500

const colHeaders = [
  '姓名', '电话', '身份证号', '工种', '级别', '报名日期', '考试日期',
  '是否提交资料🔒', '审核结果🔒', '是否实名🔒', '支付情况🔒', '审核不通过理由🔒',
  '是否开通学习账号🔒', '报考条件', '专业/岗位', '备注🔒', '是否补考🔒', '线下集训🔒'
]
const colKeys = [
  'name', 'phone', 'id_card', 'job_type', 'level', 'reg_date', 'exam_date',
  'submitted', 'audit_result', 'verified', 'payment_status', 'reject_reason',
  'account_opened', 'condition', 'major', 'remark', 'is_retest', 'offline_training'
]

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

const emptyRow = () => ({
  name: '', phone: '', id_card: '', job_type: '', level: '',
  reg_date: '', exam_date: '', submitted: '', audit_result: '',
  verified: '', payment_status: '', reject_reason: '',
  account_opened: '', condition: '', major: '', remark: '',
  is_retest: '', offline_training: ''
})

function countEmptyRows(data) {
  let count = 0
  for (let i = data.length - 1; i >= 0; i--) {
    const r = data[i]
    let empty = true
    for (const key of colKeys) {
      if (r[key] && String(r[key]).trim()) { empty = false; break }
    }
    if (empty) count++
    else break
  }
  return count
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
  // 确保有足够的空行
  await ensureEmptyRows()
  await nextTick()
  initHot()
}

const loadSheetData = async () => {
  if (!currentSheet.value) return
  try {
    const res = await orgAPI.getSheetStudents(currentSheet.value.id)
    const students = (res.data?.students || []).map(r => ({ ...r }))
    // 有内容的行排前面，空行排后面
    const hasContent = students.filter(r => colKeys.some(k => r[k] && String(r[k]).trim()))
    const empty = students.filter(r => !colKeys.some(k => r[k] && String(r[k]).trim()))
    tableData.value = [...hasContent, ...empty]
    if (hot) {
      hot.loadData(tableData.value)
    }
  } catch (e) {
    console.error('加载失败', e)
  }
}

const ensureEmptyRows = async () => {
  const empty = countEmptyRows(tableData.value)
  if (empty >= MIN_EMPTY_ROWS) return

  const need = MIN_EMPTY_ROWS - empty
  try {
    await orgAPI.batchCreateEmpty(currentSheet.value.id, need)
    await loadSheetData()
  } catch (e) {
    console.error('创建空行失败:', e)
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
    search: true,
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

      const updates = []
      for (const [row, prop, oldVal, newVal] of changes) {
        if (oldVal === newVal) continue
        const rowData = hot.getSourceDataAtRow(row)
        if (!rowData || !rowData.id) {
          console.warn(`[afterChange] 跳过无id行: row=${row}, prop=${prop}, id=${rowData?.id}`)
          continue
        }
        updates.push({ id: rowData.id, [prop]: newVal || '' })
      }

      if (updates.length > 0) {
        console.log(`[afterChange] source=${source}, 发送 ${updates.length} 条更新`)
        saving.value = true
        // 按id合并同行更新，减少数据量
        const merged = new Map()
        for (const u of updates) {
          if (!merged.has(u.id)) merged.set(u.id, {})
          Object.assign(merged.get(u.id), u)
        }
        const mergedUpdates = [...merged.values()]
        console.log(`[afterChange] 合并后 ${mergedUpdates.length} 条`)
        // 分批发送，每批最多200条
        const batches = []
        for (let i = 0; i < mergedUpdates.length; i += 200) {
          batches.push(mergedUpdates.slice(i, i + 200))
        }
        savePromise = Promise.all(
          batches.map(batch => orgAPI.batchSave(currentSheet.value.id, batch)
            .catch(e => { console.error('保存失败:', e); throw e })
          )
        ).then(() => {
          setSaveStatus('saved')
        }).catch(() => {
          setSaveStatus('error')
        }).finally(() => { saving.value = false })
      }
    },
    afterPaste(data, coords) {
      // 粘贴后检查是否有无id的行需要创建
      const newRows = []
      for (let i = 0; i < tableData.value.length; i++) {
        const row = tableData.value[i]
        if (!row.id && colKeys.some(k => row[k] && String(row[k]).trim())) {
          newRows.push({ index: i, data: { ...row } })
        }
      }

      if (newRows.length === 0) {
        // 没有新行需要创建，只需补充空行
        savePromise.then(async () => {
          await new Promise(r => setTimeout(r, 1000))
          const empty = countEmptyRows(tableData.value)
          if (empty < 50) {
            saving.value = true
            try {
              await orgAPI.batchCreateEmpty(currentSheet.value.id, MIN_EMPTY_ROWS - empty)
            } catch (e) {
              console.error('补充空行失败:', e)
            }
            saving.value = false
          }
        })
        return
      }

      // 有无id的行，先批量创建，拿到id后再更新内容
      saving.value = true
      ;(async () => {
        try {
          const res = await orgAPI.batchCreateEmpty(currentSheet.value.id, newRows.length)
          const ids = res.data?.ids || res.ids || []
          // 把id赋给对应的行
          for (let i = 0; i < newRows.length && i < ids.length; i++) {
            tableData.value[newRows[i].index].id = ids[i]
          }
          // 收集这些行的所有非空字段，批量保存
          const updates = []
          for (const { index, data } of newRows) {
            const row = tableData.value[index]
            if (row.id) {
              const update = { id: row.id }
              for (const key of colKeys) {
                if (row[key] && String(row[key]).trim()) {
                  update[key] = row[key]
                }
              }
              updates.push(update)
            }
          }
          // 分批保存
          const batchSize = 200
          for (let i = 0; i < updates.length; i += batchSize) {
            await orgAPI.batchSave(currentSheet.value.id, updates.slice(i, i + batchSize))
          }
          console.log(`[afterPaste] 创建并保存了 ${updates.length} 个新行`)

          // 补充空行
          const empty = countEmptyRows(tableData.value)
          if (empty < 50) {
            await orgAPI.batchCreateEmpty(currentSheet.value.id, MIN_EMPTY_ROWS - empty)
          }
        } catch (e) {
          console.error('粘贴处理失败:', e)
        }
        saving.value = false
      })()
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
    afterSelectionEnd() {
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
  // 只导出有内容的行
  const data = tableData.value
    .filter(r => colKeys.some(k => r[k] && String(r[k]).trim()))
    .map(r => {
      const row = {}
      colKeys.forEach((key, i) => { row[colHeaders[i]] = r[key] || '' })
      return row
    })
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '学员数据')
  XLSX.writeFile(wb, `${currentSheet.value.sheet_name || '数据表'}.xlsx`)
}

const triggerImport = () => {
  fileInput.value?.click()
}

const handleImport = async (e) => {
  const file = e.target.files?.[0]
  if (!file || !currentSheet.value) return

  saving.value = true
  try {
    const reader = new FileReader()
    const base64 = await new Promise((resolve) => {
      reader.onload = () => {
        const result = reader.result.split(',')[1]
        resolve(result)
      }
      reader.readAsDataURL(file)
    })

    const res = await orgAPI.importExcel(currentSheet.value.id, base64)
    if (res.message) {
      alert(res.message)
    }
    await loadSheetData()
  } catch (err) {
    alert('导入失败: ' + (err.message || '未知错误'))
  }
  saving.value = false
  // 清空 input 以便重复选择同一文件
  if (fileInput.value) fileInput.value.value = ''
}

const doSearch = () => {
  if (!hot) return
  const searchPlugin = hot.getPlugin('search')
  searchPlugin.query(searchKeyword.value)
  hot.render()
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

.saving-hint {
  font-size: 13px;
  margin-left: auto;
}
.saving-hint.saving { color: #667eea; }
.saving-hint.saved { color: #10b981; }
.saving-hint.error { color: #ef4444; font-weight: 500; }

.table-toolbar { display: flex; gap: 8px; margin-bottom: 12px; align-items: center; }

.search-input {
  margin-left: auto;
  padding: 8px 14px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  width: 200px;
  outline: none;
  transition: border-color 0.2s;
}
.search-input:focus { border-color: #667eea; }

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
.tool-btn.import { background: #f59e0b; }

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
