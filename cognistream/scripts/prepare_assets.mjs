// Copy the exact installed MediaPipe WASM files locally, so camera inference
// needs no external CDN after installation. The model is bundled in the ZIP.
import {mkdir, readdir, copyFile, stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(root,'frontend/node_modules/@mediapipe/tasks-vision/wasm');
const target=path.join(root,'frontend/public/wasm');
await mkdir(target,{recursive:true});
for(const name of await readdir(source))if(name.endsWith('.wasm')||name.endsWith('.js'))await copyFile(path.join(source,name),path.join(target,name));
const vendor=path.join(root,'frontend/public/vendor');
await mkdir(vendor,{recursive:true});
await copyFile(path.join(root,'frontend/node_modules/@mediapipe/tasks-vision/vision_bundle.mjs'),path.join(vendor,'vision_bundle.mjs'));
const model=path.join(root,'frontend/public/models/face_landmarker.task');
try{if((await stat(model)).size<100000)throw Error('Incomplete model');}catch{throw Error('Bundled face_landmarker.task is missing. Extract the complete project ZIP again.');}
console.log('Local vision assets are ready.');
