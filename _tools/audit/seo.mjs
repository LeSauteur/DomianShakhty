import fs from 'node:fs';
import {out,site,read,json,csv} from './lib.mjs';
const pages=read(out+'/evidence/pages.json'), indexed=pages.filter(p=>p.sitemap),findings=[];
function add(p,issue,detail,fix,severity='low'){findings.push({id:'E-'+String(findings.length+1).padStart(3,'0'),section:'E',marker:'FACT',severity,url:p.url,issue,detail,evidence:`evidence/pages.json: file=${p.file}; ${detail}`,fix,code:'src/templates.mjs / src/data / scripts/build.mjs'});}
const grouped=(key)=>{const m=new Map();for(const p of indexed){const v=key(p);m.set(v,[...(m.get(v)||[]),p])}return [...m].filter(([k,v])=>v.length>1);};
for(const [value,ps]of grouped(p=>p.title))for(const p of ps)add(p,'Дубль title',value,'Уточнить предмет и отличительный параметр страницы','medium');
for(const [value,ps]of grouped(p=>p.description))for(const p of ps)add(p,'Дубль description',value,'Добавить уникальные факты и действие посетителя');
for(const [value,ps]of grouped(p=>p.h1.join('|')))for(const p of ps)add(p,'Дубль H1',value,'Разграничить объект/проект/географию','medium');
const normalize=u=>u.replace(/\/index\.html$/,'/');const known=new Map(pages.map(p=>[normalize(p.url),p]));
for(const p of indexed){
 if(p.title.length<30||p.title.length>70)add(p,'Длина title вне 30–70',String(p.title.length)+': '+p.title,'Проверить сниппет; длина — редакционный ориентир, не ошибка поисковика');
 if(p.description.length<70||p.description.length>170)add(p,'Длина description вне 70–170',String(p.description.length)+': '+p.description,'Расширить короткое описание или вынести дополнительные факты в текст');
 if(!/Домиан(?:\s+Шахты)?$/i.test(p.title))add(p,'Бренд не в конце title',p.title,'Единый брендовый суффикс, с учётом полезной длины');
 if(/Проект\s+DS-|\b(?:eqvita|domanstroy|partner-house)-\d/i.test(p.title))add(p,'Служебный код в title',p.title,'Заменить код на характеристики');
 if(p.h1.length!==1)add(p,'Количество H1',String(p.h1.length),'Оставить один смысловой H1','medium');
 if(!p.canonical.startsWith(site.productionOrigin+'/')||p.canonical!==p.url)add(p,'Canonical не самоссылающийся production',p.canonical,'Указать абсолютный канонический URL','high');
 const c=known.get(normalize(p.canonical));if(!c||c.refresh)add(p,'Canonical на отсутствующую страницу или redirect',p.canonical,'Выбрать конечный индексируемый адрес','high');
 if(/noindex/i.test(p.robots))add(p,'Noindex в sitemap',p.robots,'Разобрать конфликт sitemap и robots','high');
 if(!p.lastmod||p.lastmod>'2026-10-19')add(p,'Недостоверный lastmod',p.lastmod,'Указать дату фактического изменения');
 if(p.incoming===0)add(p,'Нет входящих статических ссылок','incoming=0','Добавить контекстные ссылки с релевантных страниц','medium');
 if(p.depth===null||p.depth>3)add(p,'Глубина больше 3 или недостижима',String(p.depth),'Добавить переходы из тематических хабов','medium');
 for(const k of ['og:title','og:description','og:image','og:url'])if(!p.og[k])add(p,'Отсутствует '+k,'meta[property="'+k+'"]','Добавить метаданные');
 if(p.og['og:url']!==p.canonical)add(p,'OG URL отличается от canonical',p.og['og:url'],'Сформировать из единого URL');
 if(p.og['og:image']){const u=new URL(p.og['og:image']);const file='dist'+u.pathname;if(!fs.existsSync(file))add(p,'OG image отсутствует',file,'Исправить ссылку','medium');}
 if(!p.twitter)add(p,'Отсутствует Twitter card','meta[name="twitter:card"]','Добавить summary_large_image');
 for(const [k,v]of Object.entries({lang:p.lang==='ru',favicon:!!p.favicon,manifest:!!p.manifest,theme:!!p.theme}))if(!v)add(p,'Нет технического атрибута '+k,String(v),'Добавить в общий layout');
 for(const s of p.schemas)if(s.error)add(p,'JSON-LD не парсится',s.error,'Исправить сериализацию','high');
 if(p.types.includes('AggregateRating'))add(p,'AggregateRating требует проверки происхождения','types='+p.types.join(','),'Не переносить рейтинг сторонних отзывов','medium');
 if(p.file.startsWith('listings/')&&p.types.includes('Offer')){const item=read('src/data/listings.json').find(i=>p.file.endsWith('/'+i.id+'.html'));if(!item?.verifiedAt||!item?.verifiedBy)add(p,'Offer без даты и проверяющего',item?.id,'Убирать Offer до проверки владельцем','high');}
 for(const l of p.links){if(l.blank&&!/\bnoopener\b/.test(l.rel))add(p,'target blank без noopener',l.href,'Добавить rel=noopener');if(/^http:/.test(l.href))add(p,'HTTP ссылка (не автоматически mixed content)',l.href,'Использовать HTTPS если доступно');if(l.internal){const u=new URL(l.href);const dest=known.get(normalize(u.origin+u.pathname));if(!dest&&!fs.existsSync('dist'+decodeURIComponent(u.pathname)))add(p,'Внутренняя ссылка на отсутствующий файл',l.raw,'Исправить конечный путь','high');else if(dest&&u.hash&&!dest.ids.includes(decodeURIComponent(u.hash.slice(1))))add(p,'Якорь отсутствует',l.raw,'Исправить id / href','medium');}}
 const hs=p.headings.map(h=>Number(h.tag[1]));for(let i=1;i<hs.length;i++)if(hs[i]>hs[i-1]+1){add(p,'Пропущен уровень заголовка',p.headings[i-1].tag+' → '+p.headings[i].tag+': '+p.headings[i].text,'Выстроить заголовки по структуре');break;}
}
const sets=indexed.map(p=>{const words=p.text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').split(/\s+/).filter(Boolean);return new Set(words.slice(0,-4).map((w,i)=>words.slice(i,i+5).join(' ')));});const pairs=[];
for(let i=0;i<indexed.length;i++)for(let j=i+1;j<indexed.length;j++){const a=sets[i],b=sets[j];let n=0;for(const s of a)if(b.has(s))n++;const score=n/(a.size+b.size-n);if(score>.6)pairs.push([indexed[i].url,indexed[j].url,score.toFixed(4),indexed[i].type,indexed[j].type,'INF: общий шаблон и карточки входят в main; сходство не доказывает санкции или бесполезность']);}
csv('duplicates.csv',['url_1','url_2','jaccard_5_words','type_1','type_2','интерпретация'],pairs.sort((a,b)=>Number(b[2])-Number(a[2])));
csv('seo-technical.csv',['id','маркер','серьёзность','url','находка','детали','доказательство','исправление'],findings.map(f=>[f.id,f.marker,f.severity,f.url,f.issue,f.detail,f.evidence,f.fix]));json('evidence/seo-findings.json',findings);
const targets=['houses.html','apartments.html','lands.html','locations/kamenolomni.html','kadastrovye-raboty.html','zhk-aleksandrovskiy-park.html','sell.html','services.html'];
csv('anchor-texts.csv',['target','source','anchor'],pages.flatMap(p=>p.links.filter(l=>l.internal&&targets.some(t=>new URL(l.href).pathname==='/'+t)).map(l=>[l.href,p.url,l.text])));
const redirects=pages.filter(p=>p.refresh);csv('redirects.csv',['from','target','target_exists','target_self_canonical','chain','in_sitemap','transport'],redirects.map(p=>{const target=new URL(p.refresh.split('url=')[1],p.url).href,t=known.get(target);return [p.url,target,!!t,t?.canonical===target,!!t?.refresh,p.sitemap,'FACT: HTML meta refresh, HTTP status проверяется в live-http.csv'];}));
console.log({findings:findings.length,duplicates:pairs.length,orphans:indexed.filter(p=>!p.incoming).length,deep:indexed.filter(p=>p.depth===null||p.depth>3).length});
