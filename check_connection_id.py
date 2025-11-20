import json

session_id = '3be63f91-1a4b-48a2-ac04-a7aaadabf236'
data = json.load(open(f'public/data/{session_id}/connection_packets.json', 'r', encoding='utf-8'))

target = 'timeout-10.1.1.14-4301-142.250.66.67-443-996-3985-250'
print(f'Target connection ID: {target}')
print(f'Exists in data: {target in data}')
print(f'\nAll connection IDs (first 30):')
for i, conn_id in enumerate(list(data.keys())[:30]):
    if 'timeout' in conn_id:
        print(f'{i+1}. [TIMEOUT] {conn_id}')
    else:
        print(f'{i+1}. {conn_id}')

print(f'\nSearching for similar IDs...')
for conn_id in data.keys():
    if '10.1.1.14-4301' in conn_id or '142.250.66.67-443' in conn_id:
        print(f'Found similar: {conn_id}')
