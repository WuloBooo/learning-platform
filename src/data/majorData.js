// 人工智能训练师 — 报名条件专业判断数据
// 匹配逻辑：从专业目录找到输入专业 → 取其专业类 → 提取代码 → 与可报考专业类代码匹配

// 可报考的专业类代码列表（从参考表提取）
// 本科代码格式：B0807 → 对应目录中专业类 809计算机类（去掉前缀B和前导零的0）
// 专科代码格式：C5101 → 对应目录中专业类 5101电子信息类
// 研究生按名称匹配

// 本科可报考专业类（参考表代码 → 目录中匹配的数字代码）
const bachelorCodes = [
  '0807', '0809', '0806', '3104', // 电子与信息大类
  '1001', '1009', '1003', '1010', '1005', '1006', '1004', '1005b', '1006b', '1007', '1008', // 医药卫生大类
  '0808', // 装备制造大类（仅自动化类，不含机械类）
  '0401', '0402'  // 教育与体育大类
]

// 本科专业类名称匹配（师范类不在代码里，需要名称匹配）
const bachelorNameKeywords = ['师范']

// 专科可报考专业类代码
const collegeCodes = [
  '5101', '5103', '5102', '5104', // 电子与信息大类
  '5203', '5209', '5201', '5205', '5206', '5202', '5207', '5208', '5204', // 医药卫生大类
  '4601', '4607', '4602', '4603', '4606', '4604', '4605', // 装备制造大类
  '5701', '5703', '5702' // 教育与体育大类
]

// 研究生可报考专业类名称
const masterNames = [
  '电子科学与技术', '信息与通信工程', '计算机科学与技术', '软件工程', '网络空间安全',
  '新一代电子信息技术', '通信工程', '集成电路工程', '计算机技术', '软件工程硕士',
  '光电信息工程', '人工智能', '大数据技术与工程', '网络与信息安全',
  '基础医学', '临床医学', '口腔医学', '公共卫生与预防医学',
  '中医学', '中西医结合', '药学', '中药学', '医学技术',
  '机械工程', '机械', '控制科学与工程', '控制工程',
  '教育学', '体育学', '师范'
]

// 去掉前导零用于比较
function normalizeCode(code) {
  return String(code).replace(/^0+/, '') || '0'
}

// 从专业类字符串中提取数字代码
function extractCode(className) {
  const match = String(className).match(/(\d+)/)
  return match ? normalizeCode(match[1]) : ''
}

// 判断是否符合报名条件
export function checkQualification(major) {
  if (!major) return { qualified: false, reason: '未找到该专业' }

  const level = major.level
  const className = String(major.className || '')
  const code = extractCode(className)

  if (level === '本科') {
    // 代码匹配（去掉前导零比较）
    const normalizedBachelor = bachelorCodes.map(normalizeCode)
    if (normalizedBachelor.includes(code)) {
      return { qualified: true, matchedCode: code, className }
    }
    // 名称匹配（师范类等）
    if (bachelorNameKeywords.some(k => className.includes(k) || (major.name || '').includes(k))) {
      return { qualified: true, matchedName: '师范类', className }
    }
    return { qualified: false, reason: '该专业不在人工智能训练师报考条件范围内' }
  }

  if (level === '专科') {
    const normalizedCollege = collegeCodes.map(normalizeCode)
    if (normalizedCollege.includes(code)) {
      return { qualified: true, matchedCode: code, className }
    }
    return { qualified: false, reason: '该专业不在人工智能训练师报考条件范围内' }
  }

  if (level === '研究生') {
    // 研究生按专业类名称匹配
    const matched = masterNames.filter(n => className.includes(n))
    if (matched.length > 0) {
      return { qualified: true, matchedName: matched[0], className }
    }
    return { qualified: false, reason: '该专业不在人工智能训练师报考条件范围内' }
  }

  return { qualified: false, reason: '不支持的学历层次' }
}

export const relatedOccupations = '人工智能工程技术人员、呼叫中心服务员、电子商务师、数据标注员，幼师、学科教师、电教管理、网络信息管理、教育信息化建设等教育技术工作人员，算法工程师、网络安全工程师、图像处理工程师、医生、医疗数据分析、临床决策支持工程师、智能健康管理顾问、教育数据分析师、智能产品经理、在线教育平台AI开发工程师、体育数据分析师等职业'
