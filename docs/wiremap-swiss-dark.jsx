import { useState, useEffect, useRef, useMemo, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════
// Swiss Editorial — Dark Variant
// Warm parchment-black tones, not blue-black. Think: a luxury print
// magazine read under warm lamplight, not a spaceship cockpit.
// ═══════════════════════════════════════════════════════════════════

const S = {
  // Warm dark palette — parchment undertone
  bg:       "#141311",
  bgRaised: "#1b1a17",
  surface:  "#222120",
  surfaceHover: "#2a2926",
  border:   "#2e2d2a",
  borderStrong: "#3d3c38",

  text: {
    primary:   "#e8e5df",
    secondary: "#a09b91",
    tertiary:  "#706b61",
    faint:     "#3d3a34",
  },

  accent:    "#e05a33",   // Swiss red-orange
  accentDim: "#b8452a",

  protocol: {
    TCP:   "#e05a33",
    UDP:   "#3b82f6",
    HTTP:  "#10b981",
    HTTPS: "#10b981",
    DNS:   "#8b5cf6",
    ICMP:  "#ef4444",
  },
};

// ─── Shared tiny components ──────────────────────────────────────

const Mono = ({ children, style: s, ...p }) => (
  <span style={{ fontFamily: "'IBM Plex Mono', monospace", ...s }} {...p}>{children}</span>
);

const Tag = ({ children, color = S.accent, solid }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: solid ? "2px 8px" : "2px 7px",
    borderRadius: 3,
    background: solid ? color : color + "14",
    border: solid ? "none" : `1.5px solid ${color}33`,
    color: solid ? "#fff" : color,
    fontSize: 10, fontWeight: 600,
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: "0.02em",
  }}>{children}</span>
);

const ProtoChip = ({ protocol, active = true, onClick }) => {
  const c = S.protocol[protocol] || S.text.tertiary;
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 5,
      padding: "5px 10px", borderRadius: 3,
      border: `1.5px solid ${active ? c + "55" : S.border}`,
      background: active ? c + "10" : "transparent",
      color: active ? c : S.text.faint,
      fontSize: 11.5, fontWeight: 600, cursor: "pointer",
      fontFamily: "'IBM Plex Mono', monospace",
      transition: "all 0.15s",
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: 1.5,
        background: active ? c : S.text.faint,
      }} />
      {protocol}
    </button>
  );
};

// ─── Topology Canvas ─────────────────────────────────────────────

