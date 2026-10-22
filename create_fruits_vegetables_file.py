import pandas as pd
import requests
import time
import json

API_KEY = "f53a867328b63e883baa03a08911332bc2247a47"

OUTPUT_FILE = r"C:\Users\Omar Sabry\Desktop\My Projects\bringo-dashboard\Bringo_Fruits_Vegetables_With_Images.xlsx"

headers = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json; charset=utf-8",
}

products = []

def add(name, price, unit="كيلو", stock=50):
    products.append({
        "name": name,
        "brand": "طازج",
        "price": price,
        "oldPrice": 0,
        "categoryId": "fruits",
        "stock": stock,
        "unit": unit,
        "image": "",
        "isAvailable": True,
        "isBestSeller": False,
        "isOffer": False,
        "categoryName": "خضروات وفواكه",
        "notes": "منتج خضار وفاكهة طازج"
    })

def get_image(product_name):
    
    translations = {
        "بطاطس": "potato",
        "بصل": "onion",
        "خيار": "cucumber",
        "جزر": "carrot",
        "كوسة": "zucchini",
        "باذنجان": "eggplant",
        "فلفل": "pepper",
        "ليمون": "lemon",
        "ثوم": "garlic",
        "بنجر": "beetroot",
        "بطاطا": "sweet potato",
        "فاصوليا": "green beans",
        "بسلة": "peas",
        "ملوخية": "molokhia",
        "سبانخ": "spinach",
        "خس": "lettuce",
        "كرنب": "cabbage",
        "قرنبيط": "cauliflower",
        "بروكلي": "broccoli",
        "موز": "banana",
        "تفاح": "apple",
        "برتقال": "orange",
        "يوسفي": "mandarin",
        "فراولة": "strawberry",
        "عنب": "grapes",
        "مانجو": "mango",
        "كمثرى": "pear",
        "خوخ": "peach",
        "برقوق": "plum",
        "رمان": "pomegranate",
        "تين": "fig",
        "شمام": "melon",
        "كنتالوب": "cantaloupe",
        "بطيخ": "watermelon",
        "أناناس": "pineapple",
        "كيوي": "kiwi",
        "أفوكادو": "avocado",
        "جوافة": "guava",
    }

    query = "fresh vegetables"

    for ar, en in translations.items():
        if ar in product_name:
            query = en
            break

    try:
        response = requests.post(
            "https://google.serper.dev/images",
            headers=headers,
            json={
                "q": f"{query} product"
            },
            timeout=20,
        )

        if response.status_code != 200:
            print("API ERROR:", response.status_code)
            return ""

        data = response.json()

        if not data.get("images"):
            return ""

        return data["images"][0]["imageUrl"]

    except Exception as e:
        print("ERROR:", product_name, e)
        return ""

# خضروات
vegetables = [
    ("طماطم بلدي - 1 كجم", 18),
    ("طماطم شيري - 250 جم", 35, "عبوة"),
    ("بطاطس بلدي - 1 كجم", 22),
    ("بطاطس تحمير - 1 كجم", 25),
    ("بصل أحمر - 1 كجم", 28),
    ("بصل أبيض - 1 كجم", 30),
    ("خيار بلدي - 1 كجم", 25),
    ("خيار صوب - 1 كجم", 30),
    ("جزر - 1 كجم", 24),
    ("كوسة - 1 كجم", 32),
    ("باذنجان رومي - 1 كجم", 22),
    ("باذنجان عروس - 1 كجم", 24),
    ("فلفل أخضر - 1 كجم", 30),
    ("فلفل ألوان - 1 كجم", 65),
    ("فلفل حار - 250 جم", 18, "عبوة"),
    ("ليمون بلدي - 1 كجم", 45),
    ("ثوم بلدي - 250 جم", 35, "عبوة"),
    ("بنجر - 1 كجم", 25),
    ("بطاطا - 1 كجم", 28),
    ("قلقاس - 1 كجم", 35),
    ("بسلة خضراء - 1 كجم", 65),
    ("فاصوليا خضراء - 1 كجم", 55),
    ("ملوخية خضراء - حزمة", 12, "حزمة"),
    ("سبانخ - حزمة", 10, "حزمة"),
    ("جرجير - حزمة", 7, "حزمة"),
    ("بقدونس - حزمة", 5, "حزمة"),
    ("كزبرة خضراء - حزمة", 5, "حزمة"),
    ("شبت - حزمة", 5, "حزمة"),
    ("نعناع - حزمة", 5, "حزمة"),
    ("خس كابوتشا - قطعة", 18, "قطعة"),
    ("كرنب أبيض - قطعة", 40, "قطعة"),
    ("قرنبيط - قطعة", 45, "قطعة"),
    ("بروكلي - 500 جم", 55, "عبوة"),
    ("ذرة حلوة - 2 قطعة", 35, "عبوة"),
]

