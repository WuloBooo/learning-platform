<template>
  <div class="admin-page">
    <div class="page-toolbar">
      <div class="toolbar-info">
        <h2>考场题目分发管理</h2>
        <p class="hint">创建考场并上传题目 zip 文件，学生通过识别码下载</p>
      </div>
      <button class="btn-primary" @click="openAddModal">
        + 创建考场
      </button>
    </div>

    <div class="data-table" v-if="!loading">
      <table>
        <thead>
          <tr>
            <th>考试名称</th>
            <th>考场</th>
            <th>识别码</th>
            <th>题目文件</th>
            <th>下载人数</th>
            <th>状态</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="room in rooms" :key="room.id">
            <td>{{ room.exam_name }}</td>
            <td>{{ room.room_name }}</td>
            <td><code class="room-code">{{ room.room_code }}</code></td>
            <td>
              <span v-if="room.file_name" class="file-badge">
                {{ room.file_name }} ({{ formatFileSize(room.file_size) }})
              </span>
              <span v-else class="no-file">未上传</span>
            </td>
            <td>
              <button class="btn-link" @click="viewDownloads(room)">
                {{ room.download_count }} 人
              </button>
            </td>
            <td>
              <span :class="['status-badge', room.status]">
                {{ room.status === 'active' ? '开放' : '已关闭' }}
              </span>
            </td>
            <td>{{ formatDate(room.created_at) }}</td>
            <td class="actions">
              <button class="btn-upload" @click="triggerUpload(room)">上传文件</button>
              <button class="btn-edit" @click="editRoom(room)">编辑</button>
              <button class="btn-toggle" @click="toggleStatus(room)">
                {{ room.status === 'active' ? '关闭' : '开启' }}
              </button>
              <button class="btn-delete" @click="deleteRoom(room)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="empty-state" v-if="rooms.length === 0">
        暂无考场数据，点击"创建考场"开始
      </div>
    </div>

    <div class="loading-state" v-else>加载中...</div>

    <!-- 隐藏的文件上传 input -->
    <input type="file" ref="fileInput" accept=".zip" @change="handleFileUpload" style="display:none" />

    <!-- 创建/编辑弹窗 -->
    <div class="modal-overlay" v-if="showModal" @click.self="showModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingRoom ? '编辑考场' : '创建考场' }}</h3>
          <button class="modal-close" @click="showModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>考试名称</label>
            <input v-model="form.exam_name" placeholder="如：2026年春季实操考试" />
          </div>
          <div class="form-group">
            <label>考场名称</label>
            <input v-model="form.room_name" placeholder="如：考场A" />
          </div>
          <div class="form-group">
            <label>识别码（纯数字）</label>
            <input v-model="form.room_code" placeholder="如：1234" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="showModal = false">取消</button>
          <button class="btn-primary" @click="saveRoom" :disabled="saving">
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 下载记录弹窗 -->
    <div class="modal-overlay" v-if="showDownloadModal" @click.self="showDownloadModal = false">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3>{{ downloadRoom?.room_name }} - 下载记录 ({{ downloads.length }} 人)</h3>
          <button class="modal-close" @click="showDownloadModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="data-table">
            <table>
              <thead>
                <tr>
                  <th>序号</th>
                  <th>IP 地址</th>
                  <th>下载时间</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(dl, i) in downloads" :key="dl.id">
                  <td>{{ i + 1 }}</td>
                  <td>{{ dl.ip_address }}</td>
                  <td>{{ formatDate(dl.downloaded_at) }}</td>
                </tr>
              </tbody>
            </table>
            <div class="empty-state" v-if="downloads.length === 0">暂无下载记录</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const API_BASE = '/api/exam-rooms'
const token = () => localStorage.getItem('token')

const rooms = ref([])
const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const showDownloadModal = ref(false)
const editingRoom = ref(null)
const downloadRoom = ref(null)
const downloads = ref([])
const uploadingRoom = ref(null)
const fileInput = ref(null)

