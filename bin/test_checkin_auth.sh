#!/bin/bash

# 签到鉴权码测试脚本
# 用于测试签到功能的鉴权码验证逻辑

echo "========================================="
echo "签到鉴权码功能测试"
echo "========================================="
echo ""

# 配置
BASE_URL="${BASE_URL:-http://localhost:3000}"
API_URL="$BASE_URL/api/checkin"

echo "测试环境: $BASE_URL"
echo ""

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试函数
test_case() {
    local name=$1
    local token=$2
    local auth_code=$3
    local expected=$4
    
    echo -e "${YELLOW}测试: $name${NC}"
    
    response=$(curl -s -X POST "$API_URL/" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        -d "{\"authCode\": \"$auth_code\"}")
    
    echo "响应: $response"
    
    if echo "$response" | grep -q "$expected"; then
        echo -e "${GREEN}✓ 通过${NC}"
    else
        echo -e "${RED}✗ 失败${NC}"
    fi
    echo ""
}

echo "========================================="
echo "请按照以下步骤进行测试:"
echo "========================================="
echo ""
echo "1. 确保服务已启动 (默认: http://localhost:3000)"
echo "2. 登录系统并获取访问令牌"
echo "3. 在管理后台启用签到功能并设置鉴权码"
echo "4. 设置环境变量并运行此脚本:"
echo ""
echo "   export BASE_URL=http://localhost:3000"
echo "   export TOKEN=your_access_token"
echo "   export AUTH_CODE=your_auth_code"
echo "   bash bin/test_checkin_auth.sh"
echo ""
echo "========================================="
echo ""

if [ -z "$TOKEN" ]; then
    echo -e "${RED}错误: 请设置 TOKEN 环境变量${NC}"
    echo "使用方法: export TOKEN=your_access_token"
    exit 1
fi

if [ -z "$AUTH_CODE" ]; then
    echo -e "${YELLOW}警告: 未设置 AUTH_CODE 环境变量${NC}"
    echo "将使用空鉴权码进行测试"
    AUTH_CODE=""
fi

echo "开始测试..."
echo ""

# 测试用例
test_case "空鉴权码测试" "$TOKEN" "" "success"
test_case "正确鉴权码测试" "$TOKEN" "$AUTH_CODE" "success"
test_case "错误鉴权码测试" "$TOKEN" "wrong_code_123" "鉴权码错误"

echo "========================================="
echo "测试完成"
echo "========================================="
echo ""
echo "注意事项:"
echo "- 每天只能签到一次"
echo "- 如果已经签到，测试会返回'今日已签到'"
echo "- 可以查看后端日志获取更详细的错误信息"
echo ""
