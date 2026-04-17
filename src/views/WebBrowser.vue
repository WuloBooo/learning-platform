<template>
  <div class="browser-page">
    <!-- 左侧固定指引面板 -->
    <div class="guide-sidebar" v-if="currentSite">
      <div class="sidebar-header">
        <button class="btn-back" @click="backToSelect">← 返回</button>
        <div class="site-info">
          <span class="site-icon">{{ currentSite.icon }}</span>
          <span class="site-name">{{ currentSite.name }}</span>
        </div>
      </div>

      <div class="sidebar-body">
        <!-- 步骤标签 -->
        <div class="step-tabs">
          <button
            v-for="(section, index) in currentSite.guide"
            :key="index"
            :class="['step-tab', { active: currentStep === index }]"
            @click="currentStep = index"
          >
            {{ index + 1 }}
          </button>
        </div>

        <!-- 步骤内容 -->
        <div class="step-content" v-if="currentSite.guide[currentStep]">
          <h3>{{ currentSite.guide[currentStep].title }}</h3>

          <ul v-if="currentSite.guide[currentStep].steps" class="step-list">
            <li v-for="(step, idx) in currentSite.guide[currentStep].steps" :key="idx">
              <span class="num">{{ idx + 1 }}</span>
              <span class="text">{{ step }}</span>
            </li>
          </ul>

          <p v-if="currentSite.guide[currentStep].content" class="step-desc">
            {{ currentSite.guide[currentStep].content }}
          </p>

          <div v-if="currentSite.guide[currentStep].tips" class="step-tips">
            💡 {{ currentSite.guide[currentStep].tips }}
          </div>
        </div>

        <!-- 导航 -->
        <div class="step-nav">
          <button @click="prevStep" :disabled="currentStep === 0">← 上一步</button>
          <span>{{ currentStep + 1 }}/{{ currentSite.guide.length }}</span>
          <button @click="nextStep" :disabled="currentStep === currentSite.guide.length - 1">下一步 →</button>
        </div>
      </div>

      <div class="sidebar-footer">
        <div class="usage-tips">
          <p class="tips-title">💡 如何边看指引边操作？</p>
          <p>1. 点击「打开网站」在新窗口打开</p>
          <p>2. 点击浏览器右上角 <strong>□</strong> 取消最大化</p>
          <p>3. 拖动窗口到屏幕右边</p>
          <p>4. 左边看指引，右边操作网站</p>
        </div>

        <!-- 手机扫码查看 -->
        <div class="qrcode-section">
          <p class="qrcode-title">📱 手机扫码查看指引</p>
          <div class="qrcode-box">
            <canvas ref="qrcodeCanvas"></canvas>
          </div>
          <p class="qrcode-hint">手机上看指引，电脑上操作网站</p>
        </div>

        <div class="footer-btns">
          <a :href="currentSite.url" target="_blank" class="btn-open">打开网站</a>
          <button class="btn-copy" @click="copyUrl">复制链接</button>
        </div>
      </div>
    </div>

    <!-- 右侧网站区域 -->
    <div class="site-area">
      <!-- 网站选择界面 -->
      <div v-if="!currentSite" class="site-selector">
        <div class="selector-content">
          <h1>🌐 网页操作指引助手</h1>
          <p>选择需要操作的网站，左侧将显示详细操作指引</p>

          <div class="website-grid">
            <div
              v-for="site in websites"
              :key="site.id"
              class="website-card"
              @click="selectSite(site)"
            >
              <div class="card-icon">{{ site.icon }}</div>
              <div class="card-info">
                <h3>{{ site.name }}</h3>
                <p>{{ getSiteDesc(site.id) }}</p>
              </div>
              <span class="card-arrow">→</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 网站显示 -->
      <template v-else>
        <div class="site-toolbar">
          <div class="url-display">
            <span class="url-label">当前网站：</span>
            <span class="url-text">{{ currentSite.url }}</span>
          </div>
          <a :href="currentSite.url" target="_blank" class="btn-external">新标签页打开 ↗</a>
        </div>

        <div class="site-content">
          <div class="site-placeholder">
            <div class="placeholder-icon">🌐</div>
            <h2>{{ currentSite.name }}</h2>
            <p class="placeholder-url">{{ currentSite.url }}</p>
            <p class="placeholder-hint">请点击左侧「打开网站」按钮，在新窗口中操作</p>
            <a :href="currentSite.url" target="_blank" class="btn-go-site">
              打开网站
            </a>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'
import QRCode from 'qrcode'

