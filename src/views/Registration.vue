<template>
  <div class="registration-page">
    <div class="registration-container">
      <div class="registration-header">
        <h1>在线报名</h1>
        <p>填写报名信息，开启您的学习之旅</p>
      </div>
      
      <div class="progress-bar">
        <div class="progress-step" :class="{ active: currentStep >= 1, completed: currentStep > 1 }">
          <span class="step-number">1</span>
          <span class="step-label">基本信息</span>
        </div>
        <div class="progress-line" :class="{ active: currentStep > 1 }"></div>
        <div class="progress-step" :class="{ active: currentStep >= 2, completed: currentStep > 2 }">
          <span class="step-number">2</span>
          <span class="step-label">报考信息</span>
        </div>
        <div class="progress-line" :class="{ active: currentStep > 2 }"></div>
        <div class="progress-step" :class="{ active: currentStep >= 3, completed: currentStep > 3 }">
          <span class="step-number">3</span>
          <span class="step-label">教育背景</span>
        </div>
        <div class="progress-line" :class="{ active: currentStep > 3 }"></div>
        <div class="progress-step" :class="{ active: currentStep >= 4 }">
          <span class="step-number">4</span>
          <span class="step-label">确认提交</span>
        </div>
      </div>
      
      <form class="registration-form" @submit.prevent="handleSubmit">
        <div class="form-step" v-show="currentStep === 1">
          <h3>基本信息</h3>
          <div class="form-row">
            <div class="form-group">
              <label>姓名 <span class="required">*</span></label>
              <div class="input-wrapper">
                <input 
                  type="text" 
                  v-model="form.name" 
                  placeholder="请输入您的真实姓名"
                  :class="{ error: errors.name }"
                />
                <span class="help-icon" @mouseenter="showHelp('name')" @mouseleave="hideHelp">?</span>
              </div>
              <span class="error-text" v-if="errors.name">{{ errors.name }}</span>
            </div>
            
            <div class="form-group">
              <label>性别 <span class="required">*</span></label>
              <div class="radio-group">
                <label class="radio-label">
                  <input type="radio" v-model="form.gender" value="male" />
                  <span>男</span>
                </label>
                <label class="radio-label">
                  <input type="radio" v-model="form.gender" value="female" />
                  <span>女</span>
                </label>
              </div>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>身份证号 <span class="required">*</span></label>
              <div class="input-wrapper">
                <input 
                  type="text" 
                  v-model="form.idCard" 
                  placeholder="请输入18位身份证号码"
                  maxlength="18"
                  :class="{ error: errors.idCard }"
                />
                <span class="help-icon" @mouseenter="showHelp('idCard')" @mouseleave="hideHelp">?</span>
              </div>
              <span class="error-text" v-if="errors.idCard">{{ errors.idCard }}</span>
            </div>
            
            <div class="form-group">
              <label>出生日期</label>
              <input type="date" v-model="form.birthday" />
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>手机号码 <span class="required">*</span></label>
              <div class="input-wrapper">
                <input 
                  type="tel" 
                  v-model="form.phone" 
                  placeholder="请输入手机号码"
                  maxlength="11"
                  :class="{ error: errors.phone }"
                />
                <span class="help-icon" @mouseenter="showHelp('phone')" @mouseleave="hideHelp">?</span>
              </div>
              <span class="error-text" v-if="errors.phone">{{ errors.phone }}</span>
            </div>
            
            <div class="form-group">
              <label>电子邮箱</label>
              <input 
                type="email" 
                v-model="form.email" 
                placeholder="请输入电子邮箱（选填）"
                :class="{ error: errors.email }"
              />
              <span class="error-text" v-if="errors.email">{{ errors.email }}</span>
            </div>
          </div>
          
          <div class="form-group">
            <label>通讯地址</label>
            <input type="text" v-model="form.address" placeholder="请输入详细通讯地址" />
          </div>
        </div>
        
        <div class="form-step" v-show="currentStep === 2">
          <h3>报考信息</h3>
          <div class="form-group">
            <label>考试类型</label>
            <input type="text" value="人工智能训练师" readonly style="background: #f5f5f5; cursor: not-allowed;" />
          </div>
          
          <div class="form-group">
            <label>报考级别 <span class="required">*</span></label>
            <select v-model="form.examLevel" :class="{ error: errors.examLevel }">
              <option value="">请选择级别</option>
              <option value="5">五级（初级）</option>
              <option value="4">四级（中级）</option>
              <option value="3">三级（高级）</option>
            </select>
            <span class="error-text" v-if="errors.examLevel">{{ errors.examLevel }}</span>
          </div>
          
          <div class="form-group">
            <label>是否有相关工作经验</label>
            <div class="radio-group">
              <label class="radio-label">
                <input type="radio" v-model="form.hasExperience" :value="true" />
                <span>是</span>
              </label>
              <label class="radio-label">
                <input type="radio" v-model="form.hasExperience" :value="false" />
                <span>否</span>
              </label>
            </div>
          </div>
          
          <div class="form-group" v-if="form.hasExperience">
            <label>工作经历简介</label>
            <textarea v-model="form.experience" placeholder="请简要描述您的工作经历" rows="4"></textarea>
          </div>
        </div>
        
        <div class="form-step" v-show="currentStep === 3">
          <h3>教育背景</h3>
          <div class="form-row">
            <div class="form-group">
              <label>最高学历 <span class="required">*</span></label>
              <select v-model="form.education">
                <option value="">请选择</option>
                <option value="high_school">高中</option>
                <option value="college">大专</option>
                <option value="bachelor">本科</option>
                <option value="master">硕士</option>
                <option value="doctor">博士</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>毕业院校</label>
              <input type="text" v-model="form.school" placeholder="请输入毕业院校名称" />
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>所学专业</label>
              <input type="text" v-model="form.major" placeholder="请输入所学专业" />
            </div>
            
            <div class="form-group">
              <label>毕业年份</label>
              <input type="number" v-model="form.graduationYear" placeholder="如：2020" min="1950" max="2030" />
            </div>
          </div>
          
          <div class="form-group">
            <label>证书上传</label>
            <div class="upload-area">
              <div class="upload-btn" @click="triggerUpload">
                <span>📎 点击上传学历证书</span>
                <span class="upload-hint">支持JPG、PNG、PDF格式，最大5MB</span>
              </div>
              <input type="file" ref="fileInput" @change="handleUpload" accept=".jpg,.jpeg,.png,.pdf" hidden />
              <div class="uploaded-files" v-if="form.certificates.length">
                <div class="file-item" v-for="(file, index) in form.certificates" :key="index">
                  <span>{{ file.name }}</span>
                  <button type="button" class="remove-btn" @click="removeFile(index)">×</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="form-step" v-show="currentStep === 4">
          <h3>确认信息</h3>
          <div class="confirm-section">
            <h4>基本信息</h4>
            <div class="confirm-grid">
              <div class="confirm-item">
                <span class="label">姓名：</span>
                <span class="value">{{ form.name || '-' }}</span>
              </div>
              <div class="confirm-item">
                <span class="label">性别：</span>
                <span class="value">{{ form.gender === 'male' ? '男' : form.gender === 'female' ? '女' : '-' }}</span>
              </div>
              <div class="confirm-item">
                <span class="label">身份证号：</span>
                <span class="value">{{ form.idCard || '-' }}</span>
              </div>
              <div class="confirm-item">
                <span class="label">手机号码：</span>
                <span class="value">{{ form.phone || '-' }}</span>
              </div>
              <div class="confirm-item">
                <span class="label">电子邮箱：</span>
                <span class="value">{{ form.email || '-' }}</span>
              </div>
            </div>
          </div>
          
          <div class="confirm-section">
            <h4>报考信息</h4>
            <div class="confirm-grid">
              <div class="confirm-item">
                <span class="label">考试类型：</span>
                <span class="value">人工智能训练师</span>
              </div>
              <div class="confirm-item">
                <span class="label">报考级别：</span>
                <span class="value">{{ getExamLevelLabel(form.examLevel) }}</span>
              </div>
              <div class="confirm-item">
                <span class="label">工作经验：</span>
                <span class="value">{{ form.hasExperience ? '有' : '无' }}</span>
              </div>
              <div class="confirm-item" v-if="form.hasExperience && form.experience">
                <span class="label">工作经历：</span>
                <span class="value">{{ form.experience }}</span>
              </div>
            </div>
          </div>
          
          <div class="confirm-section">
            <h4>教育背景</h4>
            <div class="confirm-grid">
              <div class="confirm-item">
                <span class="label">最高学历：</span>
                <span class="value">{{ getEducationLabel(form.education) }}</span>
              </div>
              <div class="confirm-item">
                <span class="label">毕业院校：</span>
                <span class="value">{{ form.school || '-' }}</span>
              </div>
              <div class="confirm-item">
                <span class="label">所学专业：</span>
                <span class="value">{{ form.major || '-' }}</span>
              </div>
            </div>
          </div>
          
          <div class="agreement-section">
            <label class="checkbox-label">
              <input type="checkbox" v-model="form.agreement" />
              <span>我已阅读并同意 <a href="#" @click.prevent="showAgreement">《报名须知》</a> 和 <a href="#" @click.prevent="showPrivacy">《隐私政策》</a> <span class="required">*</span></span>
            </label>
          </div>
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn-draft" @click="saveDraft" v-if="currentStep < 4">
            💾 保存草稿
          </button>
          <button type="button" class="btn-prev" @click="prevStep" v-if="currentStep > 1">
            ← 上一步
          </button>
          <button type="button" class="btn-next" @click="nextStep" v-if="currentStep < 4">
            下一步 →
          </button>
          <button type="submit" class="btn-submit" v-if="currentStep === 4" :disabled="submitting">
            {{ submitting ? '提交中...' : '提交报名' }}
          </button>
        </div>
      </form>
    </div>
    
    <div class="help-tooltip" v-if="helpVisible" :style="helpPosition">
      {{ helpText }}
    </div>
    
    <div class="modal" v-if="showSuccessModal">
      <div class="modal-content">
        <div class="modal-icon success">✓</div>
        <h2>报名成功！</h2>
        <p>您的报名信息已提交，我们会尽快审核。</p>
        <p class="modal-detail">报名编号：{{ registrationNo }}</p>
        <p class="modal-tip">请妥善保存报名编号，用于查询审核进度</p>
        <button class="btn-primary" @click="closeModal">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { registrationAPI } from '../api'

