from pathlib import Path
text = Path("src/MindMapVisualization.jsx").read_text(encoding="utf-8")
needle = 'strokeWidth="0.3"'
idx = text.find(needle)
print(text[idx:idx+150])
