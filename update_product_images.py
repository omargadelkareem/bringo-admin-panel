import pandas as pd
import requests
import time
import os

API_KEY = "f53a867328b63e883baa03a08911332bc2247a47"

INPUT_FILE = r"C:\Users\Omar Sabry\Desktop\My Projects\bringo-dashboard\Bringo_5000_Products_Final_Corrected.xlsx"
OUTPUT_FILE = r"C:\Users\Omar Sabry\Desktop\My Projects\bringo-dashboard\Bringo_Products_All_Categories_With_Images.xlsx"

LIMIT_PER_SHEET = None  # بعد التجربة خليه None

headers = {
    "X-API-KEY": API_KEY,
    "Content-Type": "application/json",
}

CATEGORY_MAP = {
    "الألبان والجبن": "dairy",
    "الالبان والجبن": "dairy",
    "البقالة": "grocery",
    "البقاله": "grocery",
    "خضروات وفواكه": "fruits",
    "الخضروات والفواكه": "fruits",
    "مخبوزات": "bakery",
    "المخبوزات": "bakery",
    "المنظفات": "cleaning",
    "العطارة": "spices",
    "العطاره": "spices",
    "العسل": "honey",
    "المخللات": "pickles",
    "المخلالات": "pickles",
    "الصيدلية": "pharmacy",
    "الصيدليه": "pharmacy",
    "وجبات سريعة": "fast_food",
    "وجبات سريعه": "fast_food",
    "اللحوم والدواجن": "meat_poultry",
    "مجمدات": "frozen",
    "مشروبات": "beverages",
    "حلويات وسناكس": "sweets",
    "رعاية الطفل": "baby_care",
    "العناية الشخصية": "personal_care",
    "بيض": "dairy",
}


def clean_text(value):
    return str(value).strip() if pd.notna(value) else ""


def normalize_ar(value):
    text = clean_text(value).lower()
    text = text.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا")
    text = text.replace("ة", "ه").replace("ى", "ي")
    text = " ".join(text.split())
    return text


def get_category_id(category_name, category_id=""):
    category_id = clean_text(category_id)

    if category_id:
        return category_id

    clean_name = normalize_ar(category_name)

    for name, cat_id in CATEGORY_MAP.items():
        if normalize_ar(name) == clean_name:
            return cat_id

    return ""


def get_product_image(product_name, brand="", category_name=""):
    query = f"{product_name} {brand} {category_name} منتج"

    try:
        response = requests.post(
            "https://google.serper.dev/images",
            headers=headers,
            json={"q": query},
            timeout=20,
        )

        if response.status_code != 200:
            print("API ERROR:", response.status_code, response.text[:200])
            return ""

        data = response.json()
        images = data.get("images", [])

        if not images:
            return ""

        return images[0].get("imageUrl", "")

    except Exception as e:
        print("IMAGE ERROR:", product_name, e)
        return ""


def normalize_columns(df):
    rename_map = {}

    for col in df.columns:
        c = str(col).strip()

        if c in ["اسم المنتج", "productName", "Product Name"]:
            rename_map[col] = "name"
        elif c in ["البراند", "الماركة", "Brand"]:
            rename_map[col] = "brand"
        elif c in ["السعر", "Price"]:
            rename_map[col] = "price"
        elif c in ["السعر قبل الخصم", "Old Price"]:
            rename_map[col] = "oldPrice"
        elif c in ["الصورة", "Image"]:
            rename_map[col] = "image"
        elif c in ["القسم", "اسم القسم", "Category", "category"]:
            rename_map[col] = "categoryName"
        elif c in ["id القسم", "Category Id", "CategoryID"]:
            rename_map[col] = "categoryId"
        elif c in ["الكمية", "Stock"]:
            rename_map[col] = "stock"
        elif c in ["الوحدة", "Unit"]:
            rename_map[col] = "unit"

    return df.rename(columns=rename_map)


def main():
    if not os.path.exists(INPUT_FILE):
        print("File not found:", INPUT_FILE)
        return

    excel = pd.ExcelFile(INPUT_FILE)
    print("Sheets:", excel.sheet_names)

    all_products = []

    for sheet_name in excel.sheet_names:
        if sheet_name.lower() in ["readme", "categories"]:
            continue

        print("\nProcessing Sheet:", sheet_name)

        df = pd.read_excel(INPUT_FILE, sheet_name=sheet_name)
        df = normalize_columns(df)

        if "name" not in df.columns:
            print("Skipped sheet, no name column:", sheet_name)
            continue

        if LIMIT_PER_SHEET is not None:
            df = df.head(LIMIT_PER_SHEET)

        for col in [
            "brand",
            "price",
            "oldPrice",
            "image",
            "categoryId",
            "categoryName",
            "stock",
            "unit",
            "isAvailable",
            "isBestSeller",
            "isOffer",
        ]:
            if col not in df.columns:
                df[col] = ""

        for col in ["image", "categoryId", "categoryName", "unit"]:
            df[col] = df[col].astype(object)

        for index, row in df.iterrows():
            product_name = clean_text(row.get("name"))
            brand = clean_text(row.get("brand"))

            if not product_name:
                continue

            row_category_name = clean_text(row.get("categoryName"))
            row_category_id = clean_text(row.get("categoryId"))

            if not row_category_name:
                row_category_name = sheet_name.strip()

            final_category_id = get_category_id(row_category_name, row_category_id)

            if not final_category_id:
                print("NO CATEGORY:", product_name, "|", row_category_name)
                continue

            current_image = clean_text(row.get("image"))

            if not current_image:
                image_url = get_product_image(
                    product_name,
                    brand,
                    row_category_name,
                )

                df.at[index, "image"] = image_url

                if image_url:
                    print("OK:", product_name, "|", row_category_name)
                else:
                    print("NO IMAGE:", product_name, "|", row_category_name)

                time.sleep(0.5)
            else:
                print("SKIP IMAGE:", product_name)

            df.at[index, "categoryName"] = row_category_name
            df.at[index, "categoryId"] = final_category_id
            df.at[index, "isAvailable"] = True

            if not clean_text(row.get("unit")):
                df.at[index, "unit"] = "قطعة"

            if not clean_text(row.get("stock")):
                df.at[index, "stock"] = 50

            if not clean_text(row.get("oldPrice")):
                try:
                    price = float(row.get("price", 0))
                    df.at[index, "oldPrice"] = round(price * 1.1)
                except Exception:
                    df.at[index, "oldPrice"] = 0

        all_products.append(df)

    final_df = pd.concat(all_products, ignore_index=True)

    final_columns = [
        "name",
        "brand",
        "price",
        "oldPrice",
        "categoryId",
        "categoryName",
        "stock",
        "unit",
        "image",
        "isAvailable",
        "isBestSeller",
        "isOffer",
    ]

    for col in final_columns:
        if col not in final_df.columns:
            final_df[col] = ""

    final_df = final_df[final_columns]
    final_df.to_excel(OUTPUT_FILE, index=False)

    print("\nDONE")
    print("Total products:", len(final_df))
    print("Saved file:", OUTPUT_FILE)


if __name__ == "__main__":
    main()