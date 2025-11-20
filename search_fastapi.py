#!/usr/bin/env python3
"""FastAPI 技能搜尋工具"""
import sys
import os

def search_skill(query):
    """在 FastAPI 技能中搜尋關鍵字"""
    skill_dir = "output/fastapi"
    results = []
    
    # 搜尋所有 markdown 文件
    for root, dirs, files in os.walk(skill_dir):
        for file in files:
            if file.endswith('.md'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    lines = content.split('\n')
                    
                    for i, line in enumerate(lines):
                        if query.lower() in line.lower():
                            # 取得上下文（前後2行）
                            start = max(0, i - 2)
                            end = min(len(lines), i + 3)
                            context = '\n'.join(lines[start:end])
                            
                            results.append({
                                'file': os.path.basename(path),
                                'line': i + 1,
                                'context': context
                            })
                            break  # 每個檔案只顯示第一個匹配
    
    return results

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("用法: python search_fastapi.py <關鍵字>")
        print("範例: python search_fastapi.py dependencies")
        sys.exit(1)
    
    query = ' '.join(sys.argv[1:])
    print(f"🔍 搜尋關鍵字: {query}\n")
    
    results = search_skill(query)
    
    if not results:
        print("❌ 未找到相關內容")
    else:
        print(f"✅ 找到 {len(results)} 個結果:\n")
        for i, r in enumerate(results[:5], 1):  # 只顯示前5個
            print(f"{i}. {r['file']} (第 {r['line']} 行)")
            print(f"   {r['context'][:150]}...")
            print()

