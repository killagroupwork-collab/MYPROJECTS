import {NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
// web-push is server-only; browser bundles never contain the private VAPID key.
// @ts-expect-error web-push has no bundled type declarations
import webpush from 'web-push';
export const runtime='nodejs';
export async function POST(request:Request){
 const expected=process.env.REMINDER_DISPATCH_SECRET,provided=request.headers.get('authorization')?.replace(/^Bearer /,'');
 if(!expected||!provided||Buffer.byteLength(expected)!==Buffer.byteLength(provided)||!timingSafeEqual(Buffer.from(expected),Buffer.from(provided)))return NextResponse.json({error:'Unauthorized'},{status:401});
 if(!process.env.VAPID_PRIVATE_KEY||!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)return NextResponse.json({error:'Not configured'},{status:503});
 try{const {subscription,notification}=await request.json();
 // Only browser push services may receive subscription payloads.
 const endpoint=new URL(subscription.endpoint);const allowed=['fcm.googleapis.com','updates.push.services.mozilla.com','push.services.mozilla.com','web.push.apple.com','notify.windows.com'];
 if(endpoint.protocol!=='https:'||!allowed.some(host=>endpoint.hostname===host||endpoint.hostname.endsWith('.'+host)))return NextResponse.json({error:'Unsupported push endpoint'},{status:400});
 webpush.setVapidDetails('https://dearly.com.ng',process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);
 await webpush.sendNotification(subscription,JSON.stringify(notification),{TTL:300,timeout:15000});return NextResponse.json({sent:true});
 }catch(error){const status=(error as {statusCode?:number}).statusCode;return NextResponse.json({error:status===410?'Subscription expired':'Delivery failed'},{status:status===410?410:502});}
}
