import pandas as pd
import requests
import time
import json

API_KEY = "f53a867328b63e883baa03a08911332bc2247a47"

OUTPUT_FILE = r"C:\Users\Omar Sabry\Desktop\My Projects\bringo-dashboard\Bringo_Remaining_Categories_With_Images.xlsx"

headers = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json; charset=utf-8",
}

products = []


def add(name, brand, price, category_id, category_name, unit="قطعة", stock=50):
    products.append({
        "name": name,
        "brand": brand,
        "price": price,
        "oldPrice": 0,
        "categoryId": category_id,
        "stock": stock,
        "unit": unit,
        "image": "",
        "isAvailable": True,
        "isBestSeller": False,
        "isOffer": False,
        "categoryName": category_name,
        "notes": "منتج جاهز للاستيراد"
    })


def get_image(query):
    try:
        payload = json.dumps(
            {"q": query},
            ensure_ascii=False
        ).encode("utf-8")

        response = requests.post(
            "https://google.serper.dev/images",
            headers=headers,
            data=payload,
            timeout=25
        )

        if response.status_code != 200:
            print("API ERROR:", response.status_code)
            return ""

        data = response.json()
        images = data.get("images", [])

        if not images:
            return ""

        return images[0].get("imageUrl", "")

    except Exception as e:
        print("ERROR:", e)
        return ""


# العطارة
spices = [
    ("كمون مطحون 100 جم", "العطار", 35),
    ("كزبرة ناشفة 100 جم", "العطار", 28),
    ("فلفل أسود مطحون 100 جم", "العطار", 75),
    ("شطة ناعمة 100 جم", "العطار", 30),
    ("قرفة عيدان 100 جم", "العطار", 55),
    ("زنجبيل مطحون 100 جم", "العطار", 60),
    ("كركم 100 جم", "العطار", 35),
    ("بابريكا 100 جم", "العطار", 45),
    ("حبهان 50 جم", "العطار", 120),
    ("قرنفل 50 جم", "العطار", 95),
    ("يانسون 100 جم", "العطار", 40),
    ("نعناع ناشف 100 جم", "العطار", 35),
    ("حلبة حصى 250 جم", "العطار", 32),
    ("بذور كتان 250 جم", "العطار", 45),
    ("زعتر 100 جم", "العطار", 55),
    ("سماق 100 جم", "العطار", 65),
    ("بهارات لحمة 100 جم", "العطار", 42),
    ("بهارات فراخ 100 جم", "العطار", 42),
    ("كاري 100 جم", "العطار", 38),
    ("ورق لورا 50 جم", "العطار", 35),
]
for item in spices:
    add(*item, category_id="spices", category_name="العطارة", unit="عبوة")


# المنظفات
cleaning = [
    ("مسحوق غسيل اريال 2.5 كجم", "Ariel", 245),
    ("مسحوق غسيل برسيل 2.5 كجم", "Persil", 235),
    ("جل غسيل برسيل 1 لتر", "Persil", 110),
    ("سائل أطباق فيري 1 لتر", "Fairy", 75),
    ("كلور كلوركس 1 لتر", "Clorox", 45),
    ("مطهر ديتول أرضيات 1 لتر", "Dettol", 95),
    ("منظف زجاج 500 مل", "Glade", 55),
    ("مناديل مطبخ فاين", "Fine", 50),
    ("مناديل ورقية فاين", "Fine", 35),
    ("أكياس قمامة كبيرة", "Queen", 40),
    ("داوني منعم أقمشة 1 لتر", "Downy", 135),
    ("فانيش مزيل بقع", "Vanish", 120),
    ("صابونة غسيل", "Royal", 12),
    ("ليفة أطباق", "Scotch Brite", 25),
    ("معطر جو جليد", "Glade", 90),
    ("منظف حمام هاربيك", "Harpic", 80),
    ("منظف مطبخ سيف", "Cif", 85),
    ("ورق تواليت فاين 6 رول", "Fine", 95),
]
for item in cleaning:
    add(*item, category_id="cleaning", category_name="المنظفات", unit="عبوة")


# المخبوزات
bakery = [
    ("عيش بلدي 10 أرغفة", "مخبز اليوم", 15),
    ("عيش شامي 5 أرغفة", "مخبز اليوم", 20),
    ("توست أبيض", "لوزين", 45),
    ("توست أسمر", "لوزين", 50),
    ("كرواسون زبدة", "Monginis", 25),
    ("باتيه جبنة", "Monginis", 22),
    ("باتون ساليه 250 جم", "Bringo Bakery", 45),
    ("كيزر 6 قطع", "مخبز اليوم", 30),
    ("فينو 6 قطع", "مخبز اليوم", 25),
    ("كيك فانيليا", "Sweet House", 60),
    ("دونات شوكولاتة", "Bringo Bakery", 28),
    ("بقسماط 500 جم", "Bringo Bakery", 55),
    ("رقاق طري", "Bringo Bakery", 40),
    ("عيش سن", "مخبز اليوم", 35),
    ("منين بالعجوة", "Bringo Bakery", 65),
    ("فطير مشلتت صغير", "Bringo Bakery", 95),
    ("بيتزا صغيرة", "Bringo Bakery", 70),
    ("رغيف حواوشي", "Bringo Bakery", 55),
]
for item in bakery:
    add(*item, category_id="bakery", category_name="مخبوزات", unit="قطعة")