const TopologyCanvas = ({ compact }) => {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  const nodes = useMemo(() => {
    const list = [
      { ip: "192.168.0.1", proto: "DNS", conn: 59 },
      { ip: "203.69.138.56", proto: "HTTPS", conn: 34 },
      { ip: "20.189.173.1", proto: "HTTPS", conn: 12 },
      { ip: "162.159.133.234", proto: "HTTPS", conn: 8 },
      { ip: "3.226.101.191", proto: "HTTPS", conn: 5 },
      { ip: "40.104.20.50", proto: "HTTPS", conn: 7 },
      { ip: "147.92.249.185", proto: "HTTPS", conn: 3 },
      { ip: "172.187.86.74", proto: "HTTPS", conn: 4 },
      { ip: "40.104.21.82", proto: "TCP", conn: 6 },
      { ip: "142.250.204.46", proto: "TCP", conn: 9 },
      { ip: "34.203.182.196", proto: "TCP", conn: 2 },
      { ip: "104.18.124.108", proto: "TCP", conn: 3 },
      { ip: "192.168.119.200", proto: "UDP", conn: 11 },
      { ip: "216.239.36.223", proto: "UDP", conn: 2 },
      { ip: "52.168.117.175", proto: "TCP", conn: 4 },
    ];
    const baseR = compact ? 100 : 180;
    return list.map((n, i) => {
      const a = (i / list.length) * Math.PI * 2 - Math.PI / 2;
      const d = baseR + n.conn * (compact ? 0.5 : 1.2);
      return { ...n, x: Math.cos(a) * d, y: Math.sin(a) * d };
    });
  }, [compact]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height, cx = W / 2, cy = H / 2;

    let t = 0;
    const draw = () => {
      t += 0.006;
      ctx.clearRect(0, 0, W, H);

      // Dot grid
      ctx.fillStyle = S.text.faint + "55";
      const gs = compact ? 20 : 28;
      for (let x = gs; x < W; x += gs) {
        for (let y = gs; y < H; y += gs) {
          ctx.beginPath();
          ctx.arc(x, y, 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Connections
      nodes.forEach((n) => {
        const nx = cx + n.x, ny = cy + n.y;
        const c = S.protocol[n.proto] || S.text.tertiary;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(nx, ny);
        ctx.strokeStyle = c + "20";
        ctx.lineWidth = compact ? 1 : 1.5;
        ctx.stroke();
      });

      // Flowing dots
      nodes.forEach((n, i) => {
        const nx = cx + n.x, ny = cy + n.y;
        const c = S.protocol[n.proto] || S.text.tertiary;
        for (let j = 0; j < 2; j++) {
          const prog = ((t * (0.4 + j * 0.2) + i * 0.12 + j * 0.5) % 1);
          const px = cx + (nx - cx) * prog;
          const py = cy + (ny - cy) * prog;
          ctx.beginPath();
          ctx.arc(px, py, compact ? 1.2 : 1.8, 0, Math.PI * 2);
          ctx.fillStyle = c + "aa";
          ctx.fill();
        }
      });

      // Outer nodes
      nodes.forEach((n) => {
        const nx = cx + n.x, ny = cy + n.y;
        const c = S.protocol[n.proto] || S.text.tertiary;
        const r = compact ? 3 : (4 + n.conn * 0.1);

        ctx.beginPath();
        ctx.arc(nx, ny, r + 2, 0, Math.PI * 2);
        ctx.fillStyle = c + "0c";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(nx, ny, r, 0, Math.PI * 2);
        ctx.fillStyle = c + "18";
        ctx.fill();
        ctx.strokeStyle = c + "66";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(nx, ny, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = c;
        ctx.fill();

        if (!compact) {
          ctx.font = "500 8.5px 'DM Sans', sans-serif";
          ctx.textAlign = "center";
          ctx.fillStyle = S.text.tertiary;
          ctx.fillText(n.ip, nx, ny + r + 14);
        }
      });

      // Center node
      const cp = Math.sin(t * 2) * 1.5;
      const cr = compact ? 12 : 20;
      ctx.beginPath();
      ctx.arc(cx, cy, cr + 4 + cp, 0, Math.PI * 2);
      ctx.fillStyle = S.accent + "08";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fillStyle = S.accent + "12";
      ctx.fill();
      ctx.strokeStyle = S.accent + "88";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, compact ? 3 : 5, 0, Math.PI * 2);
      ctx.fillStyle = S.accent;
      ctx.fill();

      if (!compact) {
        ctx.font = "600 11px 'DM Sans', sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = S.text.primary;
        ctx.fillText("192.168.0.195", cx, cy + cr + 18);
        ctx.font = "400 9px 'DM Sans', sans-serif";
        ctx.fillStyle = S.text.tertiary;
        ctx.fillText("中心節點 · 158 connections", cx, cy + cr + 32);
      }

      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [nodes, compact]);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />;
};

// ─── Packet Animation ────────────────────────────────────────────

const PacketView = () => {
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(28);
  const [selPkt, setSelPkt] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const iv = setInterval(() => setProgress(p => p >= 100 ? 0 : p + 0.25), 50);
    return () => clearInterval(iv);
  }, [playing]);

  const packets = [
    { id: 866, flag: "SYN", src: "192.168.0.195:5836", dst: "20.189.173.1:443", len: 66, seq: "3428506981", time: "0.000s" },
    { id: 1002, flag: "SYN", src: "192.168.0.195:5836", dst: "20.189.173.1:443", len: 66, seq: "3428506981", time: "1.004s" },
    { id: 1322, flag: "SYN", src: "192.168.0.195:5836", dst: "20.189.173.1:443", len: 66, seq: "3428506981", time: "3.014s" },
    { id: 1668, flag: "SYN-ACK", src: "20.189.173.1:443", dst: "192.168.0.195:5836", len: 66, seq: "891204553", time: "7.020s" },
    { id: 1669, flag: "ACK", src: "192.168.0.195:5836", dst: "20.189.173.1:443", len: 54, seq: "3428506982", time: "7.021s" },
  ];

  return (
    <div style={{ display: "flex", height: "100%", background: S.bg }}>
      {/* Animation area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Connection info bar */}
        <div style={{
          padding: "10px 20px",
          borderBottom: `1px solid ${S.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: S.bgRaised,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Tag color={S.protocol.HTTP}>HTTPS</Tag>
            <Mono style={{ fontSize: 12, color: S.text.secondary }}>192.168.0.195 → 20.189.173.1</Mono>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Tag color={S.text.tertiary}>5 封包</Tag>
            <Tag color={S.protocol.HTTP} solid>正常流量</Tag>
          </div>
        </div>

        {/* Canvas */}
        <div style={{
          flex: 1, position: "relative", overflow: "hidden",
          background: S.bg,
        }}>
          {/* Dot grid BG */}
          <div style={{
            position: "absolute", inset: 0, opacity: 0.3,
            backgroundImage: `radial-gradient(${S.text.faint} 0.8px, transparent 0.8px)`,
            backgroundSize: "28px 28px",
          }} />

          <svg style={{ position: "absolute", inset: 0 }} viewBox="0 0 800 300" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="swConnGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={S.accent} stopOpacity="0.5" />
                <stop offset="50%" stopColor={S.text.tertiary} stopOpacity="0.15" />
                <stop offset="100%" stopColor={S.protocol.HTTP} stopOpacity="0.5" />
              </linearGradient>
            </defs>
            {/* Connection lines */}
            <line x1="175" y1="150" x2="625" y2="150" stroke={S.border} strokeWidth="1" strokeDasharray="4 6" />
            <path d="M 175 150 C 320 95, 480 95, 625 150" fill="none" stroke="url(#swConnGrad)" strokeWidth="1.5" />
            <path d="M 625 150 C 480 205, 320 205, 175 150" fill="none" stroke="url(#swConnGrad)" strokeWidth="1.5" opacity="0.4" />

            {/* Moving particles */}
            <circle r="4" fill={S.accent}>
              <animateMotion dur="3s" repeatCount="indefinite" path="M 175 150 C 320 95, 480 95, 625 150" />
            </circle>
            <circle r="3.5" fill={S.protocol.HTTP}>
              <animateMotion dur="3.8s" repeatCount="indefinite" path="M 625 150 C 480 205, 320 205, 175 150" />
            </circle>

            {/* Endpoint A */}
            <circle cx="175" cy="150" r="26" fill={S.bgRaised} stroke={S.accent} strokeWidth="1.5" />
            <circle cx="175" cy="150" r="4" fill={S.accent} />
            <text x="175" y="195" textAnchor="middle" fill={S.text.secondary} fontSize="10" fontFamily="'IBM Plex Mono', monospace">192.168.0.195:5836</text>
            <text x="175" y="208" textAnchor="middle" fill={S.text.tertiary} fontSize="8.5" fontFamily="'DM Sans', sans-serif">端點 A · 本機</text>

            {/* Endpoint B */}
            <circle cx="625" cy="150" r="26" fill={S.bgRaised} stroke={S.protocol.HTTP} strokeWidth="1.5" />
            <circle cx="625" cy="150" r="4" fill={S.protocol.HTTP} />
            <text x="625" y="195" textAnchor="middle" fill={S.text.secondary} fontSize="10" fontFamily="'IBM Plex Mono', monospace">20.189.173.1:443</text>
            <text x="625" y="208" textAnchor="middle" fill={S.text.tertiary} fontSize="8.5" fontFamily="'DM Sans', sans-serif">端點 B · 遠端</text>
          </svg>
        </div>

        {/* Transport bar */}
        <div style={{
          padding: "12px 20px 14px",
          borderTop: `1px solid ${S.border}`,
          background: S.bgRaised,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <Mono style={{ fontSize: 11, color: S.accent, minWidth: 86 }}>
              {(progress * 0.1613).toFixed(2)}s / 16.13s
            </Mono>
            <div style={{
              flex: 1, height: 3, background: S.border, borderRadius: 1.5,
              position: "relative", cursor: "pointer",
            }}>
              <div style={{
                width: `${progress}%`, height: "100%", borderRadius: 1.5,
                background: S.accent, transition: "width 0.05s linear",
              }} />
              <div style={{
                position: "absolute", left: `${progress}%`, top: "50%",
                transform: "translate(-50%, -50%)",
                width: 9, height: 9, borderRadius: 2,
                background: S.text.primary,
                border: `2px solid ${S.accent}`,
              }} />
            </div>
            <Mono style={{ fontSize: 10, color: S.text.tertiary }}>5 封包</Mono>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            {["0.25x", "0.5x"].map(s => (
              <button key={s} style={{
                padding: "4px 10px", borderRadius: 3,
                border: `1px solid ${S.border}`,
                background: "transparent", color: S.text.tertiary,
                fontSize: 10.5, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace",
              }}>{s}</button>
            ))}
            <button onClick={() => setPlaying(!playing)} style={{
              padding: "5px 20px", borderRadius: 3,
              background: S.accent, border: "none",
              color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer",
              fontFamily: "'IBM Plex Mono', monospace",
            }}>{playing ? "⏸ 暫停" : "▶ 播放"}</button>
            {["1x", "2x", "3x"].map(s => (
              <button key={s} style={{
                padding: "4px 10px", borderRadius: 3,
                border: `1px solid ${s === "1x" ? S.accent + "55" : S.border}`,
                background: s === "1x" ? S.accent + "12" : "transparent",
                color: s === "1x" ? S.accent : S.text.tertiary,
                fontSize: 10.5, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace",
              }}>{s}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Packet list sidebar */}
      <div style={{
        width: 320, borderLeft: `1px solid ${S.border}`,
        background: S.bgRaised, display: "flex", flexDirection: "column",
      }}>
        <div style={{ display: "flex", borderBottom: `1px solid ${S.border}` }}>
          {["攻擊時間軸", `封包列表 (${packets.length})`].map((t, i) => (
            <button key={t} style={{
              flex: 1, padding: "10px 0", fontSize: 12,
              fontWeight: i === 1 ? 600 : 400,
              color: i === 1 ? S.text.primary : S.text.tertiary,
              background: "transparent", border: "none", cursor: "pointer",
              borderBottom: i === 1 ? `2px solid ${S.accent}` : "2px solid transparent",
            }}>{t}</button>
          ))}
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
          {packets.map((pkt, i) => (
            <div key={pkt.id} onClick={() => setSelPkt(i)} style={{
              padding: "10px 12px", marginBottom: 4, borderRadius: 4,
              background: selPkt === i ? S.accent + "0c" : S.surface,
              border: `1px solid ${selPkt === i ? S.accent + "33" : S.border}`,
              cursor: "pointer", transition: "all 0.12s",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Mono style={{ fontSize: 12, fontWeight: 700, color: S.text.primary }}>#{pkt.id}</Mono>
                  <Tag color={
                    pkt.flag === "SYN" ? S.accent :
                    pkt.flag === "SYN-ACK" ? S.protocol.HTTP :
                    S.protocol.UDP
                  } solid>{pkt.flag}</Tag>
                </div>
                <Mono style={{ fontSize: 10, color: S.text.tertiary }}>{pkt.time}</Mono>
              </div>
              <Mono style={{ fontSize: 10, color: S.text.secondary, display: "block", marginBottom: 2 }}>
                <span style={{ color: S.text.tertiary }}>SRC </span>{pkt.src}
              </Mono>
              <Mono style={{ fontSize: 10, color: S.text.secondary, display: "block", marginBottom: 4 }}>
                <span style={{ color: S.text.tertiary }}>DST </span>{pkt.dst}
              </Mono>
              <div style={{ display: "flex", gap: 10 }}>
                <Mono style={{ fontSize: 9.5, color: S.text.tertiary }}>{pkt.len} bytes</Mono>
                <Mono style={{ fontSize: 9.5, color: S.text.tertiary }}>Seq: {pkt.seq}</Mono>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Attack Monitor ──────────────────────────────────────────────

const AttackView = () => {
  const barData = useMemo(() =>
    Array.from({ length: 32 }, (_, i) => ({
      t: i,
      v: i < 5 ? 2 : i < 12 ? Math.floor(Math.random() * 8 + 4) : i < 20 ? Math.floor(Math.random() * 12 + 6) : Math.floor(Math.random() * 4 + 1),
    })), []);
  const maxV = Math.max(...barData.map(d => d.v));

  return (
    <div style={{ display: "flex", height: "100%", background: S.bg }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Stats row */}
        <div style={{
          padding: "18px 24px",
          borderBottom: `1px solid ${S.border}`,
          background: S.bgRaised,
          display: "flex", alignItems: "flex-end", gap: 36,
        }}>
          {[
            { label: "連線數", value: "30", color: S.text.primary },
            { label: "峰值封包率", value: "240", unit: "/s", color: S.accent },
            { label: "總封包數", value: "30", color: S.text.primary },
            { label: "持續時間", value: "32.22", unit: "s", color: S.text.primary },
          ].map(s => (
            <div key={s.label}>
              <Mono style={{ fontSize: 9.5, color: S.text.tertiary, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 2 }}>{s.label}</Mono>
              <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                <span style={{ fontSize: 26, fontWeight: 700, color: s.color, fontFamily: "'Instrument Serif', serif", lineHeight: 1 }}>{s.value}</span>
                {s.unit && <Mono style={{ fontSize: 10, color: S.text.tertiary }}>{s.unit}</Mono>}
              </div>
            </div>
          ))}
          <div style={{ marginLeft: "auto" }}>
            <Tag color={S.protocol.HTTP} solid>Normal Traffic</Tag>
          </div>
        </div>

        {/* TCP flag analysis */}
        <div style={{
          padding: "16px 24px",
          borderBottom: `1px solid ${S.border}`,
          background: S.bgRaised,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: S.text.primary }}>TCP 旗標分析</span>
            <div style={{ width: 48, height: 4, borderRadius: 2, background: S.border, overflow: "hidden", marginLeft: 4 }}>
              <div style={{ width: "28%", height: "100%", background: S.accent, borderRadius: 2 }} />
            </div>
            <Mono style={{ fontSize: 10, color: S.text.tertiary }}>28</Mono>
            <div style={{ marginLeft: "auto" }}><Tag color={S.protocol.HTTP}>流量正常</Tag></div>
          </div>
          <div style={{ display: "flex", gap: 32 }}>
            {[
              { label: "SYN", value: "0%", ok: true },
              { label: "FIN", value: "0%", ok: true },
              { label: "RST", value: "0%", ok: true },
              { label: "ACK", value: "0%", ok: false },
            ].map(f => (
              <div key={f.label}>
                <Mono style={{ fontSize: 9, color: S.text.tertiary, letterSpacing: "0.06em", display: "block", marginBottom: 2 }}>{f.label} 比例</Mono>
                <span style={{ fontSize: 22, fontWeight: 700, color: S.text.primary, fontFamily: "'Instrument Serif', serif" }}>{f.value}</span>
                <Mono style={{ fontSize: 9, color: f.ok ? S.protocol.HTTP : S.accent, display: "block", marginTop: 1 }}>{f.ok ? "正常" : "需確認"}</Mono>
              </div>
            ))}
          </div>
        </div>

        {/* Bar chart */}
        <div style={{ flex: 1, padding: "20px 24px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: S.text.primary }}>封包密度</span>
            <Mono style={{ fontSize: 10, color: S.text.tertiary }}>時間分佈</Mono>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 2, minHeight: 100 }}>
            {barData.map((d, i) => {
              const h = (d.v / maxV) * 100;
              const hot = d.v > maxV * 0.7;
              return (
                <div key={i} style={{
                  flex: 1, height: `${h}%`, minHeight: 2,
                  borderRadius: "2px 2px 0 0",
                  background: hot ? S.accent : S.accent + "44",
                  cursor: "pointer", transition: "height 0.3s",
                }} title={`${d.t}s: ${d.v} pkts`} />
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <Mono style={{ fontSize: 9, color: S.text.tertiary }}>0s</Mono>
            <Mono style={{ fontSize: 9, color: S.text.tertiary }}>16.1s</Mono>
            <Mono style={{ fontSize: 9, color: S.text.tertiary }}>32.22s</Mono>
          </div>
        </div>
      </div>

      {/* Mini topology sidebar */}
      <div style={{
        width: 300, borderLeft: `1px solid ${S.border}`,
        background: S.bgRaised, display: "flex", flexDirection: "column",
      }}>
        <div style={{
          padding: "12px 16px", borderBottom: `1px solid ${S.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: S.text.primary }}>聚合連線</span>
          <Tag color={S.protocol.DNS}>DNS</Tag>
        </div>
        <div style={{ flex: 1 }}><TopologyCanvas compact /></div>
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${S.border}` }}>
          {[
            ["來源 IP", "192.168.0.1"],
            ["目的 IP", "192.168.0.195"],
            ["連線數量", "30 條"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
              <span style={{ fontSize: 11, color: S.text.tertiary }}>{k}</span>
              <Mono style={{ fontSize: 11, color: S.text.primary }}>{v}</Mono>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Learning Mode ───────────────────────────────────────────────

const LearnView = () => {
  const [expLevel, setExpLevel] = useState(0);
  const levels = [
    { title: "Level 1", sub: "從網路基礎開始", progress: 100, color: S.protocol.HTTP,
      steps: ["歡迎來到網路分析", "OSI 七層模型", "認識 MindMap 介面", "節點與連線概念", "Level 1 完成！"] },
    { title: "Level 2", sub: "深入了解 TCP 與連線", progress: 0, color: S.accent,
      steps: ["TCP 三次握手", "封包旗標意義", "連線建立動畫", "實作練習"] },
    { title: "Level 3", sub: "HTTP、HTTPS、DNS", progress: 0, color: S.protocol.UDP,
      steps: ["DNS 查詢流程", "HTTP 請求與回應", "TLS 加密握手"] },
    { title: "Level 4", sub: "攻擊流量特徵辨識", progress: 0, color: S.protocol.ICMP,
      steps: ["SYN Flood 攻擊", "ARP Spoofing", "流量異常判讀"] },
    { title: "Level 5", sub: "綜合實戰分析", progress: 0, color: S.protocol.DNS,
      steps: ["綜合分析練習", "結業測驗"] },
  ];

  return (
    <div style={{ display: "flex", height: "100%", background: S.bg }}>
      {/* Course sidebar */}
      <div style={{
        width: 260, borderRight: `1px solid ${S.border}`,
        background: S.bgRaised, display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "16px", borderBottom: `1px solid ${S.border}` }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: S.text.primary, marginBottom: 6 }}>課程目錄</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, height: 3, borderRadius: 2, background: S.border, overflow: "hidden" }}>
              <div style={{ width: "25%", height: "100%", borderRadius: 2, background: S.accent }} />
            </div>
            <Mono style={{ fontSize: 10, color: S.text.tertiary }}>25%</Mono>
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
          {levels.map((lv, li) => (
            <div key={li}>
              <div onClick={() => setExpLevel(expLevel === li ? -1 : li)} style={{
                padding: "10px 12px", borderRadius: 4, cursor: "pointer",
                background: expLevel === li ? lv.color + "0c" : "transparent",
                border: `1px solid ${expLevel === li ? lv.color + "22" : "transparent"}`,
                marginBottom: 2,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 3,
                    background: lv.progress === 100 ? lv.color + "22" : S.surface,
                    border: `1.5px solid ${lv.progress === 100 ? lv.color : S.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700, color: lv.progress === 100 ? lv.color : S.text.tertiary,
                  }}>{lv.progress === 100 ? "✓" : li + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: S.text.primary }}>{lv.title}</div>
                    <div style={{ fontSize: 10, color: S.text.tertiary }}>{lv.sub}</div>
                  </div>
                </div>
              </div>
              {expLevel === li && (
                <div style={{ padding: "2px 0 6px 30px" }}>
                  {lv.steps.map((step, si) => {
                    const done = lv.progress === 100;
                    return (
                      <div key={si} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "5px 8px", fontSize: 11,
                        color: done ? S.text.secondary : S.text.tertiary,
                      }}>
                        <div style={{
                          width: 14, height: 14, borderRadius: 2,
                          border: `1.5px solid ${done ? lv.color + "66" : S.border}`,
                          background: done ? lv.color + "18" : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 8, color: lv.color,
                        }}>{done ? "✓" : ""}</div>
                        {step}
                      </div>
                    );
                  })}
                  {lv.progress === 100 && (
                    <button style={{
                      margin: "6px 8px", padding: "7px 16px", borderRadius: 3,
                      background: lv.color, border: "none", color: "#fff",
                      fontSize: 11.5, fontWeight: 600, cursor: "pointer", width: "calc(100% - 16px)",
                    }}>開始測驗</button>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Error notebook */}
          <div style={{
            margin: "8px 0", padding: "10px 12px", borderRadius: 4,
            border: `1px solid ${S.protocol.ICMP}22`,
            background: S.protocol.ICMP + "08",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: S.protocol.ICMP }}>📕 錯題本</span>
              <Mono style={{ fontSize: 10, color: S.protocol.ICMP }}>1 題待複習</Mono>
            </div>
          </div>
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{
          padding: "10px 20px", borderBottom: `1px solid ${S.border}`,
          background: S.bgRaised,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Tag color={S.accent} solid>學習模式</Tag>
            <span style={{ fontSize: 13, fontWeight: 600, color: S.text.primary }}>協議時間軸分析</span>
          </div>
          <button style={{
            padding: "5px 12px", borderRadius: 3,
            background: "transparent", border: `1px solid ${S.border}`,
            color: S.text.secondary, fontSize: 11, cursor: "pointer",
          }}>顯示引導</button>
        </div>

        <div style={{ flex: 1, position: "relative" }}>
          <TopologyCanvas />
          {/* Floating lesson card */}
          <div style={{
            position: "absolute", bottom: 16, left: 16, right: 16,
            background: S.bgRaised + "ee",
            backdropFilter: "blur(12px)",
            border: `1px solid ${S.borderStrong}`,
            borderRadius: 6, padding: "16px 20px",
            boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
          }}>
            <div style={{ display: "flex", gap: 14 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 4,
                background: S.accent + "15",
                border: `1px solid ${S.accent}33`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, flexShrink: 0,
              }}>📡</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: S.text.primary, marginBottom: 4 }}>認識 MindMap 介面</div>
                <div style={{ fontSize: 12, color: S.text.secondary, lineHeight: 1.7 }}>
                  畫面中央的放射狀圖就是 MindMap 拓樸圖。每一個亮點代表一個 IP 節點，
                  而連線代表它們之間的網路通訊。試著找出中心節點。
                </div>
              </div>
              <button style={{
                padding: "8px 18px", borderRadius: 3,
                background: S.accent, border: "none", color: "#fff",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                whiteSpace: "nowrap", alignSelf: "center",
              }}>下一步 →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main App Shell ──────────────────────────────────────────────

function WireMapSwissDark() {
  const [view, setView] = useState("topo");

  const navItems = [
    { id: "topo", label: "拓樸圖" },
    { id: "packet", label: "封包流" },
    { id: "attack", label: "安全偵測" },
    { id: "learn", label: "教學" },
  ];

  return (
    <div style={{
      width: "100%", height: "100vh",
      background: S.bg, color: S.text.primary,
      fontFamily: "'DM Sans', sans-serif",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* ─── Header ──────────────────────────────────────── */}
      <header style={{
        height: 52, display: "flex", alignItems: "center",
        padding: "0 20px",
        borderBottom: `1px solid ${S.border}`,
        background: S.bgRaised,
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 28 }}>
          {/* Logomark — editorial "W" in a square */}
          <div style={{
            width: 28, height: 28, borderRadius: 3,
            background: S.accent,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{
              fontSize: 16, fontWeight: 700, color: "#fff",
              fontFamily: "'Instrument Serif', serif",
              lineHeight: 1,
            }}>W</span>
          </div>
          <span style={{
            fontSize: 20, fontWeight: 700,
            fontFamily: "'Instrument Serif', serif",
            letterSpacing: "-0.03em",
            color: S.text.primary,
          }}>WireMap</span>
        </div>

        {/* Nav */}
        <nav style={{ display: "flex", gap: 0, height: "100%" }}>
          {navItems.map(n => (
            <button key={n.id} onClick={() => setView(n.id)} style={{
              padding: "0 16px", height: "100%",
              background: "transparent", border: "none",
              borderBottom: view === n.id ? `2px solid ${S.accent}` : "2px solid transparent",
              color: view === n.id ? S.text.primary : S.text.tertiary,
              fontSize: 13, fontWeight: view === n.id ? 600 : 400,
              cursor: "pointer", transition: "all 0.15s",
            }}>{n.label}</button>
          ))}
        </nav>

        {/* Right actions */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <button style={{
            padding: "6px 16px", borderRadius: 3,
            background: S.accent, border: "none",
            color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}>上傳 PCAP</button>
          <Mono style={{ fontSize: 10.5, color: S.text.tertiary }}>uploaded.pcap</Mono>
          <Mono style={{ fontSize: 10, color: S.text.faint }}>2026/03/19</Mono>
        </div>
      </header>

      {/* ─── Content ──────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {view === "topo" && (
          <div style={{ display: "flex", height: "100%" }}>
            {/* Canvas */}
            <div style={{ flex: 1 }}><TopologyCanvas /></div>

            {/* Sidebar */}
            <div style={{
              width: 300, borderLeft: `1px solid ${S.border}`,
              background: S.bgRaised, overflow: "auto",
              display: "flex", flexDirection: "column",
            }}>
              {/* Big number */}
              <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${S.border}` }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
                  <span style={{
                    fontSize: 48, fontWeight: 700,
                    fontFamily: "'Instrument Serif', serif",
                    color: S.text.primary, lineHeight: 1,
                  }}>39</span>
                  <span style={{ fontSize: 14, color: S.text.tertiary }}>節點</span>
                </div>
                <span style={{ fontSize: 12, color: S.text.tertiary }}>5 種協定 · 158 連線</span>
              </div>

              {/* Protocol filter */}
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${S.border}` }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {["TCP", "UDP", "HTTP", "DNS", "ICMP"].map(p => <ProtoChip key={p} protocol={p} />)}
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", borderBottom: `1px solid ${S.border}` }}>
                {["節點", "健康", "統計", "安全", "TLS"].map((t, i) => (
                  <button key={t} style={{
                    flex: 1, padding: "9px 0", fontSize: 11,
                    fontWeight: i === 0 ? 600 : 400,
                    color: i === 0 ? S.text.primary : S.text.tertiary,
                    background: "transparent", border: "none", cursor: "pointer",
                    borderBottom: i === 0 ? `2px solid ${S.accent}` : "2px solid transparent",
                  }}>{t}</button>
                ))}
              </div>

              {/* Search */}
              <div style={{ padding: "10px 12px" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "7px 10px", borderRadius: 3,
                  background: S.surface, border: `1px solid ${S.border}`,
                }}>
                  <span style={{ fontSize: 12, color: S.text.faint }}>🔍</span>
                  <span style={{ fontSize: 12, color: S.text.tertiary }}>搜尋 IP 位址...</span>
                </div>
              </div>

              {/* Node list */}
              <div style={{ flex: 1, overflow: "auto", padding: "0 8px 12px" }}>
                {[
                  { ip: "192.168.0.195", type: "中心", c: S.accent, conn: 158, protos: ["TCP","UDP","DNS","HTTPS","HTTP"] },
                  { ip: "192.168.0.1", type: "閘道", c: S.protocol.UDP, conn: 59, protos: ["DNS"] },
                  { ip: "203.69.138.56", type: "外部", c: S.protocol.HTTP, conn: 34, protos: ["TCP","UDP","HTTPS"] },
                ].map(n => (
                  <div key={n.ip} style={{
                    padding: "12px", marginBottom: 4, borderRadius: 4,
                    border: `1px solid ${S.border}`, cursor: "pointer",
                    transition: "all 0.12s",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <Mono style={{ fontSize: 12.5, fontWeight: 600, color: S.text.primary }}>{n.ip}</Mono>
                      <Tag color={n.c} solid>{n.type}</Tag>
                    </div>
                    <div style={{ display: "flex", gap: 3, marginBottom: 6, flexWrap: "wrap" }}>
                      {n.protos.map(p => (
                        <Mono key={p} style={{
                          fontSize: 9, padding: "1px 5px", borderRadius: 2,
                          background: (S.protocol[p] || S.text.tertiary) + "14",
                          color: S.protocol[p] || S.text.tertiary,
                          fontWeight: 600,
                        }}>{p}</Mono>
                      ))}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 3, borderRadius: 1.5, background: S.border, overflow: "hidden" }}>
                        <div style={{
                          width: `${(n.conn / 158) * 100}%`, height: "100%",
                          background: n.c, borderRadius: 1.5,
                        }} />
                      </div>
                      <Mono style={{ fontSize: 11, fontWeight: 600, color: S.text.secondary }}>{n.conn}</Mono>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === "packet" && <PacketView />}
        {view === "attack" && <AttackView />}
        {view === "learn" && <LearnView />}
      </div>
    </div>
  );
}

export default WireMapSwissDark;
