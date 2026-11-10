import {modifiedSortTime} from './core.mjs';
export const CACHE_KEY='assedge.records.v1';
export const VIEW_KEY='assedge.view.v1';
export async function encodeRecords(records){
 const compact=records.map(({search,_modTime,...record})=>record);
 const stream=new Blob([JSON.stringify(compact)]).stream().pipeThrough(new CompressionStream('gzip'));
 const bytes=new Uint8Array(await new Response(stream).arrayBuffer());
 let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
 return btoa(binary);
}
export async function decodeRecords(encoded){
 const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
 const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
 const records=JSON.parse(await new Response(stream).text());
 return records.map(record=>({
  ...record,
  search:Object.values(record.data).join(' ').normalize('NFKD').toLowerCase(),
  _modTime:modifiedSortTime(record.data.modified_ts)
 }));
}
