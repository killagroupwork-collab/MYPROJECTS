import {ImageResponse} from 'next/og';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
export const runtime='nodejs';
export const size={width:1200,height:630};export const contentType='image/png';export const alt='Dearly — Life is a little better, together.';
export default async function Image(){const logo=await readFile(join(process.cwd(),'public/dearly-logo-clear.png'));return new ImageResponse(<div style={{display:'flex',width:'100%',height:'100%',background:'#f4d8e8',padding:55,alignItems:'center',gap:35,color:'#351b49'}}><img src={`data:image/png;base64,${logo.toString('base64')}`} width={420} height={280} alt="Dearly"/><div style={{display:'flex',flexDirection:'column',gap:24}}><div style={{fontSize:68,fontWeight:800,lineHeight:1.05}}>Life’s a little better, together.</div><div style={{fontSize:28}}>Your memories. Your people. A little room for play.</div><div style={{fontSize:24}}>dearly.com.ng</div></div></div>,size);}
