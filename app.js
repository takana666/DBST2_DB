'use strict';
const $=id=>document.getElementById(id),C=DBST2Search,model=C.buildModel(window.DABISTA2_DATA,window.DABISTA2_ALIASES);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const colors={'短':'#e8b848','速':'#e8e070','パ':'#b8e0e0','底':'#e08840','長':'#60c0e0','ダ':'#e0d0d0','丈':'#d898b8','早':'#b8d8e8','晩':'#a8c878','堅':'#b0a8c8','気':'#8088c0'};
const factors=fs=>C.FACTORS.filter(f=>(fs||[]).includes(f)).map(f=>`<span class="factor" style="background:${colors[f]}">${f}</span>`).join(' ');
const labels={father:'父大系統',damSire:'母父大系統',otherFunny:'他面白',splendid:'見事'};
const codes={Ec:'エクリプス',Ph:'ファラリス',Ns:'ナスルーラ',Ro:'ロイヤルチャージャー',Ne:'ニアークティック',Na:'ネイティヴダンサー',Fa:'フェアウェイ',To:'トムフール',Te:'テディ',Sw:'スインフォード',Ha:'ハンプトン',Hi:'ヒムヤー',St:'セントサイモン',Ma:'マッチェム',He:'ヘロド'};
const letters=['ア','カ','サ','タ','ナ','ハ','マ','ヤ','ラ','ワ',...C.LETTER_RANGES,'その他'];
let type='種牡馬',lineageGroup='father',lineages={father:[],damSire:[],otherFunny:[],splendid:[]},sublineages=[],ancestorRules=[],ancestorLetter='',nameLetter='',page=0,filtered=[],columnFilters={},sortState={key:'price',direction:1},totalFactorDepth=4,starMode='all',diamondMode='all';
const depthOptions=selected=>[1,2,3,4].map(n=>`<option value="${n}"${n===+selected?' selected':''}>${n}代以内</option>`).join('');
$('factorDepth').innerHTML=depthOptions(4);$('ancestorDepth').innerHTML=depthOptions(4);
$('factorChecks').innerHTML=C.FACTORS.map(f=>`<label><input type="checkbox" name="factor" value="${f}">${factors([f])}</label>`).join('');
$('lineageGroups').innerHTML=Object.entries(labels).map(([k,v])=>`<button data-group="${k}"${k===lineageGroup?' class="active"':''}>${v}</button>`).join('');
$('sublineageSelect').innerHTML='<option value="">小系統を選んで追加</option>'+[...new Set([...model.data.sires,...model.data.dams].map(h=>h.sublineage).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ja')).map(x=>`<option>${esc(x)}</option>`).join('');
document.querySelector('[data-type="種牡馬"] small').textContent=model.data.sires.length;
document.querySelector('[data-type="繁殖牝馬"] small').textContent=model.data.dams.length;
$('dataNote').textContent=`添付の血統DBを使用：種牡馬${model.data.sires.length}頭・繁殖牝馬${model.data.dams.length}頭 ／ 馬名を選ぶと祖先情報を表示`;
$('pairDataNote').textContent=`凝ったペアは添付データの${model.data.elaboratePairs.length.toLocaleString('ja-JP')}組を使用。候補選択の補助であり、実際の配合成立判定ではありません。`;
function renderLetters(id,selected){$(id).innerHTML=['すべて',...letters].map(l=>`<button type="button" data-letter="${l==='すべて'?'':l}" aria-pressed="${(l==='すべて'?'':l)===selected}" class="${(l==='すべて'?'':l)===selected?'active':''}">${l}</button>`).join('')}
function renderLineages(){
 $('lineageCodes').innerHTML=Object.entries(codes).map(([k,v])=>`<label title="${v}系"><input type="checkbox" name="major" value="${k}"${lineages[lineageGroup].includes(k)?' checked':''}>${k}</label>`).join('');
 document.querySelectorAll('[data-group]').forEach(b=>b.classList.toggle('active',b.dataset.group===lineageGroup));
 $('lineageSummary').textContent=Object.entries(lineages).filter(([,v])=>v.length).map(([k,v])=>`${labels[k]}：${v.join('・')}`).join(' ／ ');
}
const statusCategories=[['growth','成長',['早熟','普通','持続','晩成']],['dirt','ダート',['◎','○','△']],['achievement','実績',['A','B','C']],['stability','安定',['A','B','C']],['bottom','底力',['A','B','C']],['temperament','気性',['A','B','C']],['constitution','体質',['A','B','C']]];
function state(){const stats={};for(const [key,value] of Object.entries(columnFilters))if(value)stats[key]=[value];const statRanges={};if(type==='繁殖牝馬')for(const key of ['speed','stamina','power'])statRanges[key]={min:$(key+'Min').value,max:$(key+'Max').value};return {query:$('query').value.trim(),nameLetter,ownFactor:$('ownFactor').checked,starMode,diamondMode,lineages,lineageMode:$('lineageMode').value,sublineages,stats,statRanges,priceMin:$('priceMin').value,priceMax:$('priceMax').value,distanceMin:type==='種牡馬'?$('distanceMin').value:'',distanceMax:type==='種牡馬'?$('distanceMax').value:'',strictDistance:$('strictDistance').checked,factors:[...document.querySelectorAll('[name=factor]:checked')].map(x=>x.value),factorDepth:+$('factorDepth').value,factorMode:$('factorMode').value,ancestorRules,ancestorMode:$('ancestorMode').value}}
function columns(){return [['name','馬名'],['lineageCode','大系統',true],['sublineage','小系統',true],['price','価格'],...(type==='種牡馬'?[['distance','距離'],['growth','成長',true],['achievement','実績',true],['stability','安定',true],['bottom','底力',true]]:[['speed','SP'],['stamina','ST'],['power','PW']]),['dirt','ダート',true],['temperament','気性',true],['constitution','体質',true],['factorCount','総因子数']]}
function renderTableHead(){
 const pool=type==='種牡馬'?model.data.sires:model.data.dams;
 $('tableHead').innerHTML='<tr>'+columns().map(([key,label,filter])=>{
  const sorted=sortState.key===key;
  const title=`<div class="column-title"><span>${esc(label)}</span><span class="sort-arrows"><button data-sort-key="${key}" data-direction="1" class="${sorted&&sortState.direction===1?'active':''}" aria-label="${esc(label)}を昇順" aria-pressed="${sorted&&sortState.direction===1}">▲</button><button data-sort-key="${key}" data-direction="-1" class="${sorted&&sortState.direction===-1?'active':''}" aria-label="${esc(label)}を降順" aria-pressed="${sorted&&sortState.direction===-1}">▼</button></span></div>`;
  const values=[...new Set(pool.map(h=>h[key]).filter(v=>v!=null&&v!==''))].sort((a,b)=>typeof a==='number'?a-b:String(a).localeCompare(String(b),'ja'));
  const control=key==='factorCount'?`<select data-total-factor-depth aria-label="総因子数の集計範囲">${depthOptions(totalFactorDepth).replaceAll('以内','まで')}</select>`:filter?`<select data-column-filter="${key}" aria-label="${esc(label)}で絞り込み"><option value="">すべて</option>${values.map(v=>`<option value="${esc(v)}"${String(v)===columnFilters[key]?' selected':''}>${esc(v)}</option>`).join('')}</select>`:'';
  return `<th scope="col" data-column="${key}"${sorted?' aria-sort="'+(sortState.direction===1?'ascending':'descending')+'"':''}>${title}${control}</th>`;
 }).join('')+'</tr>';
}
const shortSublineage=text=>{const cs=[...String(text||'')];return cs.length<=4?String(text||''):cs.slice(0,4).join('')+'…'};
function renderRangeOptions(){
 const pool=type==='種牡馬'?model.data.sires:model.data.dams;
 const prices=[...new Set(pool.map(h=>h.price).filter(v=>v!=null))].sort((a,b)=>a-b);
 const distances=[...new Set(model.data.sires.flatMap(h=>[h.distanceMin,h.distanceMax]).filter(v=>v!=null))].sort((a,b)=>a-b);
 for(const [id,values,empty] of [['priceMin',prices,'下限なし'],['priceMax',prices,'上限なし'],['distanceMin',distances,'指定なし'],['distanceMax',distances,'指定なし']]){
  const value=$(id).value;$(id).innerHTML=`<option value="">${empty}</option>`+values.map(v=>`<option value="${v}">${v===0&&id.startsWith('price')?'無料':v.toLocaleString('ja-JP')}</option>`).join('');if(values.includes(Number(value))&&value!=='')$(id).value=value;
 }
 const statValues=Array.from({length:9},(_,i)=>(i+1)*1000);
 for(const key of ['speed','stamina','power'])for(const suffix of ['Min','Max']){const id=key+suffix,value=$(id).value,empty=suffix==='Min'?'下限なし':'上限なし';$(id).innerHTML=`<option value="">${empty}</option>`+statValues.map(v=>`<option value="${v}">${v.toLocaleString('ja-JP')}</option>`).join('');if(statValues.includes(+value)&&value!=='')$(id).value=value}
}
function updateMainControls(){renderRangeOptions();$('sireOptions').hidden=type!=='種牡馬';$('damOptions').hidden=type!=='繁殖牝馬';$('strictDistanceWrap').hidden=type!=='種牡馬';$('damRangeControls').hidden=type!=='繁殖牝馬';renderLetters('nameLetters',nameLetter);$('distanceRange').hidden=type!=='種牡馬';$('distanceNote').hidden=type!=='種牡馬';renderTableHead()}
function renderSublineages(){$('sublineageChips').innerHTML=sublineages.map((n,i)=>`<span class="chip">${esc(n)}<button data-remove-sub="${i}" aria-label="${esc(n)}を削除">×</button></span>`).join('')}
function pairSide(){const father=$('pairFather').checked,mother=$('pairMother').checked;return father&&!mother?'father':mother&&!father?'mother':father&&mother?'both':'none'}
function renderPairOptions(){const side=pairSide(),keys=side==='father'?[...model.pairFatherToMother.keys()]:side==='mother'?[...model.pairMotherToFather.keys()]:side==='both'?[...model.pairMap.keys()]:[],old=$('partner').value;const choices=[...new Map(keys.map(k=>[k,model.pairNames.get(k)||k])).entries()].sort((a,b)=>a[1].localeCompare(b[1],'ja'));$('partner').innerHTML='<option value="">選択なし</option>'+choices.map(([k,n])=>`<option value="${esc(k)}">${esc(n)}</option>`).join('');if(choices.some(([k])=>k===old))$('partner').value=old}
function renderAncestorOptions(){
 const partner=$('partner').value,side=pairSide(),o={letter:ancestorLetter,query:$('ancestorQuery').value,factorOnly:$('ancestorFactorOnly').checked,pairOnly:$('ancestorPairOnly').checked,partner,partnerSide:side==='both'?'':side};
 const as=model.ancestorOptions(o),old=$('ancestorSelect').value;
 $('ancestorOptionCount').textContent=`（${as.length}頭）`;
 $('ancestorSelect').innerHTML='<option value="">祖先馬を選択</option>'+as.map(a=>`<option value="${esc(a.key)}">${esc(a.name)}${a.factors.size?' ［'+C.FACTORS.filter(f=>a.factors.has(f)).join('・')+'］':''}</option>`).join('');
 if(as.some(a=>a.key===old))$('ancestorSelect').value=old;
 $('addAncestor').disabled=!$('ancestorSelect').value;
 const selectedPartner=model.ancestors.find(a=>a.key===partner);$('addPartner').disabled=!selectedPartner;
 const partnerName=model.pairNames.get(partner)||partner,sideText=side==='father'?'父側から母側':side==='mother'?'母側から父側':'両方向';
 $('partnerHint').textContent=partner?`${partnerName} の対となる候補を祖先馬へ表示（${sideText}）`:'馬を選ぶと、対となる凝った配合ペアを祖先馬プルダウンへ表示します。';
}
function renderAncestorRules(){$('ancestorRules').innerHTML=ancestorRules.length?ancestorRules.map((r,i)=>`<div class="chip rule"><span>${esc(r.name)}</span><select data-rule-depth="${i}" aria-label="${esc(r.name)}の世代条件">${depthOptions(r.depth)}</select><button data-remove-rule="${i}" aria-label="${esc(r.name)}を削除">×</button></div>`).join(''):'<span class="hint">まだ追加されていません</span>'}
const fmt=n=>n==null||n===''?'—':Number(n).toLocaleString('ja-JP');
function price(h){return h.price==null?'—':h.price===0?'無料':fmt(h.price)}
function renderResults(reset=true){
 if(reset)page=0;const s=state(),pool=type==='種牡馬'?model.data.sires:model.data.dams;filtered=pool.filter(h=>model.matches(h,s));
 if(s.priceMin!==''&&s.priceMax!==''&&+s.priceMin>+s.priceMax)filtered=[];
 if(s.distanceMin&&s.distanceMax&&+s.distanceMin>+s.distanceMax)filtered=[];
 const totals=new Map();for(const h of filtered)totals.set(h.id,Object.values(model.factorCounts(h,totalFactorDepth)).reduce((a,b)=>a+b,0));
 filtered.sort((a,b)=>C.compare(a,b,sortState.key,sortState.direction,totals)||a.name.localeCompare(b.name,'ja'));
 $('resultCount').textContent=String(filtered.length).padStart(3,'0');$('totalCount').textContent=String(pool.length).padStart(3,'0');$('resultType').textContent=type;
 const flags=[];if(s.query)flags.push(`検索：${s.query}`);if(nameLetter)flags.push(`頭文字：${nameLetter}`);if(s.ownFactor&&type==='種牡馬')flags.push('因子持ち種牡馬');if(type==='種牡馬'&&s.starMode!=='all')flags.push(s.starMode==='only'?'★のみ':'★なし');if(type==='繁殖牝馬'&&s.diamondMode!=='all')flags.push(s.diamondMode==='only'?'♦のみ':'♦なし');for(const [k,v]of Object.entries(lineages))if(v.length)flags.push(`${labels[k]}：${v.join('・')}`);if(Object.values(lineages).filter(v=>v.length).length>1)flags.push(`系統間 ${s.lineageMode}`);flags.push(...sublineages);if(s.factors.length)flags.push(`因子 ${s.factorDepth}代以内：${s.factors.join('・')}（${s.factorMode}）`);for(const r of ancestorRules)flags.push(`${r.name}：${r.depth}代以内`);if(ancestorRules.length>1)flags.push(`祖先間 ${s.ancestorMode}`);for(const [k,v]of Object.entries(s.stats))flags.push(`${columns().find(x=>x[0]===k)?.[1]||k}：${v.join('・')}`);for(const [k,r]of Object.entries(s.statRanges))if(r.min||r.max)flags.push(`${columns().find(x=>x[0]===k)?.[1]||k}：${r.min||'下限なし'}～${r.max||'上限なし'}`);if(s.priceMin!==''||s.priceMax!=='')flags.push(`価格 ${s.priceMin||'下限なし'}～${s.priceMax||'上限なし'}万円`);if(s.distanceMin||s.distanceMax)flags.push(`距離 ${s.distanceMin||s.distanceMax}～${s.distanceMax||s.distanceMin}m${s.strictDistance?'（厳密）':''}`);
 $('activeFilters').innerHTML=flags.length?flags.map(x=>`<span>${esc(x)}</span>`).join(''):'条件なし · 全データを表示';
 const sire=type==='種牡馬';
 const pages=Math.max(1,Math.ceil(filtered.length/50));page=Math.min(page,pages-1);
 $('tableBody').innerHTML=filtered.slice(page*50,page*50+50).map(h=>`<tr><td class="horse-cell"><button class="horse-link" data-horse="${esc(h.id)}">${sire&&model.starCount(h)?'<span class="horse-star">★</span>':!sire&&h.diamond?'<span class="horse-diamond">♦</span>':''}${esc(h.name)}</button></td><td><span class="lineage-code" title="${esc(h.lineage)}">${esc(h.lineageCode||'—')}</span></td><td class="sublineage-cell"><span title="${esc(h.sublineage||'小系統未確認')}">${esc(shortSublineage(h.sublineage||'小系統未確認'))}</span></td><td class="num">${price(h)}</td>${sire?`<td class="num">${h.distanceMin==null?'—':fmt(h.distanceMin)+'～'+fmt(h.distanceMax)}</td><td>${esc(h.growth||'—')}</td>${['achievement','stability','bottom'].map(k=>`<td>${esc(h[k]||'—')}</td>`).join('')}`:['speed','stamina','power'].map(k=>`<td class="num">${fmt(h[k])}</td>`).join('')}<td>${esc(h.dirt||'—')}</td><td>${esc(h.temperament||'—')}</td><td>${esc(h.constitution||'—')}</td><td class="num">${totals.get(h.id)}</td></tr>`).join('');
 $('empty').hidden=filtered.length>0;for(const id of ['prevPage','prevPageTop'])$(id).disabled=page===0;for(const id of ['nextPage','nextPageTop'])$(id).disabled=page>=pages-1;const pageText=filtered.length?`${page*50+1}～${Math.min(filtered.length,(page+1)*50)}頭 ／ ${filtered.length}頭`:'0頭';for(const id of ['pageInfo','pageInfoTop'])$(id).textContent=pageText;requestAnimationFrame(updateScrollWidth);
}
const pedigreePaths=depth=>Array.from({length:2**depth},(_,i)=>i.toString(2).padStart(depth,'0').replaceAll('0','父').replaceAll('1','母'));
function pedigreeHorse(h,path){return path?((h.ancestors||{})[path]||null):h}
function pedigreeCell(h,path,row,span){
 const a=pedigreeHorse(h,path),sex=path?path.at(-1):(h.type==='種牡馬'?'父':'母'),className=sex==='父'?'sire':'dam';
 if(!a)return `<div class="pedigree-cell unknown" style="grid-row:${row}/${row+span}"><span class="pedigree-name">未確認</span></div>`;
 const showLineage=!path||sex==='父',showSublineage=(!path||path==='父'||path==='母父')&&a.sublineage;
 return `<div class="pedigree-cell ${className}" style="grid-row:${row}/${row+span}" title="${esc(a.name)}"><div class="pedigree-cell-main"><div class="pedigree-name-row"><span class="pedigree-name">${esc(a.name)}</span>${showLineage&&a.lineageCode?`<span class="pedigree-lineage-code">【${esc(a.lineageCode)}】</span>`:''}<span class="pedigree-factors">${factors(a.factors)}</span></div>${showSublineage?`<small>${esc(a.sublineage)}</small>`:''}</div></div>`;
}
function pedigreeTable(h){
 const columns=Array.from({length:5},(_,depth)=>{const paths=depth?pedigreePaths(depth):[''],span=16/paths.length;return `<div class="pedigree-column pedigree-generation-${depth+1}">${paths.map((path,i)=>pedigreeCell(h,path,i*span+1,span)).join('')}</div>`}).join('');
 return `<div class="pedigree-section"><div class="pedigree-label">${h.type==='種牡馬'?'牡馬側（上半分）':'牝馬側（下半分）'}</div><div class="pedigree-scroll"><div class="pedigree-table">${columns}</div></div></div>`;
}
function openDetail(id){const h=[...model.data.sires,...model.data.dams].find(h=>h.id===id);if(!h)return;$('detailName').textContent=h.name;$('detailBody').innerHTML=`<div class="detail-summary">${esc(h.type)} ／ ${esc(h.lineage)} ／ ${esc(h.sublineage)}<br>${esc(h.stats)}</div>${pedigreeTable(h)}`;$('detail').showModal()}
$('typeSwitch').onclick=e=>{const b=e.target.closest('[data-type]');if(!b||b.dataset.type===type)return;type=b.dataset.type;nameLetter='';columnFilters={};sortState={key:'price',direction:1};for(const id of ['priceMin','priceMax','distanceMin','distanceMax','speedMin','speedMax','staminaMin','staminaMax','powerMin','powerMax'])$(id).value='';document.querySelectorAll('[data-type]').forEach(x=>x.classList.toggle('active',x.dataset.type===type));updateMainControls();renderResults()};
document.querySelector('.tabs').onclick=e=>{const b=e.target.closest('[data-tab]');if(!b)return;document.querySelectorAll('[data-tab]').forEach(x=>{const active=x===b;x.classList.toggle('active',active);x.setAttribute('aria-selected',active);$(x.dataset.tab+'Panel').hidden=!active})};
document.querySelector('.tabs').onkeydown=e=>{const bs=[...document.querySelectorAll('[data-tab]')],i=bs.indexOf(document.activeElement);if(i<0)return;let j=i;if(e.key==='ArrowRight')j=(i+1)%bs.length;else if(e.key==='ArrowLeft')j=(i+bs.length-1)%bs.length;else if(e.key==='Home')j=0;else if(e.key==='End')j=bs.length-1;else return;e.preventDefault();bs[j].focus();bs[j].click()};
$('lineageGroups').onclick=e=>{const b=e.target.closest('[data-group]');if(b){lineageGroup=b.dataset.group;renderLineages()}};
$('lineageCodes').onchange=()=>{lineages[lineageGroup]=[...document.querySelectorAll('[name=major]:checked')].map(x=>x.value);renderLineages();renderResults()};
$('sublineageSelect').onchange=()=>{const v=$('sublineageSelect').value;if(v&&!sublineages.includes(v))sublineages.push(v);$('sublineageSelect').value='';renderSublineages();renderResults()};
$('sublineageChips').onclick=e=>{const b=e.target.closest('[data-remove-sub]');if(b){sublineages.splice(+b.dataset.removeSub,1);renderSublineages();renderResults()}};
$('nameLetters').onclick=e=>{const b=e.target.closest('[data-letter]');if(b){nameLetter=b.dataset.letter;renderLetters('nameLetters',nameLetter);renderResults()}};
for(const id of ['priceMin','priceMax','distanceMin','distanceMax','speedMin','speedMax','staminaMin','staminaMax','powerMin','powerMax','strictDistance'])$(id).onchange=()=>renderResults();
$('tableHead').onchange=e=>{if(e.target.hasAttribute('data-total-factor-depth')){totalFactorDepth=+e.target.value;renderResults();return}const key=e.target.dataset.columnFilter;if(key){columnFilters[key]=e.target.value;renderResults()}};
$('tableHead').onclick=e=>{const b=e.target.closest('[data-sort-key]');if(b){sortState={key:b.dataset.sortKey,direction:+b.dataset.direction};renderTableHead();renderResults()}};
$('ancestorLetters').onclick=e=>{const b=e.target.closest('[data-letter]');if(b){ancestorLetter=b.dataset.letter;renderLetters('ancestorLetters',ancestorLetter);renderAncestorOptions()}};
for(const id of ['ancestorQuery'])$(id).oninput=renderAncestorOptions;
$('partner').onchange=renderAncestorOptions;
for(const id of ['pairFather','pairMother'])$(id).onchange=()=>{renderPairOptions();renderAncestorOptions()};
for(const id of ['ancestorFactorOnly','ancestorPairOnly'])$(id).onchange=renderAncestorOptions;
$('ancestorSelect').onchange=()=>{$('addAncestor').disabled=!$('ancestorSelect').value};
function addAncestorRule(key){if(!key)return;const a=model.ancestors.find(a=>a.key===key);if(!a)return;const old=ancestorRules.find(r=>r.key===key);if(old)old.depth=+$('ancestorDepth').value;else ancestorRules.push({key,name:a.name,depth:+$('ancestorDepth').value});renderAncestorRules();renderResults()}
$('addAncestor').onclick=()=>addAncestorRule($('ancestorSelect').value);
$('addPartner').onclick=()=>addAncestorRule($('partner').value);
$('ancestorRules').onclick=e=>{const b=e.target.closest('[data-remove-rule]');if(b){ancestorRules.splice(+b.dataset.removeRule,1);renderAncestorRules();renderResults()}};
$('ancestorRules').onchange=e=>{if(e.target.dataset.ruleDepth!=null){ancestorRules[+e.target.dataset.ruleDepth].depth=+e.target.value;renderResults()}};
for(const id of ['query'])$(id).oninput=()=>renderResults();
for(const id of ['ownFactor','lineageMode','factorDepth','factorMode','ancestorMode'])$(id).onchange=()=>renderResults();
$('starMode').onclick=()=>{starMode=starMode==='all'?'only':starMode==='only'?'none':'all';$('starMode').dataset.mode=starMode;$('starMode').textContent=starMode==='all'?'★ありなし':starMode==='only'?'★のみ':'★なし';renderResults()};
$('diamondMode').onclick=()=>{diamondMode=diamondMode==='all'?'only':diamondMode==='only'?'none':'all';$('diamondMode').dataset.mode=diamondMode;$('diamondMode').textContent=diamondMode==='all'?'♦ありなし':diamondMode==='only'?'♦のみ':'♦なし';renderResults()};
$('factorChecks').onchange=()=>renderResults();
$('clearAll').onclick=()=>{lineages={father:[],damSire:[],otherFunny:[],splendid:[]};lineageGroup='father';sublineages=[];ancestorRules=[];ancestorLetter='';nameLetter='';totalFactorDepth=4;starMode='all';diamondMode='all';$('starMode').dataset.mode='all';$('starMode').textContent='★ありなし';$('diamondMode').dataset.mode='all';$('diamondMode').textContent='♦ありなし';for(const id of ['query','ancestorQuery'])$(id).value='';for(const id of ['ownFactor','ancestorFactorOnly','ancestorPairOnly','strictDistance'])$(id).checked=false;$('pairFather').checked=true;$('pairMother').checked=true;document.querySelectorAll('[name=factor]').forEach(x=>x.checked=false);for(const id of ['lineageMode','factorMode','ancestorMode'])$(id).value='AND';$('factorDepth').value=4;$('ancestorDepth').value=4;columnFilters={};for(const id of ['priceMin','priceMax','distanceMin','distanceMax','speedMin','speedMax','staminaMin','staminaMax','powerMin','powerMax'])$(id).value='';updateMainControls();renderLineages();renderSublineages();renderLetters('ancestorLetters','');renderAncestorRules();renderPairOptions();renderAncestorOptions();renderResults()};
for(const id of ['prevPage','prevPageTop'])$(id).onclick=()=>{page--;renderResults(false)};for(const id of ['nextPage','nextPageTop'])$(id).onclick=()=>{page++;renderResults(false)};
$('tableBody').onclick=e=>{const b=e.target.closest('[data-horse]');if(b)openDetail(b.dataset.horse)};
$('closeDetail').onclick=()=>$('detail').close();$('detail').onclick=e=>{if(e.target===$('detail')){const r=$('detail').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('detail').close()}};
columnFilters={};for(const id of ['priceMin','priceMax','distanceMin','distanceMax','speedMin','speedMax','staminaMin','staminaMax','powerMin','powerMax'])$(id).value='';updateMainControls();renderLineages();renderLetters('ancestorLetters','');renderAncestorRules();renderPairOptions();renderAncestorOptions();renderResults();

function updateScrollWidth(){const table=$('tableScroll'),top=$('topScroll');$('topScrollWidth').style.width=table.scrollWidth+'px';top.scrollLeft=table.scrollLeft;top.hidden=table.scrollWidth<=table.clientWidth}
$('topScroll').onscroll=()=>{if(Math.abs($('tableScroll').scrollLeft-$('topScroll').scrollLeft)>1)$('tableScroll').scrollLeft=$('topScroll').scrollLeft};
$('tableScroll').onscroll=()=>{if(Math.abs($('topScroll').scrollLeft-$('tableScroll').scrollLeft)>1)$('topScroll').scrollLeft=$('tableScroll').scrollLeft};
window.addEventListener('resize',updateScrollWidth);if(typeof ResizeObserver!=='undefined')new ResizeObserver(updateScrollWidth).observe($('horseTable'));

$('mobileFilterToggle').onclick=()=>{const open=!$('filterControls').classList.contains('mobile-open');$('filterControls').classList.toggle('mobile-open',open);$('mobileFilterToggle').setAttribute('aria-expanded',String(open));$('mobileFilterToggle').textContent=open?'検索条件を閉じる ▴':'系統・因子・祖先馬の条件を開く ▾'};