# العسل
honey = [
    ("عسل نحل جبلي 500 جم", "وادي النحل", 220),
    ("عسل نحل موالح 500 جم", "وادي النحل", 190),
    ("عسل برسيم 500 جم", "وادي النحل", 180),
    ("عسل حبة البركة 500 جم", "وادي النحل", 240),
    ("عسل سدر 500 جم", "وادي النحل", 320),
    ("عسل نحل طبيعي 1 كجم", "وادي النحل", 360),
    ("عسل أبيض 250 جم", "Bringo Honey", 95),
    ("عسل بالمكسرات 500 جم", "Bringo Honey", 260),
    ("عسل مع غذاء ملكات 250 جم", "Bringo Honey", 210),
    ("عسل أسود 700 جم", "الطحان", 65),
]
for item in honey:
    add(*item, category_id="honey", category_name="العسل", unit="عبوة")


# المخللات
pickles = [
    ("مخلل خيار 1 كجم", "بيت المخللات", 60),
    ("مخلل زيتون أخضر 1 كجم", "بيت المخللات", 95),
    ("مخلل زيتون أسود 1 كجم", "بيت المخللات", 105),
    ("مخلل ليمون معصفر 500 جم", "بيت المخللات", 45),
    ("طرشي مشكل 1 كجم", "بيت المخللات", 55),
    ("فلفل مخلل 500 جم", "بيت المخللات", 40),
    ("بصل مخلل 500 جم", "بيت المخللات", 42),
    ("جزر مخلل 500 جم", "بيت المخللات", 38),
    ("لفت مخلل 500 جم", "بيت المخللات", 35),
    ("زيتون كالاماتا 500 جم", "بيت المخللات", 120),
]
for item in pickles:
    add(*item, category_id="pickles", category_name="المخللات", unit="عبوة")


# الصيدلية
pharmacy = [
    ("بنادول أدفانس", "Panadol", 55),
    ("بنادول اكسترا", "Panadol", 65),
    ("كونجستال", "Congestal", 42),
    ("ستربسلز", "Strepsils", 60),
    ("فيتامين سي 1000", "Vitamin C", 90),
    ("مطهر بيتادين 120 مل", "Betadine", 75),
    ("كريم بانثينول", "Panthenol", 80),
    ("فازلين 100 مل", "Vaseline", 60),
    ("لاصق طبي", "Hansaplast", 35),
    ("ترمومتر ديجيتال", "Generic", 120),
    ("كمامة طبية 10 قطع", "Generic", 35),
    ("جل كحول 250 مل", "Dettol", 65),
    ("محلول ملح", "Generic", 20),
    ("قطن طبي 100 جم", "Generic", 45),
    ("شاش طبي", "Generic", 25),
]
for item in pharmacy:
    add(*item, category_id="pharmacy", category_name="الصيدلية", unit="علبة")


# المشروبات
beverages = [
    ("مياه نستله 1.5 لتر", "Nestle", 12),
    ("مياه نستله 600 مل", "Nestle", 8),
    ("بيبسي كان", "Pepsi", 18),
    ("كوكاكولا كان", "Coca-Cola", 18),
    ("سفن أب 1 لتر", "7UP", 28),
    ("عصير جهينة برتقال 1 لتر", "جهينة", 38),
    ("عصير جهينة مانجو 1 لتر", "جهينة", 42),
    ("عصير جهينة تفاح 1 لتر", "جهينة", 38),
    ("مشروب طاقة ريد بول", "Red Bull", 60),
    ("شاي مثلج ليبتون", "Lipton", 25),
    ("ميرندا برتقال 1 لتر", "Mirinda", 28),
    ("سوبيا 1 لتر", "محلي", 35),
]
for item in beverages:
    add(*item, category_id="beverages", category_name="مشروبات", unit="عبوة")


# وجبات سريعة
fast_food = [
    ("برجر لحم", "Bringo Kitchen", 140),
    ("برجر دجاج", "Bringo Kitchen", 120),
    ("شاورما فراخ", "Bringo Kitchen", 95),
    ("بيتزا مارجريتا", "Bringo Kitchen", 130),
    ("بيتزا بيبروني", "Bringo Kitchen", 160),
    ("بطاطس مقلية", "Bringo Kitchen", 45),
    ("وجبة زنجر", "Bringo Kitchen", 135),
    ("ساندوتش كفتة", "Bringo Kitchen", 110),
    ("ساندوتش سجق", "Bringo Kitchen", 100),
    ("كريب فراخ", "Bringo Kitchen", 115),
    ("كريب نوتيلا", "Bringo Kitchen", 90),
    ("هوت دوج", "Bringo Kitchen", 85),
]
for item in fast_food:
    add(*item, category_id="fast_food", category_name="وجبات سريعة", unit="وجبة")


df = pd.DataFrame(products)
df["image"] = df["image"].astype(object)

success = 0
failed = 0

for index, row in df.iterrows():
    query = f'{row["name"]} {row["brand"]} product'

    image_url = get_image(query)

    if image_url:
        df.loc[index, "image"] = str(image_url)
        success += 1
        print("OK:", row["name"])
    else:
        failed += 1
        print("NO IMAGE:", row["name"])

    time.sleep(0.5)

df.to_excel(OUTPUT_FILE, index=False)

print("DONE")
print("TOTAL:", len(df))
print("SUCCESS:", success)
print("FAILED:", failed)
print("FILE:", OUTPUT_FILE)