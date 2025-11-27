#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Network packet analysis and mind map generator."""

import os
import sys
import json
from datetime import datetime, timezone
from collections import Counter, defaultdict

try:
    from scapy.all import rdpcap, IP, TCP, UDP, ICMP
except ImportError:  # pragma: no cover - user environment specific
    print("Please install scapy: pip install scapy")
    sys.exit(1)


class NetworkAnalyzer:
    """Analyze pcap files and produce structured network insights."""

    def __init__(self, pcap_file: str):
        self.pcap_file = pcap_file
        self.packets = []
        self.analysis_results = {}
        self.last_error = None

    @staticmethod
    def _safe_print(message: str) -> None:
        try:
            print(message)
        except UnicodeEncodeError:
            safe_message = message.encode('ascii', 'backslashreplace').decode('ascii')
            print(safe_message)

    def load_packets(self) -> bool:
        """Load packets from the provided pcap/pcapng file."""
        self.last_error = None
        try:
            self._safe_print(f"Loading {self.pcap_file} ...")
            self.packets = rdpcap(self.pcap_file)
            self._safe_print(f"Loaded {len(self.packets)} packets")
            return True
        except Exception as exc:  # pragma: no cover - runtime safety
            self.last_error = str(exc)
            self._safe_print(f"Failed to load capture: {exc}")
            return False

    def basic_statistics(self):
        """Compute basic statistics for the capture."""
        if not self.packets:
            return None

        stats = {
            'total_packets': len(self.packets),
            'protocols': Counter(),
            'packet_sizes': [],
            'time_intervals': [],
            'src_ips': Counter(),
            'dst_ips': Counter(),
            'src_ports': Counter(),
            'dst_ports': Counter()
        }

        connection_counts = Counter()
        protocol_details = defaultdict(lambda: {
            'sources': Counter(),
            'destinations': Counter(),
            'conversations': Counter()
        })

        prev_time = None

        for packet in self.packets:
            packet_len = len(packet)
            stats['packet_sizes'].append(packet_len)

            packet_time = float(packet.time)
            if prev_time is not None:
                stats['time_intervals'].append(packet_time - prev_time)
            prev_time = packet_time

            if packet.haslayer(IP):
                ip_layer = packet[IP]
                src_ip = ip_layer.src
                dst_ip = ip_layer.dst

                stats['src_ips'][src_ip] += 1
                stats['dst_ips'][dst_ip] += 1

                protocol_name = None
                src_port = None
                dst_port = None

                if packet.haslayer(TCP):
                    protocol_name = 'TCP'
                    tcp_layer = packet[TCP]
                    src_port = tcp_layer.sport
                    dst_port = tcp_layer.dport
                elif packet.haslayer(UDP):
                    protocol_name = 'UDP'
                    udp_layer = packet[UDP]
                    src_port = udp_layer.sport
                    dst_port = udp_layer.dport
                elif packet.haslayer(ICMP):
                    protocol_name = 'ICMP'
                else:
                    protocol_name = 'Other IP'

                stats['protocols'][protocol_name] += 1

                if src_port is not None:
                    stats['src_ports'][src_port] += 1
                if dst_port is not None:
                    stats['dst_ports'][dst_port] += 1

                details = protocol_details[protocol_name]
                details['sources'][src_ip] += 1
                details['destinations'][dst_ip] += 1

                if src_port is not None and dst_port is not None:
                    conversation_label = f"{src_ip}:{src_port} -> {dst_ip}:{dst_port}"
                elif src_port is not None:
                    conversation_label = f"{src_ip}:{src_port} -> {dst_ip}"
                elif dst_port is not None:
                    conversation_label = f"{src_ip} -> {dst_ip}:{dst_port}"
                else:
                    conversation_label = f"{src_ip} -> {dst_ip}"

                details['conversations'][conversation_label] += 1

                connection_key = (protocol_name, src_ip, src_port, dst_ip, dst_port)
                connection_counts[connection_key] += 1
            else:
                stats['protocols']['Non-IP'] += 1

        stats['packet_size_summary'] = {
            'average': self.calculate_average(stats['packet_sizes']) if stats['packet_sizes'] else 0,
            'min': min(stats['packet_sizes']) if stats['packet_sizes'] else 0,
            'max': max(stats['packet_sizes']) if stats['packet_sizes'] else 0
        }

        stats['time_interval_summary'] = {
            'average_ms': self.calculate_average(stats['time_intervals']) * 1000 if stats['time_intervals'] else 0,
            'min_ms': min(stats['time_intervals']) * 1000 if stats['time_intervals'] else 0,
            'max_ms': max(stats['time_intervals']) * 1000 if stats['time_intervals'] else 0
        }

        serialized_details = {}
        for protocol, detail in protocol_details.items():
            serialized_details[protocol] = {
                'sources': self.counter_to_list(detail['sources'], top_n=10),
                'destinations': self.counter_to_list(detail['destinations'], top_n=10),
                'conversations': self.counter_to_list(detail['conversations'], top_n=20)
            }
        stats['protocol_details'] = serialized_details

        stats['top_connections'] = [
            {
                'protocol': proto,
                'src_ip': src_ip,
                'src_port': src_port,
                'dst_ip': dst_ip,
                'dst_port': dst_port,
                'packet_count': count
            }
            for (proto, src_ip, src_port, dst_ip, dst_port), count in connection_counts.most_common(500)
        ]

        self.analysis_results['basic_stats'] = stats
        self.analysis_results['connections'] = stats['top_connections']
        return stats

    def generate_protocol_timelines(self):
        """Build protocol timeline entries for visualization fixtures."""
        timelines = []
        if not self.packets:
            payload = {
                'sourceFiles': [os.path.basename(self.pcap_file)],
                'generatedAt': datetime.now(timezone.utc).isoformat(),
                'timelines': timelines
            }
            self.analysis_results['protocol_timelines'] = payload
            self.analysis_results['connection_packets'] = {}
            self.protocol_timelines = timelines  # Set as attribute for easy access
            return payload

        # 特定協議檢測
        tcp_handshakes = self._extract_tcp_handshakes()
        tcp_teardowns = self._extract_tcp_teardowns()
        udp_transfers = self._extract_udp_transfers()
        http_requests = self._detect_http_requests()
        timeouts = self._detect_timeouts()

        timelines.extend(tcp_handshakes)
        timelines.extend(tcp_teardowns)
        timelines.extend(udp_transfers)
        timelines.extend(http_requests)
        timelines.extend(timeouts)

        # Fallback: 如果沒有檢測到任何特定協議，使用通用 TCP 連線檢測
        if len(timelines) == 0 and len(self.packets) > 0:
            generic_tcp = self._extract_generic_tcp_connections()
            timelines.extend(generic_tcp)

        payload = {
            'sourceFiles': [os.path.basename(self.pcap_file)],
            'generatedAt': datetime.now(timezone.utc).isoformat(),
            'timelines': timelines
        }
        self.analysis_results['protocol_timelines'] = payload
        self.protocol_timelines = timelines  # Set as attribute for easy access

        # Build detailed packet information for each connection
        self._build_connection_packets(timelines)

        return payload

    def _extract_tcp_handshakes(self):
        timelines = []
        handshakes = {}

        for index, packet in enumerate(self.packets):
            if not packet.haslayer(IP) or not packet.haslayer(TCP):
                continue

            ip = packet[IP]
            tcp = packet[TCP]
            ts = float(packet.time)
            client_key = (ip.src, tcp.sport, ip.dst, tcp.dport)
            server_key = (ip.dst, tcp.dport, ip.src, tcp.sport)
            flags = int(tcp.flags)

            syn = bool(flags & 0x02)
            ack = bool(flags & 0x10)

            if syn and not ack:
                handshakes[client_key] = {
                    'syn_time': ts,
                    'syn_packet': index
                }
            elif syn and ack:
                info = handshakes.get(server_key)
                if info is not None:
                    info['syn_ack_time'] = ts
                    info['syn_ack_packet'] = index
            elif ack and not syn:
                info = handshakes.get(client_key)
                if info and 'syn_ack_time' in info:
                    syn_time = info['syn_time']
                    syn_ack_time = info['syn_ack_time']
                    ack_time = ts

                    timeline = {
                        'id': f"tcp-{client_key[0]}-{client_key[1]}-{client_key[2]}-{client_key[3]}",
                        'protocol': 'tcp',
                        'protocolType': 'tcp-handshake',  # 明確標示為 TCP 握手
                        'startEpochMs': int(syn_time * 1000),
                        'endEpochMs': int(ack_time * 1000),
                        'stages': [
                            {
                                'key': 'syn',
                                'label': 'SYN Sent',
                                'direction': 'forward',
                                'durationMs': max(800, int((syn_ack_time - syn_time) * 1000)),  # 最小 800ms
                                'packetRefs': [info['syn_packet']]
                            },
                            {
                                'key': 'syn-ack',
                                'label': 'SYN-ACK Received',
                                'direction': 'backward',
                                'durationMs': max(800, int((ack_time - syn_ack_time) * 1000)),  # 最小 800ms
                                'packetRefs': [info.get('syn_ack_packet', info['syn_packet'])]
                            },
                            {
                                'key': 'ack',
                                'label': 'ACK Confirmed',
                                'direction': 'forward',
                                'durationMs': max(800, 1),  # 最小 800ms
                                'packetRefs': [index]
                            }
                        ],
                        'metrics': {
                            'rttMs': max(1, int((ack_time - syn_time) * 1000)),
                            'packetCount': 3
                        }
                    }
                    timelines.append(timeline)
                    handshakes.pop(client_key, None)

        return timelines

    def _extract_tcp_teardowns(self):
        """檢測 TCP 四向揮手（連線結束）

        TCP Teardown 流程：
        1. 主動關閉方發送 FIN
        2. 被動方回覆 ACK
        3. 被動方發送 FIN
        4. 主動方回覆 ACK

        也處理簡化的雙向 FIN+ACK 情況
        """
        timelines = []
        teardowns = {}  # key: (initiator_ip, initiator_port, responder_ip, responder_port)

        for index, packet in enumerate(self.packets):
            if not packet.haslayer(IP) or not packet.haslayer(TCP):
                continue

            ip = packet[IP]
            tcp = packet[TCP]
            ts = float(packet.time)
            flags = int(tcp.flags)

            fin = bool(flags & 0x01)
            ack = bool(flags & 0x10)
            rst = bool(flags & 0x04)

            src_key = (ip.src, tcp.sport, ip.dst, tcp.dport)
            dst_key = (ip.dst, tcp.dport, ip.src, tcp.sport)

            # 檢測 FIN 封包（開始 teardown）
            if fin:
                if src_key not in teardowns and dst_key not in teardowns:
                    # 新的 teardown 序列
                    teardowns[src_key] = {
                        'fin1_time': ts,
                        'fin1_packet': index,
                        'initiator': src_key,
                        'packets': [index]
                    }
                elif dst_key in teardowns:
                    # 對方的 FIN（第二個 FIN）
                    info = teardowns[dst_key]
                    if 'fin2_time' not in info:
                        info['fin2_time'] = ts
                        info['fin2_packet'] = index
                        info['packets'].append(index)
                elif src_key in teardowns:
                    # 同方向重傳的 FIN，更新時間
                    info = teardowns[src_key]
                    info['packets'].append(index)

            # 檢測 ACK 封包
            elif ack and not fin and not rst:
                # 檢查是否是對 FIN 的 ACK
                if dst_key in teardowns:
                    info = teardowns[dst_key]
                    if 'ack1_time' not in info:
                        info['ack1_time'] = ts
                        info['ack1_packet'] = index
                        info['packets'].append(index)
                    elif 'fin2_time' in info and 'ack2_time' not in info:
                        info['ack2_time'] = ts
                        info['ack2_packet'] = index
                        info['packets'].append(index)

            # 檢測 RST 封包（強制結束）
            elif rst:
                if src_key in teardowns or dst_key in teardowns:
                    key = src_key if src_key in teardowns else dst_key
                    info = teardowns[key]
                    info['rst_time'] = ts
                    info['rst_packet'] = index
                    info['packets'].append(index)

        # 將完成的 teardown 轉換為 timeline
        for key, info in teardowns.items():
            # 至少需要一個 FIN
            if 'fin1_time' not in info:
                continue

            start_time = info['fin1_time']
            end_time = info.get('ack2_time') or info.get('rst_time') or info.get('fin2_time') or info.get('ack1_time') or start_time

            stages = []

            # Stage 1: FIN Sent
            stages.append({
                'key': 'fin1',
                'label': 'FIN Sent',
                'direction': 'forward',
                'durationMs': max(600, int((info.get('ack1_time', start_time) - start_time) * 1000)),
                'packetRefs': [info['fin1_packet']]
            })

            # Stage 2: ACK Received (如果有)
            if 'ack1_time' in info:
                stages.append({
                    'key': 'ack1',
                    'label': 'ACK Received',
                    'direction': 'backward',
                    'durationMs': max(600, int((info.get('fin2_time', info['ack1_time']) - info['ack1_time']) * 1000)),
                    'packetRefs': [info.get('ack1_packet', info['fin1_packet'])]
                })

            # Stage 3: FIN Received (如果有)
            if 'fin2_time' in info:
                stages.append({
                    'key': 'fin2',
                    'label': 'FIN Received',
                    'direction': 'backward',
                    'durationMs': max(600, int((info.get('ack2_time', info['fin2_time']) - info['fin2_time']) * 1000)),
                    'packetRefs': [info.get('fin2_packet', info['fin1_packet'])]
                })

            # Stage 4: Final ACK (如果有)
            if 'ack2_time' in info:
                stages.append({
                    'key': 'ack2',
                    'label': 'Final ACK',
                    'direction': 'forward',
                    'durationMs': max(600, 1),
                    'packetRefs': [info.get('ack2_packet', info['fin1_packet'])]
                })

            # RST 結束（如果有）
            if 'rst_time' in info:
                stages.append({
                    'key': 'rst',
                    'label': 'RST (Force Close)',
                    'direction': 'both',
                    'durationMs': max(600, 1),
                    'packetRefs': [info.get('rst_packet', info['fin1_packet'])]
                })

            timeline = {
                'id': f"tcp-teardown-{key[0]}-{key[1]}-{key[2]}-{key[3]}",
                'protocol': 'tcp',
                'protocolType': 'tcp-teardown',
                'startEpochMs': int(start_time * 1000),
                'endEpochMs': int(end_time * 1000),
                'stages': stages,
                'metrics': {
                    'teardownDurationMs': max(1, int((end_time - start_time) * 1000)),
                    'packetCount': len(info['packets'])
                }
            }
            timelines.append(timeline)

        return timelines

    def _extract_generic_tcp_connections(self):
        """提取通用 TCP 連線（作為 fallback）

        當其他特定協議檢測沒有結果時，按 5-tuple 分組所有 TCP 封包，
        創建基本的資料傳輸 timeline。
        """
        connections = {}  # key: (src_ip, src_port, dst_ip, dst_port)

        for index, packet in enumerate(self.packets):
            if not packet.haslayer(IP) or not packet.haslayer(TCP):
                continue

            ip = packet[IP]
            tcp = packet[TCP]
            ts = float(packet.time)
            length = len(packet)
            flags = int(tcp.flags)

            # 標準化 key（排序確保雙向一致）
            endpoint1 = (ip.src, tcp.sport)
            endpoint2 = (ip.dst, tcp.dport)
            normalized_key = tuple(sorted([endpoint1, endpoint2]))

            if normalized_key not in connections:
                connections[normalized_key] = {
                    'start_time': ts,
                    'end_time': ts,
                    'packets': [],
                    'total_bytes': 0,
                    'flags_seen': set()
                }

            conn = connections[normalized_key]
            conn['end_time'] = max(conn['end_time'], ts)
            conn['packets'].append(index)
            conn['total_bytes'] += length

            # 記錄看到的 flags
            if flags & 0x02:  # SYN
                conn['flags_seen'].add('SYN')
            if flags & 0x01:  # FIN
                conn['flags_seen'].add('FIN')
            if flags & 0x04:  # RST
                conn['flags_seen'].add('RST')
            if flags & 0x10:  # ACK
                conn['flags_seen'].add('ACK')
            if flags & 0x08:  # PSH
                conn['flags_seen'].add('PSH')

        timelines = []
        for key, conn in connections.items():
            # 至少需要 2 個封包才有意義
            if len(conn['packets']) < 2:
                continue

            start_time = conn['start_time']
            end_time = conn['end_time']
            duration_ms = max(1, int((end_time - start_time) * 1000))

            # 根據看到的 flags 決定 protocolType
            flags_seen = conn['flags_seen']
            if 'SYN' in flags_seen and 'FIN' in flags_seen:
                protocol_type = 'tcp-session'  # 完整會話
            elif 'SYN' in flags_seen:
                protocol_type = 'tcp-handshake'  # 可能是不完整的握手
            elif 'FIN' in flags_seen or 'RST' in flags_seen:
                protocol_type = 'tcp-teardown'  # 連線結束
            else:
                protocol_type = 'tcp-data'  # 純資料傳輸

            # 創建簡單的單階段或雙階段 timeline
            stages = []
            half_duration = max(800, duration_ms // 2)

            stages.append({
                'key': 'transfer',
                'label': 'Data Transfer',
                'direction': 'forward',
                'durationMs': half_duration,
                'packetRefs': conn['packets'][:len(conn['packets'])//2] or conn['packets'][:1]
            })

            stages.append({
                'key': 'response',
                'label': 'Response',
                'direction': 'backward',
                'durationMs': half_duration,
                'packetRefs': conn['packets'][len(conn['packets'])//2:] or conn['packets'][-1:]
            })

            endpoint1, endpoint2 = key
            timeline = {
                'id': f"tcp-data-{endpoint1[0]}-{endpoint1[1]}-{endpoint2[0]}-{endpoint2[1]}",
                'protocol': 'tcp',
                'protocolType': protocol_type,
                'startEpochMs': int(start_time * 1000),
                'endEpochMs': int(end_time * 1000),
                'stages': stages,
                'metrics': {
                    'durationMs': duration_ms,
                    'packetCount': len(conn['packets']),
                    'totalBytes': conn['total_bytes'],
                    'flagsSeen': list(flags_seen)
                }
            }
            timelines.append(timeline)

        return timelines

    def _extract_udp_transfers(self):
        transfers = {}

        for index, packet in enumerate(self.packets):
            if not packet.haslayer(IP) or not packet.haslayer(UDP):
                continue

            ip = packet[IP]
            udp = packet[UDP]
            ts = float(packet.time)
            key = (ip.src, udp.sport, ip.dst, udp.dport)
            info = transfers.setdefault(key, {
                'start': ts,
                'end': ts,
                'count': 0,
                'first_packet': index
            })
            info['end'] = ts
            info['count'] += 1

        timelines = []
        for (src_ip, src_port, dst_ip, dst_port), info in transfers.items():
            # 檢測 DNS (通常使用 UDP 53 port)
            is_dns = src_port == 53 or dst_port == 53
            protocol_type = 'dns-query' if is_dns else 'udp-transfer'

            timeline = {
                'id': f"udp-{src_ip}-{src_port}-{dst_ip}-{dst_port}",
                'protocol': 'udp' if not is_dns else 'dns',
                'protocolType': protocol_type,  # 明確標示協議類型
                'startEpochMs': int(info['start'] * 1000),
                'endEpochMs': int(info['end'] * 1000),
                'stages': [
                    {
                        'key': 'send',
                        'label': 'DNS Query' if protocol_type == 'dns-query' else 'UDP Transfer',
                        'direction': 'forward',
                        'durationMs': max(1200, int((info['end'] - info['start']) * 1000)),  # 最小 1.2 秒
                        'packetRefs': [info['first_packet']]
                    }
                ],
                'metrics': {
                    'packetCount': info['count']
                }
            }
            timelines.append(timeline)

        return timelines

    def _detect_http_requests(self):
        """檢測 HTTP/HTTPS 請求和回應

        修復：使用 processed_connections 追蹤已處理的連線，避免重複生成 timeline
        """
        timelines = []
        http_sessions = {}
        processed_connections = set()  # 追蹤已處理的連線（標準化 key）

        for index, packet in enumerate(self.packets):
            if not packet.haslayer(TCP) or not packet.haslayer(IP):
                continue

            ip = packet[IP]
            tcp = packet[TCP]
            ts = float(packet.time)

            # 檢測 HTTP (80) 和 HTTPS (443) port
            is_http = tcp.sport == 80 or tcp.dport == 80
            is_https = tcp.sport == 443 or tcp.dport == 443

            if not (is_http or is_https):
                continue

            # 標準化連線 key（排序確保雙向一致）
            normalized_key = tuple(sorted([(ip.src, tcp.sport), (ip.dst, tcp.dport)]))

            # 跳過已處理的連線
            if normalized_key in processed_connections:
                continue

            # 識別請求和回應
            conn_key = (ip.src, tcp.sport, ip.dst, tcp.dport)
            if conn_key not in http_sessions and (is_http or is_https):
                http_sessions[conn_key] = {
                    'start_time': ts,
                    'start_packet': index,
                    'is_https': is_https,
                    'src_ip': ip.src,
                    'src_port': tcp.sport,
                    'dst_ip': ip.dst,
                    'dst_port': tcp.dport
                }
            elif conn_key in http_sessions:
                session = http_sessions[conn_key]
                duration = (ts - session['start_time']) * 1000

                # 生成 HTTP/HTTPS timeline
                protocol_type = 'https-request' if session['is_https'] else 'http-request'
                timeline = {
                    'id': f"http-{session['src_ip']}-{session['src_port']}-{session['dst_ip']}-{session['dst_port']}",
                    'protocol': 'https' if session['is_https'] else 'http',
                    'protocolType': protocol_type,
                    'startEpochMs': int(session['start_time'] * 1000),
                    'endEpochMs': int(ts * 1000),
                    'stages': [
                        {
                            'key': 'request',
                            'label': 'HTTP Request',
                            'direction': 'forward',
                            'durationMs': max(600, int(duration * 0.3))  # 最小 600ms
                        },
                        {
                            'key': 'processing',
                            'label': 'Processing',
                            'direction': 'wait',
                            'durationMs': max(800, int(duration * 0.4))  # 最小 800ms
                        },
                        {
                            'key': 'response',
                            'label': '200 OK',
                            'direction': 'backward',
                            'durationMs': max(600, int(duration * 0.3))  # 最小 600ms
                        }
                    ],
                    'metrics': {
                        'responseTimeMs': int(duration),
                        'packetCount': 2
                    }
                }
                timelines.append(timeline)
                processed_connections.add(normalized_key)  # 標記為已處理
                http_sessions.pop(conn_key)

        return timelines

    def _detect_timeouts(self):
        """檢測連線超時情況

        修復：使用標準化雙向 key 和時間窗口去重，避免同一超時事件被重複記錄
        - 雙向連線會產生相同的 normalized_key
        - 時間窗口（四捨五入到秒）用於識別同一超時事件
        """
        timelines = []
        connections = {}
        processed_timeout_events = set()  # 追蹤已處理的超時事件 (normalized_key, time_window)

        for index, packet in enumerate(self.packets):
            if not packet.haslayer(TCP) or not packet.haslayer(IP):
                continue

            ip = packet[IP]
            tcp = packet[TCP]
            ts = float(packet.time)

            # 標準化連線 key（排序確保雙向一致）
            normalized_key = tuple(sorted([(ip.src, tcp.sport), (ip.dst, tcp.dport)]))
            conn_key = (ip.src, tcp.sport, ip.dst, tcp.dport)

            if normalized_key not in connections:
                connections[normalized_key] = {
                    'start_time': ts,
                    'last_time': ts,
                    'packet_count': 1,
                    'start_packet': index,
                    'conn_key': conn_key  # 保存原始方向用於 ID 生成
                }
            else:
                conn = connections[normalized_key]
                time_gap = ts - conn['last_time']

                # 如果超過 3 秒沒有封包，視為可能的超時
                if time_gap > 3.0:
                    # 使用時間窗口（四捨五入到秒）來識別同一超時事件
                    timeout_event_key = (normalized_key, round(conn['last_time']))

                    # 只有當這個超時事件尚未處理時才創建 timeline
                    if timeout_event_key not in processed_timeout_events:
                        orig = conn['conn_key']
                        timeline = {
                            'id': f"timeout-{orig[0]}-{orig[1]}-{orig[2]}-{orig[3]}-{conn['start_packet']}-{index}",
                            'protocol': 'tcp',
                            'protocolType': 'timeout',
                            'startEpochMs': int(conn['last_time'] * 1000),
                            'endEpochMs': int(ts * 1000),
                            'stages': [
                                {
                                    'key': 'waiting',
                                    'label': '等待回應',
                                    'direction': 'forward',
                                    'durationMs': int(time_gap * 1000 * 0.5)
                                },
                                {
                                    'key': 'timeout',
                                    'label': '連線超時',
                                    'direction': 'none',
                                    'durationMs': int(time_gap * 1000 * 0.5)
                                }
                            ],
                            'metrics': {
                                'timeoutMs': int(time_gap * 1000),
                                'packetCount': conn['packet_count']
                            }
                        }
                        timelines.append(timeline)
                        processed_timeout_events.add(timeout_event_key)
                        # 關鍵修復：更新 start_packet 為當前 index
                        # 這樣後續的超時事件不會重複包含已處理的封包範圍
                        conn['start_packet'] = index

                conn['last_time'] = ts
                conn['packet_count'] += 1
                conn['conn_key'] = conn_key  # 更新最近的方向

        return timelines

    def detect_packet_loss(self):
        """Detect basic packet loss indicators (retransmissions, sequence gaps)."""
        tcp_streams = defaultdict(list)
        packet_loss_indicators = []

        for index, packet in enumerate(self.packets):
            if packet.haslayer(TCP) and packet.haslayer(IP):
                tcp_layer = packet[TCP]
                ip_layer = packet[IP]
                stream_id = f"{ip_layer.src}:{tcp_layer.sport}-{ip_layer.dst}:{tcp_layer.dport}"
                tcp_streams[stream_id].append({
                    'packet_index': index,
                    'seq': tcp_layer.seq,
                    'ack': tcp_layer.ack,
                    'flags': tcp_layer.flags,
                    'time': float(packet.time),
                    'len': len(packet)
                })

        for stream_id, stream_packets in tcp_streams.items():
            if len(stream_packets) < 3:
                continue

            stream_packets.sort(key=lambda item: item['time'])

            seq_numbers = [entry['seq'] for entry in stream_packets]
            for idx in range(1, len(seq_numbers)):
                if seq_numbers[idx] <= seq_numbers[idx - 1]:
                    packet_loss_indicators.append({
                        'type': 'retransmission',
                        'stream': stream_id,
                        'packet_index': stream_packets[idx]['packet_index'],
                        'time': stream_packets[idx]['time']
                    })

            for idx in range(1, len(stream_packets)):
                prev = stream_packets[idx - 1]
                expected_seq = prev['seq'] + max(1, prev['len'] - 54)
                actual_seq = stream_packets[idx]['seq']
                if actual_seq > expected_seq + 1000:
                    packet_loss_indicators.append({
                        'type': 'sequence_gap',
                        'stream': stream_id,
                        'packet_index': stream_packets[idx]['packet_index'],
                        'time': stream_packets[idx]['time'],
                        'gap_size': actual_seq - expected_seq
                    })

        self.analysis_results['packet_loss'] = packet_loss_indicators
        return packet_loss_indicators

    def analyze_latency(self):
        """Extract latency-related metrics from the capture."""
        latency_data = {
            'ping_responses': [],
            'tcp_handshakes': [],
            'inter_packet_delays': []
        }

        for idx, packet in enumerate(self.packets):
            if packet.haslayer(ICMP):
                icmp_layer = packet[ICMP]
                if icmp_layer.type == 0:  # echo reply
                    for offset in range(max(0, idx - 100), idx):
                        prev_packet = self.packets[offset]
                        if (
                            prev_packet.haslayer(ICMP)
                            and prev_packet[ICMP].type == 8
                            and prev_packet[ICMP].id == icmp_layer.id
                        ):
                            rtt = (float(packet.time) - float(prev_packet.time)) * 1000
                            latency_data['ping_responses'].append({
                                'rtt': rtt,
                                'time': float(packet.time)
                            })
                            break

        tcp_handshakes = {}
        for packet in self.packets:
            if packet.haslayer(TCP) and packet.haslayer(IP):
                tcp_layer = packet[TCP]
                ip_layer = packet[IP]
                connection_id = f"{ip_layer.src}:{tcp_layer.sport}-{ip_layer.dst}:{tcp_layer.dport}"

                flags = int(tcp_layer.flags)
                if flags == 0x02:  # SYN
                    tcp_handshakes[connection_id] = {'syn_time': float(packet.time)}
                elif flags == 0x12 and connection_id in tcp_handshakes:  # SYN-ACK
                    tcp_handshakes[connection_id]['syn_ack_time'] = float(packet.time)
                elif flags == 0x10 and connection_id in tcp_handshakes:  # ACK
                    handshake = tcp_handshakes[connection_id]
                    if 'syn_ack_time' in handshake:
                        total_time = float(packet.time) - handshake['syn_time']
                        latency_data['tcp_handshakes'].append({
                            'handshake_time': total_time * 1000,
                            'time': float(packet.time)
                        })

        prev_time = None
        for packet in self.packets:
            current_time = float(packet.time)
            if prev_time is not None:
                delay = (current_time - prev_time) * 1000
                if delay < 1000:
                    latency_data['inter_packet_delays'].append({
                        'delay': delay,
                        'time': current_time
                    })
            prev_time = current_time

        self.analysis_results['latency'] = latency_data
        return latency_data

    def calculate_average(self, values):
        if not values:
            return 0
        return sum(values) / len(values)

    def calculate_std(self, values):
        if len(values) < 2:
            return 0
        avg = self.calculate_average(values)
        variance = sum((value - avg) ** 2 for value in values) / len(values)
        return variance ** 0.5

    def counter_to_list(self, counter, top_n=None):
        if not counter:
            return []
        if isinstance(counter, Counter):
            items = counter.most_common()
        else:
            items = sorted(counter.items(), key=lambda item: item[1], reverse=True)
        if top_n is not None:
            items = items[:top_n]
        return [{'name': str(key), 'count': value} for key, value in items]

    def detect_attacks(self):
        """偵測潛在的網路攻擊並計算攻擊指標。"""
        if not self.packets:
            return None

        # 初始化計數器
        tcp_flags = {
            'syn': 0,
            'syn_ack': 0,
            'ack': 0,
            'fin': 0,
            'rst': 0,
            'psh': 0
        }

        connections = defaultdict(lambda: {
            'packets': 0,
            'syn_count': 0,
            'ack_count': 0,
            'fin_count': 0,
            'rst_count': 0,
            'data_packets': 0,
            'first_time': None,
            'last_time': None
        })

        source_ips = Counter()
        target_ports = Counter()
        total_tcp_packets = 0

        # 時間範圍
        first_packet_time = None
        last_packet_time = None

        for packet in self.packets:
            if not packet.haslayer(IP):
                continue

            ip_layer = packet[IP]
            packet_time = float(packet.time)

            if first_packet_time is None:
                first_packet_time = packet_time
            last_packet_time = packet_time

            if packet.haslayer(TCP):
                total_tcp_packets += 1
                tcp_layer = packet[TCP]
                flags = tcp_layer.flags

                # 解析 TCP flags
                is_syn = bool(flags & 0x02)
                is_ack = bool(flags & 0x10)
                is_fin = bool(flags & 0x01)
                is_rst = bool(flags & 0x04)
                is_psh = bool(flags & 0x08)

                # 統計 flags
                if is_syn and not is_ack:
                    tcp_flags['syn'] += 1
                if is_syn and is_ack:
                    tcp_flags['syn_ack'] += 1
                if is_ack and not is_syn:
                    tcp_flags['ack'] += 1
                if is_fin:
                    tcp_flags['fin'] += 1
                if is_rst:
                    tcp_flags['rst'] += 1
                if is_psh:
                    tcp_flags['psh'] += 1

                # 連線追蹤
                src_ip = ip_layer.src
                dst_ip = ip_layer.dst
                src_port = tcp_layer.sport
                dst_port = tcp_layer.dport

                # 標準化連線 key（雙向）
                conn_key = tuple(sorted([(src_ip, src_port), (dst_ip, dst_port)]))
                conn = connections[conn_key]
                conn['packets'] += 1

                if is_syn and not is_ack:
                    conn['syn_count'] += 1
                if is_ack:
                    conn['ack_count'] += 1
                if is_fin:
                    conn['fin_count'] += 1
                if is_rst:
                    conn['rst_count'] += 1
                if is_psh:
                    conn['data_packets'] += 1

                if conn['first_time'] is None:
                    conn['first_time'] = packet_time
                conn['last_time'] = packet_time

                # 來源統計
                source_ips[src_ip] += 1
                target_ports[dst_port] += 1

        # 計算攻擊指標
        duration_seconds = (last_packet_time - first_packet_time) if first_packet_time and last_packet_time else 1
        duration_seconds = max(duration_seconds, 0.001)  # 避免除以零

        total_connections = len(connections)

        # RST 比例
        rst_ratio = tcp_flags['rst'] / total_tcp_packets if total_tcp_packets > 0 else 0

        # 每秒連線數
        connections_per_second = total_connections / duration_seconds

        # 握手完成率（有 SYN 且有對應 SYN-ACK 的比例）
        handshake_completion_rate = tcp_flags['syn_ack'] / tcp_flags['syn'] if tcp_flags['syn'] > 0 else 1

        # 無資料傳輸的連線比例
        teardown_without_data = sum(1 for c in connections.values()
                                    if c['data_packets'] == 0 and (c['fin_count'] > 0 or c['rst_count'] > 0))
        teardown_without_data_rate = teardown_without_data / total_connections if total_connections > 0 else 0

        # 來源 IP 集中度（最大來源佔總流量的比例）
        max_source_count = source_ips.most_common(1)[0][1] if source_ips else 0
        total_source_packets = sum(source_ips.values())
        source_concentration = max_source_count / total_source_packets if total_source_packets > 0 else 0

        # 目標端口集中度
        max_target_count = target_ports.most_common(1)[0][1] if target_ports else 0
        total_target_packets = sum(target_ports.values())
        target_concentration = max_target_count / total_target_packets if total_target_packets > 0 else 0

        # 攻擊類型判斷
        attack_type = None
        attack_description = None
        severity = 'normal'
        confidence = 0.0

        # SYN Flood 檢測
        if tcp_flags['syn'] > 100 and handshake_completion_rate < 0.3:
            attack_type = 'SYN Flood'
            attack_description = '大量 SYN 請求但極少完成握手，典型的 SYN Flood 攻擊'
            severity = 'high' if tcp_flags['syn'] > 500 else 'medium'
            confidence = min(0.9, (1 - handshake_completion_rate) * 0.8 + 0.2)

        # RST Flood 檢測
        elif rst_ratio > 0.5 and total_tcp_packets > 50:
            attack_type = 'RST Flood'
            attack_description = '超過 50% 的封包是 RST，可能是 RST Flood 攻擊或連線重置攻擊'
            severity = 'high' if rst_ratio > 0.7 else 'medium'
            confidence = min(0.9, rst_ratio * 0.9)

        # FIN Flood 檢測
        elif tcp_flags['fin'] > 100 and teardown_without_data_rate > 0.8:
            attack_type = 'FIN Flood'
            attack_description = '大量 FIN 封包但無實際資料傳輸，可能是 FIN Flood 攻擊'
            severity = 'high' if tcp_flags['fin'] > 500 else 'medium'
            confidence = min(0.9, teardown_without_data_rate * 0.85)

        # 連線耗盡攻擊檢測
        elif connections_per_second > 50 and teardown_without_data_rate > 0.7:
            attack_type = 'Connection Exhaustion'
            attack_description = '高速建立大量短暫連線，意圖耗盡伺服器連線資源'
            severity = 'high' if connections_per_second > 100 else 'medium'
            confidence = min(0.85, connections_per_second / 200 + teardown_without_data_rate * 0.3)

        # 端口掃描檢測
        elif len(target_ports) > 50 and source_concentration > 0.8:
            attack_type = 'Port Scan'
            attack_description = '單一來源掃描大量端口，可能是偵察行為'
            severity = 'low'
            confidence = min(0.8, len(target_ports) / 100 * 0.5 + source_concentration * 0.3)

        # 異常分數計算（0-100）
        anomaly_score = 0
        if rst_ratio > 0.3:
            anomaly_score += rst_ratio * 30
        if handshake_completion_rate < 0.5:
            anomaly_score += (1 - handshake_completion_rate) * 25
        if teardown_without_data_rate > 0.5:
            anomaly_score += teardown_without_data_rate * 25
        if connections_per_second > 20:
            anomaly_score += min(20, connections_per_second / 5)

        anomaly_score = min(100, anomaly_score)

        # 構建結果
        attack_analysis = {
            'metrics': {
                'total_tcp_packets': total_tcp_packets,
                'total_connections': total_connections,
                'duration_seconds': round(duration_seconds, 2),
                'connections_per_second': round(connections_per_second, 2),
                'rst_ratio': round(rst_ratio, 3),
                'fin_ratio': round(tcp_flags['fin'] / total_tcp_packets if total_tcp_packets > 0 else 0, 3),
                'handshake_completion_rate': round(handshake_completion_rate, 3),
                'teardown_without_data_rate': round(teardown_without_data_rate, 3),
                'source_concentration': round(source_concentration, 3),
                'target_concentration': round(target_concentration, 3),
                'unique_source_ips': len(source_ips),
                'unique_target_ports': len(target_ports)
            },
            'tcp_flags': tcp_flags,
            'top_sources': [{'ip': ip, 'count': count} for ip, count in source_ips.most_common(5)],
            'top_targets': [{'port': port, 'count': count} for port, count in target_ports.most_common(5)],
            'attack_detection': {
                'detected': attack_type is not None,
                'type': attack_type,
                'description': attack_description,
                'severity': severity,
                'confidence': round(confidence, 2),
                'anomaly_score': round(anomaly_score, 1)
            }
        }

        self.analysis_results['attack_analysis'] = attack_analysis
        return attack_analysis

    def build_mind_map(self, max_protocols=6, max_sources=5, max_targets=5):
        """Build a hierarchical mind map structure from connection data."""
        stats = self.analysis_results.get('basic_stats')
        if not stats:
            return None

        protocol_totals = stats.get('protocols', {})
        connections = stats.get('top_connections', [])
        if not protocol_totals:
            return None

        sorted_protocols = sorted(protocol_totals.items(), key=lambda item: item[1], reverse=True)
        mind_map = {
            'name': 'Network Traffic',
            'meta': {
                'total_packets': stats.get('total_packets', 0),
                'protocols': len(protocol_totals),
                'generated_at': datetime.now().isoformat()
            },
            'children': []
        }

        for protocol, total_count in sorted_protocols[:max_protocols]:
            protocol_node = {
                'name': f"{protocol} ({total_count})",
                'protocol': protocol,
                'packet_count': total_count,
                'children': []
            }

            protocol_connections = [conn for conn in connections if conn['protocol'] == protocol]
            if not protocol_connections:
                mind_map['children'].append(protocol_node)
                continue

            grouped_by_source = defaultdict(list)
            for conn in protocol_connections:
                grouped_by_source[conn['src_ip']].append(conn)

            source_nodes = []
            for src_ip, conn_list in grouped_by_source.items():
                conn_list.sort(key=lambda item: item['packet_count'], reverse=True)
                total_src_packets = sum(item['packet_count'] for item in conn_list)

                dest_nodes = []
                for conn in conn_list[:max_targets]:
                    dst_label = conn['dst_ip']
                    if conn['dst_port'] is not None:
                        dst_label = f"{dst_label}:{conn['dst_port']}"

                    src_label = conn['src_ip']
                    if conn['src_port'] is not None:
                        src_label = f"{src_label}:{conn['src_port']}"

                    dest_nodes.append({
                        'name': dst_label,
                        'packet_count': conn['packet_count'],
                        'meta': {
                            'connection': f"{src_label} -> {dst_label}",
                            'protocol': protocol
                        }
                    })

                source_nodes.append({
                    'name': src_ip,
                    'packet_count': total_src_packets,
                    'meta': {
                        'protocol': protocol,
                        'unique_destinations': len(conn_list)
                    },
                    'children': dest_nodes
                })

            source_nodes.sort(key=lambda item: item['packet_count'], reverse=True)
            protocol_node['children'] = source_nodes[:max_sources]
            mind_map['children'].append(protocol_node)

        self.analysis_results['mind_map'] = mind_map
        return mind_map

    def generate_report(self):
        if not self.analysis_results:
            return "撠?瑁???"

        report = []
        report.append("=== 蝬脰楝撠????勗? ===\n")
        report.append(f"瑼??迂: {self.pcap_file}")
        report.append(f"?勗???: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

        if 'basic_stats' in self.analysis_results:
            stats = self.analysis_results['basic_stats']
            report.append("## ?箸蝯梯?鞈?")
            report.append(f"撠?蝮賣: {stats['total_packets']}")
            report.append(f"??蝯梯?: {dict(stats['protocols'])}")

            if stats['packet_sizes']:
                avg_size = self.calculate_average(stats['packet_sizes'])
                report.append(f"撟喳?撠?憭批?: {avg_size:.2f} bytes")
                report.append(f"撠?憭批?蝭?: {min(stats['packet_sizes'])} - {max(stats['packet_sizes'])} bytes")

            if stats['time_intervals']:
                avg_interval = self.calculate_average(stats['time_intervals']) * 1000
                report.append(f"撟喳?撠???: {avg_interval:.2f} ms")

            report.append(f"銝餉?靘? IP: {list(stats['src_ips'].most_common(5))}")
            report.append(f"銝餉??桃? IP: {list(stats['dst_ips'].most_common(5))}")
            report.append("")

        if 'packet_loss' in self.analysis_results:
            loss_indicators = self.analysis_results['packet_loss']
            report.append("## 封包遗失分析")
            report.append(f"封包遗失指標: {len(loss_indicators)} 個問題")

            retransmissions = [item for item in loss_indicators if item['type'] == 'retransmission']
            sequence_gaps = [item for item in loss_indicators if item['type'] == 'sequence_gap']

            report.append(f"重傳: {len(retransmissions)}")
            report.append(f"序列間隙: {len(sequence_gaps)}")
            if loss_indicators:
                report.append("[WARNING] 封包遺失可能影響網路性能")
            report.append("")

        if 'latency' in self.analysis_results:
            latency = self.analysis_results['latency']
            report.append("## 撱園鞈?")

            if latency['ping_responses']:
                ping_rtts = [entry['rtt'] for entry in latency['ping_responses']]
                avg_rtt = self.calculate_average(ping_rtts)
                report.append(f"Ping 蝑: {len(ping_rtts)}")
                report.append(f"撟喳? RTT: {avg_rtt:.2f} ms")
                report.append(f"RTT 蝭?: {min(ping_rtts):.2f} - {max(ping_rtts):.2f} ms")

            if latency['tcp_handshakes']:
                handshake_times = [entry['handshake_time'] for entry in latency['tcp_handshakes']]
                avg_handshake = self.calculate_average(handshake_times)
                report.append(f"TCP 鈭斗甈⊥: {len(handshake_times)}")
                report.append(f"撟喳?鈭斗??: {avg_handshake:.2f} ms")

            if latency['inter_packet_delays']:
                delays = [entry['delay'] for entry in latency['inter_packet_delays']]
                avg_delay = self.calculate_average(delays)
                std_delay = self.calculate_std(delays)
                report.append(f"平均延遲: {avg_delay:.2f} ms")
                report.append(f"延遲標準差: {std_delay:.2f} ms")
                high_delays = [delay for delay in delays if delay > 100]
                if high_delays:
                    report.append(f"[WARNING] 發現 {len(high_delays)} 個超過100ms的延遲")
            report.append("")

        report.append("## 遊戲網路優化建議")
        if 'packet_loss' in self.analysis_results and self.analysis_results['packet_loss']:
            report.append("- 檢查遊戲網路設定")
            report.append("- 關閉背景程式")
            report.append("- 使用有線網路替代 Wi-Fi")
            report.append("- 聯繫 ISP 檢查網路問題")
            report.append("- 重啟路由器")
            report.append("- 考慮升級網路套餐")
            report.append("- 聯繫 ISP 檢查網路問題")
            report.append("- 檢查防火牆設定")

        if 'latency' in self.analysis_results:
            latency = self.analysis_results['latency']
            if latency['inter_packet_delays']:
                avg_delay = self.calculate_average([entry['delay'] for entry in latency['inter_packet_delays']])
                if avg_delay > 50:
                    report.append("- 選擇較近的伺服器")
                    report.append("- 設定路由器 QoS 優先級")
                    report.append("- 檢查網路連線穩定性")

        report.append("\n[Valorant] 特定遊戲優化建議:")
        report.append("- 關閉不必要的背景程式")
        report.append("- 調整遊戲內延遲設定")
        report.append("- 使用遊戲模式或高性能模式")
        report.append("- 連接 Riot 官方網路測試工具")
        report.append("- 檢查防毒軟體")

        return "\n".join(report)

    def _extract_packet_details(self, packet_index):
        """Extract detailed information from a single packet.

        Args:
            packet_index: Index of the packet in self.packets

        Returns:
            dict: Packet details including 5-tuple, headers, and payload
        """
        if packet_index >= len(self.packets):
            return None

        packet = self.packets[packet_index]
        timestamp = float(packet.time)

        # Initialize packet details
        details = {
            'index': packet_index,
            'timestamp': timestamp,
            'length': len(packet),
            'fiveTuple': {},
            'headers': {},
            'payload': {
                'length': 0,
                'preview': ''
            },
            'streamId': None,  # TCP stream identifier
            'errorType': None,  # Error classification (ZeroWindow, RST, etc.)
            'http': None,  # HTTP information (if applicable)
        }

        # Extract IP layer information
        if packet.haslayer(IP):
            ip = packet[IP]
            details['fiveTuple']['srcIp'] = ip.src
            details['fiveTuple']['dstIp'] = ip.dst
            details['headers']['ip'] = {
                'version': ip.version,
                'ttl': ip.ttl,
                'protocol': ip.proto
            }

            # Extract TCP information
            if packet.haslayer(TCP):
                tcp = packet[TCP]
                details['fiveTuple']['srcPort'] = tcp.sport
                details['fiveTuple']['dstPort'] = tcp.dport
                details['fiveTuple']['protocol'] = 'TCP'

                # Generate TCP stream ID (hash of 5-tuple, bidirectional)
                src_ip, dst_ip = ip.src, ip.dst
                src_port, dst_port = tcp.sport, tcp.dport
                # Sort to make it bidirectional
                if (src_ip, src_port) > (dst_ip, dst_port):
                    src_ip, dst_ip = dst_ip, src_ip
                    src_port, dst_port = dst_port, src_port
                details['streamId'] = f"tcp-{src_ip}:{src_port}-{dst_ip}:{dst_port}"

                # Parse TCP flags
                flags = []
                if tcp.flags.S: flags.append('SYN')
                if tcp.flags.A: flags.append('ACK')
                if tcp.flags.F: flags.append('FIN')
                if tcp.flags.R: flags.append('RST')
                if tcp.flags.P: flags.append('PSH')
                if tcp.flags.U: flags.append('URG')

                # Detect error conditions
                error_indicators = []
                if tcp.flags.R:
                    error_indicators.append('RST')
                if tcp.window == 0 and tcp.flags.A:
                    error_indicators.append('ZeroWindow')
                # Note: Retransmission detection requires seq tracking across packets
                # which we'll implement in a future enhancement

                if error_indicators:
                    details['errorType'] = '|'.join(error_indicators)

                details['headers']['tcp'] = {
                    'flags': '|'.join(flags) if flags else 'NONE',
                    'seq': tcp.seq,
                    'ack': tcp.ack,
                    'window': tcp.window,
                    'dataOffset': tcp.dataofs,
                    'options': str(tcp.options) if tcp.options else None
                }

                # Extract payload
                if hasattr(tcp, 'payload') and tcp.payload:
                    payload_bytes = bytes(tcp.payload)
                    details['payload']['length'] = len(payload_bytes)
                    # Preview first 100 bytes
                    preview_bytes = payload_bytes[:100]
                    details['payload']['preview'] = preview_bytes.hex()
                    # Try to get ASCII representation
                    try:
                        details['payload']['ascii'] = ''.join(
                            chr(b) if 32 <= b < 127 else '.' for b in preview_bytes
                        )
                    except:
                        details['payload']['ascii'] = ''

                    # Try to parse HTTP headers
                    try:
                        payload_str = payload_bytes.decode('utf-8', errors='ignore')
                        # Check if this looks like HTTP
                        if payload_str.startswith('HTTP/') or \
                           any(payload_str.startswith(m) for m in ['GET ', 'POST ', 'PUT ', 'DELETE ', 'HEAD ', 'OPTIONS ', 'PATCH ']):
                            lines = payload_str.split('\r\n')
                            if lines:
                                first_line = lines[0]
                                http_info = {}

                                # Parse request line (e.g., "GET /path HTTP/1.1")
                                if not first_line.startswith('HTTP/'):
                                    parts = first_line.split(' ', 2)
                                    if len(parts) >= 2:
                                        http_info['method'] = parts[0]
                                        http_info['path'] = parts[1]
                                        http_info['version'] = parts[2] if len(parts) > 2 else 'HTTP/1.1'
                                        http_info['type'] = 'request'
                                # Parse response line (e.g., "HTTP/1.1 200 OK")
                                else:
                                    parts = first_line.split(' ', 2)
                                    if len(parts) >= 2:
                                        http_info['version'] = parts[0]
                                        http_info['status'] = int(parts[1])
                                        http_info['statusText'] = parts[2] if len(parts) > 2 else ''
                                        http_info['type'] = 'response'

                                # Parse headers (first few)
                                headers = {}
                                for line in lines[1:10]:  # Parse up to 10 headers
                                    if ':' in line:
                                        key, value = line.split(':', 1)
                                        headers[key.strip().lower()] = value.strip()

                                if headers:
                                    http_info['headers'] = headers

                                if http_info:
                                    details['http'] = http_info
                    except:
                        pass  # Not HTTP or parsing failed

            # Extract UDP information
            elif packet.haslayer(UDP):
                udp = packet[UDP]
                details['fiveTuple']['srcPort'] = udp.sport
                details['fiveTuple']['dstPort'] = udp.dport
                details['fiveTuple']['protocol'] = 'UDP'

                # Generate UDP stream ID (hash of 5-tuple, bidirectional)
                src_ip, dst_ip = ip.src, ip.dst
                src_port, dst_port = udp.sport, udp.dport
                # Sort to make it bidirectional
                if (src_ip, src_port) > (dst_ip, dst_port):
                    src_ip, dst_ip = dst_ip, src_ip
                    src_port, dst_port = dst_port, src_port
                details['streamId'] = f"udp-{src_ip}:{src_port}-{dst_ip}:{dst_port}"

                details['headers']['udp'] = {
                    'length': udp.len,
                    'checksum': udp.chksum
                }

                # Extract payload
                if hasattr(udp, 'payload') and udp.payload:
                    payload_bytes = bytes(udp.payload)
                    details['payload']['length'] = len(payload_bytes)
                    preview_bytes = payload_bytes[:100]
                    details['payload']['preview'] = preview_bytes.hex()
                    try:
                        details['payload']['ascii'] = ''.join(
                            chr(b) if 32 <= b < 127 else '.' for b in preview_bytes
                        )
                    except:
                        details['payload']['ascii'] = ''

            # Extract ICMP information
            elif packet.haslayer(ICMP):
                icmp = packet[ICMP]
                details['fiveTuple']['protocol'] = 'ICMP'
                details['fiveTuple']['srcPort'] = 0
                details['fiveTuple']['dstPort'] = 0

                details['headers']['icmp'] = {
                    'type': icmp.type,
                    'code': icmp.code,
                    'checksum': icmp.chksum
                }

        return details

    def _find_packets_by_connection_id(self, connection_id: str) -> set:
        """Find packet indices for a connection by parsing its ID and scanning packets.

        This method handles all connection types by extracting the 5-tuple from the
        connection ID and matching it against packets in both directions.

        Args:
            connection_id: Connection identifier in one of these formats:
                - Standard: "{protocol}-{srcIp}-{srcPort}-{dstIp}-{dstPort}"
                - Timeout: "timeout-{srcIp}-{srcPort}-{dstIp}-{dstPort}-{packetIndex}"

        Returns:
            set: Set of packet indices (int) matching this connection. Returns empty
                 set if connection ID is malformed or no packets match.

        Examples:
            >>> analyzer._find_packets_by_connection_id("tcp-10.1.1.14-5434-210.71.227.211-443")
            {4217, 4219, 4220}

            >>> analyzer._find_packets_by_connection_id("timeout-10.1.1.14-9492-172.64.153.46-443-4632")
            {4629, 4630, 4631, 4632, 4633}

            >>> analyzer._find_packets_by_connection_id("invalid-id")
            set()
        """
        # Parse connection ID
        parts = connection_id.split('-')

        # Extract 5-tuple based on connection type
        try:
            if parts[0] == 'timeout':
                # Format: timeout-srcIp-srcPort-dstIp-dstPort-packetIndex
                if len(parts) < 6:
                    return set()
                src_ip = parts[1]
                src_port = int(parts[2])
                dst_ip = parts[3]
                dst_port = int(parts[4])
                # parts[5] is the packet index after timeout (we'll find all packets, not just this one)
            else:
                # Format: protocol-srcIp-srcPort-dstIp-dstPort
                if len(parts) < 5:
                    return set()
                src_ip = parts[1]
                src_port = int(parts[2])
                dst_ip = parts[3]
                dst_port = int(parts[4])
        except (ValueError, IndexError):
            # Port is not an integer or malformed ID
            return set()

        # Scan packets to find matches
        matched_indices = set()
        for idx, packet in enumerate(self.packets):
            if not packet.haslayer(IP):
                continue

            ip = packet[IP]

            # Check TCP/UDP layer
            transport_layer = None
            if packet.haslayer(TCP):
                transport_layer = packet[TCP]
            elif packet.haslayer(UDP):
                transport_layer = packet[UDP]
            else:
                continue

            # Match 5-tuple (bidirectional)
            matches = (
                (ip.src == src_ip and transport_layer.sport == src_port and
                 ip.dst == dst_ip and transport_layer.dport == dst_port)
                or
                (ip.src == dst_ip and transport_layer.sport == dst_port and
                 ip.dst == src_ip and transport_layer.dport == src_port)
            )

            if matches:
                matched_indices.add(idx)

        return matched_indices

    def _build_connection_packets(self, timelines):
        """Build detailed packet information for each connection.

        Args:
            timelines: List of timeline objects
        """
        connection_packets = {}

        for timeline in timelines:
            connection_id = timeline['id']
            packet_indices = set()

            # PRIMARY: Collect all packet references from stages
            if 'stages' in timeline:
                for stage in timeline['stages']:
                    if 'packetRefs' in stage:
                        packet_indices.update(stage['packetRefs'])

            # FALLBACK: If no packetRefs found, scan packets by connection ID
            if not packet_indices:
                packet_indices = self._find_packets_by_connection_id(connection_id)

            # Extract details for each packet
            packets = []
            for idx in sorted(packet_indices):
                packet_detail = self._extract_packet_details(idx)
                if packet_detail:
                    packets.append(packet_detail)

            # Calculate relative time from first packet
            if packets:
                first_time = packets[0]['timestamp']
                for packet in packets:
                    packet['relativeTime'] = f"{packet['timestamp'] - first_time:.3f}s"

            connection_packets[connection_id] = packets

        self.analysis_results['connection_packets'] = connection_packets

    def save_results(self, output_file="network_analysis_results.json", public_output_dir="public/data"):
        os.makedirs(os.path.dirname(output_file) or '.', exist_ok=True)

        with open(output_file, 'w', encoding='utf-8') as handle:
            json.dump(self.analysis_results, handle, ensure_ascii=False, indent=2, default=str)
        self._safe_print(f'分析結果已儲存至 {output_file}')

        if public_output_dir:
            os.makedirs(public_output_dir, exist_ok=True)
            public_result_path = os.path.join(public_output_dir, os.path.basename(output_file))
            with open(public_result_path, 'w', encoding='utf-8') as handle:
                json.dump(self.analysis_results, handle, ensure_ascii=False, indent=2, default=str)
            self._safe_print(f'已同步輸出至 {public_result_path}')

            if 'protocol_timelines' in self.analysis_results:
                timeline_path = os.path.join(public_output_dir, 'protocol_timeline_sample.json')
                with open(timeline_path, 'w', encoding='utf-8') as handle:
                    json.dump(self.analysis_results['protocol_timelines'], handle, ensure_ascii=False, indent=2)
                self._safe_print(f'已寫入協定時間軸範例至 {timeline_path}')
            if 'mind_map' in self.analysis_results:
                mind_map_path = os.path.join(public_output_dir, 'network_mind_map.json')
                with open(mind_map_path, 'w', encoding='utf-8') as handle:
                    json.dump(self.analysis_results['mind_map'], handle, ensure_ascii=False, indent=2)
                self._safe_print(f'心智圖已輸出至 {mind_map_path}')
            if 'connection_packets' in self.analysis_results:
                packets_path = os.path.join(public_output_dir, 'connection_packets.json')
                with open(packets_path, 'w', encoding='utf-8') as handle:
                    json.dump(self.analysis_results['connection_packets'], handle, ensure_ascii=False, indent=2)
                self._safe_print(f'連線封包詳細資訊已輸出至 {packets_path}')

def main():
    if len(sys.argv) > 1:
        pcap_file = sys.argv[1]
    else:
        candidates = [
            entry for entry in os.listdir('.')
            if entry.lower().endswith(('.pcap', '.pcapng'))
        ]
        if not candidates:
            NetworkAnalyzer._safe_print('找不到 pcap/pcapng 檔案，請提供檔案路徑')
            return
        pcap_file = candidates[0]
        NetworkAnalyzer._safe_print(f'自動選擇檔案: {pcap_file}')

    analyzer = NetworkAnalyzer(pcap_file)

    if not analyzer.load_packets():
        return

    NetworkAnalyzer._safe_print('開始進行網路分析 ...')
    analyzer.basic_statistics()

    NetworkAnalyzer._safe_print('檢查封包遺失 ...')
    analyzer.detect_packet_loss()

    NetworkAnalyzer._safe_print('分析延遲 ...')
    analyzer.analyze_latency()

    NetworkAnalyzer._safe_print('建立心智圖 ...')
    analyzer.build_mind_map()

    NetworkAnalyzer._safe_print('生成協議時間軸 ...')
    analyzer.generate_protocol_timelines()

    report = analyzer.generate_report()
    NetworkAnalyzer._safe_print('\n' + report)

    analyzer.save_results()

    report_path = 'network_analysis_report.txt'
    with open(report_path, 'w', encoding='utf-8') as handle:
        handle.write(report)
    NetworkAnalyzer._safe_print(f'\n詳細報告已儲存至 {report_path}')


if __name__ == "__main__":
    main()

