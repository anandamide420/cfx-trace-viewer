"""Host the reviewed EN9581 V21 HTML without recalculating its assay data."""
from pathlib import Path
import streamlit as st

ROOT = Path(__file__).resolve().parent
VIEWER = ROOT / "viewer" / "LIDAR_Viewer_EN9581_V21.html"

st.set_page_config(page_title="LIDAR — EN9581 V21", layout="wide")
st.download_button(
    "Download EN9581 V21 for offline use",
    data=VIEWER.read_bytes(),
    file_name=VIEWER.name,
    mime="text/html",
    on_click="ignore",
)
# Load only this versioned repository asset. The iframe isolates the viewer's
# styles and JavaScript from Streamlit; all calculator logic stays in V21.
st.iframe(VIEWER, height="content", width="stretch")
