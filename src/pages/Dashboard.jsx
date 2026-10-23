import { useEffect, useMemo, useState } from "react";
import { ArrowUpLeft, Bike, CheckCircle2, Clock3, CreditCard, Package, ShoppingBag, Store, TrendingUp } from "lucide-react";
import { db } from "../firebase";
import { onValue, ref } from "firebase/database";
import "../dashboard-redesign.css";

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [drivers, setDrivers] = useState([]);

  useEffect(() => {
    const unsubOrders = onValue(ref(db, "orders"), s => {
      const list = Object.entries(s.val() || {}).map(([firebaseKey, value]) => ({ firebaseKey, ...value }));
      list.sort((a,b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
      setOrders(list);
    });
    const unsubProducts = onValue(ref(db, "products"), s => setProducts(Object.values(s.val() || {})));
    const unsubCategories = onValue(ref(db, "categories"), s => setCategories(Object.values(s.val() || {})));
    const unsubDrivers = onValue(ref(db, "drivers"), s => setDrivers(Object.values(s.val() || {})));
    return () => { unsubOrders(); unsubProducts(); unsubCategories(); unsubDrivers(); };
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const sameDay = t => { const d = new Date(Number(t || 0)); return d.toDateString() === now.toDateString(); };
    const sameMonth = t => { const d = new Date(Number(t || 0)); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); };
    const completed = orders.filter(o => normalizeStatus(o) === "completed");
    const today = orders.filter(o => sameDay(o.createdAt));
    const active = orders.filter(o => ["pending","confirmed","preparing","ready","assigned","pickedUp","onDelivery"].includes(normalizeStatus(o)));
    const todaySales = completed.filter(o => sameDay(o.createdAt)).reduce((s,o) => s + Number(o.total || 0),0);
    const monthSales = completed.filter(o => sameMonth(o.createdAt)).reduce((s,o) => s + Number(o.total || 0),0);
    return {
      total: orders.length, today: today.length, active: active.length, completed: completed.length,
      todaySales, monthSales, products: products.length, categories: categories.length, drivers: drivers.length,
      completion: orders.length ? Math.round((completed.length/orders.length)*100) : 0,
      avgOrder: completed.length ? Math.round(completed.reduce((s,o)=>s+Number(o.total||0),0)/completed.length) : 0,
    };
  }, [orders, products, categories, drivers]);

  const flow = useMemo(() => {
    const count = (...states) => orders.filter(o => states.includes(normalizeStatus(o))).length;
    return [
      ["طلبات جديدة", count("pending","confirmed")], ["جاري التجهيز", count("preparing")], ["جاهزة للاستلام", count("ready")],
      ["مع الطيار", count("assigned","pickedUp","onDelivery")], ["تم التسليم", count("completed")]
    ];
  }, [orders]);

  const topProducts = useMemo(() => {
    const map = {};
    orders.forEach(o => parseItems(o.items).forEach(i => { const name=i.name||"منتج غير معروف"; map[name]=(map[name]||0)+Number(i.quantity||1); }));
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,5);
  }, [orders]);

  return <div className="bringo-dashboard" dir="rtl">
    <section className="bd-welcome">
      <div className="bd-hero">
        <div className="bd-live"><i /> مركز عمليات Bringo مباشر</div>
        <h1>كل عمليات Bringo قدامك في شاشة واحدة.</h1>
        <p>تابع الطلبات من لحظة وصولها للمتجر لحد التسليم، وراقب المبيعات والطيارين وأداء التشغيل لحظيًا.</p>
      </div>
      <div className="bd-revenue">
        <span className="bd-revenue-label">مبيعات الشهر</span>
        <strong>{stats.monthSales.toLocaleString()} ج.م</strong>
        <div className="bd-revenue-foot"><span>متوسط الطلب <b>{stats.avgOrder.toLocaleString()} ج</b></span><span>إتمام <b>{stats.completion}%</b></span></div>
      </div>
    </section>

    <section className="bd-kpis">
      <Kpi icon={ShoppingBag} label="طلبات اليوم" value={stats.today} hint={`${stats.total} طلب إجمالي`} />
      <Kpi icon={Clock3} label="قيد التنفيذ" value={stats.active} hint="تحتاج متابعة تشغيلية" tone="warn" />
      <Kpi icon={CheckCircle2} label="تم التسليم" value={stats.completed} hint={`${stats.completion}% معدل الإتمام`} tone="good" />
      <Kpi icon={CreditCard} label="مبيعات اليوم" value={`${stats.todaySales.toLocaleString()} ج`} hint={`متوسط ${stats.avgOrder.toLocaleString()} ج`} tone="money" />
    </section>

    <section className="bd-section">
      <Head title="حركة الطلبات الآن" subtitle="لقطة سريعة لمراحل التشغيل الحالية" />
      <div className="bd-flow">{flow.map(([label,value],i)=><div className={`bd-flow-card ${i===0&&value>0?"active":""}`} key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    </section>

    <section className="bd-grid">
      <div className="bd-section">
        <Head title="آخر الطلبات" subtitle="أحدث العمليات المسجلة على Bringo" link="/orders" />
        <div className="bd-orders">{orders.slice(0,8).length ? orders.slice(0,8).map(o => <div className="bd-order" key={o.firebaseKey}>
          <div className="bd-person"><div className="bd-avatar">{(o.customerName||"B").trim().charAt(0).toUpperCase()}</div><div><strong>{o.customerName||"عميل Bringo"}</strong><span>#{String(o.id||o.firebaseKey).slice(-6)}</span></div></div>
          <div className="bd-order-meta"><b>{o.storeName||"متجر Bringo"}</b><span>{Number(o.total||0).toLocaleString()} جنيه</span></div>
          <Status status={normalizeStatus(o)} />
        </div>) : <div className="bd-empty">لا توجد طلبات حتى الآن</div>}</div>
      </div>

      <div className="bd-side">
        <div className="bd-section"><Head title="الأكثر طلبًا" subtitle="أعلى المنتجات حركة" /><div className="bd-ranking">{topProducts.length ? topProducts.map(([name,value],i)=><div className="bd-rank-row" key={name}><span className="bd-rank-no">{i+1}</span><span className="bd-rank-name">{name}</span><span className="bd-rank-value">{value} قطعة</span></div>) : <div className="bd-empty">لا توجد بيانات كافية</div>}</div></div>
        <div className="bd-section"><Head title="نظرة على المنصة" subtitle="حجم الكتالوج والتشغيل" /><div className="bd-ranking">
          <Quick icon={Bike} label="الطيارين" value={stats.drivers}/><Quick icon={Package} label="المنتجات" value={stats.products}/><Quick icon={Store} label="الأقسام" value={stats.categories}/><Quick icon={TrendingUp} label="معدل الإتمام" value={`${stats.completion}%`}/>
        </div></div>
      </div>
    </section>
  </div>;
}

function Head({title,subtitle,link}) { return <div className="bd-section-head"><div><h2>{title}</h2><p>{subtitle}</p></div>{link&&<a className="bd-link" href={link}>عرض الكل <ArrowUpLeft size={13}/></a>}</div>; }
function Kpi({icon:Icon,label,value,hint,tone=""}) { return <div className={`bd-kpi ${tone}`}><div className="bd-kpi-icon"><Icon size={20}/></div><div className="bd-kpi-copy"><span>{label}</span><strong>{value}</strong><small>{hint}</small></div></div>; }
function Quick({icon:Icon,label,value}) { return <div className="bd-rank-row"><span className="bd-rank-no"><Icon size={13}/></span><span className="bd-rank-name">{label}</span><span className="bd-rank-value">{value}</span></div>; }
function Status({status}) { const labels={pending:"جديد",confirmed:"تم القبول",preparing:"جاري التجهيز",ready:"جاهز",assigned:"تم تعيين طيار",pickedUp:"استلمه الطيار",onDelivery:"في الطريق",completed:"تم التسليم",cancelled:"ملغي"}; return <span className={`bd-pill ${status}`}>{labels[status]||"جديد"}</span>; }
function normalizeStatus(order){const raw=String(order?.orderStatus||order?.status||"pending").replaceAll("_","").replaceAll("-","").toLowerCase();const a={pendingprovider:"pending",new:"pending",accepted:"confirmed",confirmed:"confirmed",preparing:"preparing",ready:"ready",assigned:"assigned",picked:"pickedUp",pickedup:"pickedUp",way:"onDelivery",ondelivery:"onDelivery",delivered:"completed",done:"completed",completed:"completed",rejected:"cancelled",cancelled:"cancelled",canceled:"cancelled"};return a[raw]||raw||"pending";}
function parseItems(v){if(!v)return[];if(Array.isArray(v))return v;if(typeof v==="object")return Object.values(v);return[];}
