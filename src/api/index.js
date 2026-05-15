const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL
  }

  getHeaders(includeAuth = true) {
    const headers = {
      'Content-Type': 'application/json'
    }
    
    if (includeAuth) {
      const token = localStorage.getItem('token')
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }
    
    return headers
  }

  async request(endpoint, options = {}) {
    const { includeAuth = true, ...fetchOptions } = options
    
    const config = {
      ...fetchOptions,
      headers: {
        ...this.getHeaders(includeAuth),
        ...fetchOptions.headers
      }
    }
    
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config)
      const data = await response.json()
      
      if (!response.ok) {
        const error = new Error(data.message || '请求失败')
        error.status = response.status
        error.data = data
        throw error
      }
      
      return data
    } catch (error) {
      if (error.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
      throw error
    }
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' })
  }

  post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' })
  }
}

export const api = new ApiService()

export const authAPI = {
  register: (data) => api.post('/auth/register', data, { includeAuth: false }),
  login: (data) => api.post('/auth/login', data, { includeAuth: false }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me')
}

export const userAPI = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data) => api.put('/user/profile', data),
  changePassword: (data) => api.put('/user/password', data)
}

export const registrationAPI = {
  submit: (data) => api.post('/registration', data),
  getMyRegistrations: () => api.get('/registration/my'),
  getAll: () => api.get('/registration/all'),
  updateStatus: (id, status) => api.put(`/registration/${id}/status`, { status })
}

export const adminAPI = {
  getUsers: (params) => api.get(`/admin/users?${new URLSearchParams(params)}`),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),

  getExams: (params) => api.get(`/admin/exams?${new URLSearchParams(params)}`),
  createExam: (data) => api.post('/admin/exams', data),
  updateExam: (id, data) => api.put(`/admin/exams/${id}`, data),
  deleteExam: (id) => api.delete(`/admin/exams/${id}`),

  getMaterials: (params) => api.get(`/admin/materials?${new URLSearchParams(params)}`),
  createMaterial: (data) => api.post('/admin/materials', data),
  updateMaterial: (id, data) => api.put(`/admin/materials/${id}`, data),
  deleteMaterial: (id) => api.delete(`/admin/materials/${id}`),

  getBanners: () => api.get('/admin/banners'),
  createBanner: (data) => api.post('/admin/banners', data),
  updateBanner: (id, data) => api.put(`/admin/banners/${id}`, data),
  deleteBanner: (id) => api.delete(`/admin/banners/${id}`),

  getNews: (params) => api.get(`/admin/news?${new URLSearchParams(params || {})}`),
  createNews: (data) => api.post('/admin/news', data),
  updateNews: (id, data) => api.put(`/admin/news/${id}`, data),
  deleteNews: (id) => api.delete(`/admin/news/${id}`),

  getTimelines: () => api.get('/admin/timelines'),
  createTimeline: (data) => api.post('/admin/timelines', data),
  updateTimeline: (id, data) => api.put(`/admin/timelines/${id}`, data),
  deleteTimeline: (id) => api.delete(`/admin/timelines/${id}`),

  getPrograms: (params) => api.get(`/admin/programs?${new URLSearchParams(params || {})}`),
  createProgram: (data) => api.post('/admin/programs', data),
  updateProgram: (id, data) => api.put(`/admin/programs/${id}`, data),
  deleteProgram: (id) => api.delete(`/admin/programs/${id}`),

  getStatistics: () => api.get('/admin/statistics')
}

export const practiceAPI = {
  getCategories: (params) => api.get(`/practice/categories?${new URLSearchParams(params || {})}`),
  createCategory: (data) => api.post('/practice/categories', data),

  getQuestions: (params) => api.get(`/practice/questions?${new URLSearchParams(params)}`),
  getQuestion: (id) => api.get(`/practice/questions/${id}`),
  createQuestion: (data) => api.post('/practice/questions', data),
  updateQuestion: (id, data) => api.put(`/practice/questions/${id}`, data),
  deleteQuestion: (id) => api.delete(`/practice/questions/${id}`),
  importQuestions: (data) => api.post('/practice/questions/import', data),

  getPapers: (params) => api.get(`/practice/papers?${new URLSearchParams(params)}`),
  getPaper: (id) => api.get(`/practice/papers/${id}`),
  createPaper: (data) => api.post('/practice/papers', data),
  updatePaper: (id, data) => api.put(`/practice/papers/${id}`, data),
  deletePaper: (id) => api.delete(`/practice/papers/${id}`),
  addQuestionToPaper: (paperId, questionId, score = 2) => api.post(`/practice/papers/${paperId}/questions`, { question_id: questionId, score }),
  removeQuestionFromPaper: (paperId, questionId) => api.delete(`/practice/papers/${paperId}/questions/${questionId}`),

  submitAnswer: (data) => api.post('/practice/submit', data),
  submitPaper: (data) => api.post('/practice/submit-paper', data),

  getWrongQuestions: (params) => api.get(`/practice/wrong-questions?${new URLSearchParams(params)}`),
  masterWrongQuestion: (id) => api.post(`/practice/wrong-questions/${id}/master`),

  getHistory: (params) => api.get(`/practice/history?${new URLSearchParams(params)}`),
  getStatistics: () => api.get('/practice/statistics'),
  getPublicExams: (params) => api.get(`/practice/public/exams?${new URLSearchParams(params)}`, { includeAuth: false }),
  getAIExplanation: (questionId) => api.get(`/practice/questions/${questionId}/ai-explanation`)
}

