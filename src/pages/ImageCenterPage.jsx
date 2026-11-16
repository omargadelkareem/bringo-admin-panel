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
 const [search,setSearch]=useState(""),[storeFilter,setStoreFilter]=useState("all");
 const [groupsOnly,setGroupsOnly]=useState(true),[selected,setSelected]=useState({});
 const [candidates,setCandidates]=useState({}),[busy,setBusy]=useState(""),[error,setError]=useState("");
 const [overrides,setOverrides]=useState({});
 useEffect(()=>{
  const a=onValue(ref(db,"products"),s=>setProducts(Object.entries(s.val()||{}).map(([id,p])=>({firebaseKey:id,...p}))));
  const b=onValue(ref(db,"stores"),s=>setStores(Object.entries(s.val()||{}).map(([id,p])=>({firebaseKey:id,...p}))));
  return ()=>{a();b();};
 },[]);
 const missing=useMemo(()=>products.filter(p=>!p.image),[products]);
 const groups=useMemo(()=>{
  const result=new Map();
  for(const p of missing){
   if(storeFilter!=="all"&&String(p.storeId)!==storeFilter)continue;
   const name=category(p.name);
   const id=name||"unknown:"+normalize(p.name);
   if(!result.has(id))result.set(id,{id,label:name||p.name,term:name,products:[]});
   result.get(id).products.push(p);
  }
  return [...result.values()].filter(g=>(!groupsOnly||g.term)&&(!search||normalize(g.label).includes(normalize(search))||g.products.some(p=>normalize(p.name).includes(normalize(search)))))
   .sort((a,b)=>b.products.length-a.products.length);
 },[missing,storeFilter,groupsOnly,search]);
 const suggestions=useMemo(()=>{
  const map={};
  for(const p of products){
   const key=category(p.name);
   if(key&&p.image&&!map[key])map[key]=imageMeta(p);
  }
  return map;
 },[products]);
 const fetchImages=async g=>{
  setBusy(g.id);setError("");
  try{
   const query=overrides[g.id]||terms[g.term];
   if(!query)throw Error("اكتب كلمة بحث بالإنجليزي للمجموعة دي");
   const params=new URLSearchParams({action:"query",generator:"search",gsrsearch:"filetype:bitmap "+query,
    gsrnamespace:"6",gsrlimit:"15",prop:"imageinfo",iiprop:"url|extmetadata|mime",iiurlwidth:"320",format:"json",origin:"*"});
   const response=await fetch("https://commons.wikimedia.org/w/api.php?"+params);
   if(!response.ok)throw Error("فشل تحميل الصور من Wikimedia Commons");
   const json=await response.json();
   const images=Object.values(json.query?.pages||{}).map(p=>{
    const info=p.imageinfo?.[0]||{},meta=info.extmetadata||{};
    return {image:info.url||"",thumb:info.thumburl||info.url||"",imageSourceUrl:info.descriptionurl||"",
     imageLicense:String(meta.LicenseShortName?.value||""),imageLicenseUrl:String(meta.LicenseUrl?.value||""),
     imageCredit:String(meta.Artist?.value||"").replace(/<[^>]*>/g,"").slice(0,200),mime:info.mime||""};
   }).filter(x=>x.image.startsWith("https://")&&x.mime.startsWith("image/")&&knownLicense(x.imageLicense));
   setCandidates(prev=>({...prev,[g.id]:images.slice(0,8)}));
   if(!images.length)setError("مفيش صور مناسبة بترخيص مفتوح للبحث ده. جرّب كلمة تانية.");
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
 const knownCount=groups.filter(g=>suggestions[g.term]).length;
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
    <select style={{flex:1,minWidth:180}} value={storeFilter} onChange={e=>setStoreFilter(e.target.value)}>
     <option value="all">كل المتاجر</option>{stores.map(s=><option key={s.firebaseKey} value={s.firebaseKey}>{s.name||s.firebaseKey}</option>)}
    </select>
    <label style={{display:"flex",alignItems:"center",gap:6}}><input type="checkbox" checked={groupsOnly} onChange={e=>setGroupsOnly(e.target.checked)}/>المجموعات المعروفة فقط</label>
   </div>
   <p style={{marginBottom:0,fontSize:13}}>الصور الخارجية مقترحات وليست مطابقة مضمونة. اعتمد صورة واحدة لكل مجموعة، وهي تتطبق على المنتجات الناقصة في المتاجر المحددة. المنتجات ذات الصور الحالية لا تتغير.</p>
  </div>
  {error&&<p role="alert" style={{color:"#b91c1c"}}>{error}</p>}
  {groups.map(g=>{
   const suggestion=suggestions[g.term],options=candidates[g.id]||[];
   return <div className="card" key={g.id} style={{marginBottom:14}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",alignItems:"center"}}>
     <div><h3 style={{margin:"0 0 6px"}}>{g.label} <small>({g.products.length} منتج)</small></h3>
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
     <input style={{flex:1,minWidth:180}} placeholder="كلمة بحث بالإنجليزي (اختياري)" value={overrides[g.id]??terms[g.term]??""} onChange={e=>setOverrides(p=>({...p,[g.id]:e.target.value}))}/>
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
