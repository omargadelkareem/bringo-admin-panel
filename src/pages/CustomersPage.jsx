import {useEffect,useMemo,useState} from "react";
import {onValue,ref} from "firebase/database";
import {db} from "../firebase";
import {Search,Users,MessageCircle} from "lucide-react";
import "../admin-v2.css";
function whatsapp(phone){const n=String(phone||"").replace(/\D/g,"");return /^01\d{9}$/.test(n)?"2"+n:/^201\d{9}$/.test(n)?n:null;}
export default function CustomersPage(){
 const[users,setUsers]=useState([]),[query,setQuery]=useState(""),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>onValue(ref(db,"users"),snap=>{setUsers(Object.entries(snap.val()||{}).map(([id,v])=>({id,name:String(v?.name||"عميل برينجو"),phone:String(v?.phone||""),address:String(v?.address||""),createdAt:Number(v?.createdAt||0)})).sort((a,b)=>b.createdAt-a.createdAt));setLoading(false);},()=>{setError("تعذر قراءة العملاء. تحقق من صلاحيات Firebase.");setLoading(false);}),[]);
 const filtered=useMemo(()=>users.filter(u=>[u.name,u.phone,u.address].some(v=>v.toLowerCase().includes(query.toLowerCase().trim()))),[users,query]);
 return <div className="v2-page" dir="rtl">
 <div className="v2-page-head"><div><span className="v2-eyebrow">BRINGO CUSTOMERS</span><h1>العملاء المسجلون</h1><p>كل الحسابات المسجلة في تطبيق برينجو والتواصل الفردي عبر واتساب.</p></div><div className="v2-head-total"><span>إجمالي العملاء</span><strong>{users.length}</strong></div></div>
 <div className="orders-control"><div className="orders-search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="بحث بالاسم أو الهاتف أو العنوان..."/></div><div className="filter-label"><Users size={16}/> {filtered.length} عميل</div></div>
 {error&&<p role="alert">{error}</p>}
 {loading?<p>جاري التحميل...</p>:<div className="orders-table-card"><div className="orders-table-wrap"><table className="orders-v2-table"><thead><tr><th>الاسم</th><th>الهاتف</th><th>العنوان</th><th>تاريخ التسجيل</th><th>واتساب</th></tr></thead><tbody>{filtered.map(u=><tr key={u.id}><td><strong>{u.name}</strong></td><td dir="ltr">{u.phone||"—"}</td><td>{u.address||"—"}</td><td>{u.createdAt?new Date(u.createdAt).toLocaleDateString("ar-EG"):"—"}</td><td>{whatsapp(u.phone)?<a className="icon-action" href={`https://wa.me/${whatsapp(u.phone)}`} target="_blank" rel="noopener noreferrer" title="مراسلة العميل"><MessageCircle size={19}/></a>:"—"}</td></tr>)}</tbody></table>{!filtered.length&&<div className="v2-empty">لا توجد نتائج</div>}</div></div>}
 <p style={{fontSize:12,opacity:.75,marginTop:12}}>استخدم التواصل مع العملاء بموافقتهم فقط، وتجنب الرسائل التسويقية غير المرغوبة.</p>
 </div>;
}