import {redirect} from 'next/navigation';
import {configured,serverClient} from '@/lib/supabase/server';
import About from './about/page';
import type {Metadata} from 'next';
export const metadata:Metadata={alternates:{canonical:'https://dearly.com.ng'},title:'Dearly — Private journal, shared memories & playful moments'};
export default async function Home(){if(configured()){const {data:{user}}=await(await serverClient()).auth.getUser();if(user)redirect('/my-day');}return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify({'@context':'https://schema.org','@type':'WebSite',name:'Dearly',url:'https://dearly.com.ng',description:'A playful private journal for your memories, shared spaces, daily tasks and games.'})}}/><About/></>;}
