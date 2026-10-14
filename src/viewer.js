'use strict';
// EN9581 V11. All input data are embedded in DATA. No network calibration,
// hidden target normalization or data from another vaccine lot is used.
const $=id=>document.getElementById(id), NA=6.02214076e23;
let DATA={...BUNDLE,...BUNDLE.runs[BUNDLE.defaultRun]};
const colors={CY5:'#793aa3',Quasar:'#d26b00',SYBR:'#238b35'}, targets={CY5:'Spike',Quasar:'Ori',SYBR:'SYBR'};
const channelInput={CY5:'cy5',Quasar:'q705',SYBR:'sybr'};
const channels=()=>Object.keys(DATA.amp);
// A single-target SYBR well has an assigned target. A pooled C/G SYBR well
// reports both products, so it cannot supply a locus-specific concentration.
function targetFor(ch,row){return ch!=='SYBR'?targets[ch]:'AE'.includes(row)?'Spike':'BF'.includes(row)?'Ori':null;}
function channelLabel(ch,row){return ch==='SYBR'?'SYBR · '+(targetFor(ch,row)||'Spike + Ori'):targets[ch];}
function assayLengthLabel(ch,row,col){return targetFor(ch,row)?mapping(ch,col,row).bp+' bp':DATA.amplicons.Spike[col-1].bp+' / '+DATA.amplicons.Ori[col-1].bp+' bp';}
function calibrationFor(ch,row,nom){return ch==='SYBR'?DATA.sybrCalibration?.[targetFor(ch,row)]?.[nom]:DATA.calibration[ch]?.[nom];}
function efficiencySource(ch,row){return DATA.calibrationSources?.[ch+':'+targetFor(ch,row)]||'Cy5+Q705 dual';}
const rows={A:'Spike × gBlock',B:'Ori × gBlock',C:'Dual LIDAR × gBlocks',E:'Spike × EN9581',F:'Ori × EN9581',G:'Dual LIDAR × EN9581'};
const pairs={E:'A',F:'B',G:'C'}, nominal=[40,50,60,70,80,90,100,150,200,250,300];
// The mixture concentration is a physical input, not inferred from its Cq.
// Confirmation belongs to a specific preparation; a remade control does not
// retrospectively establish the concentration in the earlier run.
let selected=new Set(['E1','F1','G1']), currentTab='traces', latest=[];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=x=>Number.isFinite(x)?(Math.abs(x)>=10000||Math.abs(x)>0&&Math.abs(x)<0.001?x.toExponential(3):Number(x.toPrecision(4)).toString()):'—';
const mean=x=>x.reduce((a,b)=>a+b,0)/x.length;
const table=(heads,rs)=>'<table><thead><tr>'+heads.map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rs.map(r=>'<tr>'+r.map(x=>'<td>'+esc(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
function numeric(id){const x=Number($(id).value);return Number.isFinite(x)&&x>0?x:NaN;}
function baseline(y,n){const v=y.slice(0,n).filter(Number.isFinite),b=mean(v);return y.map(x=>Number.isFinite(x)?x-b:null);}
// Interpolate an actual upward crossing. An absent crossing remains null,
// never cycle 40/41; substituting a terminal cycle would invent abundance.
function crossing(x,y,t){for(let i=1;i<y.length;i++)if(Number.isFinite(y[i-1])&&Number.isFinite(y[i])&&y[i-1]<t&&y[i]>=t)return x[i-1]+(t-y[i-1])/(y[i]-y[i-1])*(x[i]-x[i-1]);return null;}
function cq(ch,well){const d=DATA.amp[ch],y=d.w[well];return y?crossing(d.x,baseline(y,Math.floor(numeric('baseline'))),numeric('threshold')):null;}
// Central finite difference of exported melt RFU. No smoothing is applied;
// the derivative is computed here, rather than supplied by the instrument.
function derivative(x,y){return y.map((_,i)=>{const a=Math.max(0,i-1),b=Math.min(y.length-1,i+1);return Number.isFinite(y[a])&&Number.isFinite(y[b])?-(y[b]-y[a])/(x[b]-x[a]):null;});}
function mapping(ch,col,row){return DATA.amplicons[targetFor(ch,row)][col-1];}
function flagged(col){return [50,90].includes(nominal[col-1]);}
// Keep the trace key in normal document flow below the chart. A bounded,
// scrollable key preserves the full plotting area even for an entire plate.
// The buttons retain the native legend's click-to-hide behavior.
function traceKey(id,data){
 let key=$(id+'-key');
 if(!key){key=document.createElement('details');key.id=id+'-key';key.className='trace-key';key.open=true;$(id).after(key);}
 key.innerHTML='<summary>Curve key · '+data.length+' traces</summary><div class="trace-key-items"></div>';
 const items=key.querySelector('.trace-key-items');
 data.forEach((trace,i)=>{
  const button=document.createElement('button');button.type='button';button.className='trace-key-item';button.setAttribute('aria-pressed','true');button.title='Click to hide or show this curve';
  const swatch=document.createElement('span');swatch.className='trace-key-swatch';swatch.style.borderColor=trace.line?.color||'#586671';swatch.style.borderTopStyle=trace.line?.dash==='dot'?'dotted':trace.line?.dash&&trace.line.dash!=='solid'?'dashed':'solid';
  const label=document.createElement('span');label.textContent=trace.name||'Curve '+(i+1);button.append(swatch,label);
  button.onclick=()=>{const visible=button.getAttribute('aria-pressed')!=='true';button.setAttribute('aria-pressed',String(visible));Plotly.restyle(id,{visible:visible?true:'legendonly'},[i]);};items.append(button);
 });
}
function plot(id,data,title,x,y,extra={},overlays={}){
 const isTrace=id==='ampplot'||id==='meltplot';
 const result=Plotly.react(id,data,{title:{text:title,font:{size:20}},font:{family:'system-ui',size:14},margin:{l:85,r:25,t:isTrace?60:90,b:65},xaxis:{title:{text:x}},yaxis:{title:{text:y},...extra},showlegend:!isTrace,legend:{orientation:'h',y:1.12},hovermode:'closest',paper_bgcolor:'#fff',plot_bgcolor:'#fff',...overlays},{responsive:true,displaylogo:false,toImageButtonOptions:{format:'png',scale:2}});
 if(isTrace)traceKey(id,data);
 return result;
}
function plate(){let h='<table><thead><tr><th><button data-all="1">ALL</button></th>';
for(let c=1;c<=12;c++)h+='<th><button data-col="'+c+'">'+c+'<br><small>'+(c===12?'NTC':mapping('CY5',c).bp+'/'+mapping('Quasar',c).bp)+'</small></button></th>';h+='</tr></thead><tbody>';
for(const r of Object.keys(rows)){h+='<tr><td><button data-row="'+r+'">'+r+' · '+rows[r]+'</button></td>';for(let c=1;c<=12;c++){const w=r+c;h+='<td><button data-well="'+w+'" class="'+(selected.has(w)?'picked':'')+'">'+w+'</button></td>';}h+='</tr>';}h+='</tbody></table><small>Column headers: aligned Spike / Ori bp. Click a well to toggle it; row and column buttons replace the selection.</small>';$('plate').innerHTML=h;
$('plate').querySelectorAll('button').forEach(b=>b.onclick=()=>{if(b.dataset.well){const w=b.dataset.well;selected.has(w)?selected.delete(w):selected.add(w);}else if(b.dataset.row)selected=new Set(Array.from({length:12},(_,i)=>b.dataset.row+(i+1)));else if(b.dataset.col)selected=new Set(Object.keys(rows).map(r=>r+b.dataset.col));else selected=new Set(Object.keys(rows).flatMap(r=>Array.from({length:12},(_,i)=>r+(i+1))));plate();drawTraces();});}
function drawTraces(){const amp=[],melt=[],qs=[];
for(const ch of channels()){if(!$(channelInput[ch]).checked)continue;for(const w of [...selected].sort((a,b)=>a[0].localeCompare(b[0])||Number(a.slice(1))-Number(b.slice(1)))){if(!DATA.amp[ch].w[w])continue;
const col=Number(w.slice(1)),ntc=col===12,label=w+' · '+channelLabel(ch,w[0])+(ntc?' NTC':' · '+assayLengthLabel(ch,w[0],col)),line={color:colors[ch],width:selected.size<=4?4:2.5,dash:ntc?'dot':'solid'};
let yy=DATA.amp[ch].w[w];if($('signal').value!=='raw')yy=baseline(yy,Math.floor(numeric('baseline')));if($('signal').value==='norm'){const m=Math.max(...yy);if(m>0)yy=yy.map(x=>x/m);}
amp.push({x:DATA.amp[ch].x,y:yy,name:label,mode:'lines',line});melt.push({x:DATA.melt[ch].x,y:derivative(DATA.melt[ch].x,DATA.melt[ch].w[w]),name:label,mode:'lines',line});qs.push([w,channelLabel(ch,w[0]),rows[w[0]],ntc?'NTC':assayLengthLabel(ch,w[0],col),fmt(cq(ch,w))]);}}
$('selection').textContent=selected.size+' wells selected · '+amp.length+' recorded channel traces. Solid = sample/control; dotted = NTC.';
plot('ampplot',amp,'Amplification','Cycle',$('signal').value==='norm'?'Normalized RFU':$('signal').value==='raw'?'Raw RFU':'RFU, baseline-subtracted');plot('meltplot',melt,'Melt peak (−dRFU/dT)','Temperature (°C)','−dRFU/dT');$('cqtable').innerHTML=table(['Well','Target','Condition','Aligned bp','Cq'],qs);}
function drawSize(){const tr=[];for(const row of 'EFG')for(const ch of channels()){
 if(!targetFor(ch,row)||!DATA.amp[ch].w[row+'1'])continue;
 const pts=[];for(let col=1;col<=11;col++){if($('hideflag').checked&&flagged(col))continue;
 const a=cq(ch,row+col),b=cq(ch,pairs[row]+col);if(a!==null&&b!==null)pts.push({x:mapping(ch,col,row).bp,y:a-b});}
 if(pts.length)tr.push({x:pts.map(p=>p.x),y:pts.map(p=>p.y),name:row+' · '+channelLabel(ch,row),mode:'lines+markers',line:{color:colors[ch],width:3,dash:row==='G'?'dash':ch==='SYBR'&&row==='F'?'dashdot':'solid'}});
}plot('sizeplot',tr,'Length-dependent Cq difference','Aligned amplicon length (bp)','Cq(vaccine) − Cq(gBlock)');}
// Mass to molecules: ng -> g, divide by bp × 660 g/mol/bp, then multiply
// by Avogadro's constant. This declared mass convention is independent of
// the aligned span of each assay (which is used only in the length model).
function copiesFromNg(ng,bp){return ng*1e-9/(bp*660)*NA;}
function ngFromCopies(n,bp){return n/NA*bp*660*1e9;}
function estimateCopies(refCopies,referenceCq,sampleCq,E){return refCopies*Math.pow(E,referenceCq-sampleCq);}
// OLS on -ln(copies) = intercept + lambda × aligned bp. Under random
// independent breaks, intact-span survival is exp(-lambda × bp). 1/lambda
// is an effective decay length, not a directly measured fragment histogram.
function fitLength(points){if(points.length<4)return {ok:false,reason:'Fewer than four accepted lengths',n:points.length};
const xs=points.map(p=>p.bp),ys=points.map(p=>-Math.log(p.raw)),xm=mean(xs),ym=mean(ys),sxx=xs.reduce((s,x)=>s+(x-xm)**2,0),sxy=xs.reduce((s,x,i)=>s+(x-xm)*(ys[i]-ym),0),lambda=sxy/sxx,b=ym-lambda*xm;
const sse=xs.reduce((s,x,i)=>s+(ys[i]-b-lambda*x)**2,0),sst=ys.reduce((s,y)=>s+(y-ym)**2,0),se=Math.sqrt(sse/(xs.length-2)/sxx),tc={2:4.303,3:3.182,4:2.776,5:2.571,6:2.447,7:2.365,8:2.306,9:2.262}[xs.length-2]||2.228;
return {ok:lambda>0&&Number.isFinite(lambda),reason:lambda>0?'':'Nonpositive length-decay slope',lambda,low:lambda-tc*se,high:lambda+tc*se,n:xs.length,r2:sst?1-sse/sst:0,decay:lambda>0?1/lambda:null,intercept:b};}
function settings(){return Object.fromEntries(['stockSpike','stockOri','gdil','stdvol','gbp','dualFraction','vdil','samplevol','dose','plasmidbp','manualE','threshold','baseline'].map(id=>[id,numeric(id)]));}
function calculate(P,mode,applyPoisson){const all=[],fits=[];const valid=Object.values(P).every(Number.isFinite)&&P.dualFraction<=1&&P.baseline<=15&&P.manualE>1&&P.manualE<=2.2;
if(!valid)return {all,fits,error:'Enter positive finite inputs; row C fraction must be at most 1, baseline at most 15, and E between 1 and 2.2.'};
for(const row of 'EFG')for(const ch of channels()){if(!DATA.amp[ch].w[row+'1'])continue;const group=[];
// Do not divide or reinterpret a pooled SYBR signal as two target signals.
if(ch==='SYBR'&&!targetFor(ch,row)){
 for(let col=1;col<=11;col++)all.push({well:row+col,control:pairs[row]+col,channel:ch,target:'Spike + Ori',row,column:col,bp:null,sampleCq:cq(ch,row+col),refCq:cq(ch,pairs[row]+col),raw:null,model:null,raw_ng_per_dose:null,model_ng_per_dose:null,raw_ng_per_ul:null,model_ng_per_ul:null,reason:'Pooled SYBR signal cannot be assigned to Spike or Ori',model_reason:'Pooled SYBR signal cannot be assigned to Spike or Ori',run_id:DATA.id,...Object.fromEntries(Object.entries(P).map(([k,v])=>['input_'+k,v]))});
 continue;
}
// Use the independently measured stock mean for the assigned target. Both
// reporters of a single target share that stock; mixed SYBR is excluded above.
// The stock is never inferred from vaccine Cqs or adjusted to equalize loci.
for(let col=1;col<=11;col++){const m=mapping(ch,col,row),well=row+col,control=pairs[row]+col,nom=nominal[col-1],a=calibrationFor(ch,row,nom),E=mode==='manual'?P.manualE:a?Math.pow(10,-1/a.slope):null;
const sampleCq=cq(ch,well),refCq=cq(ch,control),fraction=row==='G'?P.dualFraction:1,stock=targetFor(ch,row)==='Spike'?P.stockSpike:P.stockOri,refMass=stock/P.gdil*P.stdvol*fraction,refCopies=copiesFromNg(refMass,P.gbp);
const rec={well,control,channel:ch,target:targetFor(ch,row),run_id:DATA.id,reverse_primer_fraction:row==='G'?DATA.reversePrimerFraction:1,row,column:col,primer:m.name,nominal_bp:nom,bp:m.bp,sampleCq,refCq,E,efficiency_source:mode==='manual'?'Explicit common factor':efficiencySource(ch,row),reference_copies:refCopies,reference_stock_ng_per_ul:stock,raw:null,model:null,reason:'',model_reason:'',...Object.fromEntries(Object.entries(P).map(([k,v])=>['input_'+k,v]))};
// Exclusion identity is nominal/oligo based. Renaming a 50 bp assay to its
// aligned 59 or 55 bp span must not accidentally remove its bench flag.
if(flagged(col))rec.reason='Bench-excluded nominal '+nom+' bp assay';
else if(row==='G'&&!DATA.dualConfirmed)rec.reason='Row C per-target concentration not yet confirmed';
else if(sampleCq===null||refCq===null)rec.reason='No threshold crossing in sample or control';
else if(a&&!a.ok)rec.reason='Historical calibration QC failed: '+a.flags.join('; ');
else if(!(E>1&&E<=2.2))rec.reason='No accepted per-assay efficiency';
else {rec.raw=estimateCopies(refCopies,refCq,sampleCq,E);
// Historical points are concentrations of loaded dilution. This is only
// a transfer-range warning; it is not a validated detection/quantitation limit.
if(a?.points?.length){const lo=Math.min(...a.points.map(p=>10**p[0])),hi=Math.max(...a.points.map(p=>10**p[0]));if(rec.raw/P.samplevol<lo||rec.raw/P.samplevol>hi)rec.model_reason='Outside historical observed concentration range';}}
group.push(rec);}
const usable=group.filter(r=>r.raw>0&&!r.model_reason),fit=fitLength(usable);
// Missing/unusable observations from otherwise eligible assays can bias a
// fitted decay. Do not fit only the surviving high-abundance tail silently.
if(group.some(r=>r.reason==='No threshold crossing in sample or control'||r.model_reason)){fit.ok=false;fit.reason='Incomplete observed range';}
fits.push({row,ch,...fit});for(const r of group){if(r.raw>0&&fit.ok)r.model=r.raw*Math.exp(fit.lambda*r.bp);r.model_reason=r.reason||r.model_reason||(!fit.ok?fit.reason:'');r.lambda=fit.lambda??null;r.lambda_low=fit.low??null;r.lambda_high=fit.high??null;r.fit_r2=fit.r2??null;r.fit_n=fit.n;r.effective_length_bp=fit.decay??null;r.selected=applyPoisson?r.model:r.raw;
// Report a locus-derived plasmid-EQUIVALENT mass. Spike and Ori are never
// reweighted to agree; the plasmid mass and input stocks remain fixed.
for(const key of ['raw','model']){r[key+'_ng_per_ul']=r[key]===null?null:ngFromCopies(r[key],P.plasmidbp)/P.samplevol*P.vdil;r[key+'_ng_per_dose']=r[key+'_ng_per_ul']===null?null:r[key+'_ng_per_ul']*P.dose;}
all.push(r);}}
return {all,fits};}
function drawDNA(){const P=settings(),mode=$('effmode').value,poisson=$('poisson').checked,answer=calculate(P,mode,poisson);latest=answer.all;
$('inputsummary').textContent=answer.error||['Spike','Ori'].map(target=>{const stock=target==='Spike'?P.stockSpike:P.stockOri,mass=stock/P.gdil*P.stdvol;return target+' gBlock input: '+fmt(mass)+' ng = '+fmt(copiesFromNg(mass,P.gbp))+' copies/reaction';}).join('; ')+'. Vaccine input: '+fmt(P.samplevol/P.vdil)+' µl original vaccine/reaction.';
$('fitstatus').innerHTML=answer.fits.map(f=>'<p>'+esc(f.row+' · '+channelLabel(f.ch,f.row)+': '+(f.ok?'effective decay length '+fmt(f.decay)+' bp; λ '+fmt(f.lambda)+'/bp; 95% conditional slope interval '+fmt(f.low)+' to '+fmt(f.high)+'; R² '+fmt(f.r2)+'; n='+f.n+(f.low<=0?' · Weak fit: slope interval includes zero; finite decay length is poorly constrained.':''):f.reason))+'</p>').join('');
const unit=$('units').value;
const label=unit==='copies'?'Target copies/reaction':unit==='conc'?'Plasmid-equivalent ng/µl neat vaccine':'Plasmid-equivalent ng/dose';
// Plot the existing raw and model fields independently. Never apply the
// fragmentation factor to the raw series, even when the correction is on.
function quantTraces(key){
  const field=unit==='copies'?key:unit==='conc'?key+'_ng_per_ul':key+'_ng_per_dose', traces=[];
  for(const row of 'EFG')for(const ch of channels()){
    const rr=latest.filter(r=>r.row===row&&r.channel===ch&&Number.isFinite(r[field])&&r[field]>0);
    if(rr.length)traces.push({x:rr.map(r=>r.bp),y:rr.map(r=>r[field]),name:row+' · '+channelLabel(ch,row),mode:'lines+markers',line:{color:colors[ch],width:4,dash:row==='G'?'dash':ch==='SYBR'&&row==='F'?'dashdot':'solid'},marker:{size:8},text:rr.map(r=>r.well+' / '+r.control),hovertemplate:'%{text}<br>%{x} bp<br>%{y:.4g}<extra>%{fullData.name}</extra>'});
  }
  return traces;
}
const rawTraces=quantTraces('raw'), modelTraces=quantTraces('model');
// Both charts share one range. Linear mode starts at zero and uses
// readable, evenly spaced increments sized for approximately 6–10 ticks.
// Switching axis scale changes presentation only, never the calculated quants.
// The requested comparison is 10 ng per dose, not 10 in every display
// unit. Use the same declared dose, volume, dilution and plasmid mass
// assumptions as the calculator when showing its equivalent in other units.
const referenceValue=unit==='dose'?10:unit==='conc'?10/P.dose:copiesFromNg(10/P.dose*P.samplevol/P.vdil,P.plasmidbp);
const hasReference=Number.isFinite(referenceValue)&&referenceValue>0;
const values=[...rawTraces,...modelTraces].flatMap(t=>t.y);
if(hasReference)values.push(referenceValue); // Keep the red line in view.
const isLog=$('dnascale').value==='log';
let axis;
if(isLog){
  // D1 labels intermediate values (2, 3, ... 9) within each decade, rather
  // than leaving a narrow data range with just a single power-of-ten label.
  axis={type:'log',dtick:'D1',tickformat:'~g'};
  if(values.length){const lo=Math.min(...values.map(Math.log10)),hi=Math.max(...values.map(Math.log10)),pad=Math.max(0.12,(hi-lo)*0.08);axis.range=[lo-pad,hi+pad];}
}else{
  const top=values.length?Math.max(...values)*1.06:1;
  const ideal=top/7, magnitude=10**Math.floor(Math.log10(ideal));
  const step=[1,2,2.5,5,10].find(n=>n*magnitude>=ideal)*magnitude;
  axis={type:'linear',tick0:0,dtick:step,range:[0,Math.ceil(top/step)*step],tickformat:'~g',zeroline:true};
}
const referenceOverlay=hasReference?{
  shapes:[{type:'line',xref:'paper',x0:0,x1:1,yref:'y',y0:referenceValue,y1:referenceValue,line:{color:'#d02020',width:2.5}}],
  // Paper coordinates place the label consistently on linear and log axes.
  annotations:[{xref:'paper',x:1,xanchor:'right',yref:'paper',y:((isLog?Math.log10(referenceValue):referenceValue)-axis.range[0])/(axis.range[1]-axis.range[0]),yanchor:'bottom',yshift:3,text:unit==='dose'?'10 ng/dose':'10 ng/dose equivalent',showarrow:false,font:{color:'#d02020',size:13},bgcolor:'rgba(255,255,255,0.9)'}]
}:{};
$('dnaplot').hidden=!poisson;
$('dnacharts').style.gridTemplateColumns=poisson?'':'1fr';
plot('rawquantplot',rawTraces,'Raw quants · no Poisson correction','Aligned amplicon length (bp)',label,{...axis},referenceOverlay);
if(poisson)plot('dnaplot',modelTraces,'Poisson-corrected estimates','Aligned amplicon length (bp)',label,{...axis},referenceOverlay);
$('dnatable').innerHTML=table(['Well / control','Reporter / target','Aligned bp','Sample Cq','Control Cq','E','Raw ng/dose','Model ng/dose','Status'],latest.map(r=>[r.well+' / '+r.control,channelLabel(r.channel,r.row),r.bp,fmt(r.sampleCq),fmt(r.refCq),fmt(r.E),fmt(r.raw_ng_per_dose),fmt(r.model_ng_per_dose),r.reason||r.model_reason||'Accepted']));}
function csv(rows){if(!rows.length)return '';const keys=Object.keys(rows[0]),q=x=>'"'+String(x??'').replace(/"/g,'""')+'"';return [keys.map(q).join(','),...rows.map(r=>keys.map(k=>q(r[k])).join(','))].join('\r\n');}
function download(name,text,type='text/plain'){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([text],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function staticContent(){
$('stockMeasurementTable').innerHTML=table(['Method / source','Spike (ng/µl)','Ori (ng/µl)'],BUNDLE.stockConcentrations.sources.map(s=>[s.method,s.Spike,s.Ori]).concat([['Arithmetic mean — calculator default',BUNDLE.stockConcentrations.means.Spike,BUNDLE.stockConcentrations.means.Ori]]));
$('platekey').innerHTML=table(['Row','Template / assay','Concentration reference'],Object.entries(rows).map(([r,t])=>[r,t,pairs[r]?'Matched to row '+pairs[r]:r==='C'&&!DATA.dualConfirmed?'Per-target input unconfirmed':'Known gBlock input']))+'<p>Cy5 reports Spike; Quasar 705 reports Ori. Both reporters are LIDAR. Rows D and H were unused. Column 12 is NTC. E/A and F/B are single-target comparisons; G/C compares the dual-target reactions. No independent technical replicates are declared.</p><p>'+esc(DATA.protocolNote)+'</p>';
$('seqtable').innerHTML=table(['Target','Column','Oligo name','Instrument bp label','Aligned bp','Reference start–end','Forward 5′→3′','Reverse 5′→3′'],Object.entries(DATA.amplicons).flatMap(([t,a])=>a.map(m=>[t,m.column,m.name,m.column===1?45:m.nominal,m.bp,m.start+'–'+m.end,m.forward,m.reverse])));
$('sources').innerHTML='<h3>Original exports</h3>'+DATA.files.map(f=>'<p><a href="'+esc(f.url)+'">'+esc(f.name)+'</a><br><code>SHA-256 '+f.sha256+'</code></p>').join('');
$('metadata').innerHTML=table(['Field','Value'],DATA.metadata.filter(r=>r.some(x=>x!==null)).map(r=>r.filter(x=>x!==null)));
$('caltable').innerHTML='<p>'+esc(DATA.efficiencyNote)+'</p>'+table(['Source','Channel','Target','Nominal assay bp','E','R²','n','QC status'],DATA.calibrationSourceIndices.flatMap(i=>BUNDLE.historicalStandards[i].assays.map(a=>[BUNDLE.historicalStandards[i].title,a.channel,a.target,a.size_bp,fmt(10**(-1/a.slope)),fmt(a.r2),a.n,a.ok?'Passed':a.flags.join('; ')])));
$('calcmethod').innerHTML='<p>Cq is the first upward crossing of the selected RFU threshold after subtracting the mean of the first baseline cycles. Copies = reference copies × E^(control Cq − sample Cq). Reference copies = target-specific stock ng/µl ÷ dilution × template µl × Avogadro / (working bp × 660 × 10⁹).</p><p>The original no-SYBR efficiency source lacks the shortest assay. The new SYBR run uses its declared target/reporter-specific historical curves; missing or failed calibrations receive no automatic concentration estimate. Nominal 50 and 90 bp assays are bench-excluded; QC-failing historical assays are excluded even in explicit common-factor mode. Raw Cqs remain visible. The manual factor is an assumption, not a measured efficiency.</p><p>The fitted Poisson model regresses −ln(copies) against aligned bp, with a minimum of four accepted lengths. Each copy estimate is corrected by exp(λ × bp). Nonpositive slopes or incomplete observed ranges receive no correction. Slope confidence intervals describe conditional OLS uncertainty only; they omit uncertainty in efficiency, standard concentration, preparation and recovery. A slope interval including zero does not support a well-resolved finite decay length.</p><p>Copy counts convert to plasmid-equivalent mass using the declared plasmid length, then to neat-vaccine concentration using sample volume and dilution, and finally to dose using dose volume. This assay-specific equivalent mass is not a direct measurement of total DNA. No result is rescaled to force equimolarity between plasmid regions. NTCs are visible controls and are never used as concentration standards.</p>';
}
// Historical standard-curve records retain original nominal assay identities.
// Their regression x values are log10(copies/µl), not copies/reaction. Template
// volume therefore must not be multiplied into this axis or its intercept.
function standardRun(){return DATA.historicalStandards[Number($('standardrun').value)||0];}
function standardExclusion(a){const reasons=[];if([50,90].includes(a.size_bp))reasons.push('Bench-excluded nominal '+a.size_bp+' bp');if(!a.ok)reasons.push('Calibration QC: '+a.flags.join('; '));return reasons.join('; ');}
function standardColor(bp){const all=[40,50,60,70,80,90,100,150,200,250,300],i=all.indexOf(bp);return 'hsl('+Math.round(240-i*22)+',65%,42%)';}
function standardPointRecords(){return DATA.historicalStandards.flatMap(s=>s.assays.flatMap(a=>a.points.map((p,i)=>({source:s.key,source_file:s.metadata.file,source_instrument:s.metadata.instrument,source_started:s.metadata.started||'',channel:a.channel,target:a.target,nominal_bp:a.size_bp,point:i+1,log10_copies_per_ul:p[0],copies_per_ul:10**p[0],Cq:p[1],slope:a.slope,intercept:a.intercept,amplification_factor:10**(-1/a.slope),efficiency_percent:a.eff_pct,r2:a.r2,n:a.n,calibration_qc_pass:a.ok,exclusion:standardExclusion(a)}))));}
function drawStandards(){const s=standardRun(),hide=$('standardhide').checked;
$('standardinfo').textContent=s.note+' Source: '+s.metadata.file+' · '+(s.metadata.started||'date not recorded')+' · instrument '+s.metadata.instrument+'. Curve labels retain the original nominal assay names; EN9581 plots use aligned amplicon lengths.';
for(const [ch,id] of [['Cy5','standardcy5'],['Quasar 705','standardq705'],['SYBR','standardsybr']]){
 const aa=s.assays.filter(a=>a.channel===ch);$(id).hidden=aa.length===0;
 if(!aa.length)continue;
 const traces=[];
 for(const a of aa){const excluded=standardExclusion(a);if(hide&&excluded)continue;
  const x=a.points.map(p=>p[0]),y=a.points.map(p=>p[1]),color=standardColor(a.size_bp),name=a.size_bp+' bp'+(excluded?' · excluded':'');
  traces.push({x,y,mode:'markers',name,legendgroup:String(a.size_bp),marker:{size:8,color,symbol:excluded?'circle-open':'circle',line:{width:2}},text:a.points.map(()=>excluded||'Accepted'),hovertemplate:'Nominal '+a.size_bp+' bp<br>%{x:.3f} log10 copies/µl<br>Cq %{y:.3f}<br>%{text}<extra></extra>'});
  const lo=Math.min(...x),hi=Math.max(...x);traces.push({x:[lo,hi],y:[a.intercept+a.slope*lo,a.intercept+a.slope*hi],mode:'lines',name,legendgroup:String(a.size_bp),showlegend:false,line:{color,width:3,dash:excluded?'dot':'solid'},hoverinfo:'skip'});
 }
 Plotly.react(id,traces,{title:{text:ch+' · '+aa[0].target,font:{size:20}},font:{family:'system-ui',size:14},height:540,margin:{l:65,r:20,t:55,b:125},xaxis:{title:{text:'log10 gBlock copies/µl (loaded dilution)'},dtick:1},yaxis:{title:{text:'Cq'}},legend:{orientation:'h',y:-0.22},paper_bgcolor:'#fff',plot_bgcolor:'#fff'},{responsive:true,displaylogo:false,toImageButtonOptions:{format:'png',scale:2}});
}
$('standardcharts').style.gridTemplateColumns=new Set(s.assays.map(a=>a.channel)).size>1?'':'1fr';
$('standardtable').innerHTML=table(['Reporter','Nominal bp','E (factor/cycle)','Efficiency %','Slope','R²','Points','Use in calculation'],s.assays.map(a=>[a.channel,a.size_bp,fmt(10**(-1/a.slope)),fmt(a.eff_pct),fmt(a.slope),fmt(a.r2),a.n,standardExclusion(a)|| (DATA.calibrationSourceIndices.some(i=>BUNDLE.historicalStandards[i].key===s.key)?'Used for selected run':'Reference for other run')]));
drawHistoricalTraces();}
function drawHistoricalTraces(){const s=standardRun(),ch=$('standardchannel').value,n=Number($('standardlength').value),d=s.amp[ch],sizes=[...new Set(s.assays.map(a=>a.size_bp))].sort((a,b)=>a-b),col=sizes.indexOf(n)+1,tr=[];
if(d&&col>0){for(const row of 'ABCDEFG'){const well=row+col,y=d.w[well];if(!y)continue;tr.push({x:d.x,y,mode:'lines',name:well+' · '+(row==='G'?'NTC':'1:'+10**(row.charCodeAt(0)-65+3)),line:{color:row==='G'?'#777':standardColor(40+('ABCDEF'.indexOf(row))*10),width:3,dash:row==='G'?'dot':'solid'}});}}
$('standardtraceinfo').textContent=tr.length?'Original RFU traces for nominal '+n+' bp, '+ch+'. A–F are 1:1,000 through 1:100,000,000; G is NTC.':'The selected reporter/nominal assay is not present in this historical run.';
plot('standardtraces',tr,'Historical amplification traces','Cycle','Raw RFU');}
$('standardtracedetail').addEventListener('toggle',()=>{if($('standardtracedetail').open)drawHistoricalTraces();});
$('downloadstandards').onclick=()=>download('EN9581_historical_standard_curves_V11.csv',csv(standardPointRecords()),'text/csv');
$('downloadstandardtraces').onclick=()=>{const rr=[];for(const s of DATA.historicalStandards)for(const kind of ['amp','melt'])for(const [ch,d] of Object.entries(s[kind]))for(const [well,y] of Object.entries(d.w))y.forEach((rfu,i)=>rr.push({source:s.key,kind,channel:ch,well,x:d.x[i],RFU:rfu}));download('EN9581_historical_traces_V11.csv',csv(rr),'text/csv');};

function redraw(){if(currentTab==='traces')drawTraces();if(currentTab==='size')drawSize();if(currentTab==='dna')drawDNA();if(currentTab==='standards')drawStandards();}
$('tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{currentTab=b.dataset.tab;for(const id of ['traces','size','dna','standards','seq','methods','batch','about'])$(id).hidden=id!==currentTab;$('tabs').querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));redraw();});
for(const e of document.querySelectorAll('input,select'))e.addEventListener('change',redraw);
$('downloadcsv').onclick=()=>{drawDNA();download('EN9581_calculations_V11.csv',csv(latest.map(r=>({...r,display_poisson:$('poisson').checked,version:BUNDLE.version,run_id:DATA.id}))),'text/csv');};
$('downloadjson').onclick=()=>download('EN9581_data_V11.json',JSON.stringify(BUNDLE,null,2),'application/json');
$('downloadalign').onclick=()=>download('EN9581_amplicon_alignment_V11.csv',csv(Object.entries(DATA.amplicons).flatMap(([target,a])=>a.map(m=>({target,column:m.column,oligo:m.name,nominal_bp:m.nominal,aligned_bp:m.bp,start:m.start,end:m.end,forward:m.forward,reverse:m.reverse})))),'text/csv');
$('downloadraw').onclick=()=>{const rr=[];for(const kind of ['amp','melt'])for(const [ch,d] of Object.entries(DATA[kind]))for(const [well,yy] of Object.entries(d.w))yy.forEach((rfu,i)=>rr.push({run_id:DATA.id,kind,channel:ch,well,x:d.x[i],RFU:rfu}));download('EN9581_'+DATA.id+'_raw_traces_V11.csv',csv(rr),'text/csv');};
// Run switching changes data, controls and provenance together. Confirmation
// from the new preparation must never unlock the original run's row G.
const runInputs={};let activeRun=null;
function selectRun(index){
 if(activeRun!==null)runInputs[activeRun]=settings();
 DATA={...BUNDLE,...BUNDLE.runs[index]};activeRun=index;
 const inputs=runInputs[index]||DATA.defaults;
 for(const [id,value] of Object.entries(inputs))if($(id))$(id).value=value;
 $('runselect').value=String(index);
 $('runsummary').textContent=DATA.title+' · 72 wells · '+(DATA.hasSybr?'Cy5 Spike, Quasar 705 Ori and SYBR':'Cy5 Spike and Quasar 705 Ori')+' · self-contained offline viewer';
 $('traceRunName').textContent=DATA.title+' · 1:100 vaccine vs 1:10,000 gBlocks';
 $('runprotocol').textContent=DATA.protocolNote;
 $('dnaintro').textContent=DATA.efficiencyNote;
 $('dualNote').textContent=DATA.concentrationNote;
 $('methodPreparation').textContent=DATA.protocolNote;
 $('arrayRunNote').textContent=DATA.hasSybr?'Selected run: SYBR + Cy5 + Quasar 705; no TaqMan.':'Selected run: Cy5 + Quasar 705; no SYBR or TaqMan.';
 $('sybrlabel').hidden=!DATA.hasSybr;$('sybr').checked=DATA.hasSybr;
 $('standardrun').value=String(DATA.calibrationSourceIndices[0]);
 $('standardUseNote').textContent=DATA.efficiencyNote+' Viewing another reference source does not change that assignment.';
 selected=new Set(['E7','F7','G7']);latest=[];
 staticContent();plate();redraw();
}
$('runselect').innerHTML=BUNDLE.runs.map((r,i)=>'<option value="'+i+'">'+esc(r.title)+'</option>').join('');
$('runselect').addEventListener('change',()=>selectRun(Number($('runselect').value)));
selectRun(BUNDLE.defaultRun);

