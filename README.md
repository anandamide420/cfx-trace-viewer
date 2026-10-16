# EN9581 LIDAR plate viewer

Standalone EN9581 edition **V12**, containing the 13 October LIDAR-only, 14 October LIDAR + SYBR, and 16 October heat/Triton Bio-Rad SYBR Pfizer EN9581 plates, plus three historical calibration runs. The Run selector defaults to the 16 October plate. The main publication viewer is not included or replaced.

## Run

```sh
python -m pip install -r requirements.txt
streamlit run streamlit_app.py
```

For Streamlit Community Cloud, select this repository, branch `main`, and entrypoint `streamlit_app.py`. Python 3.12 is supported. No secrets or external database are required.

The downloadable `viewer/LIDAR_Viewer_EN9581_V12.html` works offline. The Batch report tab opens an external website and requires internet access.

## Contents

- Amplification and melt traces, plate key, and size-series comparisons.
- Raw and Poisson-corrected DNA estimates with matching linear/log axes and a red 10 ng/dose reference line.
- Imported standard-curve points, historical traces, efficiencies, QC flags and CSV downloads.
- Primer-aligned lengths, preparation details and original export provenance.
- Methods figures: supplied EN9581 vial photograph and aligned amplicon-array schematic.
- External EN9581 batch-report link.
- About LIDAR tab with a link to the presentation on YouTube.

## Calculation inputs and unresolved details

The 16 October vaccine default is 1:50 and its gBlock default is 1:20,000 per target, with 2 µl of each in 20 µl PCR. The earlier plates retain 1:100 vaccine and 1:10,000 gBlock defaults. The following historical preparation details apply to those earlier plates. gBlock controls use target-specific stock means of 1.47375 ng/µl Spike and 1.01 ng/µl Ori, diluted 1:10,000, with 2 µl per reaction and a 400 bp working mass convention. The 300 µl dose and 7,824 bp plasmid-equivalent length remain editable assumptions.

In the 14 October run, row C contains 1:10,000 of each remade gBlock and row G LIDAR estimates are enabled. Each reverse primer in pooled rows C/G is at half its single-target concentration; this does not halve the DNA input and no twofold correction is applied. In the original 13 October run, row G estimates remain withheld because that preparation's row C input is unconfirmed. Mixed-target SYBR in C/G remains visible as traces and Cqs, but supplies no locus-specific concentration estimate. Raw traces and Cqs remain available. The shortest Ori assay assumes the initially identified Ori_48bp oligo; the alternate Ori_45bp would have a different span. Spike's shortest aligned span is 46 bp.

The original run retains historical dual-LIDAR efficiencies. The 14 and 16 October runs use reporter- and target-specific LIDAR/SYBR efficiencies from the corresponding historical single-target dilution series, anchored by same-plate A/B/C concentration controls. Transfer to pooled reactions is an assumption, including the half-concentration reverse primers on 14 October. Viewing the other standard-curve sources does not silently change this selection. Missing/failed efficiencies and declared bench exclusions remain excluded. Fit intervals and incomplete-range exclusions are reported per run and reporter. All concentrations are locus-derived plasmid equivalents rather than direct measurements of total recovered DNA.

## Auditing and rebuilding

`src/viewer.js` contains commented calculator and plotting code. `src/data.json` contains the original exported values, source filenames/hashes and historical calibration data. `src/viewer_template.html` defines the interface.

```sh
python build_viewer.py
```

This reproduces the reviewed V12 HTML byte-for-byte. Plotly is bundled in `vendor/plotly.min.js`; its upstream license notice is retained. Verification and release notes are included under `verification/`.

## V12 stock concentration inputs

Methods includes IDT reported values (1/1 ng/µl Spike/Ori), electrophoresis main peaks (0.535/0.340), AccuGreen (1.36/0.700) and NanoDrop (3.0/2.0). The requested equal-weight means are separate editable defaults in all three runs. No additional premeasurement dilution correction is applied. IDT is a manufacturer-reported value, not a laboratory replicate. Run 1’s proposed 1:100,000 gBlock dilution remains unconfirmed and its 1:10,000 default is unchanged. Original exported traces and historical calibration observations/efficiencies are preserved.

## 16 October heat/Triton run

Rows A/B/C are Spike/Ori/mixed gBlocks, E/F/G are matched vaccine reactions, and column 12 is NTC. Operator confirmed 2 µl DNA, 1 µl reverse-primer mix, and 1:20,000 of each target in the mixed control. The file specifies 30-second extension and heat/Triton pretreatment. Final Bio-Rad Triton concentration is not separately confirmed. Original amplification/melt data and source hashes are embedded. Historical chemistry-specific efficiencies and prior exclusion rules are retained. Mixed SYBR receives no locus-specific quantitation. Most fitted slopes are nonpositive; the mixed Spike positive slope is flagged because long mixed gBlock controls cross earlier than single-target controls. MIC experiments are not part of this release.
