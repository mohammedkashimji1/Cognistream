import {useEffect,useRef,useState} from 'react';
import {averageSamples,expressionScore} from '../core';
import Icon from './Icon';

export default function VisionPanel({onSample,onReset,onState,running,score,progress,threshold,setThreshold,cooldown,autoPause,setAutoPause}){
  const video=useRef(null),canvas=useRef(null),engine=useRef(null),stream=useRef(null);
  const mounted=useRef(true),generation=useRef(0),frame=useRef(0),callbacks=useRef({onSample,onReset,onState});
  const baseline=useRef(null),calibration=useRef(null),smooth=useRef(0),last=useRef(0),lastVideoTime=useRef(-1);
  const [active,setActive]=useState(false),[loading,setLoading]=useState(false),[face,setFace]=useState(false);
  const [calibrated,setCalibrated]=useState(false),[seconds,setSeconds]=useState(null),[error,setError]=useState('');
  callbacks.current={onSample,onReset,onState};
  const phase=error?'error':loading?'starting':!active?'off':!face?'face-missing':!calibrated?'calibrating':'ready';
  useEffect(()=>{callbacks.current.onState?.(phase);},[phase]);
  const release=(invalidate=true)=>{
    if(invalidate)generation.current++;
    cancelAnimationFrame(frame.current);
    stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;
    engine.current?.close();engine.current=null;
    if(video.current)video.current.srcObject=null;
    if(canvas.current)canvas.current.getContext('2d')?.clearRect(0,0,canvas.current.width,canvas.current.height);
    baseline.current=null;calibration.current=null;smooth.current=0;last.current=0;lastVideoTime.current=-1;
    if(mounted.current)callbacks.current.onReset();
  };
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;release();};},[]);
  const calibrate=()=>{
    baseline.current=null;smooth.current=0;setCalibrated(false);setSeconds(5);
    calibration.current={samples:[],started:null,last:null};callbacks.current.onReset();
  };
  const stop=()=>{release();setActive(false);setLoading(false);setFace(false);setCalibrated(false);setSeconds(null);setError('');};
  const start=async()=>{
    if(active||loading)return;const token=++generation.current;setLoading(true);setError('');
    try{
      if(!navigator.mediaDevices?.getUserMedia)throw Error('Camera access is unavailable. Use Chrome at localhost or 127.0.0.1.');
      const moduleUrl='/vendor/vision_bundle.mjs';
      const {FaceLandmarker,FilesetResolver,DrawingUtils}=await import(/* @vite-ignore */ moduleUrl);
      const files=await FilesetResolver.forVisionTasks('/wasm');
      const model=await FaceLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:'/models/face_landmarker.task',delegate:'CPU'},runningMode:'VIDEO',numFaces:1,outputFaceBlendshapes:true});
      if(!mounted.current||token!==generation.current){model.close();return;}
      engine.current=model;
      const feed=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},facingMode:'user'},audio:false});
      if(!mounted.current||token!==generation.current){feed.getTracks().forEach(t=>t.stop());return;}
      stream.current=feed;
      for(const track of feed.getVideoTracks())track.onended=()=>{if(mounted.current){release();setActive(false);setLoading(false);setError('The camera disconnected. Check the device and try again.');}};
      video.current.srcObject=feed;await video.current.play();
      if(token!==generation.current||!mounted.current)return;
      setActive(true);setLoading(false);calibrate();
      const ctx=canvas.current.getContext('2d'),drawing=new DrawingUtils(ctx);
      const draw=now=>{
        if(!mounted.current||token!==generation.current||!engine.current)return;
        if(now-last.current>=100&&video.current?.readyState>=2&&video.current.currentTime!==lastVideoTime.current){
          last.current=now;lastVideoTime.current=video.current.currentTime;
          try{
            const result=engine.current.detectForVideo(video.current,now),points=result.faceLandmarks[0];
            if(canvas.current.width!==video.current.videoWidth)canvas.current.width=video.current.videoWidth;
            if(canvas.current.height!==video.current.videoHeight)canvas.current.height=video.current.videoHeight;
            ctx.clearRect(0,0,canvas.current.width,canvas.current.height);setFace(Boolean(points));
            if(points){
              drawing.drawConnectors(points,FaceLandmarker.FACE_LANDMARKS_CONTOURS,{color:'#c9f299',lineWidth:1});
              const values=Object.fromEntries((result.faceBlendshapes[0]?.categories||[]).map(c=>[c.categoryName,c.score]));
              if(!result.faceBlendshapes[0]?.categories?.length)throw Error('Expression data is unavailable from the model.');
              const cal=calibration.current;
              if(cal){
                if(cal.last!==null&&now-cal.last>700){cal.samples=[];cal.started=null;}
                cal.last=now;if(cal.started===null)cal.started=now;cal.samples.push(values);
                setSeconds(Math.max(0,Math.ceil((5000-(now-cal.started))/1000)));
                if(now-cal.started>=5000&&cal.samples.length>=25){baseline.current=averageSamples(cal.samples);calibration.current=null;setCalibrated(true);setSeconds(null);}
              }
              smooth.current=.7*smooth.current+.3*(baseline.current?expressionScore(values,baseline.current):0);
              callbacks.current.onSample({score:smooth.current,face:true,calibrated:Boolean(baseline.current),now});
            }else{
              smooth.current=0;
              if(calibration.current){calibration.current.samples=[];calibration.current.started=null;calibration.current.last=null;setSeconds(5);}
              callbacks.current.onSample({score:0,face:false,calibrated:false,now});
            }
          }catch(e){release(false);setActive(false);setFace(false);setError('Tracking stopped: '+e.message);return;}
        }
        frame.current=requestAnimationFrame(draw);
      };
      frame.current=requestAnimationFrame(draw);
    }catch(e){
      if(mounted.current&&token===generation.current){release(false);setActive(false);setError(e.name==='NotAllowedError'?'Camera permission was denied. Click the site controls beside the browser address, allow Camera, and try again.':e.name==='NotReadableError'?'Another app may be using your webcam. Close it and try again.':e.message);}
    }finally{if(mounted.current&&token===generation.current)setLoading(false);}
  };
  const labels={off:'Camera is off',starting:'Starting your camera…','face-missing':'Bring your face into view',calibrating:`Hold a relaxed expression · ${seconds??5}s`,ready:'Calibrated and ready',error:'Camera needs attention'};
  return <section className="panel vision">
    <div className="panel-heading"><div className="title-with-icon"><span className="soft-icon"><Icon name="camera"/></span><div><h2>Learning companion</h2><p>Optional, private camera support</p></div></div><span className={`status-dot ${phase==='ready'?'green':''}`}/></div>
    <div className="camera-stage"><video ref={video} muted playsInline/><canvas ref={canvas}/>
      {!active&&<div className="camera-placeholder"><span className="camera-outline"><Icon name="camera" size={29}/></span><strong>{loading?'Getting things ready…':'A little support, when you need it'}</strong><p>{loading?'Loading the local facial tracking model.':'Enable your camera to try automatic pauses.'}</p></div>}
      {active&&<div className="camera-label"><span className={`status-dot ${phase==='ready'?'green':''}`}/>{labels[phase]}</div>}
    </div>
    <div className="camera-controls"><button className={active?'secondary':'primary'} onClick={active||loading?stop:start}><Icon name={active?'close':'camera'} size={16}/>{loading?'Cancel':active?'Stop camera':'Enable camera'}</button><button className="square-button" disabled={!active||!face} onClick={calibrate} title="Recalibrate your normal expression" aria-label="Recalibrate camera"><Icon name="refresh" size={17}/></button></div>
    <p className="camera-status" role="status">{labels[phase]}</p>{error&&<p className="error" role="alert">{error}</p>}
    <div className="signal-box"><div><span className="eyebrow">EXPRESSION CUES</span><div className="score">{Math.round(score)}<small>/100</small></div></div><span className={`cue-tag ${score>=threshold?'elevated':''}`}>{phase!=='ready'?'Waiting for setup':score>=threshold?'Elevated cues':'Below threshold'}</span></div>
    <div className="hold-row"><span>{!autoPause?'Automatic pause is off':cooldown?'Resume cooldown':running?'Sustained cue timer':'Play the lesson to begin'}</span><strong>{cooldown?`${cooldown}s`:`${(progress*3).toFixed(1)} / 3s`}</strong></div><div className="hold-meter"><div style={{width:`${progress*100}%`}}/></div>
    <label className="toggle-row"><span><strong>Automatic pause</strong><small>Pause after sustained facial cues</small></span><input type="checkbox" checked={autoPause} onChange={e=>setAutoPause(e.target.checked)}/><span className="switch"/></label>
    <details className="advanced"><summary><Icon name="settings" size={15}/> Adjust sensitivity <Icon name="chevron" size={14}/></summary><label htmlFor="sensitivity">Pause threshold <strong>{threshold}</strong></label><input id="sensitivity" type="range" min="15" max="90" value={threshold} onChange={e=>setThreshold(Number(e.target.value))}/><p>A lower number triggers more easily. Recalibrate after changing your lighting or position.</p></details>
    <div className="privacy-note"><Icon name="shield" size={15}/><p>Camera frames stay on your device.<br/><span>Facial cues are an experimental proxy, not proof of confusion.</span></p></div>
  </section>;
}
