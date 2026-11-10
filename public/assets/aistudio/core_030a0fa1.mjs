export const ID='1mJc2Z3ziqRIHqJaES1p9u12MbZgWlEBxNT_bND6Nuuc';
export const GID=1964624729;
export const SHEET=`https://docs.google.com/spreadsheets/d/${ID}/edit#gid=${GID}`;
export function safeUrl(value){try{const u=new URL(value);return ['https:','http:','mailto:','tel:'].includes(u.protocol)?u.href:null}catch{return null}}
export function linksFor(cells,headers){const links=new Map();function add(url,label){const safe=safeUrl(url);if(safe&&!links.has(safe))links.set(safe,{url:safe,label})}
 cells.forEach((c,i)=>{const field=(headers[i]||'Link').replaceAll('_',' ');if(c.hyperlink)add(c.hyperlink,field);for(const run of c.textFormatRuns||[])if(run.format?.link?.uri)add(run.format.link.uri,field);
 const formula=c.userEnteredValue?.formulaValue||'';const fm=formula.match(/^=HYPERLINK\(\s*"((?:[^""]|"")+)"/i);if(fm)add(fm[1].replaceAll('""','"'),field);
 const value=c.formattedValue||'';for(const m of value.matchAll(/(?:https?:\/\/|www\.)[^\s<>"\[\]]+/gi)){const url=m[0].replace(/[.,;!?)]+$/,'');add(url.startsWith('www.')?'https://'+url:url,field)}
 for(const m of value.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi))add('mailto:'+m[0],'Email');});return [...links.values()]}
export function shortcutLinks(cells,headers){const allowed=new Set(['folder','opener','memo','link']);return headers.flatMap((h,i)=>allowed.has(h)?linksFor([cells[i]||{}],[h]).map(l=>({...l,label:h.charAt(0).toUpperCase()+h.slice(1)})):[])}
export function recordsFrom(rows){const headers=(rows[0]?.values||[]).map(c=>c.formattedValue||'');if(!headers.includes('asset_id')||!headers.includes('name'))throw Error('CRM headers were not found in row 1.');return rows.slice(1).flatMap((row,i)=>{const cells=row.values||[];const data=Object.fromEntries(headers.map((h,j)=>[h,cells[j]?.formattedValue||'']));if(!data.asset_id&&!data.name)return [];return [{data,row:i+2,links:shortcutLinks(cells,headers),search:Object.values(data).join(' ').normalize('NFKD').toLowerCase(),_modTime:modifiedSortTime(data.modified_ts)}]})}
export function match(record,query,type,status){if(type&&record.data.type!==type)return false;if(status&&record.data.status!==status)return false;const words=query.normalize('NFKD').toLowerCase().trim().split(/\s+/).filter(Boolean);return words.every(w=>record.search.includes(w))}

const dtfUtc=new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23',timeZone:'UTC'});
const dtfMadrid=new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23',timeZone:'Europe/Madrid'});

export function formatAssetDate(value){
 const raw=String(value??'').trim();if(!raw)return '';
 let date,zone='UTC';
 // Spreadsheet serials represent the sheet's wall-clock time, not UTC instants.
 if(/^\d{4,6}(?:\.\d+)?$/.test(raw)&&Number(raw)>=20000&&Number(raw)<=100000){
  date=new Date(Date.UTC(1899,11,30)+Math.round(Number(raw)*86400000/1000)*1000);
 }else{
  const local=raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?$/);
  const us=raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i);
  if(local){const [,y,m,d,h='0',min='0',sec='0']=local;date=new Date(Date.UTC(+y,+m-1,+d,+h,+min,+sec));if(date.getUTCFullYear()!==+y||date.getUTCMonth()!==+m-1||date.getUTCDate()!==+d||+h>23||+min>59||+sec>59)return raw}
  else if(us){let [,m,d,y,h='0',min='0',sec='0',ampm]=us;if(ampm)h=String(+h%12+(ampm.toUpperCase()==='PM'?12:0));date=new Date(Date.UTC(+y,+m-1,+d,+h,+min,+sec));if(date.getUTCMonth()!==+m-1||date.getUTCDate()!==+d||+h>23||+min>59||+sec>59)return raw}
  else if(/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw)){date=new Date(raw);zone='Europe/Madrid'}
  else return raw;
 }
 if(Number.isNaN(date.getTime()))return raw;
 return (zone==='Europe/Madrid'?dtfMadrid:dtfUtc).format(date);
}
export const HIDDEN_DETAIL_FIELDS=new Set(['asset_id','name','type','description','leader','team','folder','opener','memo','link','search_blob','record_source','vector_hash','vector_synced_ts','sort_parameter','small_photo','name_of_user','photo']);
export function detailDisplay(key,value){
 const labels={created_at:'Created at',reminder_time:'Reminder time',modified_ts:'Modified at',reminder_starts:'Reminder starts'};
 return {label:labels[key]||key.replaceAll('_',' '),value:labels[key]?formatAssetDate(value):value};
}

export const DATE_DETAIL_FIELDS=['created_at','modified_ts','reminder_time','reminder_starts'];
export function orderedDetailEntries(data){
 const grouped=[...DATE_DETAIL_FIELDS,'starred'];
 const entries=Object.entries(data).filter(([key,value])=>value!==''&&value!=null&&!HIDDEN_DETAIL_FIELDS.has(key));
 return [...entries.filter(([key])=>!grouped.includes(key)),...grouped.flatMap(key=>entries.filter(([k])=>k===key))];
}

export function modifiedSortTime(value){
 const raw=String(value??'').trim();if(!raw)return -Infinity;
 if(/^\d{4,6}(?:\.\d+)?$/.test(raw)&&Number(raw)>=20000&&Number(raw)<=100000){
  return Date.UTC(1899,11,30)+Math.round(Number(raw)*86400000/1000)*1000;
 }
 const local=raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?$/);
 const us=raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i);
 if(local){const [,y,m,d,h='0',min='0',sec='0']=local;return Date.UTC(+y,+m-1,+d,+h,+min,+sec)}
 if(us){let [,m,d,y,h='0',min='0',sec='0',ampm]=us;if(ampm)h=String(+h%12+(ampm.toUpperCase()==='PM'?12:0));return Date.UTC(+y,+m-1,+d,+h,+min,+sec)}
 const formatted=formatAssetDate(raw);
 const stamp=Date.parse(formatted+' UTC');
 return Number.isFinite(stamp)?stamp:-Infinity;
}

const nameCollator=new Intl.Collator('en',{sensitivity:'base',numeric:true});
export function sortRecords(records,mode='modified'){
 const byName=(a,b)=>nameCollator.compare(a.data.name||'',b.data.name||'');
 return [...records].sort((a,b)=>{
  if(mode==='name')return byName(a,b)||a.row-b.row;
  const ta=a._modTime??modifiedSortTime(a.data.modified_ts);
  const tb=b._modTime??modifiedSortTime(b.data.modified_ts);
  if(ta!==tb)return ta>tb?-1:1;
  return byName(a,b)||a.row-b.row;
 });
}
