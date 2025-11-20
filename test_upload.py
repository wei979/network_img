"""
測試 PCAP 上傳和分析功能
"""
import requests
import json
import os

print("測試上傳和分析功能...\n")

# 1. 建立新 session
print("1. 建立新 session...")
health_response = requests.get('http://localhost:8000/api/health')
print(f"   後端健康狀態: {health_response.json()}")

# 2. 上傳 PCAP 檔案
print("\n2. 上傳 PCAP 檔案...")
with open('lostpakage.pcapng', 'rb') as f:
    files = {'file': ('lostpakage.pcapng', f, 'application/octet-stream')}
    upload_response = requests.post('http://localhost:8000/api/analyze', files=files)

if upload_response.status_code == 200:
    result = upload_response.json()
    print(f"   ✓ 上傳成功!")
    print(f"   Session ID: {result.get('session_id')}")
    print(f"   封包數量: {result.get('packet_count')}")
    print(f"   Timeline 數量: {result.get('timeline_count')}")

    # 保存 session cookie
    session_cookie = upload_response.cookies.get('session_id')

    # 3. 取得 timelines
    print("\n3. 取得 timeline 資料...")
    cookies = {'session_id': session_cookie}
    timeline_response = requests.get('http://localhost:8000/api/timelines', cookies=cookies)

    if timeline_response.status_code == 200:
        timeline_data = timeline_response.json()
        timelines = timeline_data.get('timelines', [])
        print(f"   ✓ Timeline 資料取得成功")
        print(f"   Timeline 數量: {len(timelines)}")

        # 列出前 5 個 connection ID
        print(f"\n   前 5 個 Connection ID:")
        for i, t in enumerate(timelines[:5]):
            print(f"   {i+1}. {t['id']}")

        # 4. 測試取得封包資訊
        if timelines:
            test_connection_id = timelines[0]['id']
            print(f"\n4. 測試取得封包資訊...")
            print(f"   測試 Connection ID: {test_connection_id}")

            packets_response = requests.get(
                f'http://localhost:8000/api/packets/{test_connection_id}',
                cookies=cookies
            )

            if packets_response.status_code == 200:
                packet_data = packets_response.json()
                print(f"   ✓ 封包資訊取得成功")
                print(f"   封包數量: {packet_data.get('total_packets')}")
                print(f"\n✓✓✓ 所有測試通過！前後端資料一致！")
            else:
                print(f"   ✗ 取得封包資訊失敗: {packets_response.status_code}")
                print(f"   錯誤: {packets_response.text}")
    else:
        print(f"   ✗ 取得 timeline 失敗: {timeline_response.status_code}")
else:
    print(f"   ✗ 上傳失敗: {upload_response.status_code}")
    print(f"   錯誤: {upload_response.text}")
