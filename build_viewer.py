"""Rebuild the self-contained V7 HTML using only committed source assets."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "src"
OUTPUT = ROOT / "viewer" / "LIDAR_Viewer_EN9581_V7.html"

def build():
    data = json.loads((SOURCE / "data.json").read_text())
    assert data["version"] == "EN9581 V7"
    template = (SOURCE / "viewer_template.html").read_text()
    for placeholder in ("/*PLOTLY*/", "/*DATA*/", "/*APP*/"):
        assert template.count(placeholder) == 1
    result = template.replace("/*PLOTLY*/", (ROOT / "vendor" / "plotly.min.js").read_text())
    result = result.replace("/*DATA*/", "const DATA=" + json.dumps(data, separators=(",", ":")) + ";")
    result = result.replace("/*APP*/", (SOURCE / "viewer.js").read_text())
    OUTPUT.parent.mkdir(exist_ok=True)
    OUTPUT.write_text(result)
    return OUTPUT

if __name__ == "__main__":
    print(build())