const currentSite = ref(null)
const currentStep = ref(0)
const qrcodeCanvas = ref(null)

// 生成二维码
const generateQRCode = async () => {
  if (!qrcodeCanvas.value || !currentSite.value) return

  // 获取当前页面URL，带上网站ID参数
  const baseUrl = window.location.origin + window.location.pathname
  const url = `${baseUrl}?site=${currentSite.value.id}`

  try {
    await QRCode.toCanvas(qrcodeCanvas.value, url, {
      width: 120,
      margin: 2,
      color: {
        dark: '#333333',
        light: '#ffffff'
      }
    })
  } catch (err) {
    console.error('二维码生成失败:', err)
  }
}

// 监听网站选择变化，生成二维码
watch(currentSite, () => {
  nextTick(() => {
    generateQRCode()
  })
})

// 页面加载时检查URL参数，自动选中网站
onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  const siteId = params.get('site')
  if (siteId) {
    const site = websites.find(s => s.id === siteId)
    if (site) {
      currentSite.value = site
    }
  }
})

const websites = [
  {
    id: 'sanhang',
    name: '三航科技AI学习平台',
    icon: '🤖',
    url: 'http://119.23.152.194:5173',
    guide: [
      { title: '1. 平台登录', steps: ['打开平台网址', '输入用户名和密码', '点击登录按钮', '首次登录请修改初始密码'] },
      { title: '2. 课程学习', steps: ['进入课程中心浏览课程', '选择人工智能训练师相关课程', '点击课程开始学习', '完成课程视频和练习'] },
      { title: '3. 考试报名', steps: ['查看考试安排和报名时间', '选择要参加的考试科目', '填写报名信息并提交', '等待审核通过后缴费'], tips: '请确保个人信息填写准确' },
      { title: '4. 学习进度', content: '在个人中心可查看学习时长、已完成课程、考试成绩等信息。完成规定学时后方可参加考试。' }
    ]
  },
  {
    id: 'xbgydx',
    name: '西工大深研院技能认定',
    icon: '🎓',
    url: 'https://xbgydx.jndj.ks.zjyun.org',
    guide: [
      { title: '1. 系统登录', steps: ['访问认定平台', '使用身份证号作为用户名', '输入初始密码（身份证后6位）', '首次登录需完善个人信息'] },
      { title: '2. 考试报名', steps: ['查看当期认定计划', '选择认定职业和等级', '上传证件照和相关证明材料', '确认报名信息并提交审核'] },
      { title: '3. 准考证打印', steps: ['报名审核通过后', '在"我的考试"中查看考试安排', '考前一周开放准考证打印', '下载并打印准考证'], tips: '考试当天需携带身份证和准考证' },
      { title: '4. 成绩与证书', content: '考试结束后15个工作日内公布成绩。成绩合格者可查看电子证书，纸质证书由认定机构统一发放。' }
    ]
  },
  {
    id: 'gdzw',
    name: '广东政务服务网',
    icon: '🏛️',
    url: 'https://ggfw.hrss.gd.gov.cn/OUPX/#/skillLevelRecognition',
    guide: [
      { title: '1. 账号注册', steps: ['点击右上角"登录"', '选择"个人注册"', '填写真实姓名和身份证号', '完成人脸识别验证'] },
      { title: '2. 技能等级认定', steps: ['进入"职业技能等级认定"专区', '查看认定机构名单', '选择合适的评价机构', '获取报名码进行报名'] },
      { title: '3. 证书查询', steps: ['登录后进入证书查询页面', '输入证书编号或身份证号', '查看证书上网进度', '下载电子证书'], tips: '证书信息一般在考试通过后1-2个月内上网' },
      { title: '4. 常用服务', content: '政策直通车、创业培训、培训机构名单公示等。可订阅政策推送，及时获取最新政策信息。' }
    ]
  },
  {
    id: 'chsi',
    name: '学信网',
    icon: '📜',
    url: 'https://www.chsi.com.cn/xlcx/bgcx.jsp',
    guide: [
      { title: '1. 账号注册', steps: ['访问学信网官网', '点击"学信档案"', '使用手机号注册账号', '完成实名认证'] },
      { title: '2. 申请验证报告', steps: ['登录学信档案', '选择"在线验证报告"', '申请学籍/学历/学位验证报告', '设置验证有效期（最长6个月）'] },
      { title: '3. 报告使用', steps: ['获取16位在线验证码', '下载PDF版验证报告', '提供验证码给用人单位查询', '可多次延长验证有效期'], tips: '2025年3月27日起启用新版验证报告样式' },
      { title: '4. 注意事项', content: '自2018年1月1日起，学信网提供免费的电子验证报告服务。在线验证码是查询真伪的重要凭证，请妥善保管。' }
    ]
  },
  {
    id: 'gdrst',
    name: '广东省人社厅',
    icon: '🏢',
    url: 'http://hrss.gd.gov.cn/gdsbfw/',
    guide: [
      { title: '1. 网站导航', steps: ['首页查看最新政策法规', '进入"办事服务"栏目', '选择需要办理的业务类型', '查看办事指南和流程'] },
      { title: '2. 社保服务', steps: ['查询个人社保缴费记录', '办理社保转移接续', '申请社保待遇', '打印参保证明'] },
      { title: '3. 就业服务', steps: ['浏览招聘信息', '登记求职信息', '申请就业创业补贴', '参加职业培训'] },
      { title: '4. 联系方式', content: '地址：广州市东风中路483号 | 电话：020-12333 | 可在线咨询或前往服务大厅办理业务' }
    ]
  },
  {
    id: 'huawei',
    name: '华为时习知',
    icon: '💻',
    url: 'https://shixizhi.huawei.com',
    guide: [
      { title: '1. 平台登录', steps: ['使用华为账号登录', '如无账号需先注册', '绑定企业或学校信息', '完善个人学习档案'] },
      { title: '2. 课程学习', steps: ['浏览华为认证课程', '选择技术方向（云计算、AI、5G等）', '加入学习路径', '完成在线学习和实验'] },
      { title: '3. 认证考试', steps: ['预约华为认证考试', '选择考试中心和考试时间', '完成考试缴费', '参加考试获取认证'], tips: 'HCIA/HCIP/HCIE认证在业界认可度高' },
      { title: '4. 学习社区', content: '参与技术讨论、分享学习心得、获取最新技术资讯。可与华为技术专家和同行交流学习经验。' }
    ]
  },
  {
    id: 'osta',
    name: '职业技能证书查询',
    icon: '🔍',
    url: 'http://zscx.osta.org.cn/',
    guide: [
      { title: '1. 证书查询', steps: ['进入"证书查询"栏目', '选择查询类型', '输入证书编号、证件号码、姓名', '点击查询按钮'] },
      { title: '2. 用户登录', steps: ['个人用户选择"个人登录"', '法人用户选择"法人登录"', '使用12333账号登录', '忘记密码可通过手机找回'] },
      { title: '3. 外国人来华工作许可', steps: ['自2024年6月3日起统一在此办理', '原科技部平台用户需重置密码', '法人用户需完成实名认证', '按指引提交申请材料'], tips: '法定代表人为外国籍的，选择"普通护照"证件类型注册' },
      { title: '4. 注意事项', content: '全国人力资源和社会保障政务服务平台提供统一的政务服务。如遇登录问题，可查看操作手册或拨打12333咨询。' }
    ]
  }
]