const form = ref({
  exam_name: '',
  room_name: '',
  room_code: ''
})

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token()}`
})

const loadRooms = async () => {
  loading.value = true
  try {
    const res = await fetch(API_BASE, { headers: getHeaders() })
    const data = await res.json()
    rooms.value = data.data || []
  } catch (e) {
    console.error(e)
  }
  loading.value = false
}

const openAddModal = () => {
  editingRoom.value = null
  form.value = { exam_name: '', room_name: '', room_code: '' }
  showModal.value = true
}

const editRoom = (room) => {
  editingRoom.value = room
  form.value = { exam_name: room.exam_name, room_name: room.room_name, room_code: room.room_code }
  showModal.value = true
}

const saveRoom = async () => {
  if (!form.value.exam_name || !form.value.room_name || !form.value.room_code) {
    alert('请填写完整信息')
    return
  }
  if (!/^\d+$/.test(form.value.room_code)) {
    alert('识别码必须为纯数字')
    return
  }

  saving.value = true
  try {
    const url = editingRoom.value ? `${API_BASE}/${editingRoom.value.id}` : API_BASE
    const method = editingRoom.value ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: getHeaders(),
      body: JSON.stringify(form.value)
    })
    const data = await res.json()
    if (!res.ok) {
      alert(data.message || '操作失败')
      return
    }
    showModal.value = false
    await loadRooms()
  } catch (e) {
    alert('操作失败: ' + e.message)
  }
  saving.value = false
}

const deleteRoom = async (room) => {
  if (!confirm(`确定删除「${room.room_name}」？文件和下载记录将一并删除。`)) return
  try {
    const res = await fetch(`${API_BASE}/${room.id}`, {
      method: 'DELETE',
      headers: getHeaders()
    })
    if (res.ok) await loadRooms()
    else alert('删除失败')
  } catch (e) {
    alert('删除失败: ' + e.message)
  }
}

const toggleStatus = async (room) => {
  const newStatus = room.status === 'active' ? 'closed' : 'active'
  try {
    const res = await fetch(`${API_BASE}/${room.id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status: newStatus })
    })
    if (res.ok) await loadRooms()
  } catch (e) {
    alert('操作失败')
  }
}

const triggerUpload = (room) => {
  uploadingRoom.value = room
  fileInput.value.click()
}

const handleFileUpload = async (e) => {
  const file = e.target.files[0]
  if (!file || !uploadingRoom.value) return

  const formData = new FormData()
  formData.append('file', file)

  try {
    const res = await fetch(`${API_BASE}/${uploadingRoom.value.id}/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token()}` },
      body: formData
    })
    const data = await res.json()
    if (res.ok) {
      await loadRooms()
    } else {
      alert(data.message || '上传失败')
    }
  } catch (e) {
    alert('上传失败: ' + e.message)
  }
  e.target.value = ''
  uploadingRoom.value = null
}

const viewDownloads = async (room) => {
  downloadRoom.value = room
  try {
    const res = await fetch(`${API_BASE}/${room.id}/downloads`, { headers: getHeaders() })
    const data = await res.json()
    downloads.value = data.data || []
    showDownloadModal.value = true
  } catch (e) {
    alert('获取记录失败')
  }
}

const formatDate = (d) => {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN')
}

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return size.toFixed(1) + ' ' + units[i]
}

onMounted(loadRooms)
</script>

<style scoped>
.hint {
  color: var(--text-secondary);
  font-size: 14px;
  margin-top: 4px;
}
.room-code {
  background: var(--bg-tertiary);
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 16px;
  font-weight: bold;
  letter-spacing: 2px;
}
.file-badge {
  font-size: 13px;
  color: var(--text-secondary);
}
.no-file {
  color: var(--danger-color);
  font-size: 13px;
}
.status-badge {
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
}
.status-badge.active {
  background: #e6f9ee;
  color: #10b981;
}
.status-badge.closed {
  background: #fef2f2;
  color: #ef4444;
}
.btn-link {
  background: none;
  border: none;
  color: var(--primary-color);
  cursor: pointer;
  font-size: 14px;
  text-decoration: underline;
}
.btn-upload {
  padding: 4px 10px;
  border: 1px solid var(--primary-color);
  background: transparent;
  color: var(--primary-color);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}
.btn-upload:hover {
  background: var(--primary-color);
  color: white;
}
.btn-toggle {
  padding: 4px 10px;
  border: 1px solid var(--warning-color);
  background: transparent;
  color: var(--warning-color);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}
.btn-toggle:hover {
  background: var(--warning-color);
  color: white;
}
.toolbar-info h2 {
  margin: 0;
  font-size: 18px;
}
.modal-lg {
  width: 600px;
}
</style>
