import requests
import pandas as pd

API_URL = "https://sohagemarket.apis.deal-card.com/api/Product/"
OUTPUT_FILE = "Sohag_Market_Products_For_Bringo.xlsx"

BRINGO_CATEGORY_MAP = {
    10: {"id": "fruits", "name": "خضروات وفواكه"},
    8: {"id": "grocery", "name": "البقالة"},
}

def get_products():
    response = requests.get(API_URL, timeout=30)
    response.raise_for_status()
    data = response.json()

    if isinstance(data, dict) and "items" in data:
        return data["items"]

    if isinstance(data, list):
        return data

    return []

def detect_category(product_name):
    name = str(product_name or "").strip().lower()

    rules = [
        {
            "id": "fruits",
            "name": "خضروات وفواكه",
            "words": [
                "طماطم", "بطاطس", "بصل", "خيار", "جزر", "كوسة", "فلفل",
                "ليمون", "ثوم", "تفاح", "موز", "برتقال", "مانجو", "عنب",
                "فراولة", "رمان", "كمثرى", "بطيخ", "شمام", "خس", "جرجير"
            ],
        },
        {
            "id": "dairy",
            "name": "الألبان والجبن",
            "words": [
                "لبن", "حليب", "زبادي", "زبادى", "جبنة", "جبن", "قشطة",
                "زبدة", "رايب", "كريمة", "بيض"
            ],
        },
        {
            "id": "grocery",
            "name": "البقالة",
            "words": [
                "أرز", "ارز", "سكر", "زيت", "مكرونة", "دقيق", "ملح",
                "شاي", "شاى", "قهوة", "نسكافيه", "صلصة", "تونة", "فول",
                "عدس", "خل", "طحينة", "مربى", "سمنة"
            ],
        },
        {
            "id": "cleaning",
            "name": "المنظفات",
            "words": [
                "مسحوق", "غسيل", "كلور", "منظف", "مطهر", "فيري", "برسيل",
                "اريال", "تايد", "داوني", "فانيش", "صابون", "مناديل",
                "أكياس قمامة", "اكياس قمامة", "معطر"
            ],
        },
        {
            "id": "spices",
            "name": "العطارة",
            "words": [
                "كمون", "كزبرة", "فلفل أسود", "فلفل اسود", "شطة", "قرفة",
                "زنجبيل", "كركم", "بابريكا", "حبهان", "قرنفل", "يانسون",
                "نعناع ناشف", "حلبة", "زعتر", "بهارات"
            ],
        },
        {
            "id": "honey",
            "name": "العسل",
            "words": [
                "عسل", "شهد", "غذاء ملكات", "شمع عسل"
            ],
        },
        {
            "id": "pickles",
            "name": "المخللات",
            "words": [
                "مخلل", "زيتون", "طرشي", "لفت مخلل", "خيار مخلل"
            ],
        },
        {
            "id": "pharmacy",
            "name": "الصيدلية",
            "words": [
                "بنادول", "كونجستال", "ستربسلز", "فيتامين", "مطهر جروح",
                "بيتادين", "بانثينول", "فازلين", "لاصق", "ترمومتر",
                "كمامة", "كحول", "قطن", "شاش", "دواء", "مسكن"
            ],
        },
        {
            "id": "beverages",
            "name": "مشروبات",
            "words": [
                "مياه", "بيبسي", "كوكاكولا", "كوكا", "سفن", "ميرندا",
                "عصير", "مشروب", "ريد بول", "شويبس", "فيروز", "بيريل"
            ],
        },
        {
            "id": "bakery",
            "name": "مخبوزات",
            "words": [
                "عيش", "خبز", "توست", "كرواسون", "باتيه", "كيك", "بقسماط",
                "فينو", "كيزر", "فطير"
            ],
        },
        {
            "id": "fast_food",
            "name": "وجبات سريعة",
            "words": [
                "برجر", "بيتزا", "شاورما", "كريب", "هوت دوج", "بطاطس مقلية",
                "زنجر", "ساندوتش", "وجبة"
            ],
        },
        {
            "id": "meat_poultry",
            "name": "اللحوم والدواجن",
            "words": [
                "دجاج", "فراخ", "بانيه", "لحمة", "لحم", "كفتة", "سجق",
                "برجر لحم", "هوت دوج", "ناجتس", "كبدة"
            ],
        },
    ]

    for rule in rules:
        if any(word in name for word in rule["words"]):
            return rule

    return {
        "id": "grocery",
        "name": "البقالة",
    }

def build_image_url(image_name):
    if not image_name:
        return ""

    return f"https://sohagemarket.apis.deal-card.com/images/{image_name}"

def main():
    products = get_products()
    rows = []

    for p in products:
        api_category_id = p.get("categoryId")

        mapped = detect_category(p.get("nameAr") or p.get("nameEn") or "")

        price = p.get("discountedPrice") or p.get("price") or 0

        rows.append({
            "name": p.get("nameAr") or p.get("nameEn") or "",
            "brand": " Bringo",
            "price": price,
            "oldPrice": p.get("price") if p.get("discountedPrice") else 0,
            "categoryId": mapped["id"],
            "stock": p.get("stock") or 0,
            "unit": "قطعة",
            "image": build_image_url(p.get("mainImage")),
            "isAvailable": p.get("isActive") is True and p.get("isDeleted") is False,
            "isBestSeller": p.get("isBestSeller") is True,
            "isOffer": p.get("isDiscounted") is True,
            "categoryName": mapped["name"],
            "notes": f'Imported from Sohag Market API - source id: {p.get("id")}',
        })

    df = pd.DataFrame(rows)
    df.to_excel(OUTPUT_FILE, index=False)

    print("DONE")
    print("Products:", len(rows))
    print("File:", OUTPUT_FILE)

if __name__ == "__main__":
    main()