const siteDescs = {
  sanhang: '人工智能训练师在线学习平台',
  xbgydx: '西工大深研院技能等级认定',
  gdzw: '广东省人社厅网上服务',
  chsi: '学籍学历查询验证',
  gdrst: '广东省人社厅官网',
  huawei: '华为认证培训平台',
  osta: '职业资格证书查询'
}

const getSiteDesc = (id) => siteDescs[id] || ''

const selectSite = (site) => {
  currentSite.value = site
  currentStep.value = 0
}

const backToSelect = () => {
  currentSite.value = null
}

const prevStep = () => {
  if (currentStep.value > 0) currentStep.value--
}

const nextStep = () => {
  if (currentSite.value && currentStep.value < currentSite.value.guide.length - 1) {
    currentStep.value++
  }
}

const copyUrl = () => {
  if (currentSite.value) {
    navigator.clipboard.writeText(currentSite.value.url).then(() => alert('已复制'))
  }
}
</script>

<style scoped>
.browser-page {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* 左侧指引面板 */
.guide-sidebar {
  width: 340px;
  min-width: 340px;
  background: #fff;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  z-index: 100;
}

.sidebar-header {
  padding: 14px 16px;
  border-bottom: 1px solid #eee;
  background: #f8fafc;
}

.btn-back {
  padding: 6px 12px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  margin-bottom: 10px;
}

.btn-back:hover {
  background: #f5f5f5;
}

.site-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.site-icon {
  font-size: 24px;
}

.site-name {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.btn-float {
  width: 100%;
  padding: 8px;
  background: #1D6FE8;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.sidebar-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.step-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
}

.step-tab {
  width: 36px;
  height: 36px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: #666;
  transition: all 0.2s;
}

.step-tab:hover {
  border-color: #1D6FE8;
  color: #1D6FE8;
}

.step-tab.active {
  background: #1D6FE8;
  border-color: #1D6FE8;
  color: #fff;
}

.step-content h3 {
  font-size: 16px;
  color: #333;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 2px solid #f0f0f0;
}

.step-list {
  list-style: none;
  padding: 0;
  margin: 0 0 12px 0;
}

.step-list li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  margin-bottom: 8px;
}

.step-list .num {
  width: 24px;
  height: 24px;
  background: #1D6FE8;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.step-list .text {
  color: #444;
  line-height: 1.5;
  font-size: 14px;
}

.step-desc {
  color: #555;
  line-height: 1.7;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  font-size: 14px;
}

.step-tips {
  background: #fff3cd;
  border-left: 3px solid #ffc107;
  padding: 10px 12px;
  border-radius: 0 8px 8px 0;
  font-size: 13px;
  color: #856404;
}

.step-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.step-nav button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  background: #f0f4f8;
  color: #666;
}

.step-nav button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.step-nav span {
  color: #888;
  font-size: 13px;
}

.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid #eee;
}

.usage-tips {
  background: #f0f7ff;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 12px;
  text-align: left;
}

.usage-tips .tips-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 6px;
}

.usage-tips p {
  font-size: 12px;
  color: #555;
  margin-bottom: 3px;
  line-height: 1.5;
}

.usage-tips p:last-child {
  margin-bottom: 0;
}

.usage-tips strong {
  color: #1D6FE8;
}

/* 二维码区域 */
.qrcode-section {
  background: #f8f4ff;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  text-align: center;
}

.qrcode-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
}

.qrcode-box {
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
}

.qrcode-box canvas {
  border-radius: 8px;
  background: #fff;
  padding: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.qrcode-hint {
  font-size: 12px;
  color: #666;
}

.footer-btns {
  display: flex;
  gap: 10px;
}

.btn-open {
  flex: 1;
  padding: 10px;
  background: #1D6FE8;
  color: #fff;
  text-align: center;
  text-decoration: none;
  border-radius: 6px;
  font-size: 14px;
}

.btn-copy {
  padding: 10px 16px;
  background: #f0f4f8;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

/* 右侧网站区域 */
.site-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
  min-width: 0;
}

.site-selector {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1D6FE8;
  padding: 40px;
}

.selector-content {
  max-width: 800px;
  text-align: center;
}

.selector-content h1 {
  font-size: 28px;
  color: #fff;
  margin-bottom: 8px;
}

.selector-content > p {
  color: rgba(255,255,255,0.8);
  margin-bottom: 32px;
}

.website-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
  text-align: left;
}

.website-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(255,255,255,0.95);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.website-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}

.card-icon {
  font-size: 32px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f4f8;
  border-radius: 10px;
}

.card-info {
  flex: 1;
}

.card-info h3 {
  font-size: 14px;
  color: #333;
  margin-bottom: 2px;
}

.card-info p {
  font-size: 12px;
  color: #888;
}

.card-arrow {
  color: #ccc;
  font-size: 18px;
}

.site-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e0e0e0;
}

.url-display {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

.url-label {
  color: #888;
  font-size: 13px;
  white-space: nowrap;
}

.url-text {
  color: #666;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-external {
  padding: 6px 12px;
  background: #1D6FE8;
  color: #fff;
  text-decoration: none;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
}

.site-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1D6FE8;
}

.site-placeholder {
  text-align: center;
  padding: 40px;
  color: #fff;
}

.placeholder-icon {
  font-size: 72px;
  margin-bottom: 20px;
}

.site-placeholder h2 {
  font-size: 24px;
  margin-bottom: 10px;
}

.placeholder-url {
  font-size: 14px;
  opacity: 0.8;
  margin-bottom: 20px;
}

.placeholder-hint {
  font-size: 15px;
  opacity: 0.9;
  margin-bottom: 24px;
}

.btn-go-site {
  display: inline-block;
  padding: 14px 36px;
  background: rgba(255,255,255,0.2);
  color: #fff;
  text-decoration: none;
  border-radius: 10px;
  font-size: 16px;
  border: 2px solid rgba(255,255,255,0.5);
  transition: all 0.2s;
}

.btn-go-site:hover {
  background: rgba(255,255,255,0.3);
}
</style>
