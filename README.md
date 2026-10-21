# LIDAR plate viewer — V19

Public viewer with the three EN9581/FL8095 benchmark plates from V17 and two October 20 dilution plates (SYBR + LIDAR and TaqMan + LIDAR). The Run menu defaults to the new SYBR dilution series. Three historical calibration series remain available. The original publication viewer is separate.

## Run and rebuild

Install `requirements.txt`, then run `streamlit run streamlit_app.py`. Community Cloud uses branch `main` and entrypoint `streamlit_app.py`. No secrets or database are required. `python build_viewer.py` rebuilds the self-contained `viewer/LIDAR_Viewer_EN9581_V19.html`; the app provides an offline download. Plotly and reviewed methods figures are embedded.

## Dilution plates

A = vaccine 1:1,000; B = 1:100; C = 1:10; D = mixed gBlock 1:20,000 per target; E = NTC. Column 12 is NTC throughout. Rows F–H were not recorded. The operator-confirmed map supersedes copied instrument labels. Both DNA inputs are 2 µl in 20 µl reactions. TaqMan probes are 125 nM each and LIDAR probers 250 nM each. The plates used different instruments. Final detergent levels at each dilution and completion of the planned primer remake are not independently confirmed.

The new Dilution & DNA estimates tab uses each row's own dilution, an explicit amplification factor E=2, and no Poisson correction. The same five columns 7–11 provide target-resolved median quantities. Stocks are the operator-selected four-method means: Spike 1.47375 and Ori 1.01 ng/µl. Working assumptions: 400 bp gBlocks, 7,824 bp plasmid equivalent and 300 µl dose. Mixed SYBR is not apportioned between targets. Missing crossings remain missing. Historical-efficiency calculators remain available for the earlier benchmark plates; they are not silently applied to the new dilution series.

FAM column 4 baseline drift is excluded from accepted Cqs while raw curves and raw crossings are retained. The nominal 50/90 bp exclusions remain visible. NTC crossings and late HEX D10/D11 controls are flagged. Quantities are exploratory locus-derived plasmid equivalents, not direct total-DNA measurements. Neither reporters nor targets are added together.

## Verification and provenance

`src/data.json` preserves source filenames and SHA-256 hashes, raw amplification/melt values, metadata and confirmed row assignments. `verification/EN9581_verification_V19.json` records checks of 420 Cqs, 90 per-assay quantities, row-specific dilution handling, FAM drift exclusion, all imported curves and unchanged V17 run/calibration data. Exact fluor–quencher modification positions are not published. The withdrawn October 14 plate is not included. Previous releases are recoverable in Git history.

## V19 display and agreement update

The quantity chart defaults to 0–200 ng/dose with a labeled red 10 ng/dose reference. A count identifies estimates above the visible range; full linear and logarithmic views retain them. The new TaqMan–LIDAR agreement tab is accessible from both October 20 runs and explicitly compares same-well reporters on the TaqMan plate. It includes matched five-length quantities for all three dilutions, paired ratios, equal-axis diagonal plots, late-control markers, dilution-step differences and per-pair CSV downloads. All underlying run data and quantities are unchanged.
