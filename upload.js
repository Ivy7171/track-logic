document.getElementById('upload-toggle').addEventListener('click',()=>{const area=document.getElementById('upload-area');const opening=area.hidden;area.hidden=!opening;document.getElementById('upload-toggle').setAttribute('aria-expanded',String(opening));document.querySelector('#upload-toggle strong').textContent=opening?'Analyze your audio file −':'Preview an audio file +';});
"use strict";
(() => {
const form=document.querySelector('#upload-form');
const status=document.querySelector('#upload-status');
const results=document.querySelector('#own-results');
const button=document.querySelector('#upload-button');
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
form.addEventListener('submit',async (e)=>{
  e.preventDefault();results.hidden=true;
  const file=document.querySelector('#own-audio').files[0];
  if(!file){status.textContent='Please choose your audio file.';return}
  if(file.size>12*1024*1024){status.textContent='File is too large. Choose one under 12 MB.';return}
  if(!document.querySelector('#rights').checked){status.textContent='Please confirm permission to analyze this recording.';return}
  button.disabled=true;status.textContent='Running Essentia audio analysis. This may take a moment on free hosting…';
  try{
    const resp=await fetch('/api/analyze',{method:'POST',body:new FormData(form),cache:'no-store',credentials:'omit'});
    const result=await resp.json();
    if(!resp.ok)throw new Error(typeof result.detail==='string'?result.detail:'Analysis failed.');
    const f=result.features,c=result.comparison;
    results.innerHTML=`<div class="analysis-card"><span class="eyebrow">ESSENTIA AUDIO RESULTS</span><h3>${escape(result.title)}</h3><p>${escape(result.genre)} • ${escape(f.duration_seconds)} seconds analyzed</p><div class="own-grid"><div><b>${escape(f.bpm)} BPM</b><span>Measured tempo</span></div><div><b>${escape(f.key)} ${escape(f.scale)}</b><span>Estimated musical key</span></div></div><h3>Compared with our study</h3><p><strong>${escape(c.tempo)}</strong></p><p>Average tempo: ${escape(c.hit_bpm)} BPM for ${escape(c.hit_count)} hits, compared with ${escape(c.nonhit_bpm)} BPM for ${escape(c.nonhit_count)} non-hits in ${escape(result.genre)}.</p><p>${escape(c.key_note)}</p><div class="next"><div><strong>WHAT SHOULD THE ARTIST DO NEXT?</strong><p>${escape(c.what_it_means)}</p></div></div><details><summary>Why aren't mood and danceability scored?</summary><p>${escape(c.limitations)}</p></details><p class="mini">Research-based comparisons, not a probability of commercial success.</p></div>`;
    results.hidden=false;status.textContent='Your audio analysis is complete.';results.scrollIntoView({behavior:'smooth',block:'start'});
  }catch(err){status.textContent=err.message||'Analysis failed.';}
  finally{button.disabled=false;}
});
})();
