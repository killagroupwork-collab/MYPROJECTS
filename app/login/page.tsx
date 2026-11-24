import { AuthForm } from "@/components/auth-form";
import { configured,serverClient } from "@/lib/supabase/server";
import {redirect} from "next/navigation";
export default async function Login({searchParams}:{searchParams:Promise<{next?:string;code?:string;type?:string;reset?:string;recovery?:string}>}) {
 const params=await searchParams;
 if(configured()&&!params.code&&!params.reset&&!params.recovery&&params.type!=="recovery"){const {data:{user}}=await (await serverClient()).auth.getUser();if(user)redirect(params.next&&/^\/(my-day|journal|spaces|friends|play|memories|settings|notifications|daily-tasks|savings-goals)(\?|$)/.test(params.next)?params.next:"/my-day");}
 return <AuthForm configured={configured()} googleReady={process.env.AUTH_GOOGLE_READY==="true"} emailRecovery={process.env.AUTH_EMAIL_READY==="true"}/>;
}
