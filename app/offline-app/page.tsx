import {OfflineApp} from '@/components/offline-app';
export const dynamic='force-static';
export const metadata={title:'Dearly · Offline journal & games',robots:{index:false,follow:false}};
// Public shell only: account identity and journal records are loaded from IndexedDB on-device.
export default function Page(){return <OfflineApp/>;}
