#!/bin/bash
# 数据库初始化脚本
# 用途: 初始化 D1 数据库表结构
# 使用: bash scripts/init-db.sh

set -e

echo "🔧 初始化 D1 数据库..."

# 检查数据库 ID
if [ -z "$DB_DATABASE_ID" ]; then
    echo "❌ 错误: 未设置 DB_DATABASE_ID 环境变量"
    echo "请设置: export DB_DATABASE_ID=your-database-id"
    exit 1
fi

# 执行迁移脚本
echo "📝 执行迁移脚本..."
wrangler d1 execute astor-blog \
    --file=./migrations/0001_init_comments_table.sql \
    --env=production

echo "✅ 数据库初始化完成！"
echo ""
echo "验证表结构:"
wrangler d1 shell astor-blog --env=production <<EOF
SELECT name FROM sqlite_master WHERE type='table';
EOF
