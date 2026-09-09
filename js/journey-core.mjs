export const STYLES = { nature:'자연', water:'물과 바다', culture:'문화와 역사', cafe:'카페', food:'먹거리' };
const places = rows => rows.map(([name,tags,minutes=70,allowance=0,walking=false,strenuous=false])=>({name,tags:tags.split(' '),minutes,allowance,walking,strenuous}));
export const REGIONS = [
 {id:'chuncheon',name:'춘천',phrase:'물가를 따라 쉬어가는 하루',tags:['water','nature','cafe'],source:'https://www.chuncheon.go.kr/tour/destination/all-tour/',places:places([['소양강스카이워크','water nature',60,5000,true],['의암 스카이워크','water nature',60,0,false],['공지천','water nature',80,0,true],['춘천 명동','food cafe',70,15000,true],['삼악산 호수케이블카','nature',100,35000,false],['김유정문학촌','culture',70,5000,false]])},
 {id:'gangneung',name:'강릉',phrase:'호수와 오래된 집을 천천히',tags:['water','cafe','culture'],source:'https://www.gn.go.kr/tour/index.do',places:places([['경포호','water nature',80,0,true],['오죽헌','culture',80,5000,false],['경포대','water culture',50,0,true],['선교장','culture',90,7000,false],['안목해변','water cafe',90,8000,false],['강릉 중앙시장','food',70,15000,false]])},
 {id:'sokcho',name:'속초',phrase:'호수에서 바다로 이어지는 풍경',tags:['water','food','nature'],source:'https://korean.visitkorea.or.kr/detail/rem_detail.do?cotid=a8053d21-6a53-4e59-922e-1c62a60bec49',places:places([['청초호 호수공원','water nature',70,0,true],['아바이마을','culture food',90,15000,true],['영금정','water nature',60,0,false],['속초해수욕장','water',90,0,false],['속초관광수산시장','food',80,15000,true],['영랑호','water nature',100,0,false]])},
 {id:'wonju',name:'원주',phrase:'기억과 재료를 살펴보는 시간',tags:['culture','nature'],source:'https://www.wonju.go.kr/tour/index.do',places:places([['강원감영','culture',60,0,true],['원주 역사박물관','culture',80,0,true],['박경리문학공원','culture nature',70,0,false],['한지테마파크','culture',80,10000,true],['구룡사','nature culture',100,5000,false,true],['소금산그랜드밸리','nature',150,20000,false,true]])},
 {id:'cheorwon',name:'철원',phrase:'돌과 강, 넓은 풍경의 간격',tags:['nature','water','culture'],source:'https://www.cwg.go.kr/tour/contents.do?key=1809',places:places([['고석정','nature water',90,0,false],['철원 한탄강 주상절리길','nature water',110,15000,false,true],['철원역사문화공원','culture',90,0,true],['철원 노동당사','culture',45,0,true],['소이산','nature',90,0,true,true],['승일교','water culture',40,0,false]])},
 {id:'yeongwol',name:'영월',phrase:'강의 굽이를 따라 남기는 기록',tags:['nature','culture','water'],source:'https://www.yw.go.kr/tour/contents.do?key=573',places:places([['청령포','nature culture',90,5000,false],['장릉','culture nature',80,5000,false],['선돌','nature water',60,0,false],['한반도지형','nature water',90,0,false,true],['동강사진박물관','culture',80,5000,true],['영월 서부시장','food',70,15000,true]])},
];
export const clone = value => JSON.parse(JSON.stringify(value));
export function dateRange(start,end) {
 const valid = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s+'T00:00:00Z')) && new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
 if(!valid(start)||!valid(end)) throw new Error('여행 날짜를 확인해 주세요.');
 const count=(Date.parse(end+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/86400000+1;
 if(count<1||count>7) throw new Error('마지막 날은 출발일 이후로, 여행은 최대 7일까지 설정해 주세요.');
 return Array.from({length:count},(_,i)=>new Date(Date.parse(start+'T00:00:00Z')+i*86400000).toISOString().slice(0,10));
}
export function recommendations(config) {
 return REGIONS.map(region=>{const matched=region.tags.filter(t=>config.styles.includes(t));const accessible=region.places.filter(p=>!config.avoidWalk||!p.strenuous).length;return {region,score:matched.length*10+accessible+(config.transport==='walk'?region.places.filter(p=>p.walking).length*2:0),reason:matched.length?matched.map(t=>STYLES[t]).join(' · ')+' 취향과 맞아요.':'지역의 문화와 풍경을 함께 살펴볼 수 있어요.'}}).sort((a,b)=>b.score-a.score);
}
export function buildPlan(config) {
 const dates=dateRange(config.start,config.end);
 if(!Number.isInteger(config.people)||config.people<1||config.people>12)throw new Error('여행 인원은 1~12명으로 설정해 주세요.');
 if(!Number.isFinite(config.budget)||config.budget<0||config.budget>100000000)throw new Error('전체 예산을 확인해 주세요.');
 const region=REGIONS.find(r=>r.id===config.region)||recommendations(config)[0].region;
 const max={slow:2,normal:3,full:4}[config.pace]||2;
 let pool=region.places.filter(p=>(!config.avoidWalk||!p.strenuous)&&(config.transport!=='walk'||p.walking)).sort((a,b)=>b.tags.filter(t=>config.styles.includes(t)).length-a.tags.filter(t=>config.styles.includes(t)).length);
 const extra=config.must.split(/[,\n]/).map(s=>s.trim()).filter(Boolean).slice(0,5);
 pool=[...extra.map(name=>({name:name.slice(0,80),tags:['custom'],minutes:60,allowance:0})),...pool.filter(p=>!extra.includes(p.name))];
 let cursor=0;
 const id=()=>`item-${cursor++}`;
 const days=dates.map((date,index)=>{
   const picks=pool.splice(0,max);
   const items=picks.map(p=>({id:id(),name:p.name,duration:p.minutes,cost:p.allowance*config.people,category:p.tags[0],note:'',done:false}));
   items.splice(Math.min(1,items.length),0,{id:id(),name:'점심과 휴식',duration:80,cost:15000*config.people,category:'food',note:'식당은 당일의 동선에 맞춰 정해 보세요.',done:false});
   if(picks.length<max)items.push({id:id(),name:'비워둔 시간',duration:90,cost:0,category:'rest',note:'추천 장소를 반복하지 않고 자유시간으로 남겼습니다. 직접 장소를 추가할 수 있어요.',done:false});
   return {date,start:'10:00',items};
 });
 return {version:1,title:`${region.name} ${dates.length===1?'하루':dates.length+'일'}의 기록`,region:region.id,config:{...config,region:region.id},lodging:Math.max(0,dates.length-1)*90000*Math.ceil(config.people/2),transportCost:dates.length*({car:40000,public:10000*config.people,walk:0,taxi:60000}[config.transport]??0),days,checked:[]};
}
export function totals(plan) {const visits=plan.days.flatMap(d=>d.items).reduce((s,i)=>s+i.cost,0);const total=visits+plan.lodging+plan.transportCost;return {visits,total,perPerson:Math.ceil(total/plan.config.people),remaining:plan.config.budget-total};}
export function timeline(day,transport) {
 let time=Number(day.start.slice(0,2))*60+Number(day.start.slice(3));
 const buffer={car:30,public:45,walk:35,taxi:25}[transport]??30;
 return day.items.map((item,i)=>{const start=time;time+=item.duration;const end=time;time+=buffer;return {...item,start,end,gap:i?buffer:0}});
}
export const clock = n => `${String(Math.floor(n/60)%24).padStart(2,'0')}:${String(n%60).padStart(2,'0')}${n>=1440?' (다음 날)':''}`;
export function validatePlan(input) {
 if(!input||input.version!==1||typeof input.title!=='string'||input.title.length>100||!REGIONS.some(r=>r.id===input.region)||!input.config)throw new Error('일정 파일 형식을 확인해 주세요.');
 const {config}=input;dateRange(config.start,config.end);
 if(!Array.isArray(config.styles)||config.styles.some(s=>!Object.hasOwn(STYLES,s))||!['slow','normal','full'].includes(config.pace)||typeof config.must!=='string'||config.must.length>300||typeof config.avoidWalk!=='boolean'||config.region!==input.region)throw new Error('일정의 선호 조건을 확인해 주세요.');
 if(!Number.isInteger(config.people)||config.people<1||config.people>12||!Number.isFinite(config.budget)||config.budget<0||config.budget>1e8||!['car','walk','taxi','public'].includes(config.transport))throw new Error('일정 조건이 올바르지 않습니다.');
 const dates=dateRange(config.start,config.end);
 if(!Array.isArray(input.days)||input.days.length!==dates.length||!Number.isFinite(input.lodging)||input.lodging<0||input.lodging>1e8||!Number.isFinite(input.transportCost)||input.transportCost<0||input.transportCost>1e8)throw new Error('일정 비용 또는 날짜를 확인해 주세요.');
 for(const [index,day] of input.days.entries()){
  if(day.date!==dates[index]||!/^([01]\d|2[0-3]):[0-5]\d$/.test(day.start)||!Array.isArray(day.items)||day.items.length>12)throw new Error('하루 일정 형식이 올바르지 않습니다.');
  for(const i of day.items)if(typeof i.id!=='string'||i.id.length>100||typeof i.name!=='string'||i.name.length>80||typeof i.note!=='string'||i.note.length>500||typeof i.category!=='string'||!Number.isInteger(i.duration)||i.duration<10||i.duration>480||!Number.isFinite(i.cost)||i.cost<0||i.cost>1e8)throw new Error('장소 정보의 형식을 확인해 주세요.');
 }
 if(input.checked!==undefined&&(!Array.isArray(input.checked)||input.checked.some(v=>typeof v!=='string')))throw new Error('준비물 정보가 올바르지 않습니다.');
 return clone(input);
}
const escapeICS = text => String(text).replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
export function calendar(plan) {
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//MA//Journey//KO','CALSCALE:GREGORIAN'];
 const utc=(date,minutes)=>new Date(Date.parse(date+'T00:00:00+09:00')+minutes*60000).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
 for(const day of plan.days)for(const [index,item] of timeline(day,plan.config.transport).entries())lines.push('BEGIN:VEVENT',`UID:${day.date}-${index}-${plan.region}@ma-journey`,`DTSTAMP:${utc(day.date,0)}`,`DTSTART:${utc(day.date,item.start)}`,`DTEND:${utc(day.date,item.end)}`,`SUMMARY:${escapeICS(item.name)}`,`LOCATION:${escapeICS(REGIONS.find(r=>r.id===plan.region).name+' '+item.name)}`,`DESCRIPTION:${escapeICS(item.note+'\nMA에서 작성한 계획입니다. 방문 가능 여부는 별도로 확인해 주세요.')}`,'END:VEVENT');
 lines.push('END:VCALENDAR');
 const encoder=new TextEncoder();
 const folded=lines.map(line=>{let current='',bytes=0,parts=[];for(const char of line){const size=encoder.encode(char).length;if(bytes+size>75){parts.push(current);current=' ';bytes=1;}current+=char;bytes+=size;}parts.push(current);return parts.join('\r\n');});
 return folded.join('\r\n')+'\r\n';
}
