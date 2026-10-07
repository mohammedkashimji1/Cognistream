import {useEffect,useMemo,useRef,useState} from 'react';
import VisionPanel from './components/VisionPanel';
import Icon from './components/Icon';
import {clock,contextAt,cuesToVtt,parseVtt,SustainedTrigger} from './core';

const SAMPLE='/media/demo.mp4?v=2',TITLE='Neural networks, made simple';
const readEvents=()=>{try{const data=JSON.parse(localStorage.getItem('cognistream.events.v1')||'[]');return Array.isArray(data)?data.filter(e=>e&&typeof e.id==='string'&&Number.isFinite(e.time)&&['manual','automatic','demo'].includes(e.reason)).slice(-200):[];}catch{return [];}};
const modeLabel=mode=>mode==='gemini'?'Live Gemini explanation':mode==='prepared'?'Prepared sample explanation':'Transcript excerpt · fallback';

export default function App(){
  const captionTrack=useRef(null),player=useRef(null),trigger=useRef(new SustainedTrigger()),coolUntil=useRef(0),modalRef=useRef(null),guideRef=useRef(false);
  const request=useRef(null),objectUrl=useRef(null),assetsRequest=useRef(null),modalBox=useRef(null),priorFocus=useRef(null),transcriptList=useRef(null),transcriptInput=useRef(null);
  const [score,setScore]=useState(0),[progress,setProgress]=useState(0),[threshold,setThreshold]=useState(45),[autoPause,setAutoPause]=useState(true),[vision,setVision]=useState('off');
  const [playing,setPlaying]=useState(false),[time,setTime]=useState(0),[duration,setDuration]=useState(0),[cooldown,setCooldown]=useState(0),[rate,setRate]=useState(1),[ended,setEnded]=useState(false);
  const [src,setSrc]=useState(SAMPLE),[title,setTitle]=useState(TITLE),[lessonId,setLessonId]=useState('demo'),[lesson,setLesson]=useState(null);
  const [cues,setCues]=useState([]),[transcriptName,setTranscriptName]=useState('Loading matched transcript…'),[fileError,setFileError]=useState(''),[captionUrl,setCaptionUrl]=useState(''),[captions,setCaptions]=useState(true);
  const [modal,setModal]=useState(null),[busy,setBusy]=useState(false),[answer,setAnswer]=useState(null),[guide,setGuide]=useState(false);
  const [health,setHealth]=useState(null),[backendError,setBackendError]=useState(''),[events,setEvents]=useState(readEvents),[tab,setTab]=useState('transcript'),[follow,setFollow]=useState(true),[assetOpen,setAssetOpen]=useState(false);
  guideRef.current=guide;
  const isSample=src===SAMPLE,currentContext=useMemo(()=>contextAt(cues,time),[cues,time]);
  const currentCue=cues.findIndex(c=>c.start<=time&&c.end>time);
  const chapters=isSample?(lesson?.chapters||[]):[];
  const chapterIndex=Math.max(0,chapters.findLastIndex(c=>c.start<=time)),chapter=chapters[chapterIndex];
  const percent=duration?Math.min(100,time/duration*100):0;
  const counts=useMemo(()=>({automatic:events.filter(e=>e.reason==='automatic').length,manual:events.filter(e=>e.reason==='manual').length,demo:events.filter(e=>e.reason==='demo').length}),[events]);
  useEffect(()=>{try{localStorage.setItem('cognistream.events.v1',JSON.stringify(events));}catch{}},[events]);
  useEffect(()=>{
    if(!cues.length){setCaptionUrl('');return;}
    const url=URL.createObjectURL(new Blob([cuesToVtt(cues)],{type:'text/vtt'}));setCaptionUrl(url);
    return()=>URL.revokeObjectURL(url);
  },[cues]);
  const applyCaptions=()=>{if(player.current)for(const track of player.current.textTracks)track.mode=track===captionTrack.current?.track&&captions?'showing':'disabled';};
  useEffect(()=>{applyCaptions();},[captions,captionUrl]);
  useEffect(()=>{if(player.current)player.current.playbackRate=rate;},[rate,src]);
  useEffect(()=>{
    if(follow&&tab==='transcript'&&currentCue>=0){const row=transcriptList.current?.querySelector(`[data-cue="${currentCue}"]`);const list=transcriptList.current;if(row&&list)list.scrollTo?.({top:Math.max(0,row.offsetTop-list.clientHeight/2+row.clientHeight/2),behavior:'smooth'});}
  },[currentCue,follow,tab]);
  const loadSampleAssets=async()=>{
    assetsRequest.current?.abort();const controller=new AbortController();assetsRequest.current=controller;setCues([]);setTranscriptName('Loading matched transcript…');
    try{
      const [subtitle,manifest]=await Promise.all([fetch('/media/demo.vtt?v=2',{signal:controller.signal}),fetch('/media/lesson.json?v=2',{signal:controller.signal})]);
      if(!subtitle.ok||!manifest.ok)throw Error('The sample lesson files are missing. Extract the complete updated ZIP.');
      const [text,data]=await Promise.all([subtitle.text(),manifest.json()]);if(controller.signal.aborted)return;
      const parsed=parseVtt(text);if(!parsed.length||!Array.isArray(data.chapters)||!data.chapters.length)throw Error('Sample lesson data is invalid.');
      setCues(parsed);setLesson(data);setTranscriptName('Matched transcript · English');
    }catch(e){if(e.name!=='AbortError'){setFileError(e.message);setTranscriptName('Transcript unavailable');}}
  };
  const checkBackend=async()=>{
    try{const response=await fetch('/api/health',{signal:AbortSignal.timeout(5000)});if(!response.ok)throw Error();setHealth(await response.json());setBackendError('');}
    catch{setHealth(null);setBackendError('The Python server is not responding. Restart it in your backend terminal, then select Retry.');}
  };
  useEffect(()=>{
    loadSampleAssets();checkBackend();const timer=setInterval(()=>setCooldown(Math.max(0,Math.ceil((coolUntil.current-performance.now())/1000))),250);
    const hidden=()=>{if(document.hidden){trigger.current.reset();setProgress(0);}};document.addEventListener('visibilitychange',hidden);
    return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',hidden);request.current?.abort();assetsRequest.current?.abort();if(objectUrl.current)URL.revokeObjectURL(objectUrl.current);};
  },[]);
  useEffect(()=>{trigger.current.reset();setProgress(0);},[threshold,autoPause]);
  useEffect(()=>{if(modal||guide){priorFocus.current=document.activeElement;modalBox.current?.focus();}else priorFocus.current?.focus();},[Boolean(modal||guide)]);
  const resetTrigger=()=>{trigger.current.reset();setProgress(0);setScore(0);};
  const fetchExplanation=async data=>{
    request.current?.abort();const controller=new AbortController();request.current=controller;setBusy(true);setAnswer(null);
    setModal(m=>m?.id===data.id?{...m,error:'',result:null}:m);
    const timeout=setTimeout(()=>controller.abort(),25000);
    try{
      const response=await fetch('/api/explain',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({context:data.context,video_time:data.time,lesson_id:data.lessonId,reason:data.reason})});
      if(!response.ok)throw Error(response.status===422?'The transcript or timestamp could not be used. Check your matching subtitle file.':`The server returned ${response.status}. Restart the backend and retry.`);
      const result=await response.json();if(typeof result.explanation!=='string')throw Error('The server returned an incomplete explanation.');
      if(!controller.signal.aborted)setModal(m=>m?.id===data.id?{...m,result}:m);
    }catch(e){if(modalRef.current===data.id)setModal(m=>m?.id===data.id?{...m,error:e.name==='AbortError'?'The explanation request timed out. Check your server and internet, then retry.':e.message}:m);}
    finally{clearTimeout(timeout);if(request.current===controller){setBusy(false);request.current=null;}}
  };
  const ask=reason=>{
    if(modalRef.current||guideRef.current)return;
    const stamp=player.current?.currentTime||0,context=contextAt(cues,stamp);player.current?.pause();resetTrigger();
    const id=crypto.randomUUID(),data={id,reason,time:stamp,context,lessonId,result:null,error:''};modalRef.current=id;
    setEvents(previous=>[...previous,{id,reason,time:stamp,created:new Date().toISOString(),lesson:title}].slice(-200));setModal(data);setAnswer(null);
    if(!context){setModal({...data,error:cues.length?'The transcript has no spoken caption at this moment. Play or jump to a transcript line, then ask again.':'No matching transcript is available at this timestamp. Load a matching VTT or SRT file to enable learning support.'});return;}
    fetchExplanation(data);
  };
  const close=async resume=>{
    request.current?.abort();request.current=null;setBusy(false);modalRef.current=null;setModal(null);resetTrigger();coolUntil.current=performance.now()+10000;setCooldown(10);
    if(resume){try{await player.current?.play();}catch{setFileError('Playback was blocked. Select Play lesson to continue.');}}
  };
  const onSample=sample=>{
    setScore(sample.score);
    const eligible=autoPause&&sample.face&&sample.calibrated&&player.current&&!player.current.paused&&!player.current.ended&&!document.hidden&&!modalRef.current&&!guideRef.current&&sample.now>=coolUntil.current;
    const state=trigger.current.update(sample.score,sample.now,threshold,eligible);setProgress(state.progress);
    if(state.trigger){trigger.current.reset();ask('automatic');}
  };
  const switchLesson=(source,name,id)=>{
    request.current?.abort();request.current=null;setBusy(false);modalRef.current=null;setModal(null);player.current?.pause();setPlaying(false);resetTrigger();
    setTime(0);setDuration(0);setEnded(false);setFileError('');setSrc(source);setTitle(name);setLessonId(id);coolUntil.current=0;setCooldown(0);
  };
  const useDemo=()=>{
    if(objectUrl.current){URL.revokeObjectURL(objectUrl.current);objectUrl.current=null;}switchLesson(SAMPLE,TITLE,'demo');loadSampleAssets();setAssetOpen(false);
    if(player.current&&src===SAMPLE){player.current.currentTime=0;player.current.load();}
  };
  const uploadVideo=e=>{
    const file=e.target.files?.[0];e.target.value='';if(!file)return;
    assetsRequest.current?.abort();if(objectUrl.current)URL.revokeObjectURL(objectUrl.current);objectUrl.current=URL.createObjectURL(file);
    switchLesson(objectUrl.current,file.name,'custom');setCues([]);setTranscriptName('Add the matching VTT or SRT transcript');
  };
  const uploadTranscript=async e=>{
    const file=e.target.files?.[0];e.target.value='';if(!file)return;assetsRequest.current?.abort();const guard=new AbortController();assetsRequest.current=guard;
    if(file.size>2_000_000){setFileError('Use a transcript smaller than 2 MB.');return;}
    try{const parsed=parseVtt(await file.text());if(guard.signal.aborted)return;if(!parsed.length)throw Error('No valid timestamped captions found. Choose VTT or SRT instead of plain text.');setCues(parsed);setTranscriptName(file.name);setLessonId('custom');setFileError('');}
    catch(e){if(!guard.signal.aborted)setFileError('Could not read the transcript. '+e.message);}
  };
  const togglePlayback=async()=>{
    if(!player.current)return;
    if(!player.current.paused){player.current.pause();return;}
    if(player.current.ended)player.current.currentTime=0;
    try{await player.current.play();}catch{setFileError('The video could not start. Try its native play button or load a compatible MP4.');}
  };
  const seek=stamp=>{if(!player.current)return;player.current.currentTime=Math.min(Math.max(0,stamp),Number.isFinite(player.current.duration)?player.current.duration:stamp);setTime(player.current.currentTime);trigger.current.reset();setProgress(0);};
  const openGuide=()=>{player.current?.pause();trigger.current.reset();setProgress(0);setGuide(true);};
  const exportSession=()=>{
    const blob=new Blob([JSON.stringify({project:'CogniStream',version:'0.2.0',exported_at:new Date().toISOString(),threshold,events},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='cognistream-session.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  const trapFocus=e=>{
    if(e.key==='Escape'){e.preventDefault();guide?setGuide(false):close(false);}
    if(e.key==='Tab'){const items=[...modalBox.current.querySelectorAll('button:not(:disabled),summary,input,select,a[href]')].filter(el=>el.getAttribute('tabindex')!=='-1');const first=items[0],last=items.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===modalBox.current)){e.preventDefault();last?.focus();}else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===modalBox.current)){e.preventDefault();first?.focus();}}
  };
  const supportChapter=modal?.lessonId==='demo'?lesson?.chapters?.findLast(c=>c.start<=modal.time):null;
  return <div className="app-shell">
    <aside className="sidebar"><a href="#workspace" className="brand"><span className="brand-mark"><Icon name="play" size={23}/></span><span>CogniStream<small>SPACE TO UNDERSTAND</small></span></a><div className="nav-caption">LEARNING SPACE</div><a className="nav-item selected" href="#workspace"><Icon name="book"/> Study room</a><a className="nav-item" href="#session"><Icon name="activity"/> Session activity</a><button className="nav-item" onClick={openGuide}><Icon name="help"/> Getting started</button>
      <div className="sidebar-art"><div className="orbit o1"/><div className="orbit o2"/><div className="orbit o3"/><span><Icon name="spark" size={32}/></span><p>Learning has its own pace.<br/><strong>Make it yours.</strong></p></div><div className="sidebar-project"><span>REVIEW 2 · PROTOTYPE</span><p>Jawwad · Kashimji · Umair</p><small>CSE / AIML</small></div>
    </aside>
    <main id="workspace"><header className="topbar"><span>Workspace <Icon name="chevron" size={13}/> <strong>Study room</strong></span><div className="header-actions"><button className="text-button" onClick={openGuide}><Icon name="help" size={17}/> How to use</button><span className="avatar" title="Project team">CS</span></div></header>
      <div className="content"><div className="page-heading"><div><span className="eyebrow">YOUR PERSONAL LEARNING STUDIO</span><h1>A little clarity. A lot of progress.</h1><p>Watch, understand, and continue at your own pace.</p></div><span className="privacy-pill"><Icon name="shield" size={16}/> Camera stays on your device</span></div>
      <div className="setup-strip"><div className={`setup-step ${cues.length?'complete':''}`}><span>{cues.length?<Icon name="check" size={15}/>:1}</span><div><strong>Your lesson is ready</strong><small>{isSample?'Narration + matching transcript':'Your local video'}</small></div></div><div className={`setup-step ${vision==='ready'?'complete':''}`}><span>{vision==='ready'?<Icon name="check" size={15}/>:2}</span><div><strong>{vision==='ready'?'Camera calibrated':'Enable your companion'}</strong><small>Optional · 5-second calibration</small></div></div><div className={`setup-step ${playing?'complete':''}`}><span>{playing?<Icon name="check" size={15}/>:3}</span><div><strong>{playing?'You’re learning':'Start learning'}</strong><small>You can watch without a camera</small></div></div></div>
      {backendError&&<div className="error banner" role="alert"><span>{backendError}</span><button className="secondary" onClick={checkBackend}>Retry</button></div>}{fileError&&<div className="error banner" role="alert"><span>{fileError}</span><button className="square-button" onClick={()=>setFileError('')} aria-label="Dismiss error"><Icon name="close"/></button></div>}
      <div className="workspace-grid"><div className="lesson-column"><section className="panel lesson-panel"><div className="lesson-heading"><div><div className="course-tags"><span>AI & MACHINE LEARNING</span><span className="level-tag">Beginner</span></div><h2>{title}</h2><p><Icon name="volume" size={14}/>{isSample?'English narration':'Local lecture'}<span>·</span><Icon name="clock" size={14}/>{duration?`${Math.ceil(duration/60)} min`:'Loading…'}<span>·</span>{isSample?'6 chapters':transcriptName}</p></div><button className="square-button" onClick={()=>setAssetOpen(!assetOpen)} aria-label="Load your own lecture" title="Load your own lecture"><Icon name="upload"/></button></div>
        <div className="video-stage"><video key={src+captionUrl} ref={player} src={src} poster={isSample?'/media/poster.jpg?v=2':undefined} controls playsInline preload="metadata" onPlay={()=>{setPlaying(true);setEnded(false);}} onPause={()=>{setPlaying(false);trigger.current.reset();setProgress(0);}} onEnded={()=>{setPlaying(false);setEnded(true);resetTrigger();}} onSeeking={()=>{trigger.current.reset();setProgress(0);}} onTimeUpdate={()=>setTime(player.current.currentTime)} onLoadedMetadata={()=>{setPlaying(false);setTime(player.current.currentTime);setDuration(player.current.duration);player.current.playbackRate=rate;applyCaptions();}} onError={()=>setFileError('This video could not load. Restore the sample or choose a browser-compatible MP4.')}>{captionUrl&&<track ref={captionTrack} key={captionUrl} kind="captions" src={captionUrl} srcLang="en" label="English" default={captions} onLoad={applyCaptions}/>}</video></div>
        <div className="playback-toolbar"><div className="playback-left"><button className="primary play-button" onClick={togglePlayback}><Icon name={playing?'pause':'play'} size={16}/>{playing?'Pause lesson':ended?'Replay lesson':'Play lesson'}</button><button className="square-button" onClick={()=>seek(time-10)} title="Go back 10 seconds" aria-label="Rewind 10 seconds"><Icon name="skip" size={18}/></button><span className="play-time">{clock(time)} <small>/ {clock(duration)}</small></span></div><div className="playback-options"><label className="speed-label"><span className="sr-only">Playback speed</span><select aria-label="Playback speed" value={rate} onChange={e=>setRate(Number(e.target.value))}><option value="0.75">0.75×</option><option value="1">1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label><button className={`caption-button ${captions?'active':''}`} disabled={!cues.length} aria-pressed={captions} aria-label="Toggle captions" title="Toggle captions" onClick={()=>setCaptions(!captions)}>CC</button></div></div>
        <div className="help-bar"><div><span className="soft-icon"><Icon name="spark" size={20}/></span><div><strong>Need another way to understand?</strong><p>Get a short explanation of the part you just watched.</p></div></div><button className="help-button" onClick={()=>ask('manual')}>Help me understand <Icon name="arrow" size={17}/></button></div>
        {assetOpen&&<div className="asset-controls"><strong>Bring your own lecture</strong><p>Select a video, then add its matching VTT or SRT transcript. Files stay local.</p><div><label className="upload-button"><Icon name="upload" size={15}/> Choose video<input type="file" accept="video/*" onChange={uploadVideo}/></label><label className="upload-button"><Icon name="book" size={15}/> Choose transcript<input ref={transcriptInput} type="file" accept=".vtt,.srt" onChange={uploadTranscript}/></label><button className="text-button" onClick={useDemo}>Restore sample</button></div><small>{transcriptName}</small></div>}
      </section>
      {chapters.length>0&&<section className="chapter-section"><div className="section-line"><h3>In this lesson</h3><span>{chapterIndex+1} of {chapters.length} chapters</span></div><div className="chapter-grid">{chapters.map((c,i)=><button key={c.title} className={`chapter ${i===chapterIndex?'current':''} ${i<chapterIndex?'visited':''}`} onClick={()=>seek(c.start)} aria-current={i===chapterIndex?'step':undefined}><span>{i<chapterIndex?<Icon name="check" size={13}/>:String(i+1).padStart(2,'0')}</span><div><strong>{c.title}</strong><small>{clock(c.start)}</small></div>{i===chapterIndex&&<span className="chapter-now"/>}</button>)}</div></section>}
      {ended&&<div className="completion-note"><Icon name="check" size={18}/><div><strong>You reached the end of the lesson.</strong><p>Revisit any chapter or replay the lecture to strengthen your understanding.</p></div></div>}
      <section className="panel context-panel"><div className="tab-bar"><button className={tab==='transcript'?'active':''} onClick={()=>setTab('transcript')}><Icon name="book" size={16}/> Transcript</button><button className={tab==='about'?'active':''} onClick={()=>setTab('about')}>Lesson overview</button><button className={tab==='demo'?'active':''} onClick={()=>setTab('demo')}>Review demo</button></div>
        {tab==='transcript'?<><div className="context-heading"><span>{cues.length} timestamped captions <span className="transcript-language">English</span></span><label className="follow-label"><input type="checkbox" checked={follow} onChange={e=>setFollow(e.target.checked)}/> Follow playback</label></div><div className="transcript-lines" ref={transcriptList}>{cues.length?cues.map((c,i)=><button key={`${c.start}-${i}`} data-cue={i} className={`transcript-row ${currentCue===i?'current':''}`} onClick={()=>seek(c.start+.01)}><time>{clock(c.start)}</time><span>{c.text}</span>{currentCue===i&&<span className="reading-dot"/>}</button>):<div className="empty-transcript"><Icon name="book" size={24}/><p>{transcriptName}</p><button className="secondary" onClick={()=>setAssetOpen(true)}>Add a matching transcript</button></div>}</div><div className="context-footer"><Icon name="shield" size={13}/> Learning support uses the previous 30 seconds of transcript text.{cues.length>0&&<a href={lessonId==='demo'?'/media/lecture-transcript.txt':captionUrl} download={lessonId==='demo'?'lecture-transcript.txt':'lecture-captions.vtt'}><Icon name="download" size={13}/> Transcript</a>}</div></>:tab==='about'?<div className="overview-content"><span className="eyebrow">WHAT YOU’LL LEARN</span><h3>{isSample?'From examples to predictions':'Your own lecture, at your own pace'}</h3><p>{isSample?'Learn how neural networks receive inputs, transform values, measure error, and update their weights. Finish by understanding why we test on new examples.':'Watch your selected video and use a matching transcript for context-based support.'}</p><div className="overview-chips">{(isSample?['Inputs & layers','Weights & activation','Loss','Backpropagation','Generalisation']:['Local video','Matching captions','Learning support']).map(text=><span key={text}>{text}</span>)}</div>{isSample&&<p className="fineprint">Original educational slides and script with synthetic English narration. Prepared sample notes are available without a live AI key.</p>}</div>:<div className="demo-content"><span className="eyebrow">PRESENTATION TOOLS</span><h3>Demonstrate the intervention pipeline</h3><p>For an actual automatic pause, enable the camera, calibrate normally, play the lesson, and hold the selected facial cues above your threshold for three seconds.</p><button className="secondary" disabled={!playing} onClick={()=>ask('demo')}><Icon name="play" size={15}/> Simulate intervention · demo only</button><p className="fineprint">This simulation is logged separately. It demonstrates pause → context → help, not facial detection accuracy.</p></div>}
      </section></div>
      <div className="companion-column"><VisionPanel onSample={onSample} onReset={resetTrigger} onState={setVision} running={playing} score={score} progress={progress} threshold={threshold} setThreshold={setThreshold} cooldown={cooldown} autoPause={autoPause} setAutoPause={setAutoPause}/>
        <section className="panel support-card"><div className="support-card-top"><span className="soft-icon"><Icon name="spark"/></span><div><h3>Your learning support</h3><span className={`status-dot ${health?'green':''}`}/> {health?(health.gemini_configured?'Gemini key configured':'Sample notes ready'):backendError?'Server offline':'Connecting…'}</div><button className="square-button" onClick={checkBackend} aria-label="Check backend connection" title="Check server"><Icon name="refresh" size={16}/></button></div><p>{health?.gemini_configured?'Responses are generated from recent lecture context. The help panel identifies live results and any fallback.':'The sample lesson includes prepared explanations. Add a Gemini key to enable live generated support for your own lectures.'}</p><button className="text-button" onClick={openGuide}>See how it works <Icon name="arrow" size={14}/></button></section>
        <section className="progress-card"><span className="eyebrow">YOUR LESSON PROGRESS</span><div><strong>{Math.round(percent)}%</strong><span>{clock(time)} watched position</span></div><div className="lesson-progress"><i style={{width:`${percent}%`}}/></div><p>{chapter?chapter.title:'One idea at a time.'}</p><small>Progress is playback position, not an understanding score.</small></section>
      </div></div>
      <section className="panel session-panel" id="session"><div className="panel-heading"><div><span className="eyebrow">SESSION ACTIVITY</span><h2>Small pauses. Useful support.</h2></div><div className="session-actions"><button className="secondary" onClick={exportSession} disabled={!events.length}><Icon name="download" size={15}/> Export session</button><button className="text-button" disabled={!events.length} onClick={()=>setEvents([])}>Clear history</button></div></div><div className="stat-row"><div><span className="stat-icon"><Icon name="camera"/></span><div><strong>{counts.automatic}</strong><span>Automatic pauses</span></div></div><div><span className="stat-icon"><Icon name="help"/></span><div><strong>{counts.manual}</strong><span>Help requests</span></div></div><div><span className="stat-icon"><Icon name="play"/></span><div><strong>{counts.demo}</strong><span>Demo simulations</span></div></div></div>
        {events.length?<div className="event-list">{events.slice(-5).reverse().map(e=><div className="event" key={e.id}><span className={`event-symbol ${e.reason==='demo'?'demo':''}`}><Icon name={e.reason==='automatic'?'camera':e.reason==='manual'?'help':'play'} size={15}/></span><div><strong>{e.reason==='automatic'?'Sustained facial cues':e.reason==='manual'?'You asked for learning support':'Simulated intervention · demo'}</strong><small>{e.lesson}</small></div><span className="event-time">{clock(e.time)}</span></div>)}</div>:<p className="empty-state">Your requests and automatic pauses will appear here. History stays in this browser.</p>}
      </section><footer className="footer"><span>CogniStream · Review 2 · v0.2</span><span>Experimental facial cues · Detection accuracy and learning improvements are not yet evaluated.</span></footer>
    </div></main>
    {(modal||guide)&&<div className="modal-backdrop"><section className={`support-modal ${guide?'guide-modal':''}`} ref={modalBox} tabIndex={-1} onKeyDown={trapFocus} role="dialog" aria-modal="true" aria-labelledby="support-title"><button className="modal-close square-button" aria-label="Close help panel" onClick={()=>guide?setGuide(false):close(false)}><Icon name="close"/></button>
      {guide?<><span className="modal-emblem"><Icon name="book" size={25}/></span><span className="eyebrow">A QUICK TOUR</span><h2 id="support-title">Your pace. Your learning.</h2><p className="modal-subtitle">Start with the narrated sample. Camera support is optional.</p><ol className="guide-steps"><li><strong>Play your lesson</strong><p>Use Play lesson, choose a playback speed, and turn captions on or off. Click chapters or transcript lines to jump to a moment.</p></li><li><strong>Try the learning companion</strong><p>Enable camera, allow access, and keep a relaxed expression for five seconds. Automatic pause uses sustained brow and eye cues, not a proven measure of understanding.</p></li><li><strong>Ask for another explanation</strong><p>Select Help me understand. Prepared sample notes work offline. Live Gemini needs a configured key and internet.</p></li></ol><details className="gemini-guide"><summary>Enable live Gemini on this laptop</summary><p>In the project’s backend folder, copy .env.example to .env. Add your key after GEMINI_API_KEY= and restart the Python server. Never put the key in frontend code or share it in screenshots.</p></details><div className="modal-actions"><button className="primary" onClick={()=>setGuide(false)}>Got it, let’s learn <Icon name="arrow" size={16}/></button></div></>:<><span className="modal-emblem"><Icon name="spark" size={25}/></span><span className="eyebrow">LEARNING SUPPORT · {clock(modal.time)}</span><h2 id="support-title">{modal.reason==='demo'?'A simulated pause for your review.':'Let’s make that a little clearer.'}</h2><p className="modal-subtitle">{modal.reason==='automatic'?'Your selected facial cues stayed above the threshold. The lecture is paused while you review this support.':modal.reason==='demo'?'Demo mode: this pause was triggered manually and logged as a simulation.':'You asked for another way to understand this part of the lecture.'}</p>
        {busy?<div className="loading" role="status"><span className="spinner"/> Preparing support from your lecture…</div>:modal.error?<div className="support-error"><p className="error" role="alert">{modal.error}</p>{modal.context?<button className="secondary" onClick={()=>fetchExplanation(modal)}><Icon name="refresh" size={15}/> Retry explanation</button>:<button className="secondary" onClick={()=>{close(false);if(!cues.length)setAssetOpen(true);}}>{cues.length?'Back to lesson':'Add a matching transcript'}</button>}</div>:modal.result&&<><div className={`support-mode ${modal.result.mode}`}><Icon name={modal.result.mode==='gemini'?'spark':'book'} size={14}/>{modeLabel(modal.result.mode)}</div>{modal.result.notice&&<p className="fallback-notice">{modal.result.notice}</p>}<h3>In simpler words</h3><p className="explanation">{modal.result.explanation}</p>{modal.result.analogy&&<div className="analogy"><span className="eyebrow">THINK OF IT THIS WAY</span><p>{modal.result.analogy}</p></div>}{modal.result.check_question&&<div className="checkpoint"><h3>A quick self-check</h3><p>{modal.result.check_question}</p>{modal.result.mode==='prepared'&&supportChapter?.check_options&&modal.result.check_question===supportChapter.check_question&&<><div className="answer-options">{supportChapter.check_options.map((option,i)=><button className={`${answer===i?'chosen':''} ${answer!==null&&i===supportChapter.check_answer?'correct':''}`} key={option} onClick={()=>setAnswer(i)}>{option}{answer!==null&&i===supportChapter.check_answer&&<Icon name="check" size={14}/>}</button>)}</div>{answer!==null&&<p className="answer-feedback" role="status">{answer===supportChapter.check_answer?'Exactly. You’ve got this part.':'Take another look at the explanation. The highlighted option is the correct answer.'}</p>}</>}</div>}</>}
        <details className="used-transcript"><summary>View the lecture context used</summary><p>{modal.context||'No transcript available.'}</p></details><div className="modal-actions"><button className="secondary" onClick={()=>close(false)}>Stay paused</button><button className="primary" onClick={()=>close(true)}>Resume lecture <Icon name="arrow" size={16}/></button></div><p className="fineprint">A 10-second cooldown follows. Generated explanations can contain errors; compare them with your lecture.</p>
      </>}
    </section></div>}
  </div>;
}
