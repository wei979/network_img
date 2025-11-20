#!/bin/bash
# FastAPI 技能快速查詢腳本

echo "=== FastAPI 技能快速查詢 ==="
echo ""

# 1. 檔案上傳（當前 analysis_server.py 使用）
echo "1️⃣  檔案上傳相關："
grep -n "UploadFile" output/fastapi/SKILL.md | head -3
echo ""

# 2. 依賴注入（優化共用邏輯）
echo "2️⃣  依賴注入模式："
grep -n "Depends" output/fastapi/SKILL.md | head -3
echo ""

# 3. CORS 設定（允許 Vite 跨域）
echo "3️⃣  CORS 中介軟體："
grep -n "CORS" output/fastapi/references/advanced.md | head -2
echo ""

# 4. WebSocket（即時推送）
echo "4️⃣  WebSocket 支援："
grep -n "websocket" output/fastapi/references/advanced.md | head -2
echo ""

# 5. 後台任務（大型檔案處理）
echo "5️⃣  後台任務："
grep -n "background" output/fastapi/references/advanced.md | head -2
echo ""

echo "✅ 使用範例: grep -A 20 \"## WebSockets\" output/fastapi/references/advanced.md"
