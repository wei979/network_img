#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Test script to generate connection packets with new fields."""

from network_analyzer import NetworkAnalyzer
import json

# Create analyzer
analyzer = NetworkAnalyzer('lostpakage.pcapng')

# Load packets
if not analyzer.load_packets():
    print("Failed to load packets!")
    exit(1)

# Generate timelines
print("Generating protocol timelines...")
timelines_data = analyzer.generate_protocol_timelines()
analyzer.analysis_results['protocol_timelines'] = timelines_data
print(f"Generated {len(timelines_data['timelines'])} timelines")

# Build connection packets
print("Building connection packets...")
analyzer._build_connection_packets(timelines_data['timelines'])

# Check if connection_packets was populated
if 'connection_packets' in analyzer.analysis_results:
    print(f"Built packets for {len(analyzer.analysis_results['connection_packets'])} connections")

    # Show sample of new fields
    for conn_id, packets in list(analyzer.analysis_results['connection_packets'].items())[:3]:
        if packets:
            packet = packets[0]
            print(f"\n=== Sample from {conn_id} ===")
            print(f"  streamId: {packet.get('streamId')}")
            print(f"  errorType: {packet.get('errorType')}")
            print(f"  http: {packet.get('http')}")
            print(f"  tcp flags: {packet.get('headers', {}).get('tcp', {}).get('flags')}")
else:
    print("ERROR: connection_packets not in analysis_results!")

# Save results
print("\nSaving results...")
analyzer.save_results()
print("Done!")
