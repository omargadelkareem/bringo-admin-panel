export default function SettingsPage() {
  return (
    <div>
      <h1 className="page-title">الإعدادات</h1>

      <div className="card">
        <div className="form-grid">
          <input placeholder="الحد الأدنى للطلب" />
          <input placeholder="رسوم التوصيل" />
          <input placeholder="وقت إغلاق التطبيق" />
        </div>

        <button>حفظ الإعدادات</button>
      </div>
    </div>
  );
}