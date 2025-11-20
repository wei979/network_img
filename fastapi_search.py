import json
import os
import sys

# 簡易搜尋工具
query = sys.argv[1] if len(sys.argv) > 1 else "dependencies"
data_dir = "output/fastapi_data/pages"

results = []
for file in os.listdir(data_dir):
    if file.endswith('.json'):
        with open(os.path.join(data_dir, file), 'r', encoding='utf-8') as f:
            doc = json.load(f)
            if query.lower() in doc['content'].lower() or query.lower() in doc['title'].lower():
                results.append({
                    'title': doc['title'],
                    'url': doc['url'],
                    'preview': doc['content'][:200] + '...'
                })

print(f"找到 {len(results)} 個相關頁面:\n")
for i, r in enumerate(results[:5], 1):
    print(f"{i}. {r['title']}")
    print(f"   URL: {r['url']}")
    print(f"   摘要: {r['preview']}\n")
