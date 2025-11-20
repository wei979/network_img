#!/usr/bin/env python3
import json

session = 'a86f3930-a02e-49be-8776-277400bfbfd2'

# Load connection_packets
cp_file = f'public/data/{session}/connection_packets.json'
data = json.load(open(cp_file, 'r', encoding='utf-8'))

print(f"Total connections: {len(data)}\n")

# Check first connection
conn_id = list(data.keys())[0]
packets = data[conn_id]
packet = packets[0] if packets else {}

print(f"Sample Connection: {conn_id}")
print(f"Packets in connection: {len(packets)}")
print(f"\nFirst packet new fields:")
print(f"  streamId: {packet.get('streamId')}")
print(f"  errorType: {packet.get('errorType')}")
print(f"  http: {packet.get('http')}")

# Search for HTTP packets
print(f"\n{'='*60}")
print("Searching for HTTP packets...")
print(f"{'='*60}")

http_count = 0
for cid, pkts in data.items():
    for pkt in pkts[:20]:
        if pkt.get('http'):
            http_count += 1
            http_info = pkt['http']
            print(f"\nConnection: {cid}")
            print(f"  Packet #{pkt['index']}")
            print(f"  HTTP Type: {http_info.get('type')}")
            if http_info.get('type') == 'request':
                print(f"  Method: {http_info.get('method')}")
                print(f"  Path: {http_info.get('path')}")
            else:
                print(f"  Status: {http_info.get('status')} {http_info.get('statusText')}")

            if http_count >= 3:
                break
    if http_count >= 3:
        break

print(f"\nTotal HTTP packets found in sample: {http_count}")

# Search for error packets
print(f"\n{'='*60}")
print("Searching for error packets...")
print(f"{'='*60}")

error_count = 0
for cid, pkts in data.items():
    for pkt in pkts:
        if pkt.get('errorType'):
            error_count += 1
            print(f"\nConnection: {cid}")
            print(f"  Packet #{pkt['index']}")
            print(f"  Error Type: {pkt['errorType']}")

            if error_count >= 3:
                break
    if error_count >= 3:
        break

print(f"\nTotal error packets found in sample: {error_count}")
