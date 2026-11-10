import {sendViaBackground as sendHermes,tokenFingerprint} from './hermes.mjs';
import {CACHE_KEY,VIEW_KEY,encodeRecords,decodeRecords} from './session.mjs';
import {ID,GID,recordsFrom,match,HIDDEN_DETAIL_FIELDS,detailDisplay,orderedDetailEntries,sortRecords} from './core.mjs';
const $=id=>document.getElementById(id);let records=[],limit=40,busy=false,connected=false,generation=0;
let expanded=new Set(),loadedAt=null,restoring=true,saveTimer=null;
const session=chrome.storage?.session;
const tokenStorage=chrome.storage?.local;
const HERMES_TOKEN_KEY='assedge.hermes.token';
let hermesToken='',drafts={};const deliveries=new Map();
const configured=!chrome.runtime.getManifest().oauth2.client_id.startsWith('REPLACE');
function message(text,error=false){$('message').textContent=text;$('message').className=error?'error':''}
function controls(connected){for(const id of ['disconnect','type','status','sort'])$(id).disabled=!connected||busy;$('refresh').disabled=busy;$('search-submit').disabled=busy}
async function token(interactive){const result=await chrome.identity.getAuthToken({interactive});if(!result.token)throw Error('Google did not provide an access token.');return result.token}
async function read(path,access,retry=true){const response=await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+ID+path,{headers:{Authorization:'Bearer '+access},cache:'no-store'});if(response.status===401&&retry){await chrome.identity.removeCachedAuthToken({token:access});return read(path,await token(false),false)}if(!response.ok){if(response.status===403)throw Error('Access denied. Check Google Sheets API is enabled and your signed-in account can read the CRM.');const body=await response.json().catch(()=>({}));throw Error(body.error?.message||'Google Sheets request failed ('+response.status+').')}return response.json()}
async function load(interactive){if(busy)return;if(!configured){message('The Google connection is not configured. Please install the configured ASSEDGE package.',true);return}const current=++generation;let authorized=false;busy=true;controls(connected);message('Loading assets…');try{const access=await token(interactive);authorized=true;const meta=await read('?fields=sheets(properties)',access);const sheet=meta.sheets.find(s=>s.properties.sheetId===GID)?.properties;if(!sheet)throw Error('The configured CRM tab was not found.');const range="'"+sheet.title.replaceAll("'","''")+"'!A1:BG"+sheet.gridProperties.rowCount;const fields='sheets(data(rowData(values(formattedValue,hyperlink,textFormatRuns(format(link)),userEnteredValue(formulaValue)))))';const grid=await read('?includeGridData=true&ranges='+encodeURIComponent(range)+'&fields='+encodeURIComponent(fields),access);if(current!==generation)return;connected=true;records=sortRecords(recordsFrom(grid.sheets?.[0]?.data?.[0]?.rowData||[]),$('sort').value);populate('type');populate('status');render();loadedAt=Date.now();message(records.length+' records loaded · '+new Date(loadedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}));await cacheRecords();saveView(true);}catch(e){if(current===generation){if(!authorized&&!interactive)message('Enter a search and press Search to sign in to Google.');else message(e.message,true)}}finally{busy=false;controls(connected)}}
function populate(field){const previous=$(field).value;$(field).replaceChildren(new Option('All '+(field==='type'?'types':'statuses'),''));[...new Set(records.map(r=>r.data[field]).filter(Boolean))].sort().forEach(v=>$(field).add(new Option(v,v)));$(field).value=previous}
function el(tag,text,cls){const node=document.createElement(tag);if(text)node.textContent=text;if(cls)node.className=cls;return node}
function anchor(url,label){const a=el('a',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.title=url;return a}
function render(){
 const words=$('search').value.normalize('NFKD').toLowerCase().trim().split(/\s+/).filter(Boolean);
 const type=$('type').value,status=$('status').value;
 const found=records.filter(r=>{
  if(type&&r.data.type!==type)return false;
  if(status&&r.data.status!==status)return false;
  for(let i=0;i<words.length;i++){if(!r.search.includes(words[i]))return false}
  return true;
 });
 $('count').textContent=found.length+' assets'+(found.length>limit?' · showing '+limit:'');
 const fragment=document.createDocumentFragment();
 for(const r of found.slice(0,limit)){
  const card=el('details',null,'record');
  const key=r.data.asset_id||String(r.row);card.open=expanded.has(key);
  card.addEventListener('toggle',()=>{if(card.open)expanded.add(key);else expanded.delete(key);saveView()});
  card.append(el('summary',r.data.name||'Unnamed asset'));
  card.append(el('p',[r.data.type,r.data.status,r.data.priority,r.data.address].filter(Boolean).join(' · '),'meta'));
  const shortcuts=el('div',null,'links');
  for(const link of r.links)shortcuts.append(anchor(link.url,link.label+' ↗'));
  if(r.links.length)card.append(shortcuts);
  card.append(hermesForm(r));
  for(const key of ['description','leader','team']){
   if(r.data[key])card.append(el('p',r.data[key],'summary'));
  }
  const fields=el('dl');
  const hidden=HIDDEN_DETAIL_FIELDS;
  for(const [key,value] of orderedDetailEntries(r.data)){
   if(!value||hidden.has(key))continue;
   const display=detailDisplay(key,value);
   const row=el('div',null,'field-row');
   row.append(el('dt',display.label+':'),document.createTextNode(' '),el('dd',display.value));
   fields.append(row);
  }
  card.append(fields);fragment.append(card);
 }
 if(!found.length)fragment.append(el('p','No matching assets. Try a different name or keyword.'));
 $('results').replaceChildren(fragment);
 $('more').hidden=found.length<=limit;
}
$('search-form').onsubmit=event=>{event.preventDefault();if(connected){render();saveView(true)}else load(true)};$('refresh').onclick=()=>load(!connected);$('disconnect').onclick=async()=>{if(busy)return;generation++;connected=false;records=[];expanded.clear();loadedAt=null;drafts={};await session?.remove([CACHE_KEY,VIEW_KEY]).catch(()=>{});$('results').replaceChildren();$('count').textContent='';$('more').hidden=true;$('search').value='';try{await chrome.identity.clearAllCachedAuthTokens();message('Disconnected. Press Search to reconnect.')}catch{message('Panel data cleared. Google token cleanup failed; try Disconnect again.',true)}controls(false)};
for(const id of ['search','type','status'])$(id).addEventListener('input',()=>{if(connected){limit=40;render()}saveView()});
$('sort').addEventListener('input',()=>{if(connected){records=sortRecords(records,$('sort').value);limit=40;render()}saveView()});
$('more').onclick=()=>{limit+=40;render();saveView()};

function saveView(immediate=false){
 if(restoring)return;
 const save=()=>{
  const view={query:$('search').value,sort:$('sort').value,type:$('type').value,status:$('status').value,limit,expanded:[...expanded],scrollY:window.scrollY,drafts};
  session?.set({[VIEW_KEY]:view}).catch(()=>{});
 };
 clearTimeout(saveTimer);
 if(immediate)save();else saveTimer=setTimeout(save,200);
}
async function cacheRecords(){
 if(!session){message('Assets loaded. To remember your view, replace manifest.json too and reload ASSEDGE.',true);return}
 try{const encoded=await encodeRecords(records);await session.set({[CACHE_KEY]:{encoded,loadedAt}})}
 catch{message('Assets loaded. Session cache is unavailable; reopening may reload data.',true)}
}
async function start(){
 try{
  const saved=session?await session.get([CACHE_KEY,VIEW_KEY]):{};
  const view=saved[VIEW_KEY]||{};
  $('search').value=view.query||'';$('sort').value=view.sort==='name'?'name':'modified';limit=view.limit||40;expanded=new Set(view.expanded||[]);drafts=view.drafts||{};
  if(saved[CACHE_KEY]){
   records=sortRecords(await decodeRecords(saved[CACHE_KEY].encoded),$('sort').value);loadedAt=saved[CACHE_KEY].loadedAt;connected=true;
   populate('type');populate('status');$('type').value=view.type||'';$('status').value=view.status||'';
   render();controls(true);
   message('Saved session · updated '+new Date(loadedAt).toLocaleString()+' · Refresh for latest');
   requestAnimationFrame(()=>{window.scrollTo(0,view.scrollY||0);restoring=false});
   return;
  }
 }catch{await session?.remove(CACHE_KEY).catch(()=>{})}
 restoring=false;await load(false);
}
window.addEventListener('scroll',saveView,{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveView()});
function showSamSettings(visible){
 $('hermes-settings').hidden=!visible;$('hermes-settings').open=visible;
 $('sam-settings-toggle').setAttribute('aria-expanded',String(visible));
}
$('sam-settings-toggle').onclick=()=>showSamSettings($('hermes-settings').hidden);
async function restoreHermes(){
 try{
  await tokenStorage?.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'});
  const saved=await tokenStorage?.get(HERMES_TOKEN_KEY);hermesToken=saved?.[HERMES_TOKEN_KEY]||'';
  if(!hermesToken){const old=await session?.get(HERMES_TOKEN_KEY);if(old?.[HERMES_TOKEN_KEY]&&tokenStorage){await tokenStorage.set({[HERMES_TOKEN_KEY]:old[HERMES_TOKEN_KEY]});hermesToken=old[HERMES_TOKEN_KEY];await session?.remove(HERMES_TOKEN_KEY)}}
  if(hermesToken){$('hermes-connection-status').textContent='Sam AI token saved on this device.';showSamSettings(false)}else showSamSettings(true);
 }catch{$('hermes-connection-status').textContent='Saved token could not be restored. Paste it again to connect.'}
}
$('save-hermes').onclick=async()=>{
 const value=$('hermes-token').value.trim();if(!value){$('hermes-connection-status').textContent='Paste a token first.';return}
 hermesToken=value;$('hermes-token').value='';
 try{if(tokenStorage){await tokenStorage.set({[HERMES_TOKEN_KEY]:value});$('hermes-connection-status').textContent='Sam AI token saved on this device.';showSamSettings(false)}else $('hermes-connection-status').textContent='Token ready for this panel only. Reload the updated manifest to enable saving.'}catch{$('hermes-connection-status').textContent='Token ready for this panel only; saving failed.'}
};
$('check-hermes').onclick=async()=>{
 try{
  const saved=await tokenStorage?.get(HERMES_TOKEN_KEY);
  const value=saved?.[HERMES_TOKEN_KEY];
  if(!value){$('hermes-connection-status').textContent='No token saved on this device. Paste the assedge route token and click Save token.';return}
  const info=await tokenFingerprint(value);
  $('hermes-connection-status').textContent='Saved token: length='+info.length+' · SHA-256 fingerprint='+info.fingerprint+'. Compare with Hermes using the same SHA-256 method.';
 }catch{$('hermes-connection-status').textContent='Could not check the saved token. Reload ASSEDGE and try again.'}
};
$('clear-hermes').onclick=async()=>{
 hermesToken='';$('hermes-token').value='';
 try{await tokenStorage?.remove(HERMES_TOKEN_KEY);await session?.remove(HERMES_TOKEN_KEY);$('hermes-connection-status').textContent='Sam AI token cleared.'}
 catch{$('hermes-connection-status').textContent='Token cleared from this panel; removing the saved token failed. Try Clear token again.'}
};
function hermesForm(record){
 const key=record.data.asset_id||String(record.row),form=el('form',null,'hermes-form');
 const instructionLabel=el('label','Instructions for Sam AI'),instructions=el('textarea');instructions.rows=4;instructions.placeholder='What should Sam AI do with this asset?';instructions.required=true;instructionLabel.append(instructions);
 instructions.value=drafts[key]?.instructions||'';
 const button=el('button','Send to Sam AI');button.type='submit';
 const status=el('p',deliveries.get(key)?.message||'Sends this asset’s ID and your instructions to Sam AI.','meta');status.setAttribute('role','status');
 const remember=()=>{drafts[key]={instructions:instructions.value};saveView()};
 instructions.addEventListener('input',remember);
 const pending=deliveries.get(key)?.pending;button.disabled=!!pending;instructions.disabled=!!pending;
 form.append(instructionLabel,button,status);
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(deliveries.get(key)?.pending)return;
  if(!hermesToken){showSamSettings(true);status.textContent='Paste and save your token in Sam AI connection, then send.';$('hermes-token').focus();return}
  remember();deliveries.set(key,{pending:true,message:'Sending to Sam AI…'});button.disabled=true;instructions.disabled=true;status.textContent='Sending to Sam AI…';
  try{
   const result=await sendHermes(record.data,instructions.value,hermesToken);
   instructions.value='';delete drafts[key];saveView(true);
   deliveries.set(key,{pending:false,message:result});status.textContent=result;
   const scroll=window.scrollY;render();window.scrollTo(0,scroll);
  }
  catch(error){deliveries.set(key,{pending:false,message:error.message});status.textContent=error.message}
  finally{button.disabled=false;instructions.disabled=false}
 });return form;
}
async function boot(){await restoreHermes();await start()}
boot();
