import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../firebase";
import { ref, push, set, onValue, remove, update } from "firebase/database";
import * as XLSX from "xlsx";
import Papa from "papaparse";

const storeTypeConfig = {
  restaurant: {
    title: "المطاعم",
    singular: "مطعم",
    productLabel: "الوجبة",
    defaultUnit: "وجبة",
    categoryId: "restaurants",
    categoryName: "المطاعم",
    units: ["وجبة", "قطعة", "ساندوتش", "طبق", "علبة", "مشروب"],
  },
  pharmacy: {
    title: "الصيدليات",
    singular: "صيدلية",
    productLabel: "المنتج",
    defaultUnit: "قطعة",
    categoryId: "pharmacy",
    categoryName: "الصيدلية",
    units: ["قطعة", "علبة", "شريط", "زجاجة", "كيس", "عبوة"],
  },
  vegetables: {
    title: "الخضار والفاكهة",
    singular: "محل خضار وفاكهة",
    productLabel: "المنتج",
    defaultUnit: "كيلو",
    categoryId: "vegetables",
    categoryName: "خضروات وفواكه",
    units: ["كيلو", "نصف كيلو", "ربع كيلو", "قطعة", "ربطة", "كيس", "صندوق"],
  },
};

const createEmptyForm = (storeType = "restaurant") => {
  const config = storeTypeConfig[storeType] || storeTypeConfig.restaurant;

  return {
    name: "",
    brand: "",
    price: "",
    oldPrice: "",
    image: "",
    stock: "",
    unit: config.defaultUnit,
    menuCategoryName: "",
    description: "",
    isAvailable: true,
    isBestSeller: false,
    isOffer: false,
  };
};

