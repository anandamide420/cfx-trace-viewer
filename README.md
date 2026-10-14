# EN9581 LIDAR plate viewer

Standalone EN9581 edition **V6**, containing the 13 October 2026 Pfizer EN9581 plate and three historical Cy5/Quasar calibration runs. The main publication viewer is not included or replaced.

## Run

```sh
python -m pip install -r requirements.txt
streamlit run streamlit_app.py
```

For Streamlit Community Cloud, select this repository, branch `main`, and entrypoint `streamlit_app.py`. Python 3.12 is supported. No secrets or external database are required.

The downloadable `viewer/LIDAR_Viewer_EN9581_V6.html` works offline. The Batch report tab opens an external website and requires internet access.

## Contents

- Amplification and melt traces, plate key, and size-series comparisons.
- Raw and Poisson-corrected DNA estimates with matching linear/log axes and a red 10 ng/dose reference line.
- Imported standard-curve points, historical traces, efficiencies, QC flags and CSV downloads.
- Primer-aligned lengths, preparation details and original export provenance.
- External EN9581 batch-report link.

## Calculation inputs and unresolved details

The vaccine defaults are 1:100 dilution and 2 µl per reaction. Single-target gBlock controls use 1 ng/µl stocks diluted 1:10,000, with 2 µl per reaction and a 400 bp working mass convention. The 300 µl dose and 7,824 bp plasmid-equivalent length remain editable assumptions.

Row G concentration estimates are withheld until the operator confirms row C's per-target gBlock input. Raw traces and Cqs remain available. The shortest Ori assay assumes the initially identified Ori_48bp oligo; the alternate Ori_45bp would have a different span. Spike's shortest aligned span is 46 bp.

Historical dual-LIDAR per-assay efficiencies are used with same-plate concentration controls. Viewing the other standard-curve sources does not silently change this selection. Missing/failed efficiencies and declared bench exclusions remain excluded. The single-target fragmentation fits have slope intervals spanning zero. All concentrations are locus-derived plasmid equivalents rather than direct measurements of total recovered DNA.

## Auditing and rebuilding

`src/viewer.js` contains commented calculator and plotting code. `src/data.json` contains the original exported values, source filenames/hashes and historical calibration data. `src/viewer_template.html` defines the interface.

```sh
python build_viewer.py
```

This reproduces the reviewed V6 HTML byte-for-byte. Plotly is bundled in `vendor/plotly.min.js`; its upstream license notice is retained. Verification and release notes are included under `verification/`.
