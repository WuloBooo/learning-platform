#!/bin/bash

# 学习平台一键部署脚本
# 使用方法: ./deploy.sh

set -e

SERVER_IP="8.135.43.209"
SERVER_USER="root"
SERVER_PATH="/var/www/learning-platform"
LOCAL_PATH="/Users/wulobooo/Desktop/学习平台"

echo "🚀 开始部署学习平台..."

# 1. 构建前端
echo "📦 构建前端..."
cd "$LOCAL_PATH"
npm run build

# 2. 打包文件
echo "📝 打包文件..."
tar --exclude='node_modules' --exclude='server/node_modules' -czvf learning-platform.tar.gz dist server package.json

# 3. 上传到服务器
echo "⬆️  上传文件到服务器..."
scp learning-platform.tar.gz $SERVER_USER@$SERVER_IP:/root/

# 4. 在服务器上部署
echo "🔧 服务器端部署..."
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
cd /var/www/learning-platform
rm -rf dist server package.json
tar -xzvf /root/learning-platform.tar.gz
cd server && npm install --production
pm2 restart learning-api
echo "✅ 部署完成!"
ENDSSH

echo "🎉 部署成功！访问: http://8.135.43.209:8080"
