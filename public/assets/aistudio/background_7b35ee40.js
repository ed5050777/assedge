import {sendHermes,HERMES_URL} from './hermes.mjs';
chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:true}).catch(console.error);
chrome.runtime.onMessage.addListener((request,sender,respond)=>{
 if(request?.type!=='ASSEDGE_SEND_SAM')return;
 if(sender.id!==chrome.runtime.id||sender.url!==chrome.runtime.getURL('panel.html')){
  respond({ok:false,error:'Send requests must come from the ASSEDGE panel.'});return;
 }
 (async()=>{
  const origin=new URL(HERMES_URL).origin+'/*';
  const permitted=await chrome.permissions.contains({origins:[origin]});
  if(!permitted)throw Error('Sam AI host access is missing. Replace manifest.json and all extension files, reload ASSEDGE, and allow access to the Sam AI host in extension settings.');
  const saved=await chrome.storage.local.get('assedge.hermes.token');
  const token=saved['assedge.hermes.token'];
  if(!token)throw Error('Save your token in Sam AI connection before sending.');
  if(typeof request.asset_id!=='string'||typeof request.instructions!=='string')throw Error('Invalid task data.');
  const message=await sendHermes({asset_id:request.asset_id},request.instructions,token);
  return {ok:true,message};
 })().then(respond,error=>respond({ok:false,error:error.message||'Sam AI request failed.'}));
 return true;
});