export default function StoreProductsPage() {
  const { storeId } = useParams();
  const navigate = useNavigate();

  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(createEmptyForm());
  const [editForm, setEditForm] = useState(createEmptyForm());
  const [editingProduct, setEditingProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [imagePickerProduct, setImagePickerProduct] = useState(null);
  const [imageCandidates, setImageCandidates] = useState([]);
  const [imageSearch, setImageSearch] = useState("");
  const [imageSearching, setImageSearching] = useState(false);
  const [imageSaving, setImageSaving] = useState(false);
  const [imageError, setImageError] = useState("");
  const [applyToVariants, setApplyToVariants] = useState(true);

  const normalizeProduceName = (value) => String(value || "")
    .normalize("NFKC").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي")
    .replace(/ة/g, "ه").replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/\\b(كيلو|كجم|جرام|جم|نصف|ربع|واحد|اتنين|ثلاثة|قطعة|ربطة|كيس|عبوة|صندوق)\\b/gi, " ")
    .replace(/[0-9٠-٩.,/\\-]+/g, " ").replace(/\\s+/g, " ").trim();

  const produceEnglish = {
    "طماطم":"tomatoes", "طماطم بلدي":"tomatoes", "بطاطس":"potatoes",
    "بصل":"onions", "بصل احمر":"red onions", "بصل ابيض":"white onions",
    "خيار":"cucumbers", "جزر":"carrots", "كوسه":"zucchini",
    "باذنجان":"eggplant", "فلفل":"bell pepper", "فلفل اخضر":"green peppers",
    "ليمون":"lemons", "برتقال":"oranges", "تفاح":"apples",
    "تفاح احمر":"red apples", "تفاح اخضر":"green apples",
    "موز":"bananas", "مانجو":"mangoes", "فراوله":"strawberries",
    "عنب":"grapes", "رمان":"pomegranates", "جوافه":"guavas",
    "بطيخ":"watermelon", "شمام":"cantaloupe", "خوخ":"peaches",
    "كمثرى":"pears", "اناناس":"pineapple", "كيوي":"kiwifruit",
    "خس":"lettuce", "كرنب":"cabbage", "قرنبيط":"cauliflower",
    "بروكلي":"broccoli", "سبانخ":"spinach", "بقدونس":"parsley",
    "كزبره":"coriander leaves", "شبت":"dill", "نعناع":"mint leaves",
    "ثوم":"garlic", "بطاطا":"sweet potato", "باميه":"okra",
    "فاصوليا":"green beans", "بسله":"green peas", "ملوخيه":"jute mallow"
  };

  const findProduceTerm = (name) => {
    const normalized = normalizeProduceName(name);
    const keys = Object.keys(produceEnglish).sort((a,b)=>b.length-a.length);
    return keys.find(key => normalized === key || normalized.startsWith(key + " ")) || "";
  };

  const missingImageCount = products.filter(p => !p.image).length;

  const searchCommonsImages = async (product, customQuery) => {
    setImageSearching(true); setImageError(""); setImageCandidates([]);
    try {
      const term = findProduceTerm(product.name);
      const query = String(customQuery || "").trim() || (term ? produceEnglish[term] : "");
      if (!query) throw new Error("المنتج غير معروف في قاموس الخضار والفاكهة. اكتب اسم البحث بالإنجليزي يدويًا.");
      const params = new URLSearchParams({
        action:"query", generator:"search", gsrsearch:`filetype:bitmap ${query}`,
        gsrnamespace:"6", gsrlimit:"12", prop:"imageinfo",
        iiprop:"url|extmetadata|mime", iiurlwidth:"360",
        format:"json", origin:"*"
      });
      const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`);
      if (!response.ok) throw new Error("تعذر الاتصال بمكتبة Wikimedia Commons");
      const json = await response.json();
      const pages = Object.values(json.query?.pages || {});
      const safe = pages.map(page => {
        const info = page.imageinfo?.[0];
        const meta = info?.extmetadata || {};
        const license = String(meta.LicenseShortName?.value || "");
        const licenseUrl = String(meta.LicenseUrl?.value || "");
        const allowed = /^(CC0|Public domain|CC BY(?:-SA)?(?: [0-9.]+)?)$/i.test(license);
        const url = info?.thumburl || info?.url || "";
        return { title:page.title, url, originalUrl:info?.url || "",
          source:info?.descriptionurl || "", license, licenseUrl,
          credit:String(meta.Artist?.value || "").replace(/<[^>]*>/g,"").slice(0,200),
          allowed };
      }).filter(item => item.allowed && /^https:\/\//.test(item.url) && /^image\//.test(
        pages.find(p=>p.title===item.title)?.imageinfo?.[0]?.mime || ""));
      setImageCandidates(safe.slice(0,8));
      if (!safe.length) setImageError("لم نجد صورًا بترخيص مناسب. جرّب كلمة بحث أخرى.");
    } catch (error) { setImageError(error.message); }
    finally { setImageSearching(false); }
  };

  const openProduceImagePicker = (product) => {
    const term = findProduceTerm(product.name);
    setImagePickerProduct(product); setImageCandidates([]); setImageError("");
    setImageSearch(term ? produceEnglish[term] : "");
    if (term) searchCommonsImages(product, produceEnglish[term]);
  };

  const applyProduceImage = async (candidate) => {
    if (!imagePickerProduct || imageSaving) return;
    const term = findProduceTerm(imagePickerProduct.name);
    const targets = applyToVariants && term
      ? products.filter(p => !p.image && findProduceTerm(p.name) === term)
      : [imagePickerProduct];
    if (!window.confirm(`إسناد الصورة المختارة إلى ${targets.length} منتج؟ راجع تطابق الصورة قبل الحفظ.`)) return;
    setImageSaving(true); setImageError("");
    try {
      const changes = {};
      for (const product of targets) {
        changes[`products/${product.firebaseKey}/image`] = candidate.originalUrl;
        changes[`products/${product.firebaseKey}/imageSourceUrl`] = candidate.source;
        changes[`products/${product.firebaseKey}/imageLicense`] = candidate.license;
        changes[`products/${product.firebaseKey}/imageLicenseUrl`] = candidate.licenseUrl;
        changes[`products/${product.firebaseKey}/imageCredit`] = candidate.credit;
        changes[`products/${product.firebaseKey}/updatedAt`] = Date.now();
      }
      await update(ref(db), changes);
      setImagePickerProduct(null); setImageCandidates([]);
    } catch (error) { setImageError("فشل حفظ الصور: " + error.message); }
    finally { setImageSaving(false); }
  };


  useEffect(() => {
    if (!storeId) {
      setDataLoading(false);
      return undefined;
    }

    const unsubscribeStore = onValue(
      ref(db, `stores/${storeId}`),
      (snapshot) => {
        const data = snapshot.val();

        if (data) {
          setStore({ firebaseKey: storeId, ...data });
          setForm((previous) => {
            const config = storeTypeConfig[data.type] || storeTypeConfig.restaurant;
            return {
              ...previous,
              unit: previous.unit || config.defaultUnit,
              brand: previous.brand || data.name || "",
            };
          });
        } else {
          setStore(null);
        }

        setDataLoading(false);
      },
      (error) => {
        console.error("Store load error:", error);
        setDataLoading(false);
      }
    );

    const unsubscribeProducts = onValue(
      ref(db, "products"),
      (snapshot) => {
        const data = snapshot.val() || {};

        const list = Object.entries(data)
          .map(([key, value]) => ({ firebaseKey: key, ...value }))
          .filter((product) => String(product.storeId || "") === String(storeId));

        list.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
        setProducts(list);
      },
      (error) => console.error("Products load error:", error)
    );

    return () => {
      unsubscribeStore();
      unsubscribeProducts();
    };
  }, [storeId]);

  const storeType = store?.type || "restaurant";
  const config = storeTypeConfig[storeType] || storeTypeConfig.restaurant;
  const storeName = store?.name || "المتجر";

  const convertImageToBase64 = (file) =>
    new Promise((resolve, reject) => {
      if (!file) return reject(new Error("No file selected"));
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

  const readValidImage = async (file) => {
    if (!file.type.startsWith("image/")) {
      alert("اختار صورة صحيحة");
      return null;
    }

    const maxSizeMB = 1.5;
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`حجم الصورة كبير. اختار صورة أقل من ${maxSizeMB}MB`);
      return null;
    }

    try {
      return await convertImageToBase64(file);
    } catch (error) {
      console.error(error);
      alert("تعذر قراءة الصورة");
      return null;
    }
  };

  const handleAddImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const base64 = await readValidImage(file);
    if (!base64) return;
    setForm((previous) => ({ ...previous, image: base64 }));
    event.target.value = "";
  };

  const handleEditImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const base64 = await readValidImage(file);
    if (!base64) return;
    setEditForm((previous) => ({ ...previous, image: base64 }));
    event.target.value = "";
  };

  const parseBoolean = (value, defaultValue) => {
    if (value === "" || value === undefined || value === null) return defaultValue;
    if (typeof value === "boolean") return value;
    const clean = String(value).trim().toLowerCase();
    return ["true", "yes", "1", "نعم", "متاح", "available"].includes(clean);
  };

  const buildPayload = (source) => ({
    name: String(source.name || "").trim(),
    brand: String(source.brand || storeName || "").trim(),
    price: Number(source.price || 0),
    oldPrice: Number(source.oldPrice || 0),
    image: String(source.image || "").trim(),
    categoryId: config.categoryId,
    categoryName: config.categoryName,
    storeId,
    storeName,
    storeType,
    menuCategoryName: String(source.menuCategoryName || "").trim(),
    description: String(source.description || "").trim(),
    stock: Number(source.stock || 0),
    unit: String(source.unit || config.defaultUnit).trim(),
    isAvailable: source.isAvailable === true || source.isAvailable === "true",
    isBestSeller: source.isBestSeller === true || source.isBestSeller === "true",
    isOffer: source.isOffer === true || source.isOffer === "true",
    updatedAt: Date.now(),
  });

  const validate = (payload) => {
    if (!payload.name) return alert(`اكتب اسم ${config.productLabel}`), false;
    if (!payload.price || payload.price <= 0) return alert("اكتب سعر صحيح"), false;
    if (payload.oldPrice < 0) return alert("السعر قبل الخصم غير صحيح"), false;
    if (payload.oldPrice > 0 && payload.oldPrice < payload.price)
      return alert("السعر قبل الخصم يجب أن يكون أكبر من السعر الحالي"), false;
    if (payload.stock < 0) return alert("الكمية غير صحيحة"), false;
    return true;
  };

  const resetForm = () =>
    setForm({ ...createEmptyForm(storeType), brand: storeName });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!store) return alert("بيانات المتجر غير متاحة");
    const payload = buildPayload(form);
    if (!validate(payload)) return;

    try {
      setLoading(true);
      const newProductRef = push(ref(db, "products"));
      await set(newProductRef, { id: newProductRef.key, ...payload, createdAt: Date.now() });
      resetForm();
      alert(`تم إضافة ${config.productLabel} بنجاح`);
    } catch (error) {
      console.error("Add product error:", error);
      alert("حصل خطأ أثناء الحفظ");
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (product) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name || "",
      brand: product.brand || storeName || "",
      price: product.price ?? "",
      oldPrice: product.oldPrice ?? "",
      image: product.image || "",
      stock: product.stock ?? "",
      unit: product.unit || config.defaultUnit,
      menuCategoryName: product.menuCategoryName || "",
      description: product.description || "",
      isAvailable: product.isAvailable !== false,
      isBestSeller: product.isBestSeller === true,
      isOffer: product.isOffer === true,
    });
  };

  const closeEditDialog = () => {
    setEditingProduct(null);
    setEditForm(createEmptyForm(storeType));
  };

  const saveEditProduct = async (event) => {
    event.preventDefault();
    if (!editingProduct) return;
    const payload = buildPayload(editForm);
    if (!validate(payload)) return;

    try {
      setLoading(true);
      await update(ref(db, `products/${editingProduct.firebaseKey}`), payload);
      closeEditDialog();
      alert("تم تعديل المنتج");
    } catch (error) {
      console.error("Edit product error:", error);
      alert("حصل خطأ أثناء التعديل");
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (firebaseKey) => {
    if (!confirm("هل تريد حذف هذا المنتج؟")) return;
    try {
      await remove(ref(db, `products/${firebaseKey}`));
    } catch (error) {
      console.error(error);
      alert("تعذر حذف المنتج");
    }
  };

  const toggleAvailable = async (product) => {
    await update(ref(db, `products/${product.firebaseKey}`), {
      isAvailable: product.isAvailable === false,
      updatedAt: Date.now(),
    });
  };

  const toggleBestSeller = async (product) => {
    await update(ref(db, `products/${product.firebaseKey}`), {
      isBestSeller: product.isBestSeller !== true,
      updatedAt: Date.now(),
    });
  };

  const deleteAllStoreProducts = async () => {
    if (!products.length) return;
    if (!confirm(`سيتم حذف كل منتجات ${storeName} وعددها ${products.length}. هل أنت متأكد؟`)) return;

    try {
      setLoading(true);
      const updates = {};
      products.forEach((product) => {
        updates[`products/${product.firebaseKey}`] = null;
      });
      await update(ref(db), updates);
      alert("تم حذف جميع منتجات المتجر");
    } catch (error) {
      console.error(error);
      alert("حصل خطأ أثناء الحذف");
    } finally {
      setLoading(false);
    }
  };

  const normalizeImportRow = (row) => {
    const get = (...keys) => {
      for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
      }
      return "";
    };

    return {
      name: String(get("name", "اسم المنتج", "productName")).trim(),
      brand: String(get("brand", "البراند", "الماركة")).trim(),
      price: get("price", "السعر"),
      oldPrice: get("oldPrice", "السعر قبل الخصم", "old_price"),
      image: String(get("image", "الصورة", "imageUrl")).trim(),
      stock: get("stock", "الكمية"),
      unit: String(get("unit", "الوحدة")).trim() || config.defaultUnit,
      menuCategoryName: String(get("menuCategoryName", "قسم المنيو", "القسم", "category")).trim(),
      description: String(get("description", "الوصف")).trim(),
      isAvailable: get("isAvailable", "متاح", "available"),
      isBestSeller: get("isBestSeller", "الأكثر طلبًا", "bestSeller"),
      isOffer: get("isOffer", "عرض", "offer"),
    };
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const extension = file.name.split(".").pop().toLowerCase();
      let rows = [];

      if (extension === "csv") {
        await new Promise((resolve, reject) => {
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              rows = results.data || [];
              resolve();
            },
            error: reject,
          });
        });
      } else if (extension === "xlsx" || extension === "xls") {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      } else {
        alert("صيغة الملف غير مدعومة");
        return;
      }

      if (!rows.length) return alert("الملف فارغ");

      let successCount = 0;
      let skippedCount = 0;
      const updates = {};
      const now = Date.now();

      rows.forEach((row) => {
        const item = normalizeImportRow(row);
        if (!item.name || !item.price) {
          skippedCount += 1;
          return;
        }

        const newKey = push(ref(db, "products")).key;
        updates[`products/${newKey}`] = {
          id: newKey,
          name: item.name,
          brand: item.brand || storeName,
          price: Number(item.price || 0),
          oldPrice: Number(item.oldPrice || 0),
          image: item.image,
          categoryId: config.categoryId,
          categoryName: config.categoryName,
          storeId,
          storeName,
          storeType,
          menuCategoryName: item.menuCategoryName,
          description: item.description,
          stock: Number(item.stock || 0),
          unit: item.unit || config.defaultUnit,
          isAvailable: parseBoolean(item.isAvailable, true),
          isBestSeller: parseBoolean(item.isBestSeller, false),
          isOffer: parseBoolean(item.isOffer, false),
          createdAt: now,
          updatedAt: now,
        };
        successCount += 1;
      });

      if (Object.keys(updates).length) await update(ref(db), updates);
      alert(`تم استيراد ${successCount} منتج داخل ${storeName}. تم تجاهل ${skippedCount} صف.`);
    } catch (error) {
      console.error("Import products error:", error);
      alert("حصل خطأ أثناء الاستيراد");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const exportStoreProducts = () => {
    if (!products.length) {
      alert("لا توجد منتجات مسجلة لهذا المتجر");
      return;
    }
    // All products belonging to the selected store, regardless of search/filter.
    // Columns match the existing Excel import parser for convenient reuse.
    const columns = [
      "name", "brand", "price", "oldPrice", "image", "stock", "unit",
      "menuCategoryName", "description", "isAvailable", "isBestSeller", "isOffer"
    ];
    const rows = products.map(product => Object.fromEntries(
      columns.map(key => [key, product[key] ??
        (key === "isAvailable" ? true : ["isBestSeller", "isOffer"].includes(key) ? false : "")])
    ));
    const worksheet = XLSX.utils.json_to_sheet(rows, { header: columns });
    worksheet["!cols"] = columns.map(key => ({ wch:
      key === "image" ? 65 : key === "description" ? 45 :
      ["name", "menuCategoryName"].includes(key) ? 30 : 18
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    const safeName = String(storeName).replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, "_").slice(0, 60);
    XLSX.writeFile(workbook,
      `Bringo_${safeName}_Products_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return products.filter((product) => {
      const name = String(product.name || "").toLowerCase();
      const brand = String(product.brand || "").toLowerCase();
      const category = String(product.menuCategoryName || "").toLowerCase();
      const matchesSearch = !query || name.includes(query) || brand.includes(query) || category.includes(query);
      const matchesAvailability =
        availabilityFilter === "all" ||
        (availabilityFilter === "available" && product.isAvailable !== false) ||
        (availabilityFilter === "unavailable" && product.isAvailable === false);
      return matchesSearch && matchesAvailability;
    });
  }, [products, searchQuery, availabilityFilter]);

  if (dataLoading) return <div className="card">جاري تحميل بيانات المتجر...</div>;

  if (!store) {
    return (
      <div className="card">
        <h2>المتجر غير موجود</h2>
        <button type="button" onClick={() => navigate("/stores")}>رجوع للمتاجر</button>
      </div>
    );
  }

  return (
    <div dir="rtl">
      <div className="page-header">
        <div>
          <button type="button" onClick={() => navigate("/stores")}>رجوع للمتاجر</button>
          <h1 className="page-title">منتجات {storeName}</h1>
          <p className="page-subtitle">أضف وعدل منتجات هذا المتجر فقط، مع دعم الاستيراد من Excel وCSV.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          {store.image ? (
            <img src={store.image} alt={store.name} style={{ width: 90, height: 90, borderRadius: 20, objectFit: "cover" }} />
          ) : (
            <div style={{ width: 90, height: 90, borderRadius: 20, display: "grid", placeItems: "center", background: "#f5f5f5", fontSize: 34 }}>
              {storeType === "restaurant" ? "🍔" : storeType === "pharmacy" ? "💊" : "🥬"}
            </div>
          )}
          <div>
            <h2 style={{ margin: 0 }}>{store.name}</h2>
            <p style={{ margin: "8px 0" }}>{store.tags || config.singular}</p>
            <p style={{ margin: 0 }}>{store.address || "بدون عنوان"}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="products-toolbar" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          {storeType === "vegetables" && <span style={{padding:"10px 14px",background:"#edf7f1",borderRadius:10,fontWeight:600}}>منتجات بدون صور: {missingImageCount} — اضغط «اختيار صورة» بجوار أي منتج</span>}
          <label className="import-btn">
            استيراد منتجات Excel / CSV
            <input type="file" accept=".csv,.xlsx,.xls" hidden onChange={handleImportFile} />
          </label>
          <button type="button" onClick={exportStoreProducts} disabled={loading || products.length === 0}>تصدير منتجات المتجر Excel ({products.length})</button>
          <button type="button" className="danger" onClick={deleteAllStoreProducts} disabled={loading || products.length === 0}>
            حذف كل المنتجات ({products.length})
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form-grid">
          <input placeholder={`اسم ${config.productLabel}`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="البراند / اسم المتجر" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          <input type="number" min="0" step="0.01" placeholder="السعر" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <input type="number" min="0" step="0.01" placeholder="السعر قبل الخصم" value={form.oldPrice} onChange={(e) => setForm({ ...form, oldPrice: e.target.value })} />
          <input type="number" min="0" placeholder="الكمية" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
            {config.units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
          </select>
          <input placeholder="قسم المنتج داخل المتجر" value={form.menuCategoryName} onChange={(e) => setForm({ ...form, menuCategoryName: e.target.value })} />
          <input placeholder="وصف مختصر للمنتج" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input type="file" accept="image/*" onChange={handleAddImageChange} />
          <select value={form.isAvailable ? "true" : "false"} onChange={(e) => setForm({ ...form, isAvailable: e.target.value === "true" })}>
            <option value="true">متاح</option><option value="false">غير متاح</option>
          </select>
          <select value={form.isBestSeller ? "true" : "false"} onChange={(e) => setForm({ ...form, isBestSeller: e.target.value === "true" })}>
            <option value="false">ليس الأكثر طلبًا</option><option value="true">الأكثر طلبًا</option>
          </select>
          <select value={form.isOffer ? "true" : "false"} onChange={(e) => setForm({ ...form, isOffer: e.target.value === "true" })}>
            <option value="false">ليس عرضًا</option><option value="true">عرض</option>
          </select>
          <button type="submit" disabled={loading}>{loading ? "جاري الحفظ..." : `إضافة ${config.productLabel}`}</button>
        </form>

        {form.image && <div className="image-preview-box"><span>معاينة صورة المنتج</span><img src={form.image} alt="preview" /></div>}

        <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) 190px auto", gap: 12, margin: "20px 0", alignItems: "center" }}>
          <input placeholder="بحث داخل منتجات المتجر" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          <select value={availabilityFilter} onChange={(e) => setAvailabilityFilter(e.target.value)}>
            <option value="all">كل الحالات</option><option value="available">المتاح فقط</option><option value="unavailable">غير المتاح فقط</option>
          </select>
          <strong>{filteredProducts.length} منتج</strong>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead><tr><th>الصورة</th><th>المنتج</th><th>القسم</th><th>السعر</th><th>الكمية</th><th>الحالة</th><th>وسوم</th><th>تحكم</th></tr></thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.firebaseKey}>
                  <td>{product.image ? <img className="product-img" src={product.image} alt={product.name} style={{ width: 60, height: 60, borderRadius: 12, objectFit: "cover" }} /> : "بدون صورة"}</td>
                  <td><strong>{product.name}</strong><br /><small>{product.brand || storeName}</small></td>
                  <td>{product.menuCategoryName || "-"}</td>
                  <td>{product.price} جنيه{Number(product.oldPrice || 0) > 0 && <><br /><small style={{ textDecoration: "line-through" }}>{product.oldPrice} جنيه</small></>}</td>
                  <td>{product.stock || 0} {product.unit || config.defaultUnit}</td>
                  <td><span className={product.isAvailable === false ? "badge danger-badge" : "badge"}>{product.isAvailable === false ? "غير متاح" : "متاح"}</span></td>
                  <td>{product.isBestSeller && <span>🔥 الأكثر طلبًا </span>}{product.isOffer && <span> 💖 عرض </span>}</td>
                  <td><div className="actions">
                    {storeType === "vegetables" && <button type="button" onClick={() => openProduceImagePicker(product)}>اختيار صورة</button>}
                    <button type="button" onClick={() => openEditDialog(product)}>تعديل</button>
                    <button type="button" onClick={() => toggleAvailable(product)}>{product.isAvailable === false ? "إتاحة" : "إخفاء"}</button>
                    <button type="button" onClick={() => toggleBestSeller(product)}>{product.isBestSeller ? "إلغاء الأكثر طلبًا" : "الأكثر طلبًا"}</button>
                    <button type="button" className="danger" onClick={() => deleteProduct(product.firebaseKey)}>حذف</button>
                  </div></td>
                </tr>
              ))}
              {filteredProducts.length === 0 && <tr><td colSpan="8">لا توجد منتجات داخل هذا المتجر</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {imagePickerProduct && <div className="modal-overlay" onClick={() => !imageSaving && setImagePickerProduct(null)}>
        <div className="modal-card" style={{maxWidth:850,maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
          <div className="modal-header"><h2>صور المنتج: {imagePickerProduct.name}</h2><button type="button" disabled={imageSaving} onClick={()=>setImagePickerProduct(null)}>×</button></div>
          <p>صور مقترحة من Wikimedia Commons بتراخيص مفتوحة. راجع شكل المنتج قبل الحفظ، واحتفظ ببيانات المصدر والترخيص.</p>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <input style={{flex:1,minWidth:180}} value={imageSearch} placeholder="اسم المنتج بالإنجليزي" onChange={e=>setImageSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchCommonsImages(imagePickerProduct,imageSearch)}/>
            <button type="button" disabled={imageSearching||imageSaving} onClick={()=>searchCommonsImages(imagePickerProduct,imageSearch)}>{imageSearching?"جاري البحث...":"بحث عن صور"}</button>
          </div>
          <label style={{display:"flex",alignItems:"center",gap:8,margin:"14px 0"}}><input type="checkbox" checked={applyToVariants} onChange={e=>setApplyToVariants(e.target.checked)}/>تطبيق الصورة على الأحجام المختلفة من نفس المنتج التي لا تملك صورًا</label>
          {imageError && <p role="alert" style={{color:"#b91c1c"}}>{imageError}</p>}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:12}}>
            {imageCandidates.map(item=><div key={item.source} style={{border:"1px solid #ddd",borderRadius:12,padding:8}}>
              <img src={item.url} alt={item.title} loading="lazy" style={{width:"100%",height:125,objectFit:"contain"}}/>
              <small style={{display:"block",margin:"6px 0"}}>{item.license}</small>
              <a href={item.source} target="_blank" rel="noreferrer">المصدر والترخيص</a>
              <button type="button" disabled={imageSaving} style={{display:"block",marginTop:8,width:"100%"}} onClick={()=>applyProduceImage(item)}>{imageSaving?"جاري الحفظ...":"اعتماد الصورة"}</button>
            </div>)}
          </div>
        </div>
      </div>}

      {editingProduct && (
        <div className="modal-overlay" onClick={closeEditDialog}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2>تعديل المنتج</h2><button type="button" onClick={closeEditDialog}>×</button></div>
            <form onSubmit={saveEditProduct} className="form-grid modal-form">
              <input placeholder="اسم المنتج" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              <input placeholder="البراند" value={editForm.brand} onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })} />
              <input type="number" min="0" step="0.01" placeholder="السعر" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} />
              <input type="number" min="0" step="0.01" placeholder="السعر قبل الخصم" value={editForm.oldPrice} onChange={(e) => setEditForm({ ...editForm, oldPrice: e.target.value })} />
              <input type="number" min="0" placeholder="الكمية" value={editForm.stock} onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })} />
              <select value={editForm.unit} onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}>{config.units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select>
              <input placeholder="قسم المنتج" value={editForm.menuCategoryName} onChange={(e) => setEditForm({ ...editForm, menuCategoryName: e.target.value })} />
              <input placeholder="وصف المنتج" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
              <input type="file" accept="image/*" onChange={handleEditImageChange} />
              <select value={editForm.isAvailable ? "true" : "false"} onChange={(e) => setEditForm({ ...editForm, isAvailable: e.target.value === "true" })}><option value="true">متاح</option><option value="false">غير متاح</option></select>
              <select value={editForm.isBestSeller ? "true" : "false"} onChange={(e) => setEditForm({ ...editForm, isBestSeller: e.target.value === "true" })}><option value="false">ليس الأكثر طلبًا</option><option value="true">الأكثر طلبًا</option></select>
              <select value={editForm.isOffer ? "true" : "false"} onChange={(e) => setEditForm({ ...editForm, isOffer: e.target.value === "true" })}><option value="false">ليس عرضًا</option><option value="true">عرض</option></select>
              <button type="submit" disabled={loading}>{loading ? "جاري الحفظ..." : "حفظ التعديل"}</button>
            </form>
            {editForm.image && <div className="image-preview-box"><span>معاينة صورة المنتج</span><img src={editForm.image} alt="preview" /></div>}
          </div>
        </div>
      )}
    </div>
  );
}