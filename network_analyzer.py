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
            return payload

        tcp_handshakes = self._extract_tcp_handshakes()
        udp_transfers = self._extract_udp_transfers()
        http_requests = self._detect_http_requests()
        timeouts = self._detect_timeouts()

        timelines.extend(tcp_handshakes)
        timelines.extend(udp_transfers)
        timelines.extend(http_requests)
        timelines.extend(timeouts)

        payload = {
            'sourceFiles': [os.path.basename(self.pcap_file)],
            'generatedAt': datetime.now(timezone.utc).isoformat(),
            'timelines': timelines
        }
        self.analysis_results['protocol_timelines'] = payload
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
        """檢測 HTTP/HTTPS 請求和回應"""
        timelines = []
        http_sessions = {}

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
                http_sessions.pop(conn_key)

        return timelines

    def _detect_timeouts(self):
        """檢測連線超時情況"""
        timelines = []
        connections = {}

        for index, packet in enumerate(self.packets):
            if not packet.haslayer(TCP) or not packet.haslayer(IP):
                continue

            ip = packet[IP]
            tcp = packet[TCP]
            ts = float(packet.time)
            conn_key = (ip.src, tcp.sport, ip.dst, tcp.dport)

            if conn_key not in connections:
                connections[conn_key] = {
                    'start_time': ts,
                    'last_time': ts,
                    'packet_count': 1,
                    'start_packet': index
                }
            else:
                conn = connections[conn_key]
                time_gap = ts - conn['last_time']

                # 如果超過 3 秒沒有封包，視為可能的超時
                if time_gap > 3.0:
                    timeline = {
                        'id': f"timeout-{ip.src}-{tcp.sport}-{ip.dst}-{tcp.dport}-{index}",
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

                conn['last_time'] = ts
                conn['packet_count'] += 1

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

    report = analyzer.generate_report()
    NetworkAnalyzer._safe_print('\n' + report)

    analyzer.save_results()

    report_path = 'network_analysis_report.txt'
    with open(report_path, 'w', encoding='utf-8') as handle:
        handle.write(report)
    NetworkAnalyzer._safe_print(f'\n詳細報告已儲存至 {report_path}')


    main()

