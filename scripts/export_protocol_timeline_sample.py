# -*- coding: utf-8 -*-
"""Generate protocol timeline fixture from sample PCAP captures."""
from __future__ import annotations

import datetime
import json
import pathlib
from dataclasses import dataclass, field
from typing import Dict, List, Tuple

from scapy.all import IP, TCP, UDP, rdpcap  # type: ignore

BASE_DIR = pathlib.Path(__file__).resolve().parent.parent
PCAP_FILES = [
    BASE_DIR / 'tmp_test_capture.pcap',
    BASE_DIR / '\u6389\u5c01\u5305.pcapng'
]
DOC_OUTPUT_PATH = BASE_DIR / 'docs' / 'protocol_timeline_sample.json'
PUBLIC_OUTPUT_PATH = BASE_DIR / 'public' / 'data' / 'protocol_timeline_sample.json'


@dataclass
class Stage:
    key: str
    label: str
    direction: str
    duration_ms: int
    packets: List[int] = field(default_factory=list)


@dataclass
class Timeline:
    connection_id: str
    protocol: str
    start_epoch_ms: int
    end_epoch_ms: int
    stages: List[Stage]
    metrics: Dict[str, int | float | str] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, object]:
        return {
            'id': self.connection_id,
            'protocol': self.protocol,
            'startEpochMs': self.start_epoch_ms,
            'endEpochMs': self.end_epoch_ms,
            'stages': [
                {
                    'key': stage.key,
                    'label': stage.label,
                    'direction': stage.direction,
                    'durationMs': stage.duration_ms,
                    'packetRefs': stage.packets
                }
                for stage in self.stages
            ],
            'metrics': self.metrics
        }


def _ms(ts: float) -> int:
    return int(ts * 1000)


def _duration(prev: float, current: float) -> int:
    return max(1, int((current - prev) * 1000))


def build_tcp_handshakes(packets) -> List[Timeline]:
    handshakes: Dict[Tuple[str, int, str, int], Dict[str, object]] = {}
    results: List[Timeline] = []

    for index, pkt in enumerate(packets):
        if not pkt.haslayer(IP) or not pkt.haslayer(TCP):
            continue

        ip = pkt[IP]
        tcp = pkt[TCP]
        ts = float(pkt.time)
        key = (ip.src, tcp.sport, ip.dst, tcp.dport)
        reverse_key = (ip.dst, tcp.dport, ip.src, tcp.sport)

        flags = tcp.flags
        if flags == 'S':
            handshakes[key] = {
                'syn_time': ts,
                'syn_pkt': index,
                'client': (ip.src, tcp.sport),
                'server': (ip.dst, tcp.dport)
            }
        elif flags == 'SA' and reverse_key in handshakes:
            info = handshakes[reverse_key]
            info['syn_ack_time'] = ts
            info['syn_ack_pkt'] = index
        elif flags == 'A' and reverse_key in handshakes:
            info = handshakes.pop(reverse_key)
            if 'syn_ack_time' not in info:
                continue
            syn_time = info['syn_time']
            syn_ack_time = info['syn_ack_time']
            ack_time = ts
            client_ip, client_port = info['client']
            server_ip, server_port = info['server']

            timeline = Timeline(
                connection_id=f"tcp-{client_ip}-{client_port}-{server_ip}-{server_port}",
                protocol='tcp',
                start_epoch_ms=_ms(syn_time),
                end_epoch_ms=_ms(ack_time),
                stages=[
                    Stage('syn', 'SYN Sent', 'forward', _duration(syn_time, syn_ack_time), [info['syn_pkt']]),
                    Stage('syn-ack', 'SYN-ACK Received', 'backward', _duration(syn_ack_time, ack_time), [info['syn_ack_pkt']]),
                    Stage('ack', 'ACK Confirmed', 'forward', 1, [index])
                ],
                metrics={
                    'rttMs': max(1, int((ack_time - syn_time) * 1000)),
                    'packetCount': 3
                }
            )
            results.append(timeline)

    return results


def build_udp_transfers(packets) -> List[Timeline]:
    results: List[Timeline] = []
    seen: Dict[Tuple[str, int, str, int], Dict[str, object]] = {}

    for index, pkt in enumerate(packets):
        if not pkt.haslayer(IP) or not pkt.haslayer(UDP):
            continue

        ip = pkt[IP]
        udp = pkt[UDP]
        ts = float(pkt.time)
        key = (ip.src, udp.sport, ip.dst, udp.dport)
        info = seen.setdefault(key, {'start': ts, 'end': ts, 'count': 0, 'first_pkt': index})
        info['end'] = ts
        info['count'] += 1

    for (src_ip, src_port, dst_ip, dst_port), info in seen.items():
        timeline = Timeline(
            connection_id=f"udp-{src_ip}-{src_port}-{dst_ip}-{dst_port}",
            protocol='udp',
            start_epoch_ms=_ms(info['start']),
            end_epoch_ms=_ms(info['end']),
            stages=[
                Stage('send', 'UDP Transfer', 'forward', max(1, int((info['end'] - info['start']) * 1000)), [info['first_pkt']])
            ],
            metrics={'packetCount': info['count']}
        )
        results.append(timeline)

    return results


def main() -> None:
    all_timelines: List[Timeline] = []
    source_files: List[str] = []

    for path in PCAP_FILES:
        if not path.exists():
            continue
        packets = rdpcap(str(path))
        timelines = build_tcp_handshakes(packets) + build_udp_transfers(packets)
        if timelines:
            all_timelines.extend(timelines)
            source_files.append(path.name)

    payload = {
        'sourceFiles': source_files,
        'generatedAt': datetime.datetime.now(datetime.UTC).isoformat(),
        'timelines': [timeline.to_dict() for timeline in all_timelines]
    }

    for target in (DOC_OUTPUT_PATH, PUBLIC_OUTPUT_PATH):
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding='utf-8')
        print(f"Wrote {len(all_timelines)} timelines to {target}")


if __name__ == '__main__':
    main()