const router = useRouter()
const userStore = useUserStore()

const currentStep = ref(1)
const submitting = ref(false)
const showSuccessModal = ref(false)
const registrationNo = ref('')
const fileInput = ref(null)

const helpVisible = ref(false)
const helpText = ref('')
const helpPosition = ref({})

const form = reactive({
  name: '',
  gender: '',
  idCard: '',
  birthday: '',
  phone: '',
  email: '',
  address: '',
  examType: '',
  examLevel: '',
  trainingProgram: '',
  examLocation: '',
  hasExperience: false,
  experience: '',
  education: '',
  school: '',
  major: '',
  graduationYear: '',
  certificates: [],
  agreement: false
})

const errors = reactive({})

const helpTexts = {
  name: '请填写与身份证一致的姓名',
  idCard: '请填写18位有效身份证号码，用于考试身份验证',
  phone: '请填写有效手机号码，用于接收考试通知'
}

const showHelp = (field) => {
  helpText.value = helpTexts[field] || ''
  helpVisible.value = true
}

const hideHelp = () => {
  helpVisible.value = false
}

const validateStep = (step) => {
  Object.keys(errors).forEach(key => delete errors[key])
  
  if (step === 1) {
    if (!form.name.trim()) errors.name = '请输入姓名'
    if (!form.gender) errors.gender = '请选择性别'
    if (!form.idCard || !/^\d{17}[\dXx]$/.test(form.idCard)) errors.idCard = '请输入正确的身份证号'
    if (!form.phone || !/^1[3-9]\d{9}$/.test(form.phone)) errors.phone = '请输入正确的手机号'
    // 邮箱改为选填，但如果填写了则验证格式
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = '请输入正确的邮箱格式'
  }
  
  if (step === 2) {
    if (!form.examLevel) errors.examLevel = '请选择报考级别'
  }
  
  return Object.keys(errors).length === 0
}

