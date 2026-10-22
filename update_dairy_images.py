import pandas as pd
import requests
import time

API_KEY = "f53a867328b63e883baa03a08911332bc2247a47"

INPUT_FILE = r"Bringo_Dairy_Cheese_Eggs_200_Products.xlsx"
OUTPUT_FILE = r"Bringo_Dairy_Cheese_Eggs_200_Products_With_Images.xlsx"

headers = {
    "X-API-KEY": API_KEY,
    "Content-Type": "application/json"
}


def get_image(product_name, brand):
    query = f"{product_name} {brand}"

    try:
        response = requests.post(
            "https://google.serper.dev/images",
            headers=headers,
            json={"q": query},
            timeout=20
        )

        if response.status_code != 200:
            print("API ERROR:", response.status_code)
            return ""

        data = response.json()

        images = data.get("images", [])

        if len(images) == 0:
            return ""

        return images[0].get("imageUrl", "")

    except Exception as e:
        print("ERROR:", e)
        return ""


df = pd.read_excel(INPUT_FILE)
df["image"] = df["image"].fillna("").astype(object)

success = 0
failed = 0

for index, row in df.iterrows():

    name = str(row["name"]).strip()
    brand = str(row["brand"]).strip()

    current_image = str(row.get("image", "")).strip()

    if current_image and current_image != "nan":
        continue

    image_url = get_image(name, brand)

    if image_url:
        df.loc[index, "image"] = str(image_url)
        success += 1
        print("OK:", name)
    else:
        failed += 1
        print("NO IMAGE:", name)

    time.sleep(0.5)

df.to_excel(
    OUTPUT_FILE,
    index=False
)

print("\nDONE")
print("SUCCESS:", success)
print("FAILED:", failed)