// 公开API（无需登录）
export const publicAPI = {
  getBanners: () => api.get('/public/banners', { includeAuth: false }),
  getNews: (params) => api.get(`/public/news?${new URLSearchParams(params || {})}`, { includeAuth: false }),
  getNewsDetail: (id) => api.get(`/public/news/${id}`, { includeAuth: false }),
  getTimelines: () => api.get('/public/timelines', { includeAuth: false }),
  getPrograms: (params) => api.get(`/public/programs?${new URLSearchParams(params || {})}`, { includeAuth: false }),
  getMaterials: (params) => api.get(`/public/materials?${new URLSearchParams(params || {})}`, { includeAuth: false }),
  getMaterialDetail: (id) => api.get(`/public/materials/${id}`, { includeAuth: false })
}

// 机构端API
export const orgAPI = {
  login: (data) => api.post('/org/login', data, { includeAuth: false }),
  getMe: () => {
    const token = localStorage.getItem('org_token')
    return fetch(`${API_BASE_URL}/org/me`, {
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    }).then(r => r.json())
  },
  getSheets: () => {
    const token = localStorage.getItem('org_token')
    return fetch(`${API_BASE_URL}/org/sheets`, {
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    }).then(r => r.json())
  },
  getSheetStudents: (sheetId) => {
    const token = localStorage.getItem('org_token')
    return fetch(`${API_BASE_URL}/org/sheets/${sheetId}/students`, {
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    }).then(r => r.json())
  },
  addStudent: (sheetId, data) => {
    const token = localStorage.getItem('org_token')
    return fetch(`${API_BASE_URL}/org/sheets/${sheetId}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(data)
    }).then(r => r.json())
  },
  updateStudent: (sheetId, rowId, data) => {
    const token = localStorage.getItem('org_token')
    return fetch(`${API_BASE_URL}/org/sheets/${sheetId}/students/${rowId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(data)
    }).then(r => r.json())
  },
  deleteStudent: (sheetId, rowId) => {
    const token = localStorage.getItem('org_token')
    return fetch(`${API_BASE_URL}/org/sheets/${sheetId}/students/${rowId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    }).then(r => r.json())
  },
  batchSave: (sheetId, rows) => {
    const token = localStorage.getItem('org_token')
    return fetch(`${API_BASE_URL}/org/sheets/${sheetId}/batch-save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ rows })
    }).then(r => r.json())
  },
  batchCreateEmpty: (sheetId, count) => {
    const token = localStorage.getItem('org_token')
    return fetch(`${API_BASE_URL}/org/sheets/${sheetId}/batch-create-empty`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ count })
    }).then(r => r.json())
  },
  importExcel: (sheetId, fileData) => {
    const token = localStorage.getItem('org_token')
    return fetch(`${API_BASE_URL}/org/sheets/${sheetId}/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ fileData })
    }).then(r => r.json())
  },
  setCellColor: (sheetId, data) => {
    const token = localStorage.getItem('org_token')
    return fetch(`${API_BASE_URL}/org/sheets/${sheetId}/colors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(data)
    }).then(r => r.json())
  },
  removeCellColor: (sheetId, data) => {
    const token = localStorage.getItem('org_token')
    return fetch(`${API_BASE_URL}/org/sheets/${sheetId}/colors`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(data)
    }).then(r => r.json())
  }
}

// 管理员工作流API
export const workflowAPI = {
  getOrgUsers: () => api.get('/workflow/admin/org-users'),
  createOrgUser: (data) => api.post('/workflow/admin/org-users', data),
  updateOrgUser: (id, data) => api.put(`/workflow/admin/org-users/${id}`, data),
  deleteOrgUser: (id) => api.delete(`/workflow/admin/org-users/${id}`),

  getExamPlans: () => api.get('/workflow/admin/exam-plans'),
  createExamPlan: (data) => api.post('/workflow/admin/exam-plans', data),
  updateExamPlan: (id, data) => api.put(`/workflow/admin/exam-plans/${id}`, data),
  deleteExamPlan: (id) => api.delete(`/workflow/admin/exam-plans/${id}`),

  getSheets: (params) => api.get(`/workflow/admin/sheets?${new URLSearchParams(params || {})}`),
  createSheet: (data) => api.post('/workflow/admin/sheets', data),
  batchCreateSheets: (data) => api.post('/workflow/admin/sheets/batch-create', data),
  updateSheet: (id, data) => api.put(`/workflow/admin/sheets/${id}`, data),
  deleteSheet: (id) => api.delete(`/workflow/admin/sheets/${id}`),
  getSheetStudents: (sheetId) => api.get(`/workflow/admin/sheets/${sheetId}/students`),
  addSheetStudent: (sheetId, data) => api.post(`/workflow/admin/sheets/${sheetId}/students`, data),
  updateSheetStudent: (sheetId, rowId, data) => api.put(`/workflow/admin/sheets/${sheetId}/students/${rowId}`, data),
  removeSheetStudent: (sheetId, rowId) => api.delete(`/workflow/admin/sheets/${sheetId}/students/${rowId}`),
  batchCreateEmpty: (sheetId, count) => api.post(`/workflow/admin/sheets/${sheetId}/batch-create-empty`, { count }),
}
