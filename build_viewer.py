"""Rebuild the self-contained V12 HTML using only committed source assets."""
from pathlib import Path
import json
import base64

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "src"
OUTPUT = ROOT / "viewer" / "LIDAR_Viewer_EN9581_V12.html"

def build():
    data = json.loads((SOURCE / "data.json").read_text())
    assert data["version"] == "EN9581 V12"
    template = (SOURCE / "viewer_template.html").read_text()
    for placeholder in ("/*PLOTLY*/", "/*DATA*/", "/*APP*/"):
        assert template.count(placeholder) == 1
    result = template.replace("/*PLOTLY*/", (ROOT / "vendor" / "plotly.min.js").read_text())
    result = result.replace("/*DATA*/", "const BUNDLE=" + json.dumps(data, separators=(",", ":")) + ";")
    result = result.replace("/*APP*/", (SOURCE / "viewer.js").read_text())
    # Embed only the reviewed public figures; never embed manuscript panels
    # containing modification coordinates or prober-design identifiers.
    for marker, filename, mime in [
        ("/*VIAL_PHOTO*/", "EN9581_vials.png", "image/png"),
        ("/*AMPLICON_ARRAY*/", "EN9581_amplicon_array.svg", "image/svg+xml"),
    ]:
        assert result.count(marker) == 1
        payload = base64.b64encode((ROOT / "assets" / filename).read_bytes()).decode("ascii")
        result = result.replace(marker, "data:" + mime + ";base64," + payload)
    OUTPUT.parent.mkdir(exist_ok=True)
    OUTPUT.write_text(result)
    return OUTPUT

if __name__ == "__main__":
    print(build())
