'use strict';
// EN9581 V21. All input data are embedded in DATA. No network calibration,
// hidden target normalization or data from another vaccine lot is used.
const $=id=>document.getElementById(id), NA=6.02214076e23;
let DATA={...BUNDLE,...BUNDLE.runs[BUNDLE.defaultRun]};
const colors={CY5:'#793aa3',Quasar:'#d26b00',SYBR:'#238b35',FAM:'#007e91',HEX:'#b58b00'}, targets={CY5:'Spike',Quasar:'Ori',SYBR:'SYBR',FAM:'Spike',HEX:'Ori'};
const channelInput={CY5:'cy5',Quasar:'q705',SYBR:'sybr',FAM:'fam',HEX:'hex'};
const rawChannels=()=>Object.keys(DATA.amp);
const channels=()=>rawChannels().filter(ch=>ch!=='SYBR'||DATA.hasSybr);
// A single-target SYBR well has an assigned target. A pooled C/G SYBR well
// reports both products, so it cannot supply a locus-specific concentration.
function targetFor(ch,row){if(DATA.dilutionSeries&&ch==='SYBR')return null;if(ch==='SYBR'&&DATA.duplex)return DATA.rowTargets[row]||null;return ch!=='SYBR'?targets[ch]:'ACE'.includes(row)?'Spike':'BDF'.includes(row)?'Ori':null;}
function channelLabel(ch,row){if(ch==='FAM'||ch==='HEX')return ch+' TaqMan · '+targets[ch];if(ch==='SYBR'&&!DATA.hasSybr)return 'Green background · no SYBR dye';return ch==='SYBR'?'SYBR · '+(targetFor(ch,row)||'Spike + Ori'):targets[ch];}
function assayLengthLabel(ch,row,col){return targetFor(ch,row)?mapping(ch,col,row).bp+' bp':DATA.amplicons.Spike[col-1].bp+' / '+DATA.amplicons.Ori[col-1].bp+' bp';}
function calibrationFor(ch,row,nom){return ch==='SYBR'?DATA.sybrCalibration?.[targetFor(ch,row)]?.[nom]:DATA.calibration[ch]?.[nom];}
function efficiencySource(ch,row){return DATA.calibrationSources?.[ch+':'+targetFor(ch,row)]||'Cy5+Q705 dual';}
let rows={A:'EN9581 · Spike',B:'EN9581 · Ori',C:'FL8095 · Spike',D:'FL8095 · Ori',E:'gBlock · Spike',F:'gBlock · Ori'};
let pairs={A:'E',B:'F',C:'E',D:'F'}; const nominal=[40,50,60,70,80,90,100,150,200,250,300];
// The mixture concentration is a physical input, not inferred from its Cq.
// Confirmation belongs to a specific preparation; a remade control does not
// retrospectively establish the concentration in the earlier run.
let selected=new Set(['E1','F1','G1']), currentTab='dna', latest=[];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=x=>Number.isFinite(x)?(Math.abs(x)>=10000||Math.abs(x)>0&&Math.abs(x)<0.001?x.toExponential(3):Number(x.toPrecision(4)).toString()):'—';
const mean=x=>x.reduce((a,b)=>a+b,0)/x.length;
const table=(heads,rs)=>'<table><thead><tr>'+heads.map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rs.map(r=>'<tr>'+r.map(x=>'<td>'+esc(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
function numeric(id){const x=Number($(id).value);return Number.isFinite(x)&&x>0?x:NaN;}
function baseline(y,n){const v=y.slice(0,n).filter(Number.isFinite),b=mean(v);return y.map(x=>Number.isFinite(x)?x-b:null);}
// Interpolate an actual upward crossing. An absent crossing remains null,
// never cycle 40/41; substituting a terminal cycle would invent abundance.
function crossing(x,y,t){for(let i=1;i<y.length;i++)if(Number.isFinite(y[i-1])&&Number.isFinite(y[i])&&y[i-1]<t&&y[i]>=t)return x[i-1]+(t-y[i-1])/(y[i]-y[i-1])*(x[i]-x[i-1]);return null;}
function rawCq(ch,well){const d=DATA.amp[ch],y=d.w[well];return y?crossing(d.x,baseline(y,Math.floor(numeric('baseline'))),numeric('threshold')):null;}
function cq(ch,well){if(DATA.dilutionSeries&&ch==='FAM'&&Number(well.slice(1))===4)return null;return rawCq(ch,well);}
function ntcWell(w){return Number(w.slice(1))===12||(DATA.ntcRows||[]).includes(w[0]);}
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
 const isTrace=id==='ampplot'||id==='meltplot'||id==='sizeplot';
 const result=Plotly.react(id,data,{title:{text:title,font:{size:20}},font:{family:'system-ui',size:14},margin:{l:85,r:25,t:isTrace?60:90,b:65},xaxis:{title:{text:x}},yaxis:{title:{text:y},...extra},showlegend:!isTrace,legend:{orientation:'h',y:1.12},hovermode:'closest',paper_bgcolor:'#fff',plot_bgcolor:'#fff',...overlays},{responsive:true,displaylogo:false,toImageButtonOptions:{format:'png',scale:2}});
 if(isTrace)traceKey(id,data);
 return result;
}
function plate(){let h='<table><thead><tr><th><button data-all="1">ALL</button></th>';
for(let c=1;c<=12;c++)h+='<th><button data-col="'+c+'">'+c+'<br><small>'+(c===12?'NTC':mapping('CY5',c).bp+'/'+mapping('Quasar',c).bp)+'</small></button></th>';h+='</tr></thead><tbody>';
for(const r of Object.keys(rows)){h+='<tr><td><button data-row="'+r+'">'+r+' · '+rows[r]+'</button></td>';for(let c=1;c<=12;c++){const w=r+c;h+='<td><button data-well="'+w+'" class="'+(selected.has(w)?'picked':'')+'">'+w+'</button></td>';}h+='</tr>';}h+='</tbody></table><small>Column headers: aligned Spike / Ori bp. Click a well to toggle it; row and column buttons replace the selection.</small>';$('plate').innerHTML=h;
$('plate').querySelectorAll('button').forEach(b=>b.onclick=()=>{if(b.dataset.well){const w=b.dataset.well;selected.has(w)?selected.delete(w):selected.add(w);}else if(b.dataset.row)selected=new Set(Array.from({length:12},(_,i)=>b.dataset.row+(i+1)));else if(b.dataset.col)selected=new Set(Object.keys(rows).map(r=>r+b.dataset.col));else selected=new Set(Object.keys(rows).flatMap(r=>Array.from({length:12},(_,i)=>r+(i+1))));plate();drawTraces();});}
function drawTraces(){const amp=[],melt=[],qs=[];
for(const ch of rawChannels()){if(!$(channelInput[ch]).checked)continue;for(const w of [...selected].sort((a,b)=>a[0].localeCompare(b[0])||Number(a.slice(1))-Number(b.slice(1)))){if(!DATA.amp[ch].w[w])continue;
const col=Number(w.slice(1)),ntc=ntcWell(w),label=w+' · '+channelLabel(ch,w[0])+(ntc?' NTC':' · '+assayLengthLabel(ch,w[0],col)),line={color:colors[ch],width:selected.size<=4?4:2.5,dash:ntc?'dot':'solid'};
let yy=DATA.amp[ch].w[w];if($('signal').value!=='raw')yy=baseline(yy,Math.floor(numeric('baseline')));if($('signal').value==='norm'){const m=Math.max(...yy);if(m>0)yy=yy.map(x=>x/m);}
amp.push({x:DATA.amp[ch].x,y:yy,name:label,mode:'lines',line});melt.push({x:DATA.melt[ch].x,y:derivative(DATA.melt[ch].x,DATA.melt[ch].w[w]),name:label,mode:'lines',line});qs.push([w,channelLabel(ch,w[0]),rows[w[0]],ntc?'NTC':assayLengthLabel(ch,w[0],col),fmt(cq(ch,w))+(DATA.dilutionSeries&&ch==='FAM'&&col===4?' · baseline drift; raw crossing '+fmt(rawCq(ch,w)):'')]);}}
$('selection').textContent=selected.size+' wells selected · '+amp.length+' recorded channel traces. Solid = sample/control; dotted = NTC.';
plot('ampplot',amp,'Amplification','Cycle',$('signal').value==='norm'?'Normalized RFU':$('signal').value==='raw'?'Raw RFU':'RFU, baseline-subtracted');plot('meltplot',melt,'Melt peak (−dRFU/dT)','Temperature (°C)','−dRFU/dT');$('cqtable').innerHTML=table(['Well','Target','Condition','Aligned bp','Cq'],qs);}
function drawSize(){const tr=[];for(const row of sampleRows())for(const ch of channels()){
 if(!targetFor(ch,row)||!DATA.amp[ch].w[row+'1']||(DATA.duplex&&ch==='SYBR'))continue;
 const pts=[];for(let col=1;col<=11;col++){if($('hideflag').checked&&flagged(col))continue;
 const a=cq(ch,row+col),b=referenceCq(ch,row,col);if(a!==null&&b!==null)pts.push({x:mapping(ch,col,row).bp,y:a-b});}
 if(pts.length)tr.push({x:pts.map(p=>p.x),y:pts.map(p=>p.y),name:rows[row]+' · '+targetFor(ch,row)+' · '+(ch==='CY5'?'Cy5 LIDAR':ch==='Quasar'?'Quasar 705 LIDAR':ch==='SYBR'?'SYBR':ch+' TaqMan'),mode:'lines+markers',line:{color:colors[ch],width:3,dash:'CD'.includes(row)?'dash':'solid'}});
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
function calculate(P,mode,applyPoisson){if(DATA.dilutionSeries)return {all:[],fits:[],error:'Use Dilution & DNA estimates for the confirmed row-specific dilutions.'};const all=[],fits=[];const valid=Object.values(P).every(Number.isFinite)&&P.dualFraction<=1&&P.baseline<=15&&P.manualE>1&&P.manualE<=2.2;
if(!valid)return {all,fits,error:'Enter positive finite inputs; baseline must be at most 15, and E between 1 and 2.2.'};
for(const row of sampleRows())for(const ch of channels()){if(!DATA.amp[ch].w[row+'1'])continue;const group=[];
// Do not divide or reinterpret a pooled SYBR signal as two target signals.
if(ch==='SYBR'&&(!targetFor(ch,row)||DATA.duplex)){
 for(let col=1;col<=11;col++)all.push({well:row+col,control:referenceWells(row,col).join(' + '),channel:ch,target:targetFor(ch,row)||'Spike + Ori',row,column:col,bp:null,sampleCq:cq(ch,row+col),refCq:referenceCq(ch,row,col),raw:null,model:null,raw_ng_per_dose:null,model_ng_per_dose:null,raw_ng_per_ul:null,model_ng_per_ul:null,reason:(targetFor(ch,row)?'No single-target SYBR gBlock control on this plate':'Pooled SYBR signal cannot be assigned to Spike or Ori'),model_reason:(targetFor(ch,row)?'No single-target SYBR gBlock control on this plate':'Pooled SYBR signal cannot be assigned to Spike or Ori'),run_id:DATA.id,...Object.fromEntries(Object.entries(P).map(([k,v])=>['input_'+k,v]))});
 continue;
}
// Use the independently measured stock mean for the assigned target. Both
// reporters of a single target share that stock; mixed SYBR is excluded above.
// The stock is never inferred from vaccine Cqs or adjusted to equalize loci.
for(let col=1;col<=11;col++){const m=mapping(ch,col,row),well=row+col,control=referenceWells(row,col).join(' + '),nom=nominal[col-1],a=calibrationFor(ch,row,nom),E=mode==='manual'?P.manualE:a?Math.pow(10,-1/a.slope):null;
const sampleCq=cq(ch,well),refCq=referenceCq(ch,row,col),fraction=1,stock=targetFor(ch,row)==='Spike'?P.stockSpike:P.stockOri,refMass=stock/P.gdil*P.stdvol*fraction,refCopies=copiesFromNg(refMass,P.gbp);
const rec={well,control,channel:ch,target:targetFor(ch,row),run_id:DATA.id,reverse_primer_fraction:row==='G'?DATA.reversePrimerFraction:1,row,column:col,primer:m.name,nominal_bp:nom,bp:m.bp,sampleCq,refCq,E,efficiency_source:mode==='manual'?'Explicit common factor':efficiencySource(ch,row),reference_copies:refCopies,reference_stock_ng_per_ul:stock,raw:null,model:null,reason:'',model_reason:'',...Object.fromEntries(Object.entries(P).map(([k,v])=>['input_'+k,v]))};
// Exclusion identity is nominal/oligo based. Renaming a 50 bp assay to its
// aligned 59 or 55 bp span must not accidentally remove its bench flag.
if(flagged(col))rec.reason='Bench-excluded nominal '+nom+' bp assay';
else if($('matched').checked&&!matchedCalibration(ch,row,nom))rec.reason='Not accepted in both reporter calibrations';
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
const zeroCorrection=fit.reason==='Nonpositive length-decay slope';fit.applied_lambda=zeroCorrection?0:fit.ok?fit.lambda:null;fits.push({row,ch,...fit});for(const r of group){if(r.raw>0&&(fit.ok||zeroCorrection))r.model=r.raw*Math.exp(fit.applied_lambda*r.bp);r.applied_lambda=fit.applied_lambda;r.zero_correction_applied=zeroCorrection&&r.raw>0;r.model_reason=r.reason||r.model_reason||(!fit.ok?fit.reason:'');r.lambda=fit.lambda??null;r.lambda_low=fit.low??null;r.lambda_high=fit.high??null;r.fit_r2=fit.r2??null;r.fit_n=fit.n;r.effective_length_bp=fit.decay??null;r.selected=applyPoisson?r.model:r.raw;
// Report a locus-derived plasmid-EQUIVALENT mass. Spike and Ori are never
// reweighted to agree; the plasmid mass and input stocks remain fixed.
for(const key of ['raw','model']){r[key+'_ng_per_ul']=r[key]===null?null:ngFromCopies(r[key],P.plasmidbp)/P.samplevol*P.vdil;r[key+'_ng_per_dose']=r[key+'_ng_per_ul']===null?null:r[key+'_ng_per_ul']*P.dose;}
all.push(r);}}
return {all,fits};}
function drawDNA(){if(DATA.dilutionSeries){drawDilution();return;}const P=settings(),mode=$('effmode').value,poisson=$('poisson').checked,answer=calculate(P,mode,poisson);latest=answer.all;drawDNASurface(latest);
$('inputsummary').textContent=answer.error||['Spike','Ori'].map(target=>{const stock=target==='Spike'?P.stockSpike:P.stockOri,mass=stock/P.gdil*P.stdvol;return target+' gBlock input: '+fmt(mass)+' ng = '+fmt(copiesFromNg(mass,P.gbp))+' copies/reaction';}).join('; ')+'. Vaccine input: '+fmt(P.samplevol/P.vdil)+' µl original vaccine/reaction.';
$('fitstatus').innerHTML=answer.fits.map(f=>'<p>'+esc(f.row+' · '+channelLabel(f.ch,f.row)+': '+(f.ok?'effective decay length '+fmt(f.decay)+' bp; λ '+fmt(f.lambda)+'/bp; 95% conditional slope interval '+fmt(f.low)+' to '+fmt(f.high)+'; R² '+fmt(f.r2)+'; n='+f.n+(f.low<=0?' · Weak fit: slope interval includes zero; finite decay length is poorly constrained.':''):f.reason==='Nonpositive length-decay slope'?'0% correction applied; fitted λ '+fmt(f.lambda)+'/bp':f.reason))+'</p>').join('');
const unit=$('units').value;
const label=unit==='copies'?'Target copies/reaction':unit==='conc'?'Plasmid-equivalent ng/µl neat vaccine':'Plasmid-equivalent ng/dose';
// Plot the existing raw and model fields independently. Never apply the
// fragmentation factor to the raw series, even when the correction is on.
function quantTraces(key){
  const field=unit==='copies'?key:unit==='conc'?key+'_ng_per_ul':key+'_ng_per_dose', traces=[];
  for(const row of sampleRows())for(const ch of channels()){
    const rr=latest.filter(r=>r.row===row&&r.channel===ch&&Number.isFinite(r[field])&&r[field]>0);
    if(rr.length)traces.push({x:rr.map(r=>r.bp),y:rr.map(r=>r[field]),name:rows[row]+' · '+(ch==='SYBR'?'SYBR':ch==='FAM'||ch==='HEX'?ch+' TaqMan':'LIDAR'),mode:'lines+markers',line:{color:colors[ch],width:4,dash:'CD'.includes(row)?'dash':'solid'},marker:{size:8},text:rr.map(r=>r.well+' / '+r.control),hovertemplate:'%{text}<br>%{x} bp<br>%{y:.4g}<extra>%{fullData.name}</extra>'});
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
if(poisson)plot('dnaplot',modelTraces,'After correction · zero for nonpositive slopes','Aligned amplicon length (bp)',label,{...axis},referenceOverlay);
$('dnatable').innerHTML=table(['Well / control','Reporter / target','Aligned bp','Sample Cq','Control Cq','E','Raw ng/dose','After correction ng/dose','Status'],latest.map(r=>[r.well+' / '+r.control,channelLabel(r.channel,r.row),r.bp,fmt(r.sampleCq),fmt(r.refCq),fmt(r.E),fmt(r.raw_ng_per_dose),fmt(r.model_ng_per_dose),r.reason||(r.zero_correction_applied?'0% correction applied':r.model_reason)||'Accepted']));}
function csv(rows){if(!rows.length)return '';const keys=Object.keys(rows[0]),q=x=>'"'+String(x??'').replace(/"/g,'""')+'"';return [keys.map(q).join(','),...rows.map(r=>keys.map(k=>q(r[k])).join(','))].join('\r\n');}
function download(name,text,type='text/plain'){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([text],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function matchedCalibration(ch,row,nom){
 const target=targetFor(ch,row),lidar=target==='Spike'?'CY5':'Quasar';
 return [lidar,'SYBR'].every(c=>{const a=c==='SYBR'?DATA.sybrCalibration?.[target]?.[nom]:calibrationFor(c,row,nom),e=a?10**(-1/a.slope):null;return a?.ok&&e>1&&e<=2.2;});
}
function median(values){const v=values.filter(Number.isFinite).sort((a,b)=>a-b),n=v.length;return n?n%2?v[(n-1)/2]:(v[n/2-1]+v[n/2])/2:null;}
let agreementLatest=[];
function agreementResults(){if(DATA.dilutionSeries)return {all:[],fits:[],summary:[]};if(DATA.duplex)return duplexResults();
 const answer=calculate(settings(),$('effmode').value,$('poisson').checked),correct=$('poisson').checked;
 const summary=[];
 for(const row of sampleRows()){
  const target=targetFor('SYBR',row),lot='AB'.includes(row)?'EN9581':'FL8095',lidar=target==='Spike'?'CY5':'Quasar';
  const rr=answer.all.filter(r=>r.row===row);
  const groups=Object.fromEntries([lidar,'SYBR'].map(ch=>[ch,rr.filter(r=>r.channel===ch&&r.raw!==null)]));
  const l=groups[lidar],s=groups.SYBR,field=correct?'model_ng_per_dose':'raw_ng_per_dose';
  const lv=median(l.map(r=>r[field])),sv=median(s.map(r=>r[field]));
  summary.push({lot,target,row,lidar_channel:lidar,lidar_n:l.length,sybr_n:s.length,lidar_raw_ng_per_dose:median(l.map(r=>r.raw_ng_per_dose)),sybr_raw_ng_per_dose:median(s.map(r=>r.raw_ng_per_dose)),lidar_reported_ng_per_dose:lv,sybr_reported_ng_per_dose:sv,sybr_change_percent:lv>0&&sv!==null?(sv/lv-1)*100:null,correction_enabled:correct,matched_lengths:$('matched').checked,lidar_lengths:l.map(r=>r.bp).join(';'),sybr_lengths:s.map(r=>r.bp).join(';')});
 }
 return {...answer,summary};
}
function drawAgreement(){if(DATA.dilutionSeries){if(DATA.amp.FAM&&DATA.amp.HEX)drawTaqAgreement();return;}
 $('agreementScatter').hidden=!DATA.hasSybr||DATA.duplex;
 if(DATA.duplex){drawDuplexSummary();return;}
 if(!DATA.hasSybr){drawNoSybrSummary();return;}
 const result=agreementResults();agreementLatest=result.summary;
 const corrected=$('poisson').checked,scope=$('matched').checked;
 $('agreementInputs').textContent=result.error||('Threshold '+fmt(numeric('threshold'))+' RFU; baseline '+fmt(numeric('baseline'))+' cycles; '+($('effmode').value==='measured'?'historical per-reporter efficiencies':'explicit common amplification factor')+'. '+(scope?'Matched accepted lengths in both reporters.':'Separate accepted length sets: differences can reflect assay selection as well as reporter.')+' '+(corrected?'Poisson correction enabled; 0% applied for nonpositive slopes.':'Correction disabled; displaying raw estimates.'));
 $('agreementTable').innerHTML=table(['Lot','Target','LIDAR raw','SYBR raw','LIDAR '+(corrected?'after correction':'reported'),'SYBR '+(corrected?'after correction':'reported'),'SYBR change','Lengths used L/S'],result.summary.map(s=>[s.lot,s.target,fmt(s.lidar_raw_ng_per_dose),fmt(s.sybr_raw_ng_per_dose),fmt(s.lidar_reported_ng_per_dose),fmt(s.sybr_reported_ng_per_dose),s.sybr_change_percent===null?'—':s.sybr_change_percent.toFixed(1)+'%',s.lidar_n+'/'+s.sybr_n]));
 const labs=result.summary.map(s=>s.lot+'<br>'+s.target);
 Plotly.react('agreementBars',[{type:'bar',x:labs,y:result.summary.map(s=>s.lidar_reported_ng_per_dose),name:'LIDAR',marker:{color:'#176b83'}},{type:'bar',x:labs,y:result.summary.map(s=>s.sybr_reported_ng_per_dose),name:'SYBR',marker:{color:'#238b35'}}],{height:490,title:{text:corrected?'Quantities after correction':'Uncorrected quantities',font:{size:20}},barmode:'group',margin:{l:80,r:20,t:60,b:130},legend:{orientation:'h',y:-.28},yaxis:{title:{text:'Plasmid-equivalent ng/dose'},rangemode:'tozero'},xaxis:{title:{text:'Vaccine lot and target'}}},{responsive:true,displaylogo:false});
 const field=corrected?'model_ng_per_dose':'raw_ng_per_dose',tr=[];
 for(const s of result.summary){const l=result.all.filter(r=>r.row===s.row&&r.channel===s.lidar_channel&&Number.isFinite(r[field])),ss=result.all.filter(r=>r.row===s.row&&r.channel==='SYBR'&&Number.isFinite(r[field]));const pairs=l.map(r=>[r,ss.find(z=>z.column===r.column)]).filter(p=>p[1]);tr.push({x:pairs.map(p=>p[0][field]),y:pairs.map(p=>p[1][field]),text:pairs.map(p=>p[0].bp+' bp · '+p[0].well),name:s.lot+' · '+s.target,mode:'markers',marker:{size:10,color:s.lot==='EN9581'?'#176b83':'#a23d7a',symbol:s.target==='Spike'?'circle':'diamond'},hovertemplate:'%{text}<br>LIDAR %{x:.3g}<br>SYBR %{y:.3g}<extra>%{fullData.name}</extra>'});}
 const max=Math.max(1,...tr.flatMap(t=>t.x.concat(t.y)))*1.08;
 tr.push({x:[0,max],y:[0,max],name:'Equal estimates',mode:'lines',line:{color:'#78838b',width:2,dash:'dot'}});
 Plotly.react('agreementScatter',tr,{height:490,title:{text:'Paired assay estimates',font:{size:20}},margin:{l:80,r:20,t:60,b:130},legend:{orientation:'h',y:-.28},xaxis:{title:{text:'LIDAR plasmid-equivalent ng/dose'},range:[0,max]},yaxis:{title:{text:'SYBR plasmid-equivalent ng/dose'},range:[0,max]}},{responsive:true,displaylogo:false});
 $('agreementMethod').innerHTML='<p>Default shared lengths: Spike 72, 87, 106, 152, 197 and 258 bp; Ori 65, 75, 85, 105, 145 and 197 bp. Nominal 50/90 bp flags and historical calibration QC are retained. The 66-bp Spike assay is omitted from both reporters because its SYBR calibration failed. Medians summarize assay estimates; assays are not biological replicates. Reporter agreement alone does not establish absolute accuracy.</p>'+table(['Lot / target','Reporter','Fitted λ /bp','Applied λ /bp','Correction status'],result.fits.map(f=>[rows[f.row],f.ch,fmt(f.lambda),fmt(f.applied_lambda),f.reason==='Nonpositive length-decay slope'?'0% correction applied':f.ok?(f.low<=0?'Positive fit; interval includes zero':'Positive fit'):f.reason]))+'<p>Negative fitted slopes are retained in the download; only the applied correction is set to zero. Missing data, incomplete observed ranges and invalid inputs do not silently receive zero correction.</p>';
}
$('downloadagreement').onclick=()=>{drawAgreement();download('EN9581_FL8095_reporter_agreement_V21.csv',csv(agreementLatest),'text/csv');};

function drawNoSybrSummary(){
 const result=agreementResults();agreementLatest=result.summary;
 $('agreementInputs').textContent=result.error||('Threshold '+fmt(numeric('threshold'))+' RFU; baseline '+fmt(numeric('baseline'))+' cycles. '+($('matched').checked?'Same six accepted lengths per target as the SYBR plate.':'All accepted LIDAR calibrations.'));
 $('agreementTable').innerHTML=table(['Lot','Target','Raw ng/dose','Reported ng/dose','Lengths used'],result.summary.map(s=>[s.lot,s.target,fmt(s.lidar_raw_ng_per_dose),fmt(s.lidar_reported_ng_per_dose),s.lidar_n]));
 Plotly.react('agreementBars',[{type:'bar',x:result.summary.map(s=>s.lot+'<br>'+s.target),y:result.summary.map(s=>s.lidar_reported_ng_per_dose),name:'LIDAR',marker:{color:'#176b83'}}],{height:490,title:{text:$('poisson').checked?'Quantities after correction':'Uncorrected quantities'},margin:{l:85,r:25,t:65,b:95},yaxis:{title:{text:'Plasmid-equivalent ng/dose'},rangemode:'tozero'}},{responsive:true,displaylogo:false});
 $('agreementMethod').innerHTML=table(['Lot / target','Reporter','Fitted λ /bp','Applied λ /bp','Status'],result.fits.map(f=>[rows[f.row],f.ch,fmt(f.lambda),fmt(f.applied_lambda),f.reason==='Nonpositive length-decay slope'?'0% correction applied':f.ok?(f.low<=0?'Positive fit; interval includes zero':'Positive fit'):f.reason]));
}
function sampleRows(){return DATA.sampleRows||'ABCD';}
function referenceWells(row,col){return DATA.duplex?DATA.controlRows.map(r=>r+col):[pairs[row]+col];}
function referenceCq(ch,row,col){const values=referenceWells(row,col).map(w=>cq(ch,w));return values.every(Number.isFinite)?mean(values):null;}
function duplexResults(){
 const answer=calculate(settings(),$('effmode').value,$('poisson').checked),field=$('poisson').checked?'model_ng_per_dose':'raw_ng_per_dose',summary=[];
 for(const row of sampleRows())for(const ch of ['CY5','Quasar']){
  const all=answer.all.filter(r=>r.row===row&&r.channel===ch),rr=all.filter(r=>r.raw!==null);
  if(!all.length)continue;
  summary.push({row,condition:rows[row],target:targets[ch],channel:ch,lengths_used:rr.length,raw_ng_per_dose:median(rr.map(r=>r.raw_ng_per_dose)),reported_ng_per_dose:median(rr.map(r=>r[field])),control:'Mean Cq of E/F',correction_enabled:$('poisson').checked});
 }
 return {...answer,summary};
}
function drawDuplexSummary(){
 const result=duplexResults();agreementLatest=result.summary;
 $('agreementInputs').textContent=result.error||('Threshold '+fmt(numeric('threshold'))+' RFU; baseline '+fmt(numeric('baseline'))+' cycles. Duplicate sample rows are reported separately; both gBlock controls must cross threshold. '+($('matched').checked?'Default six-length selection retained.':'All accepted LIDAR calibrations.'));
 $('agreementTable').innerHTML=table(['Row / condition','Target','Raw ng/dose','Reported ng/dose','Lengths used'],result.summary.map(s=>[s.row+' · '+s.condition,s.target,fmt(s.raw_ng_per_dose),fmt(s.reported_ng_per_dose),s.lengths_used]));
 Plotly.react('agreementBars',['CY5','Quasar'].map(ch=>({type:'bar',x:result.summary.filter(s=>s.channel===ch).map(s=>s.row+' · '+s.condition),y:result.summary.filter(s=>s.channel===ch).map(s=>s.reported_ng_per_dose),name:targets[ch]+' LIDAR',marker:{color:colors[ch]}})),{height:540,barmode:'group',title:{text:$('poisson').checked?'Quantities after correction':'Uncorrected quantities'},margin:{l:85,r:25,t:70,b:180},yaxis:{title:{text:'Plasmid-equivalent ng/dose'},rangemode:'tozero'},legend:{orientation:'h',y:1.1}},{responsive:true,displaylogo:false});
 $('agreementMethod').innerHTML='<p>SYBR is retained for traces, melts and replicate comparisons. A–F combine two products; G/H lack same-plate single-target SYBR gBlock controls. No SYBR concentration is inferred. The mean E/F Cq is a geometric-mean reference in copy space. Each sample row has a separate length fit; G/H use mixed-target controls, so single-versus-mixed reaction differences may affect their estimates.</p>'+table(['Row','Target','Fitted λ /bp','Applied λ /bp','Status'],result.fits.map(f=>[f.row,targets[f.ch],fmt(f.lambda),fmt(f.applied_lambda),f.reason==='Nonpositive length-decay slope'?'0% correction applied':f.ok?(f.low<=0?'Positive fit; interval includes zero':'Positive fit'):f.reason]));
}
let replicateLatest=[];
function replicateResults(){
 if(!DATA.duplex)return {summary:[],details:[],single:[]};
 const details=[],summary=[],single=[];
 for(const pair of ['AB','CD','EF'])for(const ch of channels()){
  const rr=[];
  for(let c=1;c<=11;c++){
   if(flagged(c))continue;
   const x=cq(ch,pair[0]+c),y=cq(ch,pair[1]+c);
   const rec={kind:'duplicate',rows:pair,channel:ch,column:c,aligned_bp:assayLengthLabel(ch,pair[0],c),first_Cq:x,second_Cq:y,second_minus_first_Cq:Number.isFinite(x)&&Number.isFinite(y)?y-x:null};details.push(rec);
   if(rec.second_minus_first_Cq!==null)rr.push(rec);
  }
  const x=rr.map(r=>r.first_Cq),y=rr.map(r=>r.second_Cq),mx=mean(x),my=mean(y),ssx=x.reduce((s,v)=>s+(v-mx)**2,0),ssy=y.reduce((s,v)=>s+(v-my)**2,0),sxy=x.reduce((s,v,i)=>s+(v-mx)*(y[i]-my),0);
  summary.push({rows:pair,channel:ch,n:rr.length,median_difference:median(rr.map(r=>r.second_minus_first_Cq)),median_absolute_difference:median(rr.map(r=>Math.abs(r.second_minus_first_Cq))),maximum_absolute_difference:rr.length?Math.max(...rr.map(r=>Math.abs(r.second_minus_first_Cq))):null,r2:ssx&&ssy?sxy*sxy/(ssx*ssy):null});
 }
 for(const [row,ch] of [['G','CY5'],['H','Quasar']])for(let c=1;c<=11;c++){
  if(flagged(c))continue;
  const singleCq=cq(ch,row+c),mix=[cq(ch,'A'+c),cq(ch,'B'+c)],mixedCq=mix.every(Number.isFinite)?mean(mix):null;
  single.push({kind:'single versus mixed',rows:row+'/AB',channel:ch,column:c,aligned_bp:mapping(ch,c,row).bp,first_Cq:mixedCq,second_Cq:singleCq,second_minus_first_Cq:Number.isFinite(singleCq)&&Number.isFinite(mixedCq)?singleCq-mixedCq:null});
 }
 return {summary,details,single};
}
function drawReproducibility(result){
 const points=result.details.filter(r=>Number.isFinite(r.first_Cq)&&Number.isFinite(r.second_Cq));
 const values=points.flatMap(r=>[r.first_Cq,r.second_Cq]);
 const range=values.length?[Math.floor(Math.min(...values)-1),Math.ceil(Math.max(...values)+1)]:[0,40];
 const groups={AB:{name:'EN9581 · A/B',color:'#176b83',symbol:'circle'},CD:{name:'FL8095 · C/D',color:'#a23d7a',symbol:'diamond'},EF:{name:'gBlock · E/F',color:'#6c7032',symbol:'square'}};
 for(const ch of ['CY5','Quasar','SYBR']){
  const traces=[{x:range,y:range,mode:'lines',name:'Exact agreement',showlegend:false,hoverinfo:'skip',line:{color:'#555',width:2,dash:'dash'}}];
  for(const [pair,g] of Object.entries(groups)){
   const rr=points.filter(r=>r.rows===pair&&r.channel===ch),s=result.summary.find(r=>r.rows===pair&&r.channel===ch);
   traces.push({x:rr.map(r=>r.first_Cq),y:rr.map(r=>r.second_Cq),customdata:rr.map(r=>[pair[0]+r.column+' / '+pair[1]+r.column,r.aligned_bp,r.second_minus_first_Cq]),name:g.name+' · R² '+(Number.isFinite(s?.r2)?s.r2.toFixed(3):'—'),mode:'markers',marker:{size:11,color:g.color,symbol:g.symbol,line:{color:'#fff',width:1}},hovertemplate:'%{customdata[0]} · %{customdata[1]}<br>Replicate 1: %{x:.3f} Cq<br>Replicate 2: %{y:.3f} Cq<br>ΔCq: %{customdata[2]:.3f}<extra>%{fullData.name}</extra>'});
  }
  Plotly.react('repro'+ch,traces,{height:560,title:{text:ch==='CY5'?'Cy5 · Spike':ch==='Quasar'?'Quasar 705 · Ori':'SYBR · combined signal',font:{size:19}},margin:{l:70,r:20,t:60,b:155},xaxis:{title:{text:'Replicate 1 Cq'},range,constrain:'domain'},yaxis:{title:{text:'Replicate 2 Cq'},range,scaleanchor:'x',scaleratio:1,constrain:'domain'},legend:{orientation:'h',y:-.23,x:0,font:{size:12}},hovermode:'closest',paper_bgcolor:'#fff',plot_bgcolor:'#fff'},{responsive:true,displaylogo:false,toImageButtonOptions:{format:'png',scale:3,filename:'LIDAR_reproducibility_'+ch}});
 }
}
function drawReplicates(){if(!DATA.duplex)return;
 if(!DATA.duplex){drawReproducibility({details:[],summary:[]});$('replicateIntro').textContent='Select the S+O+SYBR duplicate run to view this comparison.';$('replicateTable').innerHTML='';$('replicateDetails').innerHTML='';Plotly.react('replicatePlot',[],{});Plotly.react('singlePlot',[],{});return;}
 const result=replicateResults();drawReproducibility(result);replicateLatest=result.details.concat(result.single);
 $('replicateIntro').textContent='A/B: EN9581; C/D: FL8095; E/F: mixed gBlock. G/H: EN9581 Spike/Ori alone. Nine lengths per channel are shown after the inherited nominal 50/90-bp exclusions; historical calibration filters are not needed for these Cq comparisons. Positive differences mean the second row is later. R² measures association across lengths, while absolute Cq differences measure repeatability.';
 $('replicateTable').innerHTML=table(['Row pair','Channel','Paired lengths','Median ΔCq','Median |ΔCq|','Largest |ΔCq|','R²'],result.summary.map(s=>[s.rows,s.channel,s.n,fmt(s.median_difference),fmt(s.median_absolute_difference),fmt(s.maximum_absolute_difference),fmt(s.r2)]));
 const traces=result.summary.map(s=>{const rr=result.details.filter(r=>r.rows===s.rows&&r.channel===s.channel&&r.second_minus_first_Cq!==null);return {x:rr.map(r=>r.column),y:rr.map(r=>r.second_minus_first_Cq),text:rr.map(r=>r.aligned_bp),name:s.rows+' · '+s.channel,mode:'lines+markers',line:{color:colors[s.channel],width:3,dash:s.rows==='AB'?'solid':s.rows==='CD'?'dash':'dot'},hovertemplate:'Column %{x} · %{text}<br>ΔCq %{y:.3f}<extra>%{fullData.name}</extra>'};});
 const lay={height:510,margin:{l:75,r:25,t:65,b:130},legend:{orientation:'h',y:-.25},xaxis:{title:{text:'Amplicon column'}},yaxis:{title:{text:'Cq(second row) − Cq(first row)'},zeroline:true,zerolinecolor:'#777'}};
 Plotly.react('replicatePlot',traces,{...lay,title:{text:'Duplicate differences'}},{responsive:true,displaylogo:false});
 Plotly.react('singlePlot',['CY5','Quasar'].map(ch=>{const rr=result.single.filter(r=>r.channel===ch&&r.second_minus_first_Cq!==null);return{x:rr.map(r=>r.aligned_bp),y:rr.map(r=>r.second_minus_first_Cq),name:targets[ch],mode:'lines+markers',line:{color:colors[ch],width:3}};}),{...lay,title:{text:'EN9581: single-target versus S+O'},xaxis:{title:{text:'Aligned amplicon length (bp)'}},yaxis:{title:{text:'Cq(single) − mean Cq(A/B)'},zeroline:true,zerolinecolor:'#777'}},{responsive:true,displaylogo:false});
 $('replicateDetails').innerHTML=table(['Comparison','Rows','Channel','Column','Aligned bp','First Cq','Second Cq','ΔCq'],replicateLatest.map(r=>[r.kind,r.rows,r.channel,r.column,r.aligned_bp,fmt(r.first_Cq),fmt(r.second_Cq),fmt(r.second_minus_first_Cq)]));
}
$('downloadreplicates').onclick=()=>{drawReplicates();download('EN9581_FL8095_duplex_replicates_V21.csv',csv(replicateLatest),'text/csv');};

function staticContent(){
$('stockMeasurementTable').innerHTML=table(['Method / source','Spike (ng/µl)','Ori (ng/µl)'],BUNDLE.stockConcentrations.sources.map(s=>[s.method,s.Spike,s.Ori]).concat([['Arithmetic mean — calculator default',BUNDLE.stockConcentrations.means.Spike,BUNDLE.stockConcentrations.means.Ori]]));
if(DATA.duplex){$('platekey').innerHTML=table(['Row','Condition','Reference'],Object.entries(rows).map(([r,t])=>[r,t,sampleRows().includes(r)?'Mean Cq of E/F, target channel':'Duplicate mixed-gBlock control']))+'<p>'+esc(DATA.protocolNote)+'</p>';}else{
$('platekey').innerHTML=table(['Row','Template / assay','Concentration reference'],Object.entries(rows).map(([r,t])=>[r,t,pairs[r]?'Matched to row '+pairs[r]:'Known gBlock input']))+'<p>Cy5 reports Spike; Quasar 705 reports Ori. Both reporters are LIDAR. Rows G and H were unused. Column 12 is NTC. A/E and C/E compare Spike; B/F and D/F compare Ori. '+(DATA.hasSybr?'SYBR in each well reports its single assigned target.':'The green scan is background only; no SYBR dye was added.')+' No independent technical replicates are declared.</p><p>'+esc(DATA.protocolNote)+'</p>';
}
if(DATA.dilutionSeries)$('platekey').innerHTML=table(['Row','Condition','Reference'],Object.entries(rows).map(([r,t])=>[r,t,sampleRows().includes(r)?'Same-channel row D':r==='E'?'NTC across every column':'gBlock control']))+'<p>'+esc(DATA.protocolNote)+'</p>';
$('seqtable').innerHTML=table(['Target','Column','Oligo name','Instrument bp label','Aligned bp','Reference start–end','Forward 5′→3′','Reverse 5′→3′'],Object.entries(DATA.amplicons).flatMap(([t,a])=>a.map(m=>[t,m.column,m.name,m.column===1?45:m.nominal,m.bp,m.start+'–'+m.end,m.forward,m.reverse])));
$('sources').innerHTML='<h3>Original exports</h3>'+DATA.files.map(f=>'<p><a href="'+esc(f.url)+'">'+esc(f.name)+'</a><br><code>SHA-256 '+f.sha256+'</code></p>').join('');
$('metadata').innerHTML=table(['Field','Value'],DATA.metadata.filter(r=>r.some(x=>x!==null)).map(r=>r.filter(x=>x!==null)));
$('caltable').innerHTML='<p>'+esc(DATA.efficiencyNote)+'</p>'+table(['Source','Channel','Target','Nominal assay bp','E','R²','n','QC status'],DATA.calibrationSourceIndices.flatMap(i=>BUNDLE.historicalStandards[i].assays.map(a=>[BUNDLE.historicalStandards[i].title,a.channel,a.target,a.size_bp,fmt(10**(-1/a.slope)),fmt(a.r2),a.n,a.ok?'Passed':a.flags.join('; ')])));
$('calcmethod').innerHTML='<p>Cq is the first upward crossing of the selected RFU threshold after subtracting the mean of the first baseline cycles. Copies = reference copies × E^(control Cq − sample Cq). Reference copies = target-specific stock ng/µl ÷ dilution × template µl × Avogadro / (working bp × 660 × 10⁹).</p><p>LIDAR retains the dual-LIDAR calibration; SYBR uses the paired target/SYBR calibrations. Missing or failed calibrations receive no automatic concentration estimate. Matching lengths requires acceptance by both reporter calibrations. Nominal 50 and 90 bp assays are bench-excluded; QC-failing historical assays are excluded even in explicit common-factor mode. Raw Cqs remain visible. The manual factor is an assumption, not a measured efficiency.</p><p>The fitted Poisson model regresses −ln(copies) against aligned bp, with a minimum of four accepted lengths. Each copy estimate is corrected by exp(λ × bp). Nonpositive slopes apply 0% correction and retain the raw quantity. Incomplete observed ranges remain unavailable for correction. Slope confidence intervals describe conditional OLS uncertainty only; they omit uncertainty in efficiency, standard concentration, preparation and recovery. A slope interval including zero does not support a well-resolved finite decay length.</p><p>Copy counts convert to plasmid-equivalent mass using the declared plasmid length, then to neat-vaccine concentration using sample volume and dilution, and finally to dose using dose volume. This assay-specific equivalent mass is not a direct measurement of total DNA. No result is rescaled to force equimolarity between plasmid regions. NTCs are visible controls and are never used as concentration standards.</p>';
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
$('downloadstandards').onclick=()=>download('EN9581_historical_standard_curves_V21.csv',csv(standardPointRecords()),'text/csv');
$('downloadstandardtraces').onclick=()=>{const rr=[];for(const s of DATA.historicalStandards)for(const kind of ['amp','melt'])for(const [ch,d] of Object.entries(s[kind]))for(const [well,y] of Object.entries(d.w))y.forEach((rfu,i)=>rr.push({source:s.key,kind,channel:ch,well,x:d.x[i],RFU:rfu}));download('EN9581_historical_traces_V21.csv',csv(rr),'text/csv');};

function redraw(){if(currentTab==='dilution')drawDilution();if(currentTab==='replicates')drawReplicates();if(currentTab==='agreement')drawAgreement();if(currentTab==='traces')drawTraces();if(currentTab==='size')drawSize();if(currentTab==='dna')drawDNA();if(currentTab==='standards')drawStandards();}
let surfaceRun=null;
// Display-only: consume existing calculated quantities without refitting or averaging.
function surfaceSampleKey(r){return DATA.dilutionSeries||DATA.duplex?r.row:rows[r.row].split(' · ')[0];}
function surfaceReporter(r){return (r.channel==='CY5'?'Cy5 LIDAR':r.channel==='Quasar'?'Quasar 705 LIDAR':r.channel==='SYBR'?'SYBR':r.channel+' TaqMan')+' · '+r.target;}
function drawDNASurface(records){
 const select=$('surfaceSample'),mode=$('surfaceMode');
 const keys=[...new Set(records.map(surfaceSampleKey))];
 if(surfaceRun!==DATA.id||!keys.includes(select.value)){
  select.innerHTML=keys.map(k=>'<option value="'+esc(k)+'">'+esc(DATA.dilutionSeries?'Vaccine 1:'+DATA.rowDilutions[k].toLocaleString()+' · row '+k:DATA.duplex?rows[k]+' · row '+k:k)+'</option>').join('');
  select.value=keys[0]||'';surfaceRun=DATA.id;
 }
 mode.querySelector('option[value="model"]').disabled=!!DATA.dilutionSeries;
 if(DATA.dilutionSeries)mode.value='raw';
 const field=DATA.dilutionSeries?'uncorrected_ng_per_dose':mode.value==='model'?'model_ng_per_dose':'raw_ng_per_dose';
 const chosen=records.filter(r=>surfaceSampleKey(r)===select.value);
 const valid=r=>Number.isFinite(r[field])&&r[field]>0&&Number.isFinite(r.bp);
 const labels=[...new Set(chosen.filter(valid).map(surfaceReporter))].sort((a,b)=>{
  const order=['Cy5 LIDAR · Spike','FAM TaqMan · Spike','SYBR · Spike','Quasar 705 LIDAR · Ori','HEX TaqMan · Ori','SYBR · Ori'];return order.indexOf(a)-order.indexOf(b);
 });
 const cols=[...new Set(chosen.map(r=>r.column))].sort((a,b)=>a-b);
 const xx=[],yy=[],zz=[],traces=[];
 labels.forEach((label,yi)=>{
  const rr=chosen.filter(r=>surfaceReporter(r)===label),byCol=new Map(rr.map(r=>[r.column,r]));
  xx.push(cols.map(c=>byCol.get(c)?.bp??null));yy.push(cols.map(()=>yi));zz.push(cols.map(c=>{const r=byCol.get(c);return r&&valid(r)?r[field]:null;}));
  const vv=rr.filter(valid);
  traces.push({type:'scatter3d',mode:'lines+markers',name:label,x:cols.map(c=>byCol.get(c)?.bp??null),y:cols.map(()=>yi),z:zz[yi],connectgaps:false,line:{color:colors[rr[0].channel],width:5},marker:{color:colors[rr[0].channel],size:4},customdata:cols.map(c=>{const r=byCol.get(c);return r?[r.well,r.control||r.control_well,r.warning||r.reason||r.model_reason||'']:['','',''];}),hovertemplate:esc(label)+'<br>%{x} bp<br>%{z:.4g} ng/dose<br>Sample %{customdata[0]} / control %{customdata[1]}<br>%{customdata[2]}<extra></extra>'});
 });
 if(labels.length>=2&&cols.length>=2)traces.unshift({type:'surface',name:'Quantity surface',x:xx,y:yy,z:zz,connectgaps:false,colorscale:'Viridis',opacity:0.68,showscale:false,hoverinfo:'skip',showlegend:false});
 const values=chosen.filter(valid).map(r=>r[field]),lengths=chosen.filter(valid).map(r=>r.bp);
 if(lengths.length){const lo=Math.min(...lengths),hi=Math.max(...lengths),ylo=-.16,yhi=Math.max(.16,labels.length-1+.16);traces.push({type:'scatter3d',mode:'lines',name:'10 ng/dose',x:[lo,hi,hi,lo,lo],y:[ylo,ylo,yhi,yhi,ylo],z:[10,10,10,10,10],line:{color:'#c22',width:4},hovertemplate:'10 ng/dose reference<extra></extra>'});}
 const log=$('surfaceScale').value==='log',bounds=[10,...values],top=Math.max(...bounds),low=Math.min(...bounds);
 const zaxis={title:{text:'Plasmid-equivalent ng/dose'},type:log?'log':'linear',range:log?[Math.log10(low)-.15,Math.log10(top)+.15]:[0,top*1.08],tickformat:'.3g'};
 $('surfaceNote').textContent=(DATA.dilutionSeries?'Uncorrected estimates; no Poisson correction is applied to these dilution plates. ':mode.value==='model'?'Uses the existing corrected estimates; nonpositive decay slopes retain their raw values. ':'Uses the existing uncorrected estimates. ')+(DATA.hasSybr&&(DATA.duplex||DATA.dilutionSeries)?'Mixed-target SYBR cannot be assigned separate target quantities and is omitted. ':'')+(values.length?'Showing '+values.length+' calculated assay values.':'No eligible quantities for this selection.');
 Plotly.react('dnaSurfacePlot',traces,{height:680,title:{text:'Amplicon length × reporter × DNA quantity',font:{size:19}},margin:{l:10,r:10,t:55,b:65},scene:{xaxis:{title:{text:'Aligned amplicon length (bp)'}},yaxis:{title:{text:'Reporter / target'},tickvals:labels.map((_,i)=>i),ticktext:labels,tickfont:{size:11},range:[-.3,Math.max(.3,labels.length-.7)]},zaxis,aspectmode:'manual',aspectratio:{x:1.5,y:1,z:1},camera:{eye:{x:1.65,y:1.8,z:1.15}},dragmode:'orbit',uirevision:DATA.id+'|'+select.value},legend:{orientation:'h',x:0,y:-.07,font:{size:12}},paper_bgcolor:'#fff',annotations:values.length?[]:[{text:'No eligible quantities',xref:'paper',yref:'paper',x:.5,y:.5,showarrow:false}]},{responsive:true,displaylogo:false,scrollZoom:true,toImageButtonOptions:{format:'png',scale:2,filename:'LIDAR_DNA_3D'}});
}
$('surfaceReset').onclick=()=>Plotly.relayout('dnaSurfacePlot',{'scene.camera':{eye:{x:1.65,y:1.8,z:1.15}}});

$('tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{currentTab=b.dataset.tab;for(const id of ['dilution','replicates','agreement','traces','size','dna','standards','seq','methods','batch','about'])$(id).hidden=id!==currentTab;$('tabs').querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));redraw();});
for(const e of document.querySelectorAll('input,select'))e.addEventListener('change',redraw);
$('downloadcsv').onclick=()=>{drawDNA();download('EN9581_calculations_V21.csv',csv(latest.map(r=>({...r,display_poisson:$('poisson').checked,version:BUNDLE.version,run_id:DATA.id}))),'text/csv');};
$('downloadjson').onclick=()=>download('EN9581_data_V21.json',JSON.stringify(BUNDLE,null,2),'application/json');
$('downloadalign').onclick=()=>download('EN9581_amplicon_alignment_V21.csv',csv(Object.entries(DATA.amplicons).flatMap(([target,a])=>a.map(m=>({target,column:m.column,oligo:m.name,nominal_bp:m.nominal,aligned_bp:m.bp,start:m.start,end:m.end,forward:m.forward,reverse:m.reverse})))),'text/csv');
$('downloadraw').onclick=()=>{const rr=[];for(const kind of ['amp','melt'])for(const [ch,d] of Object.entries(DATA[kind]))for(const [well,yy] of Object.entries(d.w))yy.forEach((rfu,i)=>rr.push({run_id:DATA.id,kind,channel:ch,well,x:d.x[i],RFU:rfu}));download('EN9581_'+DATA.id+'_raw_traces_V21.csv',csv(rr),'text/csv');};
// Run switching changes data, controls and provenance together. Confirmation
// from the new preparation must never unlock the original run's row G.
const runInputs={};let activeRun=null;
function selectRun(index){
 if(activeRun!==null)runInputs[activeRun]=settings();
 DATA={...BUNDLE,...BUNDLE.runs[index]};activeRun=index;
 rows=DATA.rowLabels||{A:'EN9581 · Spike',B:'EN9581 · Ori',C:'FL8095 · Spike',D:'FL8095 · Ori',E:'gBlock · Spike',F:'gBlock · Ori'};pairs=DATA.sampleToControl||{A:'E',B:'F',C:'E',D:'F'};

 const inputs=runInputs[index]||DATA.defaults;
 for(const [id,value] of Object.entries(inputs))if($(id))$(id).value=value;
 $('runselect').value=String(index);
 $('runsummary').textContent=DATA.title+' · '+(Object.keys(rows).length*12)+' wells · '+(DATA.hasSybr?'Cy5 Spike, Quasar 705 Ori and SYBR':'Cy5 Spike and Quasar 705 Ori')+' · self-contained offline viewer';
 // Dilution labels follow the selected run, rather than the original plate.
 $('traceRunName').textContent=DATA.title+' · both vaccines 1:'+DATA.defaults.vdil.toLocaleString()+'; gBlocks 1:'+DATA.defaults.gdil.toLocaleString();
 $('runprotocol').textContent=DATA.protocolNote;
 $('dnaintro').textContent=DATA.efficiencyNote;
 $('dualNote').textContent=DATA.concentrationNote;
 $('methodPreparation').textContent=DATA.protocolNote;
 $('runMethodDetail').textContent=DATA.methodDetail||DATA.protocolNote;
 $('runResultNote').textContent=DATA.resultNote||'';
 $('runResultNote').hidden=!DATA.resultNote;
 $('arrayRunNote').textContent=DATA.hasSybr?'Selected run: SYBR + Cy5 + Quasar 705; no TaqMan.':'Selected run: Cy5 + Quasar 705; no SYBR or TaqMan.';
 $('sybrlabel').hidden=!DATA.amp.SYBR;$('sybr').checked=DATA.hasSybr;
 $('greenChannelLabel').textContent=DATA.hasSybr?'SYBR · intercalator':'Green scan · no SYBR dye (background)';
 $('agreementTitle').textContent=DATA.hasSybr?'SYBR and LIDAR on the same plate':'LIDAR quantities · no SYBR plate';
 $('agreementIntro').textContent=DATA.hasSybr?'Each reporter uses its own historical efficiency and the same-length gBlock control. The default comparison uses six shared accepted assays per target. All values are plasmid-equivalent ng/dose.':'This plate contains no SYBR dye. Only Cy5 Spike and Quasar Ori are quantified. Switch to the SYBR plate to view within-well reporter agreement. The default length selection is held constant between plates.';
 $('standardrun').value=String(DATA.calibrationSourceIndices[0]);
 $('standardUseNote').textContent=DATA.efficiencyNote+' Viewing another reference source does not change that assignment.';
 if(DATA.duplex){$('agreementTitle').textContent='Target-resolved LIDAR quantities';$('agreementIntro').textContent='Mixed-well SYBR is not a target-specific concentration measurement. Cy5 and Quasar estimates are shown separately for each row, using the mean Cq of the two gBlock control wells.';}
 $('dnaLegacy').hidden=!!DATA.dilutionSeries;
 $('dnaDilution').hidden=!DATA.dilutionSeries;
 $('dilutionAvailable').hidden=!DATA.dilutionSeries;
 $('dilutionUnavailable').hidden=!!DATA.dilutionSeries;
 $('replicateAvailable').hidden=!DATA.duplex;
 $('replicateUnavailable').hidden=!!DATA.duplex;
 $('agreementLegacy').hidden=!!DATA.dilutionSeries;
 $('taqagreement').hidden=!(DATA.dilutionSeries&&DATA.amp.FAM&&DATA.amp.HEX);
 $('agreementUnavailable').hidden=!(DATA.dilutionSeries&&!(DATA.amp.FAM&&DATA.amp.HEX));
 selected=new Set(DATA.duplex?['A7','B7','G7','H7']:['A7','C7','E7']);latest=[];
 staticContent();plate();

 $('famlabel').hidden=!DATA.amp.FAM;$('hexlabel').hidden=!DATA.amp.HEX;

 if(DATA.dilutionSeries){
  $('runsummary').textContent=DATA.title+' · 60 wells · '+rawChannels().join(', ');
  $('traceRunName').textContent=DATA.title+' · A 1:1,000; B 1:100; C 1:10; D gBlock 1:20,000; E NTC';
  $('arrayRunNote').textContent=DATA.hasSybr?'Mixed-target SYBR with Cy5 and Quasar LIDAR.':'FAM Spike and HEX Ori TaqMan with Cy5 and Quasar LIDAR.';
  selected=new Set(['A7','B7','C7','D7','E7']);plate();
 }
 for(const id of ['dilution','replicates','agreement','traces','size','dna','standards','seq','methods','batch','about'])$(id).hidden=id!==currentTab;
 $('tabs').querySelectorAll('button').forEach(button=>button.classList.toggle('active',button.dataset.tab===currentTab));
 redraw();
}
// Separate dilution-series calculation: no global vaccine dilution or
// historical per-assay calibration is transferred into these estimates.
function dilutionResults(){
 const details=[],summary=[];
 if(!DATA.dilutionSeries)return {details,summary};
 for(const ch of channels().filter(c=>c!=='SYBR'))for(const row of 'CBA'){
  const target=targets[ch],stock=BUNDLE.stockConcentrations.means[target],dilution=DATA.rowDilutions[row],records=[];
  for(let col=7;col<=11;col++){
   const sample=cq(ch,row+col),control=cq(ch,'D'+col),ntc=cq(ch,'E'+col);
   const mass=Number.isFinite(sample)&&Number.isFinite(control)?stock/20000*(7824/400)*dilution*300*2**(control-sample):null;
   const warnings=[];
   if(sample===null||control===null)warnings.push('No accepted sample or control crossing');
   if(control>=38)warnings.push('Control crosses at or after cycle 38');
   if(Number.isFinite(ntc))warnings.push('NTC crosses at '+fmt(ntc)+'; sample–NTC separation '+fmt(ntc-sample)+' cycles');
   const r={run_id:DATA.id,channel:ch,target,row,well:row+col,control_well:'D'+col,column:col,bp:mapping(ch,col,row).bp,vaccine_dilution:dilution,gblock_dilution:20000,stock_ng_per_uL:stock,gblock_bp:400,plasmid_bp:7824,dose_uL:300,sample_uL:2,control_uL:2,E:2,threshold:numeric('threshold'),baseline:numeric('baseline'),sample_Cq:sample,control_Cq:control,NTC_Cq:ntc,uncorrected_ng_per_dose:mass,poisson_applied:false,warning:warnings.join('; ')};
   records.push(r);details.push(r);
  }
  summary.push({channel:ch,target,row,dilution,median_ng_per_dose:median(records.map(r=>r.uncorrected_ng_per_dose)),accepted:records.filter(r=>Number.isFinite(r.uncorrected_ng_per_dose)).length,late_controls:records.filter(r=>r.control_Cq>=38).length});
 }
 return {details,summary};
}
function drawDilution(){
 if(!DATA.dilutionSeries)return;
 const result=dilutionResults(),chs=channels().filter(ch=>ch!=='SYBR');
 $('dilutionIntro').textContent=DATA.title+'. A: vaccine 1:1,000; B: 1:100; C: 1:10; D: mixed gBlock 1:20,000 of each target; E and every column 12: NTC. Both DNA inputs are 2 µl. Current threshold '+fmt(numeric('threshold'))+' RFU; baseline '+fmt(numeric('baseline'))+' cycles.';
 $('dilutionQC').textContent=(DATA.hasSybr?'SYBR E5 has target-channel amplification around cycles 30–32; nominal 90 bp has the known early Cy5 dimer.':'FAM column 4 is gradual baseline drift, including in the NTC: its raw traces remain visible, but its crossings are excluded. HEX D10/D11 controls cross near cycle 40; estimates using these are exploratory. Nominal 90 bp retains the known dimer flag.')+' Other target-channel NTC crossings are listed below. The two dilution plates used different cyclers. No technical replicates are declared.';
 $('dilutionTable').innerHTML=table(['Reporter / target','1:10 · C (ng/dose)','1:100 · B (ng/dose)','1:1,000 · A (ng/dose)','Lengths contributing C/B/A'],chs.map(ch=>{
  const r='CBA'.split('').map(row=>result.summary.find(x=>x.channel===ch&&x.row===row));return [ch+' · '+targets[ch],...r.map(x=>fmt(x.median_ng_per_dose)),r.map(x=>x.accepted+'/5').join(' / ')];
 }));
 const curves=[];
 for(const ch of channels())for(let col=1;col<=11;col++){
  if(flagged(col)||(ch==='FAM'&&col===4))continue;
  const y='CBA'.split('').map(row=>cq(ch,row+col));if(!y.some(Number.isFinite))continue;
  curves.push({x:[10,100,1000],y,name:ch+' · '+assayLengthLabel(ch,'C',col),mode:'lines+markers',line:{color:colors[ch],width:2},marker:{size:6},connectgaps:false});
 }
 Plotly.react('dilutionCqPlot',curves,{height:540,title:{text:'Cq versus vaccine dilution'},margin:{l:65,r:20,t:65,b:65},xaxis:{type:'log',tickvals:[10,100,1000],ticktext:['1:10','1:100','1:1,000'],title:{text:'Vaccine dilution'}},yaxis:{title:{text:'Cq'}},showlegend:false,hovermode:'closest'},{responsive:true,displaylogo:false});
 traceKey('dilutionCqPlot',curves);
 const quants=[];
 for(const ch of chs)for(const row of 'CBA'){
  const rr=result.details.filter(r=>r.channel===ch&&r.row===row);
  quants.push({x:rr.map(r=>r.bp),y:rr.map(r=>r.uncorrected_ng_per_dose),name:ch+' · 1:'+DATA.rowDilutions[row],mode:'lines+markers',line:{color:colors[ch],width:3,dash:row==='C'?'solid':row==='B'?'dash':'dot'},text:rr.map(r=>r.well+' / '+r.control_well+' '+r.warning),hovertemplate:'%{text}<br>%{x} bp<br>%{y:.3g} ng/dose<extra>%{fullData.name}</extra>'});
 }
 const scale=$('dilutionScale').value,values=quants.flatMap(t=>t.y).filter(v=>Number.isFinite(v)&&v>0),clipped=values.filter(v=>v>200).length;
 const axis={title:{text:'Plasmid-equivalent ng / 300 µl dose'}};
 if(scale==='full'){axis.range=[0,Math.max(200,...values)*1.06];axis.rangemode='tozero';}
 else if(scale==='log'){axis.type='log';axis.range=[Math.log10(Math.min(5,...values))-.08,Math.log10(Math.max(200,...values))+.08];axis.dtick='D1';}
 else {axis.range=[0,200];axis.tickvals=[0,10,50,100,150,200];}
 $('dilutionScaleNote').textContent=scale==='focus'?clipped+' estimates exceed 200 ng/dose and are outside this focused view. Select Full linear range or Logarithmic to see them.':'All positive estimates shown. The red line marks 10 ng/dose.';
 Plotly.react('dilutionQuantPlot',quants,{height:540,title:{text:'Uncorrected quantities by amplicon'},margin:{l:75,r:20,t:65,b:65},xaxis:{title:{text:'Aligned amplicon length (bp)'}},yaxis:axis,showlegend:false,shapes:[{type:'line',xref:'paper',x0:0,x1:1,y0:10,y1:10,line:{color:'#c22',width:3}}],annotations:[{xref:'paper',x:0.01,xanchor:'left',yref:'y',y:scale==='log'?1:10,yanchor:'bottom',yshift:4,text:'10 ng/dose',showarrow:false,font:{color:'#b11',size:14},bgcolor:'rgba(255,255,255,.92)'}]},{responsive:true,displaylogo:false});
 traceKey('dilutionQuantPlot',quants);
 $('dilutionMethod').textContent='Common amplification factor E = 2 (assumption). ng/dose = target stock / 20,000 × (7,824 / 400) × row vaccine dilution × 300 × 2^(Cq gBlock − Cq vaccine). Equal 2 µl sample and control inputs cancel. Stock means: Spike 1.47375 and Ori 1.01 ng/µl. Five shared columns 7–11 are used to compare both reporters beyond the short-amplicon probe-site constraints. Other assays remain in Traces and Size series. Medians are calculated only from finite sample/control pairs; missing crossings remain unavailable. NTC signals are displayed, not subtracted. These are plasmid-equivalent masses, not direct total-DNA measurements.';
 $('dilutionDetails').innerHTML=table(['Row','Reporter','bp','Sample Cq','Control Cq','ng/dose','Notes'],result.details.map(r=>[r.row,r.channel,r.bp,fmt(r.sample_Cq),fmt(r.control_Cq),fmt(r.uncorrected_ng_per_dose),r.warning]));
 const ntcs=[];
 for(const ch of channels())for(const w of Object.keys(DATA.amp[ch].w))if(ntcWell(w)){
  const raw=rawCq(ch,w),accepted=cq(ch,w);if(Number.isFinite(raw))ntcs.push([w,ch,fmt(accepted),accepted===null?'Baseline drift; raw crossing '+fmt(raw):Number(w.slice(1))===6?'Known nominal 90 bp flag':'Inspect raw trace and melt']);
 }
 $('dilutionNTCs').innerHTML=table(['Well','Reporter','Accepted Cq','Notes'],ntcs);
 drawDNASurface(result.details);
}
 $('downloadDilution').onclick=()=>download('EN9581_'+DATA.dilutionKey+'_dilution_quantities_V21.csv',csv(dilutionResults().details),'text/csv');

function pairedReporterResults(){
 const run=BUNDLE.runs.find(r=>r.dilutionKey==='taqman'), details=[],summary=[],steps=[];
 const read=(ch,w)=>{const d=run.amp[ch],y=d.w[w];return y?crossing(d.x,baseline(y,Math.floor(numeric('baseline'))),numeric('threshold')):null;};
 for(const [target,lidar,probe] of [['Spike','CY5','FAM'],['Ori','Quasar','HEX']]){
  for(const row of 'CBA'){
   const rr=[];
   for(let col=7;col<=11;col++){
    const lc=read(lidar,row+col),tc=read(probe,row+col),ld=read(lidar,'D'+col),td=read(probe,'D'+col);
    const factor=BUNDLE.stockConcentrations.means[target]/20000*(7824/400)*run.rowDilutions[row]*300;
    const l=Number.isFinite(lc)&&Number.isFinite(ld)?factor*2**(ld-lc):null,t=Number.isFinite(tc)&&Number.isFinite(td)?factor*2**(td-tc):null;
    const rec={target,row,well:row+col,control:'D'+col,column:col,bp:BUNDLE.amplicons[target][col-1].bp,dilution:run.rowDilutions[row],lidar_channel:lidar,taqman_channel:probe,lidar_Cq:lc,taqman_Cq:tc,lidar_control_Cq:ld,taqman_control_Cq:td,lidar_ng_per_dose:l,taqman_ng_per_dose:t,taqman_to_lidar:l>0&&t>0?t/l:null,late_control:ld>=38||td>=38,threshold:numeric('threshold'),baseline:numeric('baseline'),E:2,poisson_applied:false};
    details.push(rec);if(l>0&&t>0)rr.push(rec);
   }
   summary.push({target,row,dilution:run.rowDilutions[row],n:rr.length,lidar:median(rr.map(r=>r.lidar_ng_per_dose)),taqman:median(rr.map(r=>r.taqman_ng_per_dose)),fold:median(rr.map(r=>r.taqman_to_lidar)),late:rr.filter(r=>r.late_control).length});
  }
  for(let col=7;col<=11;col++)for(const [low,high] of [['C','B'],['B','A']]){
   const x=[read(lidar,low+col),read(lidar,high+col)],y=[read(probe,low+col),read(probe,high+col)];
   if([...x,...y].every(Number.isFinite))steps.push({target,column:col,step:low+' → '+high,lidar:x[1]-x[0],taqman:y[1]-y[0],difference:y[1]-y[0]-(x[1]-x[0])});
  }
 }
 return {details,summary,steps};
}
function drawTaqAgreement(){
 const result=pairedReporterResults();
 $('taqAgreeIntro').textContent='Same-well comparison on the selected 20 October TaqMan + LIDAR plate: FAM versus Cy5 for Spike, and HEX versus Quasar 705 for Ori. Each reporter uses its own same-length D-row gBlock Cq. Current threshold '+fmt(numeric('threshold'))+' RFU; baseline '+fmt(numeric('baseline'))+' cycles.';
 $('taqAgreeTable').innerHTML=table(['Target','Vaccine dilution','Paired lengths','LIDAR ng/dose','TaqMan ng/dose','Median paired TaqMan/LIDAR','Late control pairs'],result.summary.map(r=>[r.target,'1:'+r.dilution,r.n+'/5',fmt(r.lidar),fmt(r.taqman),fmt(r.fold)+'×',r.late]));
 for(const target of ['Spike','Ori']){
  const rr=result.details.filter(r=>r.target===target&&r.lidar_ng_per_dose>0&&r.taqman_ng_per_dose>0),values=rr.flatMap(r=>[r.lidar_ng_per_dose,r.taqman_ng_per_dose]);
  const range=values.length?[Math.floor(Math.log10(Math.min(...values))*.5)/.5,Math.ceil(Math.log10(Math.max(...values))*.5)/.5]:[0,3];
  // Equal logarithmic ranges preserve the y=x identity relationship.
  const lo=values.length?Math.log10(Math.min(...values))-.12:0,hi=values.length?Math.log10(Math.max(...values))+.12:3;
  const traces=[{x:[10**lo,10**hi],y:[10**lo,10**hi],name:'Equal estimates',mode:'lines',line:{color:'#666',width:2,dash:'dash'},hoverinfo:'skip'}];
  for(const row of 'CBA'){
   const pts=rr.filter(r=>r.row===row);
   traces.push({x:pts.map(r=>r.lidar_ng_per_dose),y:pts.map(r=>r.taqman_ng_per_dose),name:'1:'+({C:10,B:100,A:1000}[row]),mode:'markers',marker:{size:11,color:({C:'#176b83',B:'#a23d7a',A:'#b47a00'}[row]),symbol:pts.map(r=>r.late_control?'circle-open':'circle'),line:{width:2}},text:pts.map(r=>r.well+' · '+r.bp+' bp · '+fmt(r.taqman_to_lidar)+'×'+(r.late_control?' · control ≥38 Cq':'')),hovertemplate:'%{text}<br>LIDAR %{x:.3g}<br>TaqMan %{y:.3g} ng/dose<extra>%{fullData.name}</extra>'});
  }
  Plotly.react('taqAgree'+target,traces,{height:530,title:{text:target+' · paired quantities'},margin:{l:85,r:25,t:65,b:110},xaxis:{type:'log',range:[lo,hi],dtick:'D1',title:{text:'LIDAR ng/dose'}},yaxis:{type:'log',range:[lo,hi],dtick:'D1',title:{text:'TaqMan ng/dose'},scaleanchor:'x',scaleratio:1},legend:{orientation:'h',y:-.24}},{responsive:true,displaylogo:false});
 }
 $('taqStepSummary').innerHTML=table(['Target','Paired dilution steps','Median |TaqMan − LIDAR| (Cq)'],['Spike','Ori'].map(target=>{const rr=result.steps.filter(r=>r.target===target);return [target,rr.length,fmt(median(rr.map(r=>Math.abs(r.difference))))];}));
 $('taqAgreeDetails').innerHTML=table(['Target','Well','bp','LIDAR Cq','TaqMan Cq','LIDAR control Cq','TaqMan control Cq','TaqMan/LIDAR'],result.details.map(r=>[r.target,r.well,r.bp,fmt(r.lidar_Cq),fmt(r.taqman_Cq),fmt(r.lidar_control_Cq),fmt(r.taqman_control_Cq),fmt(r.taqman_to_lidar)]));
}
$('downloadTaqAgreement').onclick=()=>download('Oct20_TaqMan_LIDAR_agreement_V21.csv',csv(pairedReporterResults().details),'text/csv');

$('runselect').innerHTML=BUNDLE.runs.map((r,i)=>'<option value="'+i+'">'+esc(r.title)+'</option>').join('');
$('runselect').addEventListener('change',()=>selectRun(Number($('runselect').value)));
selectRun(BUNDLE.defaultRun);

