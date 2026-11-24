import {readdir,readFile,writeFile,access} from 'node:fs/promises';
import path from 'node:path';
// Run after Next's production build. All game engines are bundled React modules;
// their sound is synthesized locally, and their marble/cookie art is SVG/CSS.
async function files(dir){const result=[];for(const entry of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())result.push(...await files(p));else result.push(p);}return result;}
const assets=(await files('.next/static')).filter(p=>/\.(js|css|woff2?)$/.test(p)).map(p=>'/'+p.replace(/^\.next\//,'_next/'));
const publicFiles=['/app-book-light-192.png','/app-book-light-512.png','/dearly-book.svg','/dearly-play-home.png','/arcade-clues.png','/dearly-mark.svg','/dearly-logo-clear.png','/diary-adventure-3d.png','/dearly-3d-features.png','/dearly-editorial-scenes.png'];
for(const file of publicFiles){try{await access('public'+file);assets.push(file);}catch{}}
const version=(await readFile('.next/BUILD_ID','utf8')).trim();
await writeFile('public/offline-assets.json',JSON.stringify({version,assets:['/offline-app',...assets]}));
let worker=await readFile('public/sw.js','utf8');
worker=worker.replace(/const CACHE = 'dearly-offline-[^']*';/,`const CACHE = 'dearly-offline-${version}';`);
await writeFile('public/sw.js',worker);
console.log(`Prepared ${assets.length} offline assets for Dearly.`);
