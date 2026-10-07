// These are experimental expression rules, not a validated cognitive-load model.
export function expressionScore(values, baseline) {
  const excess = key => Math.max(0, (values[key] || 0) - (baseline[key] || 0));
  const brow = (excess('browDownLeft') + excess('browDownRight')) / 2;
  const squint = (excess('eyeSquintLeft') + excess('eyeSquintRight')) / 2;
  return Math.min(100, Math.max(0, (0.65 * brow + 0.35 * squint) * 200));
}
export function averageSamples(samples) {
  const keys = ['browDownLeft','browDownRight','eyeSquintLeft','eyeSquintRight'];
  return Object.fromEntries(keys.map(key=>[key, samples.reduce((sum,s)=>sum+(s[key]||0),0)/Math.max(samples.length,1)]));
}
export class SustainedTrigger {
  constructor(){this.reset();}
  reset(){this.since=null; this.last=null;}
  update(score, now, threshold, eligible, holdMs=3000){
    // A long frame gap must not count as observed, sustained expression.
    if(this.last !== null && now-this.last > 1000) this.since=null;
    this.last=now;
    if(!eligible || score<threshold){this.since=null;return {trigger:false,progress:0};}
    if(this.since===null)this.since=now;
    const progress=Math.min(1,(now-this.since)/holdMs);
    return {trigger:progress>=1,progress};
  }
}
export function parseVtt(text){
  const stamp = s => {
    const fields=s.replace(',','.').split(':').map(Number);
    if(fields.length<2||fields.length>3||fields.some(x=>!Number.isFinite(x)||x<0)||fields.at(-1)>=60||fields.at(-2)>=60)return NaN;
    return fields.reduce((v,n)=>v*60+n,0);
  };
  const cues=[];
  for(const block of text.replace(/\r/g,'').split(/\n\s*\n/)){
    const lines=block.trim().split('\n');
    if(/^(NOTE|STYLE|REGION)(\s|$)/.test(lines[0]))continue;
    const idx=lines.findIndex(line=>line.includes('-->'));
    if(idx<0)continue;
    const match=lines[idx].match(/([\d:.,]+)\s*-->\s*([\d:.,]+)/);
    if(!match)continue;
    const start=stamp(match[1]),end=stamp(match[2]);
    const entities={'&amp;':'&','&lt;':'<','&gt;':'>','&nbsp;':' ','&quot;':'"','&#39;':"'"};
    const content=lines.slice(idx+1).join(' ').replace(/<[^>]*>/g,'').replace(/&(?:amp|lt|gt|nbsp|quot|#39);/g,m=>entities[m]).trim();
    if(Number.isFinite(start)&&Number.isFinite(end)&&start>=0&&end>start&&content)cues.push({start,end,text:content});
  }
  return cues.sort((a,b)=>a.start-b.start);
}
export function contextAt(cues, time, seconds=30){
  return cues.filter(c=>c.end>Math.max(0,time-seconds)&&c.start<=time).map(c=>c.text).join(' ').slice(-12000);
}
export function cuesToVtt(cues){
  const stamp=t=>{const n=Math.round(t*1000);return `${Math.floor(n/3600000).toString().padStart(2,'0')}:${Math.floor(n/60000)%60<10?'0':''}${Math.floor(n/60000)%60}:${Math.floor(n/1000)%60<10?'0':''}${Math.floor(n/1000)%60}.${(n%1000).toString().padStart(3,'0')}`;};
  return 'WEBVTT\n\n'+cues.map(c=>`${stamp(c.start)} --> ${stamp(c.end)}\n${c.text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}\n`).join('\n');
}
export function clock(s){if(!Number.isFinite(s))return '00:00'; const n=Math.max(0,Math.floor(s));return `${Math.floor(n/60).toString().padStart(2,'0')}:${(n%60).toString().padStart(2,'0')}`;}
