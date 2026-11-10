export const HERMES_URL='https://nvidia-vera-rubin.tailc9ae59.ts.net/webhooks/assedge';
export function makePayload(asset,instructions){
 if(!asset.asset_id)throw Error('This asset has no internal ID.');
 if(!instructions.trim())throw Error('Enter instructions first.');
 return {event_type:'trigger',source:'Assedge AppSheet',table:'Assets',asset_id:asset.asset_id,objective:'',comment:instructions.trim()};
}
export async function sendHermes(asset,instructions,token,transport=fetch){
 if(!token.trim())throw Error('Add your token in Sam AI connection first.');
 const payload=makePayload(asset,instructions);
 let response;
 try{response=await transport(HERMES_URL,{method:'POST',headers:{'Content-Type':'application/json','X-Gitlab-Token':token.trim()},body:JSON.stringify(payload),redirect:'error',credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(30000)})}
 catch{throw Error('Delivery could not be confirmed. Check Hermes before sending again; the task may have arrived. Ensure this computer can reach your Hermes/Tailscale address.')}
 if(response.status===401||response.status===403)throw Error('Sam AI authentication rejected (HTTP '+response.status+'). Check the saved token and gateway authentication: this extension sends X-Gitlab-Token; a route requiring a signature needs matching server configuration.');
 if(!response.ok)throw Error('Hermes returned HTTP '+response.status+'. Check Hermes before sending again.');
 return 'Received by Sam AI.';
}

export async function sendViaBackground(asset,instructions,_token,runtime=chrome.runtime){
 makePayload(asset,instructions);
 let result;
 try{result=await runtime.sendMessage({type:'ASSEDGE_SEND_SAM',asset_id:asset.asset_id,instructions})}
 catch{throw Error('The background sender could not confirm delivery. Reload ASSEDGE, and check Hermes before resending.')}
 if(!result?.ok)throw Error(result?.error||'The background sender returned no confirmation. Check Hermes before resending.');
 return result.message;
}

export async function tokenFingerprint(token){
 const bytes=new TextEncoder().encode(token);
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 const hex=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
 return {length:token.length,fingerprint:hex.slice(0,12)};
}
