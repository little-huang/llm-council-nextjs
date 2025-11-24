#!/bin/bash

# LLM Council Next.js 启动脚本

echo "🚀 LLM Council - Next.js 版本"
echo "================================"
echo ""

# 检查环境变量配置文件
if [ ! -f .env.local ] && [ ! -f .env ]; then
    echo "⚠️  未找到环境变量配置文件"
    echo ""
    echo "请创建 .env.local 或 .env 文件并配置 API 密钥："
    echo ""
    echo "  cp env.example .env.local"
    echo "  # 然后编辑 .env.local 填入你的 API 密钥"
    echo ""
    read -p "是否现在创建配置文件？(y/n): " create_env
    
    if [ "$create_env" = "y" ] || [ "$create_env" = "Y" ]; then
        read -p "请输入你的 OpenRouter API 密钥: " api_key
        echo "OPENROUTER_API_KEY=$api_key" > .env.local
        echo ""
        echo "✅ 已创建 .env.local 文件"
        echo ""
        read -p "是否自定义模型配置？(y/n，默认使用推荐配置): " custom_models
        
        if [ "$custom_models" = "y" ] || [ "$custom_models" = "Y" ]; then
            echo ""
            echo "请输入议会成员模型（逗号分隔，留空使用默认）："
            read -p "COUNCIL_MODELS: " council_models
            if [ ! -z "$council_models" ]; then
                echo "COUNCIL_MODELS=$council_models" >> .env.local
            fi
            
            echo ""
            echo "请输入主席模型（留空使用默认）："
            read -p "CHAIRMAN_MODEL: " chairman_model
            if [ ! -z "$chairman_model" ]; then
                echo "CHAIRMAN_MODEL=$chairman_model" >> .env.local
            fi
        fi
        echo ""
    else
        echo ""
        echo "❌ 未创建配置文件，无法启动"
        exit 1
    fi
fi

# 检查是否安装了依赖
if [ ! -d node_modules ]; then
    echo "📦 检测到未安装依赖，正在安装..."
    npm install
    echo ""
fi

# 检查是否有 Docker
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    echo "选择启动方式："
    echo "1. 本地开发模式（支持热重载）"
    echo "2. Docker 部署模式"
    echo ""
    read -p "请选择 (1/2，默认 1): " choice
    choice=${choice:-1}
    
    if [ "$choice" = "2" ]; then
        echo ""
        echo "🐳 使用 Docker 启动..."
        
        # 将 .env.local 内容复制到 .env（Docker Compose 使用）
        if [ -f .env.local ] && [ ! -f .env ]; then
            cp .env.local .env
            echo "✅ 已将 .env.local 复制到 .env"
        fi
        
        docker-compose up -d
        echo ""
        echo "✅ 服务已启动！"
        echo "📱 访问地址: http://localhost:3000"
        echo ""
        echo "查看日志: docker-compose logs -f"
        echo "停止服务: docker-compose down"
        exit 0
    fi
fi

# 本地开发模式
echo "🔧 启动开发服务器..."
echo ""
npm run dev
