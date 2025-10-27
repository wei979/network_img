from pathlib import Path
text = Path("src/MindMapVisualization.jsx").read_text(encoding="utf-8")
needle = 'opacity="0.5"\n                  />\n                </g>'
print('found' if needle in text else 'not')
