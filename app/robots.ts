import type {MetadataRoute} from 'next';
export default function robots():MetadataRoute.Robots{return{rules:{userAgent:'*',allow:['/','/about'],disallow:['/api/','/auth/','/my-day','/journal','/spaces','/settings','/friends','/notifications','/daily-tasks','/savings-goals','/play']},sitemap:'https://dearly.com.ng/sitemap.xml'};}