for item in vegetables:
    add(*item)

# فواكه
fruits = [
    ("موز بلدي - 1 كجم", 45),
    ("موز مستورد - 1 كجم", 60),
    ("تفاح أحمر - 1 كجم", 85),
    ("تفاح أخضر - 1 كجم", 95),
    ("تفاح أصفر - 1 كجم", 90),
    ("برتقال بلدي - 1 كجم", 35),
    ("برتقال سكري - 1 كجم", 40),
    ("يوسفي - 1 كجم", 38),
    ("ليمون - 1 كجم", 45),
    ("فراولة - 500 جم", 55, "عبوة"),
    ("عنب أحمر - 1 كجم", 90),
    ("عنب أخضر - 1 كجم", 85),
    ("عنب أسود - 1 كجم", 95),
    ("مانجو زبدية - 1 كجم", 120),
    ("مانجو نعومي - 1 كجم", 110),
    ("مانجو عويس - 1 كجم", 145),
    ("كمثرى - 1 كجم", 85),
    ("خوخ - 1 كجم", 75),
    ("برقوق - 1 كجم", 80),
    ("رمان - 1 كجم", 65),
    ("تين برشومي - 1 كجم", 70),
    ("شمام - قطعة", 55, "قطعة"),
    ("كنتالوب - قطعة", 45, "قطعة"),
    ("بطيخ - قطعة", 120, "قطعة"),
    ("بطيخ نصف قطعة", 65, "قطعة"),
    ("أناناس - قطعة", 120, "قطعة"),
    ("كيوي - 500 جم", 95, "عبوة"),
    ("أفوكادو - 500 جم", 110, "عبوة"),
    ("تمر طازج - 500 جم", 65, "عبوة"),
    ("جوافة - 1 كجم", 45),
]

for item in fruits:
    add(*item)

# تكرار أحجام مختلفة لزيادة العدد بشكل منظم
base_products = products.copy()

for product in base_products:
    if len(products) >= 200:
        break

    name = product["name"]

    if "1 كجم" in name:
        new_name = name.replace("1 كجم", "2 كجم")
        new_price = product["price"] * 2 - 5
        add(new_name, new_price, product["unit"], 40)

    if len(products) >= 200:
        break

    if "1 كجم" in name:
        new_name = name.replace("1 كجم", "500 جم")
        new_price = round(product["price"] / 2 + 5)
        add(new_name, new_price, "عبوة", 50)

# قص العدد على 200
products = products[:200]

df = pd.DataFrame(products)
df["image"] = df["image"].astype(object)

success = 0
failed = 0

for index, row in df.iterrows():
    name = str(row["name"]).strip()

    image_url = get_image(name)

    if image_url:
        df.loc[index, "image"] = str(image_url)
        success += 1
        print("OK:", name)
    else:
        failed += 1
        print("NO IMAGE:", name)

    time.sleep(0.5)

df.to_excel(OUTPUT_FILE, index=False)

print("\nDONE")
print("TOTAL:", len(df))
print("SUCCESS:", success)
print("FAILED:", failed)
print("FILE:", OUTPUT_FILE)