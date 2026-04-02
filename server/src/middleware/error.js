export const errorHandler = (err, req, res, next) => {
  console.error('错误:', err)
  
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(400).json({ 
      message: '数据已存在',
      field: extractDuplicateField(err.message)
    })
  }
  
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ message: '关联数据不存在' })
  }
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      message: '数据验证失败',
      errors: err.errors 
    })
  }
  
  res.status(err.status || 500).json({
    message: err.message || '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
}

export const notFound = (req, res) => {
  res.status(404).json({ message: '请求的资源不存在' })
}

function extractDuplicateField(message) {
  const match = message.match(/for key '(.+?)'/)
  if (match) {
    const field = match[1].split('_')[1]
    return field || match[1]
  }
  return null
}
