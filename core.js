(function(root){
 'use strict';
 const FACTORS=['短','速','パ','底','長','ダ','丈','早','晩','堅','気'];
 const GROUPS={father:[''],damSire:['母父'],otherFunny:['父母父','母母父'],splendid:['父父母父','父母母父','母父母父','母母母父']};
 const norm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[’‘`]/g,"'").replace(/\s+/g,' ').trim();
 const kana=s=>norm(s).replace(/[ぁ-ゖ]/g,c=>String.fromCharCode(c.charCodeAt(0)+96));
 function letter(s){const f=kana(s)[0]||'';if(/[a-z]/.test(f))return f.toUpperCase();const rows={ア:'アイウエオァィゥェォヴ',カ:'カキクケコガギグゲゴ',サ:'サシスセソザジズゼゾ',タ:'タチツテトダヂヅデドッ',ナ:'ナニヌネノ',ハ:'ハヒフヘホバビブベボパピプペポ',マ:'マミムメモ',ヤ:'ヤユヨャュョ',ラ:'ラリルレロ',ワ:'ワヲンヮ'};return Object.keys(rows).find(k=>rows[k].includes(f))||'その他'}
 const LETTER_RANGES=['A～C','D～F','G～I','J～L','M～O','P～R','S～U','V～Z'];
 function letterMatches(name,selection){if(!selection)return true;const l=letter(name);const m=/^([A-Z])[～~-]([A-Z])$/.exec(selection);return m?l.length===1&&l>=m[1]&&l<=m[2]:l===selection}
 function compare(a,b,key,direction=1,counts){
  const get=h=>key==='factorCount'?counts.get(h.id):key==='distance'?h.distanceMin:key==='factors'?(h.factors||[]).length:h[key];
  const x=get(a),y=get(b),missing=v=>v==null||v==='';
  if(missing(x)||missing(y))return missing(x)?missing(y)?0:1:-1;
  let result=typeof x==='number'&&typeof y==='number'?x-y:String(x).localeCompare(String(y),'ja');
  if(!result&&key==='distance')result=(a.distanceMax??0)-(b.distanceMax??0);
  return direction*result;
 }
 function buildModel(data,aliases={}){
  const parents=new Map(),find=x=>{if(!parents.has(x))parents.set(x,x);if(parents.get(x)!==x)parents.set(x,find(parents.get(x)));return parents.get(x)};
  for(const [a,bs] of Object.entries(aliases))for(const b of bs)parents.set(find(norm(b)),find(norm(a)));
  const identity=s=>find(norm(s));const pairMap=new Map(),rawPairNames=new Map(),pairFatherToMother=new Map(),pairMotherToFather=new Map();
  const addPair=(map,x,y)=>{if(!map.has(x))map.set(x,new Set());map.get(x).add(y)};
  for(const [a,b] of data.elaboratePairs||[]){const x=identity(a),y=identity(b);addPair(pairMap,x,y);addPair(pairMap,y,x);addPair(pairFatherToMother,x,y);addPair(pairMotherToFather,y,x);rawPairNames.set(x,a);rawPairNames.set(y,b)}
  const ancestorMap=new Map();
  for(const h of [...data.sires,...data.dams])for(const a of Object.values(h.ancestors||{})){if(!a.name)continue;const k=identity(a.name);if(!ancestorMap.has(k))ancestorMap.set(k,{key:k,name:a.name,names:new Set(),nameCounts:new Map(),factors:new Set()});const entry=ancestorMap.get(k);entry.names.add(a.name);entry.nameCounts.set(a.name,(entry.nameCounts.get(a.name)||0)+1);for(const f of a.factors||[])entry.factors.add(f)}
  for(const entry of ancestorMap.values()){entry.name=[...entry.nameCounts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'ja'))[0][0];delete entry.nameCounts}
  const pairNames=new Map([...pairMap.keys()].map(k=>[k,ancestorMap.get(k)?.name||rawPairNames.get(k)||k]));
  const ancestors=[...ancestorMap.values()].sort((a,b)=>a.name.localeCompare(b.name,'ja'));
  const entries=h=>Object.entries(h.ancestors||{}).map(([path,a])=>({path,depth:path.length,...a,key:identity(a.name)}));
  function factorCounts(h,depth,includeSelf=true){const result=Object.fromEntries(FACTORS.map(f=>[f,0]));const nodes=[...(includeSelf?[h]:[]),...entries(h).filter(a=>a.depth<=depth)];for(const a of nodes)for(const f of new Set(a.factors||[]))if(f in result)result[f]++;return result}
 function starCount(h){return +(String(h.stats||'').match(/★(\d+)/)?.[1]||0)}
  function lineageAt(h,path){for(let i=path.length;i>=0;i--){const p=path.slice(0,i);const a=p?h.ancestors?.[p]:h;if(a?.lineageCode&&a.lineageCode!=='--')return a.lineageCode}return ''}
  // 左側（若い世代）のデータを優先し、父系上にある最初の大系統を使用する。
  function branchLineage(h,path){for(let i=0;i<=path.length;i++){const p=path.slice(0,i);if(!path.slice(i).split('').every(c=>c==='父'))continue;const a=p?h.ancestors?.[p]:h;if(a?.lineageCode&&a.lineageCode!=='--')return a.lineageCode}return ''}
  function matches(h,s){
   if(s.query&&!kana([h.name,h.lineage,h.sublineage,h.stats].join(' ')).includes(kana(s.query)))return false;
   if(s.nameLetter&&!letterMatches(h.name,s.nameLetter))return false;
   if(s.ownFactor&&h.type==='種牡馬'&&!(h.factors||[]).length)return false;
   if(h.type==='種牡馬'&&s.starMode==='only'&&!starCount(h))return false;
   if(h.type==='種牡馬'&&s.starMode==='none'&&starCount(h))return false;
   if(h.type==='繁殖牝馬'&&s.diamondMode==='only'&&!h.diamond)return false;
   if(h.type==='繁殖牝馬'&&s.diamondMode==='none'&&h.diamond)return false;
   if(s.sublineages?.length&&!s.sublineages.includes(h.sublineage))return false;
   const lg=Object.entries(s.lineages||{}).filter(([,v])=>v.length);const lm=([g,v])=>GROUPS[g].some(p=>v.includes(branchLineage(h,p)));if(lg.length&&!(s.lineageMode==='OR'?lg.some(lm):lg.every(lm)))return false;
   for(const [field,values] of Object.entries(s.stats||{}))if(values.length&&!values.some(v=>String(v)===String(h[field])))return false;
   if(s.priceMin!==''&&s.priceMin!=null&&(h.price==null||h.price<+s.priceMin))return false;
   if(s.priceMax!==''&&s.priceMax!=null&&(h.price==null||h.price>+s.priceMax))return false;
   for(const [key,r]of Object.entries(s.statRanges||{})){if(r.min!==''&&r.min!=null&&(h[key]==null||h[key]<+r.min))return false;if(r.max!==''&&r.max!=null&&(h[key]==null||h[key]>+r.max))return false}
   if(h.type==='種牡馬'){
    if(s.distanceMin||s.distanceMax){
     const lo=Number(s.distanceMin||s.distanceMax),hi=Number(s.distanceMax||s.distanceMin);
     if(lo>hi||h.distanceMin==null||h.distanceMax==null)return false;
     if(s.strictDistance){if(h.distanceMin>lo||h.distanceMax<hi)return false}
     else if(h.distanceMax<lo||h.distanceMin>hi)return false;
    }
   }
   if(s.factors?.length){const counts=factorCounts(h,+s.factorDepth);const fn=f=>counts[f]>0;if(!(s.factorMode==='OR'?s.factors.some(fn):s.factors.every(fn)))return false}
   if(s.ancestorRules?.length){const es=entries(h);const fn=r=>es.some(a=>a.key===r.key&&a.depth<=+r.depth);if(!(s.ancestorMode==='OR'?s.ancestorRules.some(fn):s.ancestorRules.every(fn)))return false}
   return true;
  }
  function ancestorOptions(o={}){const partnerKey=o.partner?identity(o.partner):'',directed=o.partnerSide==='father'?pairFatherToMother:o.partnerSide==='mother'?pairMotherToFather:pairMap;return ancestors.filter(a=>(!o.letter||letterMatches(a.name,o.letter))&&(!o.query||[...a.names].some(n=>kana(n).includes(kana(o.query))))&&(!o.factorOnly||a.factors.size)&&(!o.pairOnly||pairMap.has(a.key))&&(!partnerKey||directed.get(partnerKey)?.has(a.key)))}
  return {data,identity,entries,factorCounts,starCount,branchLineage,matches,ancestorOptions,ancestors,pairMap,pairNames,pairFatherToMother,pairMotherToFather};
 }
 const api={FACTORS,GROUPS,norm,kana,letter,letterMatches,LETTER_RANGES,compare,buildModel};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DBST2Search=api;
})(typeof window==='undefined'?globalThis:window);
