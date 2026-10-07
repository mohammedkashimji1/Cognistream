import test from 'node:test';
import assert from 'node:assert/strict';
import {SustainedTrigger,expressionScore,parseVtt,contextAt,cuesToVtt} from './core.js';
test('Trigger uses observed elapsed time, resets on missing face and frame gaps',()=>{
  const t=new SustainedTrigger();
  for(let n=0;n<3000;n+=100)assert.equal(t.update(80,n,45,true).trigger,false);
  assert.equal(t.update(80,3000,45,true).trigger,true);
  assert.equal(t.update(80,3100,45,false).progress,0);
  assert.equal(t.update(80,3200,45,true).trigger,false);
  assert.equal(t.update(80,10000,45,true).trigger,false);
  assert.equal(t.update(10,10100,45,true).progress,0);
});
test('Neutral calibration does not score as confusion; weighted excess is bounded',()=>{
  const values={browDownLeft:.8,browDownRight:.8,eyeSquintLeft:.6,eyeSquintRight:.6};
  assert.equal(expressionScore(values,values),0);
  assert.equal(expressionScore(values,{}),100);
  assert.equal(expressionScore({},values),0);
});
test('VTT and SRT parsing preserve timestamp overlap and strip markup',()=>{
  const cues=parseVtt('WEBVTT\n\n00:00:00.000 --> 00:00:15.000\n<b>First</b>\n\n2\n00:00:15,000 --> 00:00:30,000\nSecond\n\n00:00:31.000 --> 00:00:40.000 align:start\nThird');
  assert.equal(cues.length,3);assert.equal(contextAt(cues,20),'First Second');
  assert.equal(contextAt(cues,45),'Second Third');assert.equal(contextAt(cues,100),'');
  assert.equal(parseVtt('plain text').length,0);
});

test('Caption parser rejects invalid times, ignores notes and roundtrips text entities',()=>{
  const cues=[{start:3.25,end:9.1,text:'Input < 5 & output > 2'}];
  assert.deepEqual(parseVtt(cuesToVtt(cues)),cues);
  assert.equal(parseVtt('00:99:00.000 --> 00:99:03.000\nInvalid').length,0);
  assert.equal(parseVtt('NOTE metadata\n00:00:00.000 --> 00:00:02.000\nIgnore').length,0);
  assert.equal(contextAt([{start:0,end:100,text:'a'.repeat(12000)+'RECENT'}],50).endsWith('RECENT'),true);
});
