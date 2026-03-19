#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Network packet analysis and mind map generator."""

import os
import sys
import json
from datetime import datetime, timezone
from collections import Counter, defaultdict

try:
    from scapy.all import rdpcap, IP, IPv6, TCP, UDP, ICMP, Ether, Raw, DNS, DNSQR, DNSRR, ARP
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

            has_ip = packet.haslayer(IP)
            has_ipv6 = packet.haslayer(IPv6)
            if has_ip or has_ipv6:
                ip_layer = packet[IP] if has_ip else packet[IPv6]
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
        icmp_pings = self._extract_icmp_pings()

        timelines.extend(tcp_handshakes)
        timelines.extend(tcp_teardowns)
        timelines.extend(udp_transfers)
        timelines.extend(http_requests)
        timelines.extend(timeouts)
        timelines.extend(icmp_pings)

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
            if not packet.haslayer(TCP):
                continue
            has_ip = packet.haslayer(IP)
            has_ipv6 = packet.haslayer(IPv6)
            if not has_ip and not has_ipv6:
                continue

            ip = packet[IP] if has_ip else packet[IPv6]
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

                    is_dns_tcp = (client_key[3] == 53)
                    d1 = max(800, int((syn_ack_time - syn_time) * 1000))
                    d2 = max(800, int((ack_time - syn_ack_time) * 1000))
                    if is_dns_tcp:
                        stages = [
                            {
                                'key': 'query',
                                'label': 'DNS Query',
                                'direction': 'forward',
                                'durationMs': d1,
                                'packetRefs': [info['syn_packet']]
                            },
                            {
                                'key': 'resolving',
                                'label': 'Resolving...',
                                'direction': 'wait',
                                'durationMs': d2,
                                'packetRefs': [info.get('syn_ack_packet', info['syn_packet'])]
                            },
                            {
                                'key': 'response',
                                'label': 'DNS Response',
                                'direction': 'backward',
                                'durationMs': max(800, 1),
                                'packetRefs': [index]
                            }
                        ]
                    else:
                        stages = [
                            {
                                'key': 'syn',
                                'label': 'SYN Sent',
                                'direction': 'forward',
                                'durationMs': d1,
                                'packetRefs': [info['syn_packet']]
                            },
                            {
                                'key': 'syn-ack',
                                'label': 'SYN-ACK Received',
                                'direction': 'backward',
                                'durationMs': d2,
                                'packetRefs': [info.get('syn_ack_packet', info['syn_packet'])]
                            },
                            {
                                'key': 'ack',
                                'label': 'ACK Confirmed',
                                'direction': 'forward',
                                'durationMs': max(800, 1),
                                'packetRefs': [index]
                            }
                        ]
                    timeline = {
                        'id': f"tcp-{client_key[0]}-{client_key[1]}-{client_key[2]}-{client_key[3]}",
                        'protocol': 'dns' if is_dns_tcp else 'tcp',
                        'protocolType': 'dns-query' if is_dns_tcp else 'tcp-handshake',
                        'startEpochMs': int(syn_time * 1000),
                        'endEpochMs': int(ack_time * 1000),
                        'stages': stages,
                        'metrics': {
                            'rttMs': max(1, int((ack_time - syn_time) * 1000)),
                            'packetCount': 3
                        }
                    }
                    timelines.append(timeline)
                    handshakes.pop(client_key, None)

        return timelines

    def _extract_icmp_pings(self):
        """偵測 ICMP Echo Request (type 8) / Echo Reply (type 0) 配對，產出 icmp-ping timeline。"""
        timelines = []
        pending = {}  # key: (icmp.id, icmp.seq, src_ip, dst_ip) -> request info

        for index, packet in enumerate(self.packets):
            if not packet.haslayer(IP) or not packet.haslayer(ICMP):
                continue
            ip = packet[IP]
            icmp = packet[ICMP]
            ts = float(packet.time)

            if icmp.type == 8:  # Echo Request
                pair_key = (icmp.id, icmp.seq, ip.src, ip.dst)
                pending[pair_key] = {
                    'request_time': ts,
                    'request_index': index,
                    'src_ip': ip.src,
                    'dst_ip': ip.dst,
                }
            elif icmp.type == 0:  # Echo Reply — reverse direction to find the request
                pair_key = (icmp.id, icmp.seq, ip.dst, ip.src)
                info = pending.pop(pair_key, None)
                if info is None:
                    continue
                rtt_ms = (ts - info['request_time']) * 1000
                half_ms = max(800, int(rtt_ms * 0.5))
                timelines.append({
                    'id': f"icmp-{info['src_ip']}-{icmp.seq}-{info['dst_ip']}-0",
                    'protocol': 'icmp',
                    'protocolType': 'icmp-ping',
                    'startEpochMs': int(info['request_time'] * 1000),
                    'endEpochMs': int(ts * 1000),
                    'stages': [
                        {
                            'key': 'echo-request',
                            'label': 'Echo Request',
                            'direction': 'forward',
                            'durationMs': half_ms,
                            'packetRefs': [info['request_index']],
                        },
                        {
                            'key': 'echo-reply',
                            'label': f'Echo Reply ({rtt_ms:.1f}ms)',
                            'direction': 'backward',
                            'durationMs': half_ms,
                            'packetRefs': [index],
                        },
                    ],
                    'metrics': {
                        'rttMs': round(rtt_ms, 2),
                        'packetCount': 2,
                    },
                    'options': {
                        'rttMs': round(rtt_ms, 2),
                    },
                })

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

        同時支援 Flood 攻擊檢測（按目標分組，忽略 source port）。
        """
        connections = {}  # key: (src_ip, src_port, dst_ip, dst_port) - 標準 5-tuple
        flood_groups = {}  # key: (src_ip, dst_ip, dst_port) - Flood 攻擊分組（忽略 source port）

        for index, packet in enumerate(self.packets):
            if not packet.haslayer(IP) or not packet.haslayer(TCP):
                continue

            ip = packet[IP]
            tcp = packet[TCP]
            ts = float(packet.time)
            length = len(packet)
            flags = int(tcp.flags)

            # === 標準 5-tuple 分組 ===
            endpoint1 = (ip.src, tcp.sport)
            endpoint2 = (ip.dst, tcp.dport)
            normalized_key = tuple(sorted([endpoint1, endpoint2]))

            if normalized_key not in connections:
                connections[normalized_key] = {
                    'start_time': ts,
                    'end_time': ts,
                    'packets': [],
                    'total_bytes': 0,
                    'flags_seen': set(),
                    'psh_count': 0,
                    'syn_count': 0
                }

            conn = connections[normalized_key]
            conn['end_time'] = max(conn['end_time'], ts)
            conn['packets'].append(index)
            conn['total_bytes'] += length

            # 記錄看到的 flags 並計數
            if flags & 0x02:  # SYN
                conn['flags_seen'].add('SYN')
                conn['syn_count'] += 1
            if flags & 0x01:  # FIN
                conn['flags_seen'].add('FIN')
            if flags & 0x04:  # RST
                conn['flags_seen'].add('RST')
            if flags & 0x10:  # ACK
                conn['flags_seen'].add('ACK')
            if flags & 0x08:  # PSH
                conn['flags_seen'].add('PSH')
                conn['psh_count'] += 1

            # === Flood 攻擊分組（忽略 source port）===
            # 用於檢測每個封包使用不同 source port 的攻擊模式
            flood_key = (ip.src, ip.dst, tcp.dport)  # 注意：不包含 source port
            if flood_key not in flood_groups:
                flood_groups[flood_key] = {
                    'start_time': ts,
                    'end_time': ts,
                    'packets': [],
                    'total_bytes': 0,
                    'flags_seen': set(),
                    'psh_count': 0,
                    'syn_count': 0,
                    'urg_count': 0,
                    'fin_count': 0,
                    'ack_count': 0,
                    'rst_count': 0,
                    'unique_sports': set()  # 追蹤不同的 source ports
                }

            fg = flood_groups[flood_key]
            fg['end_time'] = max(fg['end_time'], ts)
            fg['packets'].append(index)
            fg['total_bytes'] += length
            fg['unique_sports'].add(tcp.sport)

            if flags & 0x02:  # SYN
                fg['flags_seen'].add('SYN')
                fg['syn_count'] += 1
            if flags & 0x01:  # FIN
                fg['flags_seen'].add('FIN')
                fg['fin_count'] += 1
            if flags & 0x20:  # URG
                fg['flags_seen'].add('URG')
                fg['urg_count'] += 1
            if flags & 0x08:  # PSH
                fg['flags_seen'].add('PSH')
                fg['psh_count'] += 1
            if flags & 0x10:  # ACK
                fg['flags_seen'].add('ACK')
                fg['ack_count'] += 1
            if flags & 0x04:  # RST
                fg['flags_seen'].add('RST')
                fg['rst_count'] += 1

        timelines = []
        processed_packets = set()  # 追蹤已被 Flood 檢測處理的封包

        # === 第一階段：檢測 Flood 攻擊 ===
        for flood_key, fg in flood_groups.items():
            total_packets = len(fg['packets'])
            unique_ports = len(fg['unique_sports'])

            # Flood 攻擊特徵：
            # 1. 大量封包 (> 50)
            # 2. 使用很多不同的 source ports（幾乎每個封包都不同）
            # 3. unique_ports / total_packets 比例 > 0.8
            is_flood_pattern = (
                total_packets > 50 and
                unique_ports > 20 and
                unique_ports / total_packets > 0.8
            )

            if not is_flood_pattern:
                continue

            # 判斷 Flood 類型
            psh_ratio = fg['psh_count'] / total_packets if total_packets > 0 else 0
            syn_ratio = fg['syn_count'] / total_packets if total_packets > 0 else 0
            urg_ratio = fg['urg_count'] / total_packets if total_packets > 0 else 0
            fin_ratio = fg['fin_count'] / total_packets if total_packets > 0 else 0
            ack_ratio = fg['ack_count'] / total_packets if total_packets > 0 else 0
            rst_ratio = fg['rst_count'] / total_packets if total_packets > 0 else 0

            # URG+PSH+FIN 攻擊（異常旗標組合）
            if urg_ratio > 0.5 and psh_ratio > 0.5 and fin_ratio > 0.5:
                protocol_type = 'urg-psh-fin-flood'
            # ACK+FIN 複合攻擊
            elif ack_ratio > 0.5 and fin_ratio > 0.5:
                protocol_type = 'ack-fin-flood'
            # PSH Flood
            elif psh_ratio > 0.6:
                protocol_type = 'psh-flood'
            # SYN Flood
            elif syn_ratio > 0.8:
                protocol_type = 'syn-flood'
            # ACK Flood
            elif ack_ratio > 0.8:
                protocol_type = 'ack-flood'
            # RST Flood
            elif rst_ratio > 0.8:
                protocol_type = 'rst-flood'
            # FIN Flood
            elif fin_ratio > 0.8:
                protocol_type = 'fin-flood'
            else:
                protocol_type = 'tcp-flood'  # 通用 Flood

            src_ip, dst_ip, dst_port = flood_key
            start_time = fg['start_time']
            end_time = fg['end_time']
            duration_ms = max(1000, int((end_time - start_time) * 1000))

            # 標記這些封包已被處理
            for pkt_idx in fg['packets']:
                processed_packets.add(pkt_idx)

            # 創建 Flood 攻擊 timeline
            stages = [
                {
                    'key': 'attack',
                    'label': f'{protocol_type.upper()} 攻擊',
                    'direction': 'forward',
                    'durationMs': duration_ms // 3,
                    'packetRefs': fg['packets'][:10]
                },
                {
                    'key': 'flood',
                    'label': '洪水攻擊中',
                    'direction': 'forward',
                    'durationMs': duration_ms // 3,
                    'packetRefs': fg['packets'][10:20] if len(fg['packets']) > 10 else []
                },
                {
                    'key': 'overload',
                    'label': '資源過載',
                    'direction': 'forward',
                    'durationMs': duration_ms // 3,
                    'packetRefs': fg['packets'][20:30] if len(fg['packets']) > 20 else []
                }
            ]

            # Sample up to 200 evenly-distributed packet indices for statistics endpoint.
            # Stage packetRefs only cover 30 packets (animation frames); the statistics
            # endpoint needs a larger representative sample to cross the detection threshold
            # and compute accurate flag ratios.
            _all_count = len(fg['packets'])
            _step = max(1, _all_count // 200)
            stats_packet_sample = fg['packets'][::_step][:200]

            timeline = {
                'id': f"flood-{src_ip}-0-{dst_ip}-{dst_port}",  # 添加虛擬 srcPort=0 以符合前端解析格式
                'protocol': 'tcp',
                'protocolType': protocol_type,
                'startEpochMs': int(start_time * 1000),
                'endEpochMs': int(end_time * 1000),
                'stages': stages,
                'allPacketRefs': stats_packet_sample,
                'metrics': {
                    'durationMs': duration_ms,
                    'packetCount': total_packets,
                    'totalBytes': fg['total_bytes'],
                    'uniquePorts': unique_ports,
                    'flagsSeen': list(fg['flags_seen']),
                    'pshRatio': round(psh_ratio, 3),
                    'synRatio': round(syn_ratio, 3),
                    'finRatio': round(fin_ratio, 3),
                    'urgRatio': round(urg_ratio, 3),
                    'ackRatio': round(ack_ratio, 3),
                    'rstRatio': round(rst_ratio, 3),
                    'isFlood': True
                }
            }
            timelines.append(timeline)

        # === 第二階段：處理正常連線（排除已被 Flood 處理的封包）===
        for key, conn in connections.items():
            # 過濾掉已被 Flood 檢測處理的封包
            remaining_packets = [p for p in conn['packets'] if p not in processed_packets]

            if len(remaining_packets) < 2:
                continue

            # 重新計算統計（基於剩餘封包）
            start_time = conn['start_time']
            end_time = conn['end_time']
            duration_ms = max(1, int((end_time - start_time) * 1000))

            total_packets = len(remaining_packets)
            # 使用原始的 flag 計數（因為我們是按連線計算，不是按封包）
            psh_ratio = conn['psh_count'] / len(conn['packets']) if len(conn['packets']) > 0 else 0
            syn_ratio = conn['syn_count'] / len(conn['packets']) if len(conn['packets']) > 0 else 0

            flags_seen = conn['flags_seen']

            # 決定 protocolType
            if psh_ratio > 0.6 and syn_ratio < 0.4 and total_packets > 20:
                protocol_type = 'psh-flood'
            elif 'SYN' in flags_seen and 'FIN' in flags_seen:
                protocol_type = 'tcp-session'
            elif 'SYN' in flags_seen:
                protocol_type = 'tcp-handshake'
            elif 'FIN' in flags_seen or 'RST' in flags_seen:
                protocol_type = 'tcp-teardown'
            else:
                protocol_type = 'tcp-data'

            # 創建 timeline
            stages = []
            half_duration = max(800, duration_ms // 2)

            stages.append({
                'key': 'transfer',
                'label': 'Data Transfer',
                'direction': 'forward',
                'durationMs': half_duration,
                'packetRefs': remaining_packets[:len(remaining_packets)//2] or remaining_packets[:1]
            })

            stages.append({
                'key': 'response',
                'label': 'Response',
                'direction': 'backward',
                'durationMs': half_duration,
                'packetRefs': remaining_packets[len(remaining_packets)//2:] or remaining_packets[-1:]
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
                    'packetCount': len(remaining_packets),
                    'totalBytes': conn['total_bytes'],
                    'flagsSeen': list(flags_seen),
                    'pshRatio': round(psh_ratio, 3),
                    'synRatio': round(syn_ratio, 3),
                }
            }
            timelines.append(timeline)

        return timelines

    def _extract_udp_transfers(self):
        transfers = {}

        for index, packet in enumerate(self.packets):
            if not packet.haslayer(UDP):
                continue
            has_ip = packet.haslayer(IP)
            has_ipv6 = packet.haslayer(IPv6)
            if not has_ip and not has_ipv6:
                continue

            ip = packet[IP] if has_ip else packet[IPv6]
            udp = packet[UDP]
            ts = float(packet.time)
            key = (ip.src, udp.sport, ip.dst, udp.dport)
            info = transfers.setdefault(key, {
                'start': ts,
                'end': ts,
                'count': 0,
                'first_packet': index,
                'dns_queries': [],
                'dns_answers': [],
                'dns_rcode': None
            })
            info['end'] = ts
            info['count'] += 1

            # Extract DNS details if present
            if packet.haslayer(DNS):
                dns = packet[DNS]
                if not dns.qr and packet.haslayer(DNSQR):
                    qr = packet[DNSQR]
                    qname = qr.qname.decode('utf-8', errors='replace') if isinstance(qr.qname, bytes) else str(qr.qname)
                    info['dns_queries'].append({'name': qname, 'type': self._dns_qtype_name(qr.qtype)})
                elif dns.qr:
                    info['dns_rcode'] = self._dns_rcode_name(dns.rcode)
                    if packet.haslayer(DNSRR):
                        rr = dns.an
                        for _ in range(dns.ancount):
                            if rr is None:
                                break
                            try:
                                rdata = rr.rdata if hasattr(rr, 'rdata') else str(rr.payload)
                            except Exception:
                                rdata = '(unparsed)'
                            if isinstance(rdata, bytes):
                                rdata = rdata.decode('utf-8', errors='replace')
                            info['dns_answers'].append({
                                'name': rr.rrname.decode('utf-8', errors='replace') if isinstance(rr.rrname, bytes) else str(rr.rrname),
                                'type': self._dns_qtype_name(rr.type),
                                'data': str(rdata),
                                'ttl': rr.ttl
                            })
                            rr = rr.payload if hasattr(rr, 'payload') and isinstance(rr.payload, DNSRR) else None

        timelines = []
        for (src_ip, src_port, dst_ip, dst_port), info in transfers.items():
            # 檢測 DNS (通常使用 UDP 53 port)
            is_dns = src_port == 53 or dst_port == 53
            protocol_type = 'dns-query' if is_dns else 'udp-transfer'

            metrics = {'packetCount': info['count']}
            if is_dns:
                if info['dns_queries']:
                    metrics['queries'] = info['dns_queries']
                if info['dns_answers']:
                    metrics['answers'] = info['dns_answers']
                if info['dns_rcode']:
                    metrics['rcode'] = info['dns_rcode']

            timeline = {
                'id': f"udp-{src_ip}-{src_port}-{dst_ip}-{dst_port}",
                'protocol': 'udp' if not is_dns else 'dns',
                'protocolType': protocol_type,
                'startEpochMs': int(info['start'] * 1000),
                'endEpochMs': int(info['end'] * 1000),
                'stages': [
                    {
                        'key': 'send',
                        'label': 'DNS Query' if protocol_type == 'dns-query' else 'UDP Transfer',
                        'direction': 'forward',
                        'durationMs': max(1200, int((info['end'] - info['start']) * 1000)),
                        'packetRefs': [info['first_packet']]
                    }
                ],
                'metrics': metrics
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
            if not packet.haslayer(TCP):
                continue
            has_ip = packet.haslayer(IP)
            has_ipv6 = packet.haslayer(IPv6)
            if not has_ip and not has_ipv6:
                continue

            ip = packet[IP] if has_ip else packet[IPv6]
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
            if not packet.haslayer(TCP):
                continue
            has_ip = packet.haslayer(IP)
            has_ipv6 = packet.haslayer(IPv6)
            if not has_ip and not has_ipv6:
                continue

            ip = packet[IP] if has_ip else packet[IPv6]
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
        """Detect basic packet loss indicators (retransmissions, sequence gaps).

        Retransmission: sequence number moves backward in the 32-bit modular space,
        excluding control-only packets (pure ACK with no payload and no SYN/FIN).

        Sequence gap: the next observed sequence number is much higher than
        expected based on the previous packet's payload size, indicating lost packets.
        Both checks use modular arithmetic to handle 32-bit sequence wraparound.
        """
        tcp_streams = defaultdict(list)
        packet_loss_indicators = []

        _SEQ_MAX = 2 ** 32
        _SEQ_HALF = _SEQ_MAX // 2

        for index, packet in enumerate(self.packets):
            if not packet.haslayer(TCP):
                continue
            has_ip = packet.haslayer(IP)
            has_ipv6 = packet.haslayer(IPv6)
            if not has_ip and not has_ipv6:
                continue
            tcp_layer = packet[TCP]
            ip_layer = packet[IP] if has_ip else packet[IPv6]
            flags = int(tcp_layer.flags)
            syn = bool(flags & 0x02)
            fin = bool(flags & 0x01)
            # Actual TCP payload length from IP/TCP headers (handles variable TCP options)
            if has_ip:
                ip_payload = ip_layer.len - (ip_layer.ihl * 4)
            else:
                ip_payload = ip_layer.plen
            tcp_hdr = tcp_layer.dataofs * 4
            data_len = max(0, ip_payload - tcp_hdr)
            # SYN and FIN each consume one sequence number even without data
            seq_advance = data_len + (1 if syn else 0) + (1 if fin else 0)

            stream_id = f"{ip_layer.src}:{tcp_layer.sport}-{ip_layer.dst}:{tcp_layer.dport}"
            tcp_streams[stream_id].append({
                'packet_index': index,
                'seq': tcp_layer.seq,
                'time': float(packet.time),
                'seq_advance': seq_advance,
            })

        for stream_id, stream_packets in tcp_streams.items():
            if len(stream_packets) < 3:
                continue

            stream_packets.sort(key=lambda item: item['time'])

            # Retransmission detection using 32-bit modular arithmetic
            for idx in range(1, len(stream_packets)):
                curr = stream_packets[idx]
                prev = stream_packets[idx - 1]
                # Skip control-only packets (pure ACK, no payload, no SYN/FIN)
                if curr['seq_advance'] == 0:
                    continue
                # Positive modular diff means forward; > half means wrapped backward
                diff = (curr['seq'] - prev['seq']) % _SEQ_MAX
                if diff > _SEQ_HALF:
                    packet_loss_indicators.append({
                        'type': 'retransmission',
                        'stream': stream_id,
                        'packet_index': curr['packet_index'],
                        'time': curr['time']
                    })

            # Sequence gap detection: skip sender-side no-advance packets
            for idx in range(1, len(stream_packets)):
                prev = stream_packets[idx - 1]
                curr = stream_packets[idx]
                if prev['seq_advance'] == 0:
                    continue  # Previous packet didn't advance seq, no gap to measure
                expected_seq = (prev['seq'] + prev['seq_advance']) % _SEQ_MAX
                actual_seq = curr['seq']
                gap = (actual_seq - expected_seq) % _SEQ_MAX
                # Gap is a forward jump of more than 1000 bytes (not wraparound)
                if 0 < gap < _SEQ_HALF and gap > 1000:
                    packet_loss_indicators.append({
                        'type': 'sequence_gap',
                        'stream': stream_id,
                        'packet_index': curr['packet_index'],
                        'time': curr['time'],
                        'gap_size': gap
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
                is_syn = bool(flags & 0x02)
                is_ack = bool(flags & 0x10)
                if is_syn and not is_ack:  # SYN (ECN bits tolerated)
                    tcp_handshakes[connection_id] = {'syn_time': float(packet.time)}
                elif is_syn and is_ack and connection_id in tcp_handshakes:  # SYN-ACK
                    tcp_handshakes[connection_id]['syn_ack_time'] = float(packet.time)
                elif is_ack and not is_syn and connection_id in tcp_handshakes:  # ACK
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

    # ── Phase 9: Advanced attack detection helpers ─────────────────────

    def _detect_dns_amplification(self):
        """Detect DNS amplification/reflection attacks."""
        result = {'amplification_ratio': 0, 'total_queries': 0, 'total_responses': 0,
                  'response_source_count': 0, 'target_ip': None}
        query_bytes = 0
        response_bytes = 0
        response_sources = set()
        response_targets = Counter()

        for packet in self.packets:
            if not packet.haslayer(UDP) or not packet.haslayer(DNS):
                continue
            udp = packet[UDP]
            if udp.sport != 53 and udp.dport != 53:
                continue
            dns = packet[DNS]
            pkt_len = len(packet)
            if not dns.qr:  # query
                query_bytes += pkt_len
                result['total_queries'] += 1
            else:  # response
                response_bytes += pkt_len
                result['total_responses'] += 1
                if packet.haslayer(IP):
                    response_sources.add(packet[IP].src)
                    response_targets[packet[IP].dst] += 1

        result['amplification_ratio'] = response_bytes / query_bytes if query_bytes > 0 else 0
        result['response_source_count'] = len(response_sources)
        if response_targets:
            result['target_ip'] = response_targets.most_common(1)[0][0]
        return result

    def _detect_slowloris(self):
        """Detect Slowloris slow HTTP attacks (many concurrent low-data HTTP connections)."""
        HTTP_PORTS = {80, 443, 8080, 8443}
        result = {'detected': False, 'suspicious_sources': 0, 'details': []}
        connections = defaultdict(lambda: {
            'sockets': set(), 'data_bytes': 0, 'packet_count': 0,
            'first_time': None, 'last_time': None,
            'has_fin': False, 'has_rst': False
        })

        for packet in self.packets:
            if not packet.haslayer(TCP) or not packet.haslayer(IP):
                continue
            ip = packet[IP]
            tcp = packet[TCP]
            if tcp.dport not in HTTP_PORTS:
                continue
            src_ip = ip.src
            conn = connections[src_ip]
            conn['sockets'].add((ip.dst, tcp.dport, tcp.sport))
            conn['packet_count'] += 1
            ts = float(packet.time)
            if conn['first_time'] is None:
                conn['first_time'] = ts
            conn['last_time'] = ts
            if packet.haslayer(Raw):
                conn['data_bytes'] += len(packet[Raw])
            flags = int(tcp.flags)
            if flags & 0x01:
                conn['has_fin'] = True
            if flags & 0x04:
                conn['has_rst'] = True

        for src_ip, info in connections.items():
            num_sockets = len(info['sockets'])
            if num_sockets < 10:
                continue
            duration = (info['last_time'] - info['first_time']) if info['first_time'] and info['last_time'] else 0
            avg_data = info['data_bytes'] / num_sockets if num_sockets > 0 else 0
            no_termination = not info['has_fin'] and not info['has_rst']
            if avg_data < 200 and duration > 30 and no_termination:
                result['suspicious_sources'] += 1
                result['details'].append({'ip': src_ip, 'connections': num_sockets,
                                          'avg_data': round(avg_data, 1), 'duration': round(duration, 1)})

        result['detected'] = result['suspicious_sources'] > 0
        return result

    def _detect_arp_spoofing(self):
        """Detect ARP spoofing (IP-MAC mapping conflicts)."""
        result = {'detected': False, 'conflicting_ips': 0, 'details': []}
        ip_mac_map = defaultdict(set)

        for packet in self.packets:
            if not packet.haslayer(ARP):
                continue
            arp = packet[ARP]
            if arp.op == 2:  # ARP reply
                ip_mac_map[arp.psrc].add(str(arp.hwsrc).lower())

        for ip_addr, macs in ip_mac_map.items():
            if len(macs) > 1:
                result['conflicting_ips'] += 1
                result['details'].append({'ip': ip_addr, 'macs': list(macs)})

        result['detected'] = result['conflicting_ips'] > 0
        return result

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

        # Flag 比例
        rst_ratio = tcp_flags['rst'] / total_tcp_packets if total_tcp_packets > 0 else 0
        psh_ratio = tcp_flags['psh'] / total_tcp_packets if total_tcp_packets > 0 else 0

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

        # Phase 9: 進階偵測
        dns_amp = self._detect_dns_amplification()
        slowloris = self._detect_slowloris()
        arp_spoof = self._detect_arp_spoofing()

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

        # PSH Flood 檢測
        elif psh_ratio > 0.6 and total_tcp_packets > 100:
            attack_type = 'PSH Flood'
            attack_description = '大量 PSH 封包淹沒目標，可能是 PSH Flood 攻擊'
            severity = 'high' if psh_ratio > 0.8 else 'medium'
            confidence = min(0.9, psh_ratio * 0.85)

        # DNS Amplification 檢測
        elif dns_amp['amplification_ratio'] > 3 and dns_amp['total_responses'] > 50 and dns_amp['response_source_count'] > 5:
            amp_r = dns_amp['amplification_ratio']
            src_c = dns_amp['response_source_count']
            attack_type = 'DNS Amplification'
            attack_description = f'DNS 放大攻擊：回應/查詢位元組比 {amp_r:.1f}x，來自 {src_c} 個不同 DNS 伺服器'
            severity = 'high' if amp_r > 10 else 'medium'
            confidence = min(0.9, amp_r / 20 + src_c / 50)

        # Slowloris 檢測
        elif slowloris['detected']:
            sl_count = slowloris['suspicious_sources']
            attack_type = 'Slowloris'
            attack_description = f'疑似 Slowloris 慢速攻擊：{sl_count} 個來源 IP 維持大量低流量長連線'
            severity = 'high' if sl_count > 3 else 'medium'
            confidence = min(0.85, 0.5 + sl_count * 0.1)

        # ARP Spoofing 檢測
        elif arp_spoof['detected']:
            arp_count = arp_spoof['conflicting_ips']
            attack_type = 'ARP Spoofing'
            attack_description = f'偵測到 ARP 欺騙：{arp_count} 個 IP 位址對應到多個 MAC 位址'
            severity = 'high' if arp_count > 2 else 'medium'
            confidence = min(0.9, 0.6 + arp_count * 0.15)

        # 端口掃描檢測
        elif len(target_ports) > 50 and source_concentration > 0.8:
            attack_type = 'Port Scan'
            attack_description = '單一來源掃描大量端口，可能是偵察行為'
            severity = 'low'
            confidence = min(0.8, len(target_ports) / 100 * 0.5 + source_concentration * 0.3)

        # 高速單源洪泛（通用規則）
        elif connections_per_second > 80 and source_concentration > 0.9 and total_tcp_packets > 200:
            attack_type = 'Volumetric Flood'
            attack_description = f'單一來源 IP 以 {connections_per_second:.0f} 連線/秒的速率發送大量封包'
            severity = 'high' if connections_per_second > 150 else 'medium'
            confidence = min(0.85, connections_per_second / 200 + source_concentration * 0.2)

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
        if psh_ratio > 0.6:
            anomaly_score += psh_ratio * 25
        if source_concentration > 0.9 and total_tcp_packets > 100:
            anomaly_score += source_concentration * 15
        if dns_amp['amplification_ratio'] > 3:
            anomaly_score += min(20, dns_amp['amplification_ratio'] * 2)
        if slowloris['suspicious_sources'] > 0:
            anomaly_score += min(20, slowloris['suspicious_sources'] * 5)
        if arp_spoof['conflicting_ips'] > 0:
            anomaly_score += min(25, arp_spoof['conflicting_ips'] * 10)

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
                'unique_target_ports': len(target_ports),
                'dns_amplification_ratio': round(dns_amp['amplification_ratio'], 1),
                'slowloris_sources': slowloris['suspicious_sources'],
                'arp_conflicts': arp_spoof['conflicting_ips']
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

    @staticmethod
    def _parse_tcp_options(options, byte_offset):
        """Parse TCP options into structured fields with byte ranges.

        Args:
            options: Scapy parsed options list [(kind_name, value), ...]
            byte_offset: starting byte offset of the options block

        Returns:
            list of field dicts suitable for the layer tree
        """
        fields = []
        pos = byte_offset
        for opt_name, opt_val in (options or []):
            kind = opt_name
            if kind == 'EOL':
                fields.append({'name': 'End of Option List (EOL)', 'value': '', 'byteRange': [pos, pos]})
                pos += 1
            elif kind == 'NOP':
                fields.append({'name': 'No-Operation (NOP)', 'value': '', 'byteRange': [pos, pos]})
                pos += 1
            elif kind == 'MSS':
                val = opt_val if isinstance(opt_val, int) else 0
                fields.append({'name': 'Maximum Segment Size', 'value': f'{val} bytes', 'byteRange': [pos, pos + 3]})
                pos += 4
            elif kind == 'WScale':
                val = opt_val if isinstance(opt_val, int) else 0
                multiplier = 2 ** val
                fields.append({'name': 'Window Scale', 'value': f'{val} (multiply by {multiplier})', 'byteRange': [pos, pos + 2]})
                pos += 3
            elif kind == 'SAckOK':
                fields.append({'name': 'SACK Permitted', 'value': '', 'byteRange': [pos, pos + 1]})
                pos += 2
            elif kind == 'SAck':
                blocks = opt_val if isinstance(opt_val, (list, tuple)) else ()
                block_strs = []
                for i in range(0, len(blocks), 2):
                    if i + 1 < len(blocks):
                        block_strs.append(f'{blocks[i]}-{blocks[i + 1]}')
                block_len = 2 + len(blocks) * 4
                fields.append({
                    'name': 'SACK',
                    'value': ', '.join(block_strs) if block_strs else str(opt_val),
                    'byteRange': [pos, pos + block_len - 1]
                })
                pos += block_len
            elif kind == 'Timestamp':
                if isinstance(opt_val, (list, tuple)) and len(opt_val) == 2:
                    tsval, tsecr = opt_val
                    fields.append({'name': 'Timestamps', 'value': f'TSval={tsval}, TSecr={tsecr}', 'byteRange': [pos, pos + 9]})
                else:
                    fields.append({'name': 'Timestamps', 'value': str(opt_val), 'byteRange': [pos, pos + 9]})
                pos += 10
            else:
                # Unknown / other option
                opt_len = 2
                if isinstance(opt_val, bytes):
                    opt_len = 2 + len(opt_val)
                elif isinstance(opt_val, (list, tuple)):
                    opt_len = 2 + len(opt_val) * 4
                fields.append({
                    'name': f'Option: {kind}',
                    'value': str(opt_val) if opt_val is not None else '',
                    'byteRange': [pos, pos + opt_len - 1]
                })
                pos += opt_len
        return fields

    @staticmethod
    def _dns_rcode_name(rcode):
        """Return human-readable DNS response code."""
        codes = {0: 'No Error', 1: 'Format Error', 2: 'Server Failure',
                 3: 'Name Error (NXDOMAIN)', 4: 'Not Implemented', 5: 'Refused'}
        return codes.get(rcode, f'Code {rcode}')

    @staticmethod
    def _dns_qtype_name(qtype):
        """Return human-readable DNS query type."""
        types = {1: 'A', 2: 'NS', 5: 'CNAME', 6: 'SOA', 12: 'PTR',
                 15: 'MX', 16: 'TXT', 28: 'AAAA', 33: 'SRV', 35: 'NAPTR',
                 43: 'DS', 46: 'RRSIG', 47: 'NSEC', 48: 'DNSKEY', 255: 'ANY',
                 65: 'HTTPS', 64: 'SVCB', 257: 'CAA'}
        return types.get(qtype, f'Type {qtype}')

    def _extract_packet_deep_detail(self, packet_index):
        """Extract deep dissection of a single packet with per-field byte offsets.

        Returns a structure suitable for Wireshark-style layer tree + hex dump display.
        Each field includes byteRange [start, end] (inclusive) into the raw packet bytes.
        """
        if packet_index < 0 or packet_index >= len(self.packets):
            return None

        packet = self.packets[packet_index]
        raw_bytes = bytes(packet)
        timestamp = float(packet.time)

        ts_human = datetime.fromtimestamp(timestamp, tz=timezone.utc).strftime('%Y-%m-%d %H:%M:%S.%f')

        layers = []
        offset = 0  # cumulative byte offset

        # Frame (meta layer — no physical bytes, but covers entire packet)
        layers.append({
            'name': 'Frame',
            'displayName': f'Frame {packet_index} ({len(raw_bytes)} bytes on wire)',
            'byteRange': [0, len(raw_bytes) - 1],
            'fields': [
                {'name': 'Arrival Time', 'value': ts_human, 'byteRange': None},
                {'name': 'Frame Length', 'value': f'{len(raw_bytes)} bytes', 'byteRange': None},
                {'name': 'Capture Length', 'value': f'{len(raw_bytes)} bytes', 'byteRange': None},
            ]
        })

        # Ethernet layer
        if packet.haslayer(Ether):
            eth = packet[Ether]
            eth_len = 14  # standard Ethernet II header
            layers.append({
                'name': 'Ethernet',
                'displayName': f'Ethernet II, Src: {eth.src}, Dst: {eth.dst}',
                'byteRange': [offset, offset + eth_len - 1],
                'fields': [
                    {'name': 'Destination', 'value': eth.dst, 'byteRange': [offset, offset + 5]},
                    {'name': 'Source', 'value': eth.src, 'byteRange': [offset + 6, offset + 11]},
                    {'name': 'Type', 'value': f'0x{eth.type:04x}', 'byteRange': [offset + 12, offset + 13]},
                ]
            })
            offset += eth_len

        # IP layer
        if packet.haslayer(IP):
            ip = packet[IP]
            ip_hdr_len = ip.ihl * 4
            ip_start = offset
            fields = [
                {'name': 'Version', 'value': str(ip.version), 'byteRange': [ip_start, ip_start]},
                {'name': 'Header Length', 'value': f'{ip_hdr_len} bytes ({ip.ihl})', 'byteRange': [ip_start, ip_start]},
                {'name': 'DSCP/ECN', 'value': f'0x{ip.tos:02x}', 'byteRange': [ip_start + 1, ip_start + 1]},
                {'name': 'Total Length', 'value': str(ip.len), 'byteRange': [ip_start + 2, ip_start + 3]},
                {'name': 'Identification', 'value': f'0x{ip.id:04x}', 'byteRange': [ip_start + 4, ip_start + 5]},
                {'name': 'Flags', 'value': f'0x{ip.flags.value:02x}' if hasattr(ip.flags, 'value') else str(ip.flags), 'byteRange': [ip_start + 6, ip_start + 7]},
                {'name': 'Fragment Offset', 'value': str(ip.frag), 'byteRange': [ip_start + 6, ip_start + 7]},
                {'name': 'TTL', 'value': str(ip.ttl), 'byteRange': [ip_start + 8, ip_start + 8]},
                {'name': 'Protocol', 'value': str(ip.proto), 'byteRange': [ip_start + 9, ip_start + 9]},
                {'name': 'Header Checksum', 'value': f'0x{ip.chksum:04x}' if ip.chksum is not None else '0x0000', 'byteRange': [ip_start + 10, ip_start + 11]},
                {'name': 'Source Address', 'value': ip.src, 'byteRange': [ip_start + 12, ip_start + 15]},
                {'name': 'Destination Address', 'value': ip.dst, 'byteRange': [ip_start + 16, ip_start + 19]},
            ]
            if ip_hdr_len > 20:
                fields.append({'name': 'Options', 'value': f'{ip_hdr_len - 20} bytes', 'byteRange': [ip_start + 20, ip_start + ip_hdr_len - 1]})

            layers.append({
                'name': 'IPv4',
                'displayName': f'Internet Protocol Version 4, Src: {ip.src}, Dst: {ip.dst}',
                'byteRange': [ip_start, ip_start + ip_hdr_len - 1],
                'fields': fields
            })
            offset = ip_start + ip_hdr_len

            # TCP layer
            if packet.haslayer(TCP):
                tcp = packet[TCP]
                tcp_hdr_len = tcp.dataofs * 4
                tcp_start = offset

                flag_names = []
                if tcp.flags.S: flag_names.append('SYN')
                if tcp.flags.A: flag_names.append('ACK')
                if tcp.flags.F: flag_names.append('FIN')
                if tcp.flags.R: flag_names.append('RST')
                if tcp.flags.P: flag_names.append('PSH')
                if tcp.flags.U: flag_names.append('URG')
                flags_str = ', '.join(flag_names) if flag_names else 'NONE'

                tcp_fields = [
                    {'name': 'Source Port', 'value': str(tcp.sport), 'byteRange': [tcp_start, tcp_start + 1]},
                    {'name': 'Destination Port', 'value': str(tcp.dport), 'byteRange': [tcp_start + 2, tcp_start + 3]},
                    {'name': 'Sequence Number', 'value': str(tcp.seq), 'byteRange': [tcp_start + 4, tcp_start + 7]},
                    {'name': 'Acknowledgment Number', 'value': str(tcp.ack), 'byteRange': [tcp_start + 8, tcp_start + 11]},
                    {'name': 'Data Offset', 'value': f'{tcp_hdr_len} bytes ({tcp.dataofs})', 'byteRange': [tcp_start + 12, tcp_start + 12]},
                    {'name': 'Flags', 'value': f'0x{int(tcp.flags):03x} ({flags_str})', 'byteRange': [tcp_start + 12, tcp_start + 13]},
                    {'name': 'Window', 'value': str(tcp.window), 'byteRange': [tcp_start + 14, tcp_start + 15]},
                    {'name': 'Checksum', 'value': f'0x{tcp.chksum:04x}' if tcp.chksum is not None else '0x0000', 'byteRange': [tcp_start + 16, tcp_start + 17]},
                    {'name': 'Urgent Pointer', 'value': str(tcp.urgptr), 'byteRange': [tcp_start + 18, tcp_start + 19]},
                ]
                if tcp_hdr_len > 20:
                    opt_bytes = tcp_hdr_len - 20
                    opt_fields = self._parse_tcp_options(tcp.options, tcp_start + 20)
                    tcp_fields.append({
                        'name': 'Options',
                        'value': f'{opt_bytes} bytes ({len(opt_fields)} options)',
                        'byteRange': [tcp_start + 20, tcp_start + tcp_hdr_len - 1],
                        'children': opt_fields
                    })

                layers.append({
                    'name': 'TCP',
                    'displayName': f'TCP, Src Port: {tcp.sport}, Dst Port: {tcp.dport} [{flags_str}]',
                    'byteRange': [tcp_start, tcp_start + tcp_hdr_len - 1],
                    'fields': tcp_fields
                })
                offset = tcp_start + tcp_hdr_len

            # UDP layer
            elif packet.haslayer(UDP):
                udp = packet[UDP]
                udp_start = offset
                udp_hdr_len = 8

                layers.append({
                    'name': 'UDP',
                    'displayName': f'UDP, Src Port: {udp.sport}, Dst Port: {udp.dport}',
                    'byteRange': [udp_start, udp_start + udp_hdr_len - 1],
                    'fields': [
                        {'name': 'Source Port', 'value': str(udp.sport), 'byteRange': [udp_start, udp_start + 1]},
                        {'name': 'Destination Port', 'value': str(udp.dport), 'byteRange': [udp_start + 2, udp_start + 3]},
                        {'name': 'Length', 'value': str(udp.len), 'byteRange': [udp_start + 4, udp_start + 5]},
                        {'name': 'Checksum', 'value': f'0x{udp.chksum:04x}' if udp.chksum is not None else '0x0000', 'byteRange': [udp_start + 6, udp_start + 7]},
                    ]
                })
                offset = udp_start + udp_hdr_len

                # DNS layer (inside UDP)
                if packet.haslayer(DNS):
                    dns = packet[DNS]
                    dns_start = offset
                    qr = 'Response' if dns.qr else 'Query'
                    rcode_name = self._dns_rcode_name(dns.rcode)
                    dns_fields = [
                        {'name': 'Transaction ID', 'value': f'0x{dns.id:04x}', 'byteRange': [dns_start, dns_start + 1]},
                        {'name': 'Flags', 'value': f'0x{(dns.qr << 15 | dns.opcode << 11 | dns.aa << 10 | dns.rd << 8 | dns.ra << 7 | dns.rcode):04x} ({qr})', 'byteRange': [dns_start + 2, dns_start + 3]},
                        {'name': 'QR', 'value': f'{dns.qr} ({qr})', 'byteRange': None},
                        {'name': 'Opcode', 'value': str(dns.opcode), 'byteRange': None},
                        {'name': 'AA (Authoritative)', 'value': str(dns.aa), 'byteRange': None},
                        {'name': 'RD (Recursion Desired)', 'value': str(dns.rd), 'byteRange': None},
                        {'name': 'RA (Recursion Available)', 'value': str(dns.ra), 'byteRange': None},
                        {'name': 'Response Code', 'value': f'{dns.rcode} ({rcode_name})', 'byteRange': None},
                        {'name': 'Questions', 'value': str(dns.qdcount), 'byteRange': [dns_start + 4, dns_start + 5]},
                        {'name': 'Answer RRs', 'value': str(dns.ancount), 'byteRange': [dns_start + 6, dns_start + 7]},
                        {'name': 'Authority RRs', 'value': str(dns.nscount), 'byteRange': [dns_start + 8, dns_start + 9]},
                        {'name': 'Additional RRs', 'value': str(dns.arcount), 'byteRange': [dns_start + 10, dns_start + 11]},
                    ]
                    # Parse question section
                    if dns.qdcount and packet.haslayer(DNSQR):
                        qr_layer = packet[DNSQR]
                        qname = qr_layer.qname.decode('utf-8', errors='replace') if isinstance(qr_layer.qname, bytes) else str(qr_layer.qname)
                        qtype_name = self._dns_qtype_name(qr_layer.qtype)
                        dns_fields.append({
                            'name': 'Query',
                            'value': f'{qname} type {qtype_name}',
                            'byteRange': None,
                            'children': [
                                {'name': 'Name', 'value': qname, 'byteRange': None},
                                {'name': 'Type', 'value': f'{qr_layer.qtype} ({qtype_name})', 'byteRange': None},
                                {'name': 'Class', 'value': str(qr_layer.qclass), 'byteRange': None},
                            ]
                        })
                    # Parse answer section
                    if dns.ancount and packet.haslayer(DNSRR):
                        rr = dns.an
                        ans_children = []
                        for i in range(dns.ancount):
                            if rr is None:
                                break
                            rr_name = rr.rrname.decode('utf-8', errors='replace') if isinstance(rr.rrname, bytes) else str(rr.rrname)
                            rr_type = self._dns_qtype_name(rr.type)
                            try:
                                rdata = rr.rdata if hasattr(rr, 'rdata') else str(rr.payload)
                            except Exception:
                                rdata = '(unparsed)'
                            if isinstance(rdata, bytes):
                                rdata = rdata.decode('utf-8', errors='replace')
                            ans_children.append({
                                'name': f'Answer {i + 1}',
                                'value': f'{rr_name} {rr_type} {rdata}',
                                'byteRange': None,
                                'children': [
                                    {'name': 'Name', 'value': rr_name, 'byteRange': None},
                                    {'name': 'Type', 'value': f'{rr.type} ({rr_type})', 'byteRange': None},
                                    {'name': 'TTL', 'value': str(rr.ttl), 'byteRange': None},
                                    {'name': 'Data', 'value': str(rdata), 'byteRange': None},
                                ]
                            })
                            rr = rr.payload if hasattr(rr, 'payload') and isinstance(rr.payload, DNSRR) else None
                        if ans_children:
                            dns_fields.append({
                                'name': 'Answers',
                                'value': f'{len(ans_children)} records',
                                'byteRange': None,
                                'children': ans_children
                            })

                    dns_end = len(raw_bytes) - 1  # DNS extends to end of packet
                    layers.append({
                        'name': 'DNS',
                        'displayName': f'DNS {qr}, ID: 0x{dns.id:04x}',
                        'byteRange': [dns_start, dns_end],
                        'fields': dns_fields
                    })
                    offset = dns_end + 1

            # ICMP layer
            elif packet.haslayer(ICMP):
                icmp = packet[ICMP]
                icmp_start = offset
                icmp_hdr_len = 8

                icmp_types = {0: 'Echo Reply', 3: 'Destination Unreachable', 8: 'Echo Request', 11: 'Time Exceeded'}
                type_name = icmp_types.get(icmp.type, f'Type {icmp.type}')

                layers.append({
                    'name': 'ICMP',
                    'displayName': f'ICMP {type_name}',
                    'byteRange': [icmp_start, icmp_start + icmp_hdr_len - 1],
                    'fields': [
                        {'name': 'Type', 'value': f'{icmp.type} ({type_name})', 'byteRange': [icmp_start, icmp_start]},
                        {'name': 'Code', 'value': str(icmp.code), 'byteRange': [icmp_start + 1, icmp_start + 1]},
                        {'name': 'Checksum', 'value': f'0x{icmp.chksum:04x}' if icmp.chksum is not None else '0x0000', 'byteRange': [icmp_start + 2, icmp_start + 3]},
                        {'name': 'Identifier', 'value': str(getattr(icmp, 'id', 0)), 'byteRange': [icmp_start + 4, icmp_start + 5]},
                        {'name': 'Sequence', 'value': str(getattr(icmp, 'seq', 0)), 'byteRange': [icmp_start + 6, icmp_start + 7]},
                    ]
                })
                offset = icmp_start + icmp_hdr_len

        # IPv6 layer
        elif packet.haslayer(IPv6):
            ipv6 = packet[IPv6]
            ipv6_start = offset
            ipv6_hdr_len = 40  # fixed IPv6 header
            next_hdr_names = {6: 'TCP', 17: 'UDP', 58: 'ICMPv6', 44: 'Fragment', 43: 'Routing', 0: 'Hop-by-Hop'}
            nh_name = next_hdr_names.get(ipv6.nh, str(ipv6.nh))
            layers.append({
                'name': 'IPv6',
                'displayName': f'Internet Protocol Version 6, Src: {ipv6.src}, Dst: {ipv6.dst}',
                'byteRange': [ipv6_start, ipv6_start + ipv6_hdr_len - 1],
                'fields': [
                    {'name': 'Version', 'value': '6', 'byteRange': [ipv6_start, ipv6_start]},
                    {'name': 'Traffic Class', 'value': f'0x{ipv6.tc:02x}', 'byteRange': [ipv6_start, ipv6_start + 1]},
                    {'name': 'Flow Label', 'value': f'0x{ipv6.fl:05x}', 'byteRange': [ipv6_start + 1, ipv6_start + 3]},
                    {'name': 'Payload Length', 'value': str(ipv6.plen), 'byteRange': [ipv6_start + 4, ipv6_start + 5]},
                    {'name': 'Next Header', 'value': f'{ipv6.nh} ({nh_name})', 'byteRange': [ipv6_start + 6, ipv6_start + 6]},
                    {'name': 'Hop Limit', 'value': str(ipv6.hlim), 'byteRange': [ipv6_start + 7, ipv6_start + 7]},
                    {'name': 'Source Address', 'value': ipv6.src, 'byteRange': [ipv6_start + 8, ipv6_start + 23]},
                    {'name': 'Destination Address', 'value': ipv6.dst, 'byteRange': [ipv6_start + 24, ipv6_start + 39]},
                ]
            })
            offset = ipv6_start + ipv6_hdr_len

            # TCP/UDP inside IPv6
            if packet.haslayer(TCP):
                tcp = packet[TCP]
                tcp_hdr_len = tcp.dataofs * 4
                tcp_start = offset
                flag_names = []
                if tcp.flags.S: flag_names.append('SYN')
                if tcp.flags.A: flag_names.append('ACK')
                if tcp.flags.F: flag_names.append('FIN')
                if tcp.flags.R: flag_names.append('RST')
                if tcp.flags.P: flag_names.append('PSH')
                if tcp.flags.U: flag_names.append('URG')
                flags_str = ', '.join(flag_names) if flag_names else 'NONE'
                tcp_fields = [
                    {'name': 'Source Port', 'value': str(tcp.sport), 'byteRange': [tcp_start, tcp_start + 1]},
                    {'name': 'Destination Port', 'value': str(tcp.dport), 'byteRange': [tcp_start + 2, tcp_start + 3]},
                    {'name': 'Sequence Number', 'value': str(tcp.seq), 'byteRange': [tcp_start + 4, tcp_start + 7]},
                    {'name': 'Acknowledgment Number', 'value': str(tcp.ack), 'byteRange': [tcp_start + 8, tcp_start + 11]},
                    {'name': 'Flags', 'value': f'0x{int(tcp.flags):03x} ({flags_str})', 'byteRange': [tcp_start + 12, tcp_start + 13]},
                    {'name': 'Window', 'value': str(tcp.window), 'byteRange': [tcp_start + 14, tcp_start + 15]},
                ]
                if tcp_hdr_len > 20:
                    opt_fields = self._parse_tcp_options(tcp.options, tcp_start + 20)
                    tcp_fields.append({
                        'name': 'Options', 'value': f'{tcp_hdr_len - 20} bytes ({len(opt_fields)} options)',
                        'byteRange': [tcp_start + 20, tcp_start + tcp_hdr_len - 1], 'children': opt_fields
                    })
                layers.append({
                    'name': 'TCP',
                    'displayName': f'TCP, Src Port: {tcp.sport}, Dst Port: {tcp.dport} [{flags_str}]',
                    'byteRange': [tcp_start, tcp_start + tcp_hdr_len - 1],
                    'fields': tcp_fields
                })
                offset = tcp_start + tcp_hdr_len
            elif packet.haslayer(UDP):
                udp = packet[UDP]
                udp_start = offset
                layers.append({
                    'name': 'UDP',
                    'displayName': f'UDP, Src Port: {udp.sport}, Dst Port: {udp.dport}',
                    'byteRange': [udp_start, udp_start + 7],
                    'fields': [
                        {'name': 'Source Port', 'value': str(udp.sport), 'byteRange': [udp_start, udp_start + 1]},
                        {'name': 'Destination Port', 'value': str(udp.dport), 'byteRange': [udp_start + 2, udp_start + 3]},
                        {'name': 'Length', 'value': str(udp.len), 'byteRange': [udp_start + 4, udp_start + 5]},
                        {'name': 'Checksum', 'value': f'0x{udp.chksum:04x}' if udp.chksum else '0x0000', 'byteRange': [udp_start + 6, udp_start + 7]},
                    ]
                })
                offset = udp_start + 8

        # Payload / Data layer (remaining bytes after all headers)
        if offset < len(raw_bytes):
            payload_len = len(raw_bytes) - offset
            preview = raw_bytes[offset:offset + 100]
            ascii_preview = ''.join(chr(b) if 32 <= b < 127 else '.' for b in preview)

            layers.append({
                'name': 'Data',
                'displayName': f'Data ({payload_len} bytes)',
                'byteRange': [offset, len(raw_bytes) - 1],
                'fields': [
                    {'name': 'Length', 'value': f'{payload_len} bytes', 'byteRange': [offset, len(raw_bytes) - 1]},
                    {'name': 'Preview (ASCII)', 'value': ascii_preview[:80], 'byteRange': [offset, min(offset + len(ascii_preview) - 1, len(raw_bytes) - 1)]},
                ]
            })

        return {
            'index': packet_index,
            'timestamp': timestamp,
            'timestampHuman': ts_human,
            'captureLength': len(raw_bytes),
            'wireLength': len(raw_bytes),
            'layers': layers,
            'rawHex': raw_bytes[:65535].hex(),
            'totalBytes': len(raw_bytes)
        }

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
        # Parse connection ID — supports both IPv4 and IPv6 (bracketed) formats
        # IPv4: "tcp-10.0.0.1-80-10.0.0.2-443"
        # IPv6: "tcp-[2001:db8::1]-80-[2001:db8::2]-443"
        import re as _re
        _ip_part = r'(?:\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|\[[0-9a-fA-F:]+\])'
        m = _re.search(rf'({_ip_part})-(\d+)-({_ip_part})-(\d+)', connection_id)
        if not m:
            return set()
        try:
            src_ip = m.group(1).strip('[]')
            src_port = int(m.group(2))
            dst_ip = m.group(3).strip('[]')
            dst_port = int(m.group(4))
        except (ValueError, IndexError):
            return set()

        # Scan packets to find matches
        matched_indices = set()
        for idx, packet in enumerate(self.packets):
            has_ip = packet.haslayer(IP)
            has_ipv6 = packet.haslayer(IPv6)
            if not has_ip and not has_ipv6:
                continue

            ip = packet[IP] if has_ip else packet[IPv6]

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

            # For flood connections: use allPacketRefs (larger sample) for accurate statistics.
            # Stage packetRefs only cover 30 animation frames; allPacketRefs holds up to 200
            # evenly-sampled indices so the statistics endpoint gets representative flag data.
            if timeline.get('allPacketRefs'):
                packet_indices.update(timeline['allPacketRefs'])
            elif 'stages' in timeline:
                # PRIMARY: Collect all packet references from stages
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

    # ── Phase 5: Statistics summary ────────────────────────────────────

    def generate_statistics_summary(self):
        """Generate Wireshark-style protocol hierarchy, endpoint and conversation stats."""
        if not self.packets:
            return None

        # Protocol hierarchy: Ethernet → IP → TCP/UDP → Application
        hierarchy = {}
        endpoints = Counter()     # ip → {sent, recv, bytes_sent, bytes_recv}
        endpoint_details = {}
        conversations = Counter()  # sorted pair → packet count
        conversation_details = {}

        for packet in self.packets:
            pkt_len = len(packet)
            proto_path = []

            if packet.haslayer(Ether):
                proto_path.append('Ethernet')

            has_ip = packet.haslayer(IP)
            has_ipv6 = packet.haslayer(IPv6)
            src_ip = dst_ip = None

            if has_ip:
                proto_path.append('IPv4')
                src_ip, dst_ip = packet[IP].src, packet[IP].dst
            elif has_ipv6:
                proto_path.append('IPv6')
                src_ip, dst_ip = packet[IPv6].src, packet[IPv6].dst

            if src_ip:
                ep_src = endpoint_details.setdefault(src_ip, {'packets_sent': 0, 'packets_recv': 0, 'bytes_sent': 0, 'bytes_recv': 0})
                ep_src['packets_sent'] += 1
                ep_src['bytes_sent'] += pkt_len

                ep_dst = endpoint_details.setdefault(dst_ip, {'packets_sent': 0, 'packets_recv': 0, 'bytes_sent': 0, 'bytes_recv': 0})
                ep_dst['packets_recv'] += 1
                ep_dst['bytes_recv'] += pkt_len

                conv_key = tuple(sorted([src_ip, dst_ip]))
                conv = conversation_details.setdefault(conv_key, {'packets': 0, 'bytes': 0, 'src_ip': conv_key[0], 'dst_ip': conv_key[1]})
                conv['packets'] += 1
                conv['bytes'] += pkt_len

            if packet.haslayer(TCP):
                proto_path.append('TCP')
                tcp = packet[TCP]
                if tcp.sport == 80 or tcp.dport == 80:
                    proto_path.append('HTTP')
                elif tcp.sport == 443 or tcp.dport == 443:
                    proto_path.append('TLS/HTTPS')
                elif tcp.sport == 22 or tcp.dport == 22:
                    proto_path.append('SSH')
            elif packet.haslayer(UDP):
                proto_path.append('UDP')
                udp = packet[UDP]
                if udp.sport == 53 or udp.dport == 53:
                    proto_path.append('DNS')
            elif packet.haslayer(ICMP):
                proto_path.append('ICMP')

            # Build hierarchy tree
            node = hierarchy
            for layer_name in proto_path:
                if layer_name not in node:
                    node[layer_name] = {'_count': 0, '_bytes': 0}
                node[layer_name]['_count'] += 1
                node[layer_name]['_bytes'] += pkt_len
                node = node[layer_name]

        def build_hierarchy_tree(tree, total_packets):
            result = []
            for key, val in tree.items():
                if key.startswith('_'):
                    continue
                entry = {
                    'protocol': key,
                    'packets': val['_count'],
                    'bytes': val['_bytes'],
                    'percentage': round(val['_count'] / total_packets * 100, 1) if total_packets else 0,
                }
                children = build_hierarchy_tree(val, total_packets)
                if children:
                    entry['children'] = children
                result.append(entry)
            result.sort(key=lambda x: x['packets'], reverse=True)
            return result

        total = len(self.packets)
        summary = {
            'protocolHierarchy': build_hierarchy_tree(hierarchy, total),
            'endpoints': sorted(
                [{'ip': ip, **stats} for ip, stats in endpoint_details.items()],
                key=lambda x: x['packets_sent'] + x['packets_recv'],
                reverse=True
            )[:100],
            'conversations': sorted(
                list(conversation_details.values()),
                key=lambda x: x['packets'],
                reverse=True
            )[:100],
            'totalPackets': total,
        }
        self.analysis_results['statistics_summary'] = summary
        return summary

    # ── Phase 6: Expert info ───────────────────────────────────────────

    def extract_expert_info(self):
        """Extract expert information events (retransmissions, RST, ZeroWindow, anomalous TTL)."""
        events = []

        # Reuse packet loss data if available
        loss_data = self.analysis_results.get('packet_loss')
        if loss_data is None:
            loss_data = self.detect_packet_loss()

        for item in loss_data:
            if item['type'] == 'retransmission':
                events.append({
                    'severity': 'warning',
                    'type': 'Retransmission',
                    'message': f'TCP retransmission in stream {item["stream"]}',
                    'packetIndex': item['packet_index'],
                    'timestamp': item['time'],
                    'stream': item['stream']
                })
            elif item['type'] == 'sequence_gap':
                events.append({
                    'severity': 'warning',
                    'type': 'Sequence Gap',
                    'message': f'Gap of {item.get("gap_size", 0)} bytes in {item["stream"]}',
                    'packetIndex': item['packet_index'],
                    'timestamp': item['time'],
                    'stream': item['stream']
                })

        # Scan for RST, ZeroWindow, anomalous TTL
        for idx, packet in enumerate(self.packets):
            if not packet.haslayer(IP):
                if not packet.haslayer(IPv6):
                    continue
            ts = float(packet.time)

            ip = packet[IP] if packet.haslayer(IP) else packet[IPv6]
            ttl = getattr(ip, 'ttl', getattr(ip, 'hlim', 64))

            if packet.haslayer(TCP):
                tcp = packet[TCP]
                flags = int(tcp.flags)
                stream = f"{ip.src}:{tcp.sport}-{ip.dst}:{tcp.dport}"

                if flags & 0x04:  # RST
                    events.append({
                        'severity': 'error',
                        'type': 'RST',
                        'message': f'Connection reset {stream}',
                        'packetIndex': idx,
                        'timestamp': ts,
                        'stream': stream
                    })
                if tcp.window == 0 and not (flags & 0x02):  # ZeroWindow (not SYN)
                    events.append({
                        'severity': 'error',
                        'type': 'Zero Window',
                        'message': f'Zero window advertised by {ip.src} in {stream}',
                        'packetIndex': idx,
                        'timestamp': ts,
                        'stream': stream
                    })

            if ttl <= 2:
                events.append({
                    'severity': 'note',
                    'type': 'Anomalous TTL',
                    'message': f'Very low TTL ({ttl}) from {ip.src}',
                    'packetIndex': idx,
                    'timestamp': ts,
                    'stream': ''
                })

        # 攻擊模式彙總事件（利用 detect_attacks() 的結果）
        attack_data = self.analysis_results.get('attack_analysis')
        if attack_data:
            det = attack_data.get('attack_detection', {})
            metrics = attack_data.get('metrics', {})
            flags = attack_data.get('tcp_flags', {})
            first_ts = float(self.packets[0].time) if self.packets else 0

            # 已偵測到攻擊 → error 事件
            if det.get('detected'):
                events.append({
                    'severity': 'error',
                    'type': det['type'],
                    'message': det.get('description', '偵測到攻擊行為'),
                    'packetIndex': 0,
                    'timestamp': first_ts,
                    'stream': ''
                })

            # 高連線速率 → warning 事件
            cps = metrics.get('connections_per_second', 0)
            if cps > 50:
                events.append({
                    'severity': 'warning',
                    'type': 'High Connection Rate',
                    'message': f'連線速率 {cps:.1f}/s 超出正常範圍（閾值 50/s）',
                    'packetIndex': 0,
                    'timestamp': first_ts,
                    'stream': ''
                })

            # 單一 flag 主導 → warning 事件
            total_tcp = metrics.get('total_tcp_packets', 0)
            if total_tcp > 100:
                for flag_name, count in flags.items():
                    ratio = count / total_tcp
                    if ratio > 0.8 and flag_name not in ('ack',):
                        events.append({
                            'severity': 'warning',
                            'type': 'Flag Anomaly',
                            'message': f'{flag_name.upper()} 封包佔比 {ratio:.0%}（{count}/{total_tcp}），可能為 {flag_name.upper()} Flood',
                            'packetIndex': 0,
                            'timestamp': first_ts,
                            'stream': ''
                        })

            # 單源高度集中 → note 事件
            sc = metrics.get('source_concentration', 0)
            if sc > 0.9 and total_tcp > 100:
                top_src = (attack_data.get('top_sources') or [{}])[0].get('ip', '未知')
                events.append({
                    'severity': 'note',
                    'type': 'Source Concentration',
                    'message': f'{sc:.0%} 的封包來自單一來源 {top_src}',
                    'packetIndex': 0,
                    'timestamp': first_ts,
                    'stream': ''
                })

        events.sort(key=lambda e: e['timestamp'])
        self.analysis_results['expert_info'] = events
        return events

    # ── Phase 10: TLS handshake parsing (raw bytes) ────────────────────

    TLS_VERSIONS = {
        (3, 1): 'TLS 1.0', (3, 2): 'TLS 1.1', (3, 3): 'TLS 1.2', (3, 4): 'TLS 1.3',
    }

    CIPHER_SUITES = {
        0x1301: 'TLS_AES_128_GCM_SHA256',
        0x1302: 'TLS_AES_256_GCM_SHA384',
        0x1303: 'TLS_CHACHA20_POLY1305_SHA256',
        0xc02b: 'TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256',
        0xc02c: 'TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384',
        0xc02f: 'TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256',
        0xc030: 'TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384',
        0xc013: 'TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA',
        0xc014: 'TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA',
        0x002f: 'TLS_RSA_WITH_AES_128_CBC_SHA',
        0x0035: 'TLS_RSA_WITH_AES_256_CBC_SHA',
        0x009c: 'TLS_RSA_WITH_AES_128_GCM_SHA256',
        0x009d: 'TLS_RSA_WITH_AES_256_GCM_SHA384',
        0xcca8: 'TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256',
        0xcca9: 'TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256',
    }

    def _parse_tls_version(self, major, minor):
        return self.TLS_VERSIONS.get((major, minor), f'Unknown ({major}.{minor})')

    def _parse_cipher_suite(self, code):
        name = self.CIPHER_SUITES.get(code, 'Unknown')
        return f'0x{code:04x} ({name})'

    def _extract_supported_version(self, data, offset):
        """Extract TLS 1.3 supported_versions from ClientHello extensions."""
        try:
            sid_len = data[offset]
            offset += 1 + sid_len
            if offset + 2 > len(data):
                return None
            cs_len = int.from_bytes(data[offset:offset + 2], 'big')
            offset += 2 + cs_len
            if offset >= len(data):
                return None
            cm_len = data[offset]
            offset += 1 + cm_len
            if offset + 2 > len(data):
                return None
            ext_len = int.from_bytes(data[offset:offset + 2], 'big')
            offset += 2
            ext_end = min(offset + ext_len, len(data))
            while offset + 4 <= ext_end:
                ext_type = int.from_bytes(data[offset:offset + 2], 'big')
                ext_data_len = int.from_bytes(data[offset + 2:offset + 4], 'big')
                offset += 4
                if ext_type == 0x002B and ext_data_len >= 3:  # supported_versions
                    # First byte is list length, then 2-byte version entries
                    if offset + 1 <= len(data):
                        list_len = data[offset]
                        for i in range(0, min(list_len, ext_data_len - 1), 2):
                            if offset + 1 + i + 2 <= len(data):
                                major = data[offset + 1 + i]
                                minor = data[offset + 1 + i + 1]
                                if (major, minor) == (3, 4):
                                    return 'TLS 1.3'
                offset += max(ext_data_len, 1)
        except (IndexError, ValueError):
            pass
        return None

    def _extract_sni(self, data, offset):
        """Extract SNI from ClientHello extensions."""
        try:
            # Skip session_id
            if offset >= len(data):
                return None
            sid_len = data[offset]
            offset += 1 + sid_len
            # Skip cipher suites
            if offset + 2 > len(data):
                return None
            cs_len = int.from_bytes(data[offset:offset + 2], 'big')
            offset += 2 + cs_len
            # Skip compression methods
            if offset >= len(data):
                return None
            cm_len = data[offset]
            offset += 1 + cm_len
            # Extensions
            if offset + 2 > len(data):
                return None
            ext_len = int.from_bytes(data[offset:offset + 2], 'big')
            offset += 2
            ext_end = min(offset + ext_len, len(data))
            while offset + 4 <= ext_end:
                ext_type = int.from_bytes(data[offset:offset + 2], 'big')
                ext_data_len = int.from_bytes(data[offset + 2:offset + 4], 'big')
                offset += 4
                if ext_type == 0x0000 and ext_data_len > 5:  # SNI
                    if offset + 5 > len(data):
                        break
                    name_len = int.from_bytes(data[offset + 3:offset + 5], 'big')
                    if offset + 5 + name_len <= len(data):
                        return data[offset + 5:offset + 5 + name_len].decode('ascii', errors='replace')
                offset += max(ext_data_len, 1)  # guard against zero-length infinite loop
        except (IndexError, ValueError):
            pass
        return None

    def extract_tls_info(self):
        """Extract TLS handshake info from raw packet bytes (no Scapy TLS dependency)."""
        sessions = {}  # connection_id → session dict

        for packet in self.packets:
            if not packet.haslayer(TCP) or not packet.haslayer(Raw):
                continue
            has_ip = packet.haslayer(IP)
            has_ipv6 = packet.haslayer(IPv6)
            if not has_ip and not has_ipv6:
                continue
            tcp = packet[TCP]
            if tcp.sport != 443 and tcp.dport != 443:
                continue

            ip = packet[IP] if has_ip else packet[IPv6]
            # Normalize connection ID: server (port 443) always on one side
            if tcp.sport == 443:
                conn_id = f'{ip.src}:{tcp.sport}-{ip.dst}:{tcp.dport}'
            else:
                conn_id = f'{ip.dst}:{tcp.dport}-{ip.src}:{tcp.sport}'

            data = bytes(packet[Raw].load)
            if len(data) < 6:
                continue

            content_type = data[0]
            if content_type not in (0x14, 0x15, 0x16, 0x17):
                continue

            if conn_id not in sessions:
                sessions[conn_id] = {
                    'connection_id': conn_id,
                    'client_hello': None,
                    'server_hello': None,
                    'handshake_complete': False,
                    'has_app_data': False,
                }

            sess = sessions[conn_id]

            if content_type == 0x17:  # Application Data
                sess['has_app_data'] = True
                continue

            if content_type == 0x14:  # ChangeCipherSpec
                sess['handshake_complete'] = True
                continue

            if content_type != 0x16 or len(data) < 6:  # Not Handshake
                continue

            # Validate record length to skip fragmented/truncated records
            record_len = int.from_bytes(data[3:5], 'big')
            if len(data) < 5 + record_len:
                continue

            try:
                hs_type = data[5]
                record_version = self._parse_tls_version(data[1], data[2])

                if hs_type == 1 and sess['client_hello'] is None:  # ClientHello
                    client_version = self._parse_tls_version(data[9], data[10]) if len(data) > 10 else record_version
                    # Count cipher suites
                    cs_count = 0
                    sni = None
                    if len(data) > 43:
                        sid_len = data[43]
                        cs_offset = 44 + sid_len
                        if cs_offset + 2 <= len(data):
                            cs_bytes = int.from_bytes(data[cs_offset:cs_offset + 2], 'big')
                            cs_count = cs_bytes // 2
                        sni = self._extract_sni(data, 43)
                    # TLS 1.3 advertises legacy_version=0x0303; check supported_versions extension
                    real_version = self._extract_supported_version(data, 43)
                    sess['client_hello'] = {
                        'sni': sni,
                        'tls_version': real_version or client_version,
                        'cipher_suite_count': cs_count,
                    }

                elif hs_type == 2 and sess['server_hello'] is None:  # ServerHello
                    server_version = self._parse_tls_version(data[9], data[10]) if len(data) > 10 else record_version
                    cipher_code = None
                    if len(data) > 43:
                        sid_len = data[43]
                        cs_offset = 44 + sid_len
                        if cs_offset + 2 <= len(data):
                            cipher_code = int.from_bytes(data[cs_offset:cs_offset + 2], 'big')
                    sess['server_hello'] = {
                        'tls_version': server_version,
                        'cipher_suite': self._parse_cipher_suite(cipher_code) if cipher_code else 'Unknown',
                    }
            except (IndexError, ValueError):
                continue

        tls_sessions = list(sessions.values())

        # Build summary
        version_counts = {}
        unique_snis = set()
        for sess in tls_sessions:
            if sess['server_hello']:
                v = sess['server_hello']['tls_version']
                version_counts[v] = version_counts.get(v, 0) + 1
            if sess['client_hello'] and sess['client_hello']['sni']:
                unique_snis.add(sess['client_hello']['sni'])

        result = {
            'tls_sessions': tls_sessions,
            'summary': {
                'total_tls_connections': len(tls_sessions),
                'tls_versions': version_counts,
                'unique_snis': sorted(unique_snis),
            }
        }

        self.analysis_results['tls_info'] = result
        return result

    # ── Phase 12: IP geolocation enrichment ─────────────────────────────

    def _classify_ip(self, ip_str):
        """Classify IP into network type with optional GeoIP lookup."""
        import ipaddress
        try:
            addr = ipaddress.ip_address(ip_str)
        except ValueError:
            return {'type': 'unknown', 'label': '未知', 'country_code': None, 'country_name': None}

        if addr.is_loopback:
            return {'type': 'loopback', 'label': 'Loopback', 'country_code': None, 'country_name': None}
        if addr.is_link_local:
            return {'type': 'link_local', 'label': 'Link-Local', 'country_code': None, 'country_name': None}
        if addr.is_private:
            return {'type': 'private', 'label': '區域網路', 'country_code': None, 'country_name': None}

        # Public IP — try optional GeoIP
        geo = self._geoip_lookup(ip_str)
        return {
            'type': 'public',
            'label': geo.get('country_name') or '外網',
            'country_code': geo.get('country_code'),
            'country_name': geo.get('country_name'),
        }

    def _geoip_lookup(self, ip_str):
        """Optional GeoIP lookup. Returns empty dict if DB not available."""
        if not hasattr(self, '_geoip_reader'):
            try:
                import geoip2.database
                from pathlib import Path
                db_path = Path(__file__).parent / 'data' / 'GeoLite2-Country.mmdb'
                if db_path.exists():
                    self._geoip_reader = geoip2.database.Reader(str(db_path))
                else:
                    self._geoip_reader = None
            except ImportError:
                self._geoip_reader = None
        if self._geoip_reader is None:
            return {}
        try:
            resp = self._geoip_reader.country(ip_str)
            return {'country_code': resp.country.iso_code, 'country_name': resp.country.name}
        except Exception:
            return {}

    def enrich_geo_info(self):
        """Enrich all IPs with geolocation/network type info."""
        stats = self.analysis_results.get('basic_stats')
        if not stats:
            self.analysis_results['geo_info'] = {}
            return {}

        all_ips = set()
        all_ips.update(stats.get('src_ips', {}).keys())
        all_ips.update(stats.get('dst_ips', {}).keys())

        geo_map = {}
        for ip in all_ips:
            geo_map[ip] = self._classify_ip(ip)

        self.analysis_results['geo_info'] = geo_map
        return geo_map

    # ── Phase 11: Network performance scoring ──────────────────────────

    def compute_performance_score(self):
        """Compute composite network performance score (0-100)."""
        stats = self.analysis_results.get('basic_stats')
        latency = self.analysis_results.get('latency')
        loss_data = self.analysis_results.get('packet_loss', [])

        if not stats or not latency:
            empty = {'overall': 0, 'grade': 'F',
                     'latency': {'score': 0, 'avg_rtt_ms': 0, 'grade': 'F', 'sample_count': 0},
                     'packet_loss': {'score': 0, 'retransmission_rate': 0, 'retransmission_count': 0, 'grade': 'F'},
                     'throughput': {'score': 0, 'bytes_per_second': 0, 'total_bytes': 0, 'grade': 'F'}}
            self.analysis_results['performance_score'] = empty
            return empty

        def _score_to_grade(s):
            if s >= 95: return 'A+'
            if s >= 80: return 'A'
            if s >= 65: return 'B'
            if s >= 50: return 'C'
            if s >= 30: return 'D'
            return 'F'

        def _interp(value, breakpoints):
            """Linear interpolation: breakpoints = [(val, score), ...] sorted ascending by val."""
            if value <= breakpoints[0][0]:
                return breakpoints[0][1]
            if value >= breakpoints[-1][0]:
                return breakpoints[-1][1]
            for i in range(len(breakpoints) - 1):
                v0, s0 = breakpoints[i]
                v1, s1 = breakpoints[i + 1]
                if v0 <= value <= v1:
                    t = (value - v0) / (v1 - v0) if v1 != v0 else 0
                    return s0 + t * (s1 - s0)
            return breakpoints[-1][1]

        # ── Latency score (40%) ──
        rtt_samples = []
        for h in latency.get('tcp_handshakes', []):
            rtt_samples.append(h['handshake_time'])
        for p in latency.get('ping_responses', []):
            rtt_samples.append(p['rtt'])

        if rtt_samples:
            avg_rtt = sum(rtt_samples) / len(rtt_samples)
        else:
            avg_rtt = 0

        # Lower RTT → higher score
        latency_breakpoints = [(0, 100), (20, 90), (50, 75), (100, 55), (200, 35), (500, 15), (2000, 5)]
        latency_score = _interp(avg_rtt, latency_breakpoints) if rtt_samples else 50  # neutral when no data

        latency_result = {
            'score': round(latency_score, 1),
            'avg_rtt_ms': round(avg_rtt, 1),
            'grade': _score_to_grade(latency_score),
            'sample_count': len(rtt_samples),
        }

        # ── Packet loss score (35%) ──
        retransmissions = [item for item in loss_data if item.get('type') == 'retransmission']
        retransmission_count = len(retransmissions)
        protocols = stats.get('protocols', {})
        total_tcp = protocols.get('TCP', 0) if isinstance(protocols, dict) else 0
        retransmission_rate = retransmission_count / total_tcp if total_tcp > 0 else 0

        # Lower loss → higher score
        loss_breakpoints = [(0, 100), (0.005, 95), (0.02, 75), (0.05, 50), (0.10, 30), (0.20, 10), (0.50, 0)]
        loss_score = _interp(retransmission_rate, loss_breakpoints)

        loss_result = {
            'score': round(loss_score, 1),
            'retransmission_rate': round(retransmission_rate, 4),
            'retransmission_count': retransmission_count,
            'total_tcp_packets': total_tcp,
            'grade': _score_to_grade(loss_score),
        }

        # ── Throughput score (25%) ──
        packet_sizes = stats.get('packet_sizes', [])
        total_bytes = sum(packet_sizes) if packet_sizes else 0

        if len(self.packets) >= 2:
            first_t = float(self.packets[0].time)
            last_t = float(self.packets[-1].time)
            duration = max(last_t - first_t, 0.001)
        else:
            duration = 0.001

        bps = total_bytes / duration

        # Higher throughput → higher score
        tp_breakpoints = [(0, 10), (1024, 30), (10240, 50), (102400, 70), (1048576, 85), (10485760, 100)]
        tp_score = _interp(bps, tp_breakpoints)

        tp_result = {
            'score': round(tp_score, 1),
            'bytes_per_second': round(bps, 1),
            'total_bytes': total_bytes,
            'duration_seconds': round(duration, 2),
            'grade': _score_to_grade(tp_score),
        }

        # ── Overall ──
        overall = latency_score * 0.40 + loss_score * 0.35 + tp_score * 0.25
        overall = max(0, min(100, overall))

        result = {
            'overall': round(overall, 1),
            'grade': _score_to_grade(overall),
            'latency': latency_result,
            'packet_loss': loss_result,
            'throughput': tp_result,
        }

        self.analysis_results['performance_score'] = result
        return result

    # ── Phase 8: TCP stream reassembly ─────────────────────────────────

    def reassemble_tcp_stream(self, connection_id):
        """Reassemble a TCP stream's payload for the given connection_id.

        Returns client→server and server→client data segments (max 4096 bytes each).
        """
        indices = self._find_packets_by_connection_id(connection_id)
        if not indices:
            return None

        # Determine client/server from first SYN or first packet
        first_idx = min(indices)
        first_pkt = self.packets[first_idx]
        if not first_pkt.haslayer(IP) or not first_pkt.haslayer(TCP):
            return None

        client_ip = first_pkt[IP].src
        client_port = first_pkt[TCP].sport

        segments = []
        for idx in sorted(indices):
            pkt = self.packets[idx]
            if not pkt.haslayer(TCP) or not pkt.haslayer(IP):
                continue
            tcp = pkt[TCP]
            ip = pkt[IP]
            payload = bytes(tcp.payload) if tcp.payload else b''
            if not payload:
                continue
            is_client = (ip.src == client_ip and tcp.sport == client_port)
            segments.append({
                'seq': tcp.seq,
                'direction': 'client' if is_client else 'server',
                'data': payload,
                'index': idx,
                'timestamp': float(pkt.time)
            })

        segments.sort(key=lambda s: s['timestamp'])

        client_data = b''
        server_data = b''
        stream_entries = []
        max_bytes = 4096

        for seg in segments:
            if seg['direction'] == 'client' and len(client_data) < max_bytes:
                chunk = seg['data'][:max_bytes - len(client_data)]
                client_data += chunk
            elif seg['direction'] == 'server' and len(server_data) < max_bytes:
                chunk = seg['data'][:max_bytes - len(server_data)]
                server_data += chunk

            preview = seg['data'][:256]
            stream_entries.append({
                'direction': seg['direction'],
                'length': len(seg['data']),
                'packetIndex': seg['index'],
                'timestamp': seg['timestamp'],
                'hex': preview.hex(),
                'ascii': ''.join(chr(b) if 32 <= b < 127 else '.' for b in preview)
            })

        return {
            'connectionId': connection_id,
            'clientData': {
                'hex': client_data.hex(),
                'ascii': ''.join(chr(b) if 32 <= b < 127 else '.' for b in client_data),
                'length': len(client_data)
            },
            'serverData': {
                'hex': server_data.hex(),
                'ascii': ''.join(chr(b) if 32 <= b < 127 else '.' for b in server_data),
                'length': len(server_data)
            },
            'segments': stream_entries,
            'totalSegments': len(stream_entries)
        }

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

