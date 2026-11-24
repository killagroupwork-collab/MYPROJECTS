/* Explicit device-local draft; never pretend an offline draft was synced. */
const field=document.getElementById('draft'),status=document.getElementById('status');
try{field.value=localStorage.getItem('dearly-offline-draft')||'';}catch{}
document.getElementById('save').onclick=()=>{try{localStorage.setItem('dearly-offline-draft',field.value);status.textContent='Draft saved on this device.';}catch{status.textContent='Device storage is unavailable. Copy your draft to keep it.';}};
document.getElementById('copy').onclick=async()=>{try{await navigator.clipboard.writeText(field.value);status.textContent='Copied. Paste it into your journal when you reconnect.';}catch{field.select();status.textContent='Select and copy your draft.';}};
document.getElementById('clear').onclick=()=>{try{localStorage.removeItem('dearly-offline-draft');field.value='';status.textContent='Draft cleared.';}catch{status.textContent='Could not clear device storage.';}};
window.addEventListener('online',()=>{status.textContent='Connection restored. Copy your draft, then return to Dearly.';});
