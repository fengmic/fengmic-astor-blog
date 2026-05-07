# 数据库初始化脚本 (PowerShell)
# 用途: 初始化 D1 数据库表结构
# 使用: .\scripts\init-db.ps1

Write-Host "🔧 初始化 D1 数据库..." -ForegroundColor Cyan

# 检查数据库 ID
if ([string]::IsNullOrEmpty($env:DB_DATABASE_ID)) {
    Write-Host "❌ 错误: 未设置 DB_DATABASE_ID 环境变量" -ForegroundColor Red
    Write-Host "请设置: `$env:DB_DATABASE_ID='your-database-id'" -ForegroundColor Yellow
    exit 1
}

# 执行迁移脚本
Write-Host "📝 执行迁移脚本..." -ForegroundColor Cyan
wrangler d1 execute astor-blog `
    --file=./migrations/0001_init_comments_table.sql `
    --env=production

Write-Host "✅ 数据库初始化完成！" -ForegroundColor Green
Write-Host ""
Write-Host "验证表结构:" -ForegroundColor Cyan
wrangler d1 shell astor-blog --env=production
