import { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import { onValue, ref, update } from "firebase/database";

const terms = {
 "طماطم":"tomatoes","بطاطس":"potatoes","بصل احمر":"red onions","بصل ابيض":"white onions","بصل":"onions",
 "خيار":"cucumbers","جزر":"carrots","كوسه":"zucchini","باذنجان":"eggplant","فلفل":"bell peppers",
 "ليمون":"lemons","برتقال":"oranges","تفاح احمر":"red apples","تفاح اخضر":"green apples","تفاح":"apples",
 "موز":"bananas","مانجو":"mangoes","فراوله":"strawberries","عنب":"grapes","رمان":"pomegranates",
 "جوافه":"guavas","بطيخ":"watermelon","شمام":"cantaloupe","خوخ":"peaches","كمثري":"pears",
 "اناناس":"pineapple","كيوي":"kiwifruit","خس":"lettuce","كرنب":"cabbage","قرنبيط":"cauliflower",
 "بروكلي":"broccoli","سبانخ":"spinach","بقدونس":"parsley","كزبره":"coriander leaves",
 "شبت":"dill","نعناع":"mint leaves","ثوم":"garlic","بطاطا":"sweet potatoes",
 "باميه":"okra","فاصوليا":"green beans","بسله":"green peas","ملوخيه":"jute mallow"
};
const storeTypes = {restaurant:"المطاعم",pharmacy:"الصيدليات",vegetables:"الخضار والفاكهة",supermarket:"السوبر ماركت",beauty:"مستحضرات التجميل",meat:"اللحوم والدواجن",bakery:"المخابز والحلويات",fish:"الأسماك",market:"متاجر متنوعة"};
const catalog = {
 restaurant:{"بيتزا":"pizza","برجر":"burger","شاورما":"shawarma","كشري":"koshari","فراخ مشويه":"grilled chicken","كريب":"crepe","فطير":"egyptian pie","محشي":"stuffed vegetables","مكرونه":"pasta","رز":"rice dish","بطاطس محمره":"french fries","كفته":"kofta","كباب":"kebab","سندوتش":"sandwich"},
 supermarket:{"سكر":"sugar bag","ارز":"rice bag","مكرونه":"pasta package","زيت":"cooking oil bottle","دقيق":"flour bag","لبن":"milk carton","زبادي":"yogurt","جبنه":"cheese","شاي":"tea box","قهوه":"coffee","مياه":"bottled water","بيض":"eggs","تونه":"canned tuna","فول":"canned beans","عصير":"juice carton","بسكويت":"biscuits"},
 pharmacy:{"شاش":"medical gauze","قطن":"medical cotton","كمامه":"medical face mask","مطهر":"antiseptic bottle","ترمومتر":"digital thermometer","لاصق طبي":"medical tape","حفاضات":"diapers","مناديل مبلله":"wet wipes"},
 beauty:{"شامبو":"shampoo bottle","بلسم":"conditioner bottle","غسول":"facial cleanser","كريم":"skin cream jar","صابون":"soap bar","واقي شمس":"sunscreen bottle","مزيل عرق":"deodorant","عطر":"perfume bottle","روج":"lipstick","ماسكارا":"mascara","فاونديشن":"foundation makeup","بودره":"face powder","سيروم":"skincare serum"},
 meat:{"فراخ":"raw chicken","لحمه":"raw beef","كفته":"raw kofta","كبدة":"raw liver"},
 bakery:{"عيش":"bread","كيك":"cake","بسبوسه":"basbousa","كنافه":"kunafa","بقلاوه":"baklava"},
 fish:{"سمك":"fresh fish","جمبري":"shrimp","سبيط":"squid"}
};
const findCatalogTerm = (name,type) => {
 const normalized=normalize(name),dictionary=type==="vegetables"?terms:(catalog[type]||{});
 const matches=Object.keys(dictionary).sort((a,b)=>b.length-a.length);
 const key=matches.find(k=>normalized===k||normalized.startsWith(k+" "));
 return key?{key,query:dictionary[key]}:null;
};
const exactProductName = p => normalize([p.brand,p.name].filter(Boolean).join(" "));
const normalize = s => String(s||"").normalize("NFKC").replace(/[أإآ]/g,"ا").replace(/ى/g,"ي")
 .replace(/ة/g,"ه").replace(/[ًٌٍَُِّْـ]/g,"").replace(/[0-9٠-٩.,/\-]+/g," ").replace(/\s+/g," ").trim();
const keys = Object.keys(terms).sort((a,b)=>b.length-a.length);
const category = name => {const n=normalize(name);return keys.find(k=>n===k||n.startsWith(k+" "))||"";};
const knownLicense = s => /^(CC0|Public domain|CC BY(?:-SA)?(?: [0-9.]+)?)$/i.test(s);
const imageMeta = p => ({
 image:p.image,imageSourceUrl:p.imageSourceUrl||"",imageLicense:p.imageLicense||"",
 imageLicenseUrl:p.imageLicenseUrl||"",imageCredit:p.imageCredit||""
});
export default function ImageCenterPage(){
 const [products,setProducts]=useState([]),[stores,setStores]=useState([]);
 const [search,setSearch]=useState(""),[storeFilter,setStoreFilter]=useState("all"),[typeFilter,setTypeFilter]=useState("all");
 const [groupsOnly,setGroupsOnly]=useState(false),[selected,setSelected]=useState({});
 const [candidates,setCandidates]=useState({}),[busy,setBusy]=useState(""),[error,setError]=useState("");
 const [overrides,setOverrides]=useState({});
 useEffect(()=>{
  const a=onValue(ref(db,"products"),s=>setProducts(Object.entries(s.val()||{}).map(([id,p])=>({firebaseKey:id,...p}))));
  const b=onValue(ref(db,"stores"),s=>setStores(Object.entries(s.val()||{}).map(([id,p])=>({firebaseKey:id,...p}))));
  return ()=>{a();b();};
 },[]);
 const missing=useMemo(()=>products.filter(p=>!p.image),[products]);
 const storeById=useMemo(()=>Object.fromEntries(stores.map(s=>[String(s.firebaseKey),s])),[stores]);
 const typeOf=p=>p.storeType||storeById[String(p.storeId)]?.type||storeById[String(p.storeId)]?.storeType||"market";
 const groupOf=p=>{
  const type=typeOf(p),known=findCatalogTerm(p.name,type);
  // Packaged and branded products must match by exact product identity, not a broad category.
  const strict=["supermarket","pharmacy","beauty"].includes(type);
  const key=strict?exactProductName(p):(known?.key||exactProductName(p));
  return {id:type+":"+key,label:strict?p.name:(known?.key||p.name),term:strict?"":(known?.key||""),query:strict?"":(known?.query||""),type,products:[]};
 };
 const groups=useMemo(()=>{
  const result=new Map();
  for(const p of missing){
   if(storeFilter!=="all"&&String(p.storeId)!==storeFilter)continue;
   if(typeFilter!=="all"&&typeOf(p)!==typeFilter)continue;
   const g=groupOf(p);
   if(!result.has(g.id))result.set(g.id,g);
   result.get(g.id).products.push(p);
  }
  return [...result.values()].filter(g=>(!groupsOnly||g.query)&&(!search||normalize(g.label).includes(normalize(search))||g.products.some(p=>normalize(p.name).includes(normalize(search)))))
   .sort((a,b)=>b.products.length-a.products.length);
 },[missing,storeFilter,typeFilter,groupsOnly,search,stores]);
 const suggestions=useMemo(()=>{
  const map={};
  for(const p of products){
   if(!p.image)continue;
   const g=groupOf(p);
   if(!map[g.id])map[g.id]=imageMeta(p);
  }
  return map;
 },[products,stores]);
 const translateArabicTerm = async term => {
  if (!/[\u0600-\u06FF]/.test(term)) return "";
  try {
   const params = new URLSearchParams({action:"wbsearchentities",search:term,language:"ar",uselang:"ar",limit:"3",format:"json",origin:"*"});
   const response = await fetch("https://www.wikidata.org/w/api.php?"+params);
   if (!response.ok) return "";
   const data = await response.json();
   const match = (data.search||[]).find(x=>normalize(x.label)===normalize(term)) || data.search?.[0];
   if (!match?.id) return "";
   const details = new URLSearchParams({action:"wbgetentities",ids:match.id,props:"labels",languages:"en",format:"json",origin:"*"});
   const entityResponse = await fetch("https://www.wikidata.org/w/api.php?"+details);
   if (!entityResponse.ok) return "";
   const entity = await entityResponse.json();
   return entity.entities?.[match.id]?.labels?.en?.value || "";
  } catch { return ""; }
 };
 const searchCommons = async query => {
   const params = new URLSearchParams({action:"query",generator:"search",gsrsearch:"filetype:bitmap "+query,
    gsrnamespace:"6",gsrlimit:"24",prop:"imageinfo",iiprop:"url|extmetadata|mime",iiurlwidth:"320",format:"json",origin:"*"});
   const response = await fetch("https://commons.wikimedia.org/w/api.php?"+params);
   if(!response.ok)throw Error("تعذر الاتصال بمكتبة الصور");
   const json = await response.json();
   return Object.values(json.query?.pages||{}).map(p=>{
    const info=p.imageinfo?.[0]||{},meta=info.extmetadata||{};
    return {image:info.url||"",thumb:info.thumburl||info.url||"",imageSourceUrl:info.descriptionurl||"",
     imageLicense:String(meta.LicenseShortName?.value||""),imageLicenseUrl:String(meta.LicenseUrl?.value||""),
     imageCredit:String(meta.Artist?.value||"").replace(/<[^>]*>/g,"").slice(0,200),mime:info.mime||""};
   }).filter(x=>x.image.startsWith("https://")&&x.mime.startsWith("image/")&&knownLicense(x.imageLicense));
 };
 const fetchImages=async g=>{
  setBusy(g.id);setError("");
  try{
   // Arabic is the primary input. Existing English keywords are an optional fallback.
   const typed=String(overrides[g.id]??"").trim();
   const original=typed||String(g.label||"").trim();
   const english=await translateArabicTerm(original);
   const queries=[original,english,(!typed?g.query:"")].filter((x,i,a)=>x&&a.indexOf(x)===i);
   if(!queries.length)throw Error("اكتب اسم المنتج بالعربي");
   const results=[];
   for(const query of queries){
    const images=await searchCommons(query);
    for(const item of images)if(!results.some(x=>x.image===item.image))results.push(item);
    if(results.length>=8)break;
   }
   setCandidates(prev=>({...prev,[g.id]:results.slice(0,8)}));
   if(!results.length)setError("ملقيناش صور مناسبة للاسم ده. جرّب الاسم التجاري أو اسم المادة الفعالة بالعربي، ومش مطلوب منك تكتب إنجليزي.");
  }catch(e){setError(e.message);}finally{setBusy("");}
 };
 const apply=async(g,photo)=>{
  if(!photo?.image)return;
  if(!window.confirm(`تطبيق الصورة على ${g.products.length} منتج بدون صور من جميع المتاجر المحددة؟`))return;
  setBusy(g.id);setError("");
  try{
   const patch={};
   for(const p of g.products){
    for(const [field,value] of Object.entries(photo))if(["image","imageSourceUrl","imageLicense","imageLicenseUrl","imageCredit"].includes(field))
      patch[`products/${p.firebaseKey}/${field}`]=value;
    patch[`products/${p.firebaseKey}/updatedAt`]=Date.now();
   }
   await update(ref(db),patch);
   setSelected(prev=>({...prev,[g.id]:undefined}));
  }catch(e){setError("فشل حفظ الصور: "+e.message);}finally{setBusy("");}
 };
 const knownCount=groups.filter(g=>suggestions[g.id]).length;
 return <div dir="rtl" style={{paddingBottom:40}}>
  <div className="page-header"><div><h1 className="page-title">مركز صور المنتجات</h1>
   <p className="page-subtitle">إدارة موحدة لكل المتاجر — مطابقة جماعية بعد مراجعة صورة واحدة لكل نوع، دون تغيير الصور الموجودة</p></div></div>
  <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:20}}>
   {[["إجمالي المنتجات",products.length],["بدون صور",missing.length],["مجموعات تحتاج مراجعة",groups.length],["مجموعات لها صور موجودة",knownCount]].map(([name,value])=>
    <div className="card" key={name} style={{padding:18,minWidth:175,flex:1}}><div style={{fontSize:25,fontWeight:800}}>{value}</div><div>{name}</div></div>)}
  </div>
  <div className="card" style={{marginBottom:18}}>
   <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
    <input style={{flex:2,minWidth:180}} placeholder="بحث باسم المنتج" value={search} onChange={e=>setSearch(e.target.value)}/>
    <select style={{flex:1,minWidth:150}} value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>
     <option value="all">كل الأنشطة</option>{Object.entries(storeTypes).map(([id,name])=><option key={id} value={id}>{name}</option>)}
    </select>
    <select style={{flex:1,minWidth:180}} value={storeFilter} onChange={e=>setStoreFilter(e.target.value)}>
     <option value="all">كل المتاجر</option>{stores.map(s=><option key={s.firebaseKey} value={s.firebaseKey}>{s.name||s.firebaseKey}</option>)}
    </select>
    <label style={{display:"flex",alignItems:"center",gap:6}}><input type="checkbox" checked={groupsOnly} onChange={e=>setGroupsOnly(e.target.checked)}/>المجموعات ذات اقتراح بحث جاهز فقط</label>
   </div>
   <p style={{marginBottom:0,fontSize:13}}>في السوبر ماركت والصيدليات والتجميل، المطابقة بالاسم والماركة وليس بمجرد نوع المنتج. البحث بالعربي متاح، ولا يحتاج معرفة الاسم بالإنجليزي. اكتب اسم المنتج بالعربي عند الحاجة، والنظام يحاول إيجاد مقابله بالإنجليزي تلقائيًا. الصور الخارجية مقترحات وليست مطابقة مضمونة. اعتمد صورة واحدة لكل مجموعة، وهي تتطبق على المنتجات الناقصة في المتاجر المحددة. المنتجات ذات الصور الحالية لا تتغير.</p>
  </div>
  {error&&<p role="alert" style={{color:"#b91c1c"}}>{error}</p>}
  {groups.map(g=>{
   const suggestion=suggestions[g.id],options=candidates[g.id]||[];
   return <div className="card" key={g.id} style={{marginBottom:14}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",alignItems:"center"}}>
     <div><h3 style={{margin:"0 0 6px"}}>{g.label} <small>— {storeTypes[g.type]||g.type}</small> <small>({g.products.length} منتج)</small></h3>
      <small>{[...new Set(g.products.map(p=>p.storeName||stores.find(s=>s.firebaseKey===String(p.storeId))?.name||"متجر"))].slice(0,6).join("، ")}</small></div>
     <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      {suggestion&&<button type="button" disabled={!!busy} onClick={()=>apply(g,suggestion)}>استخدم الصورة الموجودة لكل المجموعة</button>}
      <button type="button" disabled={!!busy} onClick={()=>fetchImages(g)}>{busy===g.id?"جاري المعالجة...":"اقترح صور"}</button>
     </div>
    </div>
    {suggestion&&<div style={{display:"flex",alignItems:"center",gap:8,marginTop:12}}>
     <img src={suggestion.image} alt={g.label} style={{width:68,height:68,objectFit:"contain",borderRadius:8}}/>
     <small>صورة موجودة بالفعل لمنتج من نفس النوع — راجعها قبل التعميم</small></div>}
    <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>
     <input style={{flex:1,minWidth:180}} placeholder="اكتب اسم المنتج بالعربي (اختياري)" value={overrides[g.id]??""} onChange={e=>setOverrides(p=>({...p,[g.id]:e.target.value}))}/>
     <small style={{alignSelf:"center"}}>أمثلة: {g.products.slice(0,3).map(p=>p.name).join("، ")}</small>
    </div>
    {options.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(145px,1fr))",gap:12,marginTop:14}}>
     {options.map((o,i)=><div key={o.image} style={{border:"1px solid #ddd",borderRadius:12,padding:8}}>
      <img src={o.thumb} alt={g.label} loading="lazy" style={{width:"100%",height:120,objectFit:"contain"}}/>
      <small style={{display:"block"}}>{o.imageLicense}</small><a href={o.imageSourceUrl} target="_blank" rel="noreferrer">المصدر والترخيص</a>
      <button type="button" style={{width:"100%",marginTop:8}} disabled={!!busy} onClick={()=>apply(g,o)}>اعتماد للمجموعة</button>
     </div>)}
    </div>}
   </div>;
  })}
  {!groups.length&&<div className="card">لا توجد مجموعات ناقصة مطابقة للفلاتر الحالية.</div>}
 </div>;
}
