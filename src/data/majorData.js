// 人工智能训练师 — 报名条件专业判断数据

// 本科符合条件的专业类（专业类名称包含这些关键词即匹配）
const bachelorClassKeywords = [
  '电子信息', '计算机', '电气', '集成电路',
  '基础医学', '法医学', '临床医学', '医学技术', '护理', '口腔医学', '公共卫生', '中医', '中西医结合', '药学', '中药学',
  '机械', '自动化',
  '教育', '体育', '师范'
]

// 专科符合条件的关键词
const collegeClassKeywords = [
  '电子信息', '通信', '计算机', '集成电路',
  '药学', '眼视光', '临床医学', '医学技术', '康复治疗', '护理', '公共卫生', '健康管理', '中医药',
  '机械设计制造', '汽车制造', '机电设备', '自动化', '航空装备', '轨道装备', '船舶',
  '教育', '体育', '语言'
]

// 研究生符合条件的关键词
const masterClassKeywords = [
  '电子科学', '信息与通信', '计算机', '软件工程', '网络空间安全', '电子信息技术', '集成电路工程', '光电信息', '人工智能', '大数据技术', '网络与信息安全',
  '基础医学', '临床医学', '口腔医学', '公共卫生', '中医学', '中西医结合', '药学', '中药学', '医学技术',
  '机械工程', '机械硕士', '控制科学', '控制工程',
  '教育学', '体育学', '师范'
]

// 判断某个专业是否符合报名条件
export function checkQualification(level, className, majorName) {
  const text = (className + ' ' + majorName).toLowerCase()

  let keywords = []
  if (level === '本科') keywords = bachelorClassKeywords
  else if (level === '专科') keywords = collegeClassKeywords
  else if (level === '研究生') keywords = masterClassKeywords
  else return { qualified: false, reason: '不支持的学历层次' }

  const matched = keywords.filter(k => text.includes(k.toLowerCase()))
  if (matched.length > 0) {
    return { qualified: true, matchedKeywords: matched }
  }

  return { qualified: false, reason: '该专业不在人工智能训练师报考条件范围内' }
}

export const relatedOccupations = '人工智能工程技术人员、呼叫中心服务员、电子商务师、数据标注员，幼师、学科教师、电教管理、网络信息管理、教育信息化建设等教育技术工作人员，算法工程师、网络安全工程师、图像处理工程师、医生、医疗数据分析、临床决策支持工程师、智能健康管理顾问、教育数据分析师、智能产品经理、在线教育平台AI开发工程师、体育数据分析师等职业'
