import type {MetadataRoute} from 'next';
export default function sitemap():MetadataRoute.Sitemap{return[{url:'https://dearly.com.ng',changeFrequency:'monthly',priority:1},{url:'https://dearly.com.ng/about',changeFrequency:'monthly',priority:.8}];}