const nextStep = () => {
  if (validateStep(currentStep.value)) {
    currentStep.value++
    window.scrollTo(0, 0)
  }
}

const prevStep = () => {
  currentStep.value--
  window.scrollTo(0, 0)
}

const saveDraft = () => {
  localStorage.setItem('registrationDraft', JSON.stringify(form))
  alert('草稿已保存')
}

const handleSubmit = async () => {
  if (!form.agreement) {
    alert('请阅读并同意报名须知和隐私政策')
    return
  }
  
  submitting.value = true
  
  try {
    const response = await registrationAPI.submit({
      name: form.name,
      gender: form.gender,
      idCard: form.idCard,
      phone: form.phone,
      email: form.email,
      education: form.education,
      school: form.school,
      major: form.major,
      examType: 'ai',
      examLevel: form.examLevel,
      hasExperience: form.hasExperience,
      experience: form.experience
    })
    
    registrationNo.value = response.registration.registrationNo
    showSuccessModal.value = true
    localStorage.removeItem('registrationDraft')
  } catch (error) {
    alert(error.message || '提交失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}

const triggerUpload = () => {
  fileInput.value?.click()
}

const handleUpload = (e) => {
  const file = e.target.files[0]
  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      alert('文件大小不能超过5MB')
      return
    }
    form.certificates.push({
      name: file.name,
      size: file.size,
      file: file
    })
  }
}

const removeFile = (index) => {
  form.certificates.splice(index, 1)
}

const closeModal = () => {
  showSuccessModal.value = false
  router.push('/')
}

const getExamTypeLabel = (value) => {
  const labels = { ai: '人工智能训练师', data: '数据分析', software: '软件开发' }
  return labels[value] || '-'
}

const getExamLevelLabel = (value) => {
  const labels = { '5': '五级（初级）', '4': '四级（中级）', '3': '三级（高级）' }
  return labels[value] || '-'
}

const getLocationLabel = (value) => {
  const labels = { shenzhen: '深圳市', guangzhou: '广州市', online: '线上考试' }
  return labels[value] || '-'
}

const getTrainingLabel = (value) => {
  const labels = {
    ai_basic: '人工智能基础培训',
    ai_advanced: '人工智能进阶培训',
    python: 'Python数据分析培训',
    web: 'Web前端开发培训'
  }
  return labels[value] || '未选择'
}

const getEducationLabel = (value) => {
  const labels = {
    high_school: '高中',
    college: '大专',
    bachelor: '本科',
    master: '硕士',
    doctor: '博士'
  }
  return labels[value] || '-'
}

const showAgreement = () => {
  alert('报名须知：\n\n1. 请确保填写的信息真实有效\n2. 报名成功后请保持手机畅通\n3. 考试费用需在审核通过后缴纳\n4. 开考前7天可申请退款')
}

const showPrivacy = () => {
  alert('隐私政策：\n\n1. 我们严格保护您的个人信息安全\n2. 您的信息仅用于考试报名和相关服务\n3. 未经您的同意，我们不会向第三方透露您的信息')
}
</script>
