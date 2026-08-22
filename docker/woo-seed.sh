#!/bin/sh
set -e

echo "=========================================="
echo "  CRM WooCommerce Seed Script"
echo "  200 customers | 50 products | 300 orders"
echo "=========================================="

# ── Wait for WordPress ──────────────────────────
echo "[1/7] Waiting for WordPress..."
until wp core is-installed --allow-root 2>/dev/null; do
  sleep 3
done
echo "  ✓ WordPress is installed"

# ── Install WooCommerce ─────────────────────────
echo "[2/7] Installing WooCommerce..."
if ! wp plugin is-installed woocommerce --allow-root 2>/dev/null; then
  wp plugin install woocommerce --activate --allow-root
fi
wp plugin activate woocommerce --allow-root 2>/dev/null || true

# ── WooCommerce Settings ────────────────────────
echo "[3/7] Configuring WooCommerce..."
wp option update woocommerce_store_address "خیابان ولیعصر، پلاک 123" --allow-root
wp option update woocommerce_store_city "تهران" --allow-root
wp option update woocommerce_default_country "IR" --allow-root
wp option update woocommerce_currency "IRR" --allow-root
wp option update woocommerce_price_thousand_sep "," --allow-root
wp option update woocommerce_price_decimal_sep "." --allow-root
wp option update woocommerce_num_decimals 0 --allow-root
wp option update woocommerce_weight_unit "kg" --allow-root
wp option update woocommerce_dimension_unit "cm" --allow-root
wp option update woocommerce_calc_taxes "yes" --allow-root
wp option update woocommerce_enabled_currencies "IRR,USD" --allow-root
wp option update woocommerce_api_enabled "yes" --allow-root
wp rewrite flush --allow-root 2>/dev/null

# ── Categories ──────────────────────────────────
echo "[4/7] Creating categories..."

create_cat() {
  wp wc product_cat create --user=admin --name="$1" --description="$2" --allow-root 2>/dev/null || true
}

create_cat "الکترونیک" "موبایل، لپ‌تاپ، تبلت، لوازم جانبی"
create_cat "پوشاک" "مردانه، زنانه، بچه‌گانه"
create_cat "لوازم خانگی" "آشپزخانه، شستشو، نظافت"
create_cat "ورزشی" "بدنسازی، فوتبال، کوهنوردی"
create_cat "کتاب و لوازم التحریر" "کتاب، دفتر، قلم"
create_cat "آرایشی و بهداشتی" "مراقبت پوست، عطر، لوازم آرایشی"
create_cat "مواد غذایی" "خشکبار، شکلات، چای و قهوه"
create_cat "خودرو" "لوازم یدکی، لوازم جانبی خودرو"
create_cat "مبلمان و دکوراسیون" "مبلمان اداری و خانگی"
create_cat "ابزار و یراق" "ابزار برقی، ابزار دستی"

echo "  ✓ 10 categories created"

# ── Helper: random Persian name parts ───────────
FIRST_NAMES="علی,حسین,محمد,احمد,رضا,سعید,مهدی,امیر,فرهاد,جواد,بهزاد,داریوش,کامران,منوچهر,حمید,رضا,پوریا,آرش,بهرام,سامان,نیما,میلاد,وحید,ṙضا,ابراهیم,حسن,مرتضی,فرید,محمدرضا,علیرضا,امیرحسین,مهدیه,فاطمه,زهرا,مریم,نسرین,سارا,الهام,نگار,مینا,سمیه,ליתا,آناهیتا,رها,پریسا,شیرین,مرجان,سمیرا,زینب,فرزانه,مهسا,هدیه,یاسمن,ندا,النا,برکت,ترانه,پرنیان,شبنم,نجمه"
COMPANY_NAMES="فناوری اطلاعات آریا,گروه صنعتی پارس,شرکت مهندسی نوین,شرکت بازرگانی جهان,فروشگاه زنجیره‌ای رفاه,شرکت پخش دماوند,گروه تجاری ایرانیان,کارخانه سیمان فارس,شرکت حمل و نقل بین‌المللی,شرکت ساختمانی عمران,فروشگاه آنلاین تخفیفان,شرکت تبلیغاتی ایده,آژانس مسافرتی پرستاره,شرکت مشاوره مدیریت,دفتر وکالت حق,شرکت بیمه آسیا,فروشگاه لوازم خانگی,شرکت صادرات و واردات,گروه رستوران‌های زنجیره‌ای,شرکت حسابداری,مرکز تحقیقات صنعتی,شرکت انرژی نو,کارخانه لبنیات,شرکت دارویی,فروشگاه آنلاین مد,شرکت معماری,آموزشگاه کامپیوتر,شرکت توزیع برق,شرکت پیمانکاری,فروشگاه ابزارآلات"
CITIES="تهران,اصفهان,شیراز,تبریز,مشهد,اهواز,کرمان,اراک,زاهدان,همدان,یزد,اردبیل,بندرعباس,قزوین,زنجان,سنندج,بیرجند,بجنورد,ساری,گرگان,رشت,خرم‌آباد,کرج,نیشابور,گلستان"
STREETS="خیابان ولیعصر,خیابان انقلاب,خیابان آزادی,خیابان شریعتی,خیابان میرداماد,خیابان چهارباغ,خیابان چمران,خیابان پیروزی,خیابان نبرد,خیابان بهار,خیابان سعدی,خیابان فردوسی,خیابان کریم خان,خیابان جمهوری,خیابان حافظ,بلوار کشاورز,بلوار آیت‌الله کاشانی,خیابان گاندی,خیابان مطهری,خیابان وینک"
COMPANY_SUFFIXES="& شرکا","LLC","سهامی خاص","تعاونی","꿀"
PHONE_PREFIXES="0912,0913,0914,0915,0916,0917,0918,0919,0920,0921,0930,0932,0933,0935,0936,0938,0939,0901,0902,0903"

rand_item() { echo "$1" | tr ',' '\n' | shuf -n1; }
rand_digit() { echo -n $((RANDOM % 10)); }
rand_phone() { p=$(rand_item "$PHONE_PREFIXES"); echo -n "$p"; for i in 1 2 3 4 5 6 7; do rand_digit; done; }
rand_int() { echo $((RANDOM % ($2 - $1 + 1) + $1)); }

# ── Products ────────────────────────────────────
echo "[5/7] Creating 50 products..."

declare -a PROD_NAMES=(
  "گوشی موبایل سامسونگ Galaxy S24"
  "گوشی موبایل اپل iPhone 15 Pro"
  "گوشی موبایل شیائومی Redmi Note 13"
  "لپ‌تاپ اپل MacBook Air M3"
  "لپ‌تاپ ایسوس ROG Strix G16"
  "تبلت سامسونگ Galaxy Tab S9"
  "هندزفری بی‌سیم اپل AirPods Pro"
  "اسپیکر جیبل JBL Flip 6"
  "ساعت هوشمند اپل Watch Series 9"
  "پاوربانک شیائومی 20000mAh"
  "کیف مردانه چرم طبیعی"
  "کفش مردانه اسپرت نایک"
  "پیراهن مردانه کلاسیک"
  "مانتو زنانه مجلسی"
  "کفش زنانه پاشنه‌دار"
  "شلوار جین مردانه"
  "آبمیوه‌گیری فیلیپس"
  "mixer بوش مدل MMB4372"
  "جاروبرقی سامسونگ"
  "ماشین لباسشویی ال جی 8 کیلویی"
  "توپ فوتبال آدیداس مدل Al Rihla"
  "دمبل بدنسازی 10 کیلویی"
  "چادر کوهنوردی 3 نفره"
  "کتاب آموزش جاوااسکریپت"
  "دفتر یادداشت چرمی A5"
  "عطر مردانه دولچه گابانا"
  "کرم ضد آفتاب لاروش پوزه"
  "شامپو ضد ریزش فولیکا"
  "پسته اکبری یک کیلویی"
  "شکلات تلخ بلژیکی 70%"
  "چای ایرانی لاهیجان یک کیلویی"
  "قهوه ترک کافه مونت 250 گرمی"
  "روغن موتور 5W-30 کاسترول"
  "لنت ترمز جلو پراید"
  "فیلتر هوای موتور پژو 405"
  "مبل تک‌نفره اداری چرم"
  "میز تحریر چوبی مدرن"
  "کتابخانه فلزی 5 طبقه"
  "ابزار آلات 108 تکه بوش"
  "دریل شارژی ماکیتا"
  "اره فرز دیوالت"
  "پمپ آب خانگی ابارا"
  "لوله کشی مسی 3/4 اینچ"
  "سیم برق 2.5 مسی 100 متری"
  "کولر گازی اینورتر ال جی 12000"
  "بخاری گازی ایران‌رادیاتور"
  "یخچال ساید‌بای‌ساید سامسونگ"
  "مایکروفر سامسونگ 30 لیتری"
  "آبگرمکن بوتان 300 لیتری"
)

declare -a PROD_CATS=(1 1 1 1 1 1 1 1 1 1 2 2 2 2 2 2 3 3 3 3 4 4 4 5 5 6 6 6 7 7 7 7 8 8 8 9 9 9 10 10 10 10 10 10 10 10 10 10 10 10)

declare -a PROD_PRICES=(
  42000000 55000000 12500000 48000000 62000000 22000000 8500000 2800000 15000000 950000
  850000 2200000 450000 1200000 980000 380000 3200000 2800000 4500000 18000000
  350000 280000 1500000 185000 45000 2800000 520000 180000 420000 350000
  320000 480000 1800000 350000 220000 3500000 2800000 1200000 3200000 2800000
  1500000 8500000 120000 45000 32000000 2500000 3800000 1500000 2200000
)

for i in "${!PROD_NAMES[@]}"; do
  idx=$((i))
  name="${PROD_NAMES[$i]}"
  cat_id="${PROD_CATS[$i]}"
  price="${PROD_PRICES[$i]}"
  regular_price=$((price + RANDOM % 500000))
  stock=$((RANDOM % 200 + 5))

  wp wc product create --user=admin \
    --name="$name" \
    --regular_price="$regular_price" \
    --sale_price="$price" \
    --stock_quantity="$stock" \
    --manage_stock=true \
    --status=publish \
    --categories="[{\"id\":$cat_id}]" \
    --description="توضیحات محصول $name — کیفیت عالی، ارسال سریع" \
    --short_description="$name" \
    --allow-root 2>/dev/null

  echo "  ✓ Product $((i+1))/50: $name"
done

# ── Customers (200) via direct DB ──────────────
echo "[6/7] Creating 200 customers..."

FIRST_ARR=$(echo "$FIRST_NAMES" | tr ',' '\n')
COMPANY_ARR=$(echo "$COMPANY_NAMES" | tr ',' '\n')
CITY_ARR=$(echo "$CITIES" | tr ',' '\n')
STREET_ARR=$(echo "$STREETS" | tr ',' '\n')

LAST_NAMES="احمدی,محمدی,رضاپور,علیپور,حسینی,کریمی,فرهادی,جعفری,نوری,слоб,پورمحمد,مرادی,صادقی, asked,نقوی,ower, Mohammadi,ahmadi,rezaei,hosseini,karimi,rahimi,mousavi,fallah,moradi,jafari,khoshbakht,khalili,soltani,mohammadi,hashemi,azami,gorji,tavakoli,hamidi,sharifi,kiani,raisi,fazel,malmir,safaei,shams,tabatabaei,mirzaei,ahmadikhah,dehghani,shahbazi,mohseni,zakeri,ghasemi,lotfi,najafi,zarei,khodaei,amiri,shirazi,boroumand"

LAST_ARR=$(echo "$LAST_NAMES" | tr ',' '\n')

for i in $(seq 1 200); do
  fn=$(echo "$FIRST_ARR" | shuf -n1)
  ln=$(echo "$LAST_ARR" | shuf -n1)
  email=$(echo "${fn}${i}@example.com" | tr '[:upper:]' '[:lower:]' | sed 's/ی/y/g; s/و/o/g; s/ه/e/g; s/ن/n/g; s/م/m/g; s/ر/r/g; s/ل/l/g; s/ک/k/g; s/د/d/g; s/س/s/g; s/ع/a/g; s/ب/b/g; s/ت/t/g; s/پ/p/g; s/ش/sh/g; s/چ/ch/g; s/ژ/zh/g; s/خ/kh/g; s/غ/gh/g; s/ف/f/g; s/ق/g/g; s/گ/g2/g')
  phone=$(rand_phone)
  city=$(echo "$CITY_ARR" | shuf -n1)
  street=$(echo "$STREET_ARR" | shuf -n1)
  num=$((RANDOM % 500 + 1))
  comp=$(echo "$COMPANY_ARR" | shuf -n1)
  street_num=$((RANDOM % 200 + 1))

  wp wc customer create --user=admin \
    --email="$email" \
    --first_name="$fn" \
    --last_name="$ln" \
    --billing="{\"first_name\":\"$fn\",\"last_name\":\"$ln\",\"company\":\"$comp\",\"address_1\":\"$street $street_num\",\"city\":\"$city\",\"state\":\"$city\",\"country\":\"IR\",\"phone\":\"$phone\",\"email\":\"$email\"}" \
    --shipping="{\"first_name\":\"$fn\",\"last_name\":\"$ln\",\"company\":\"$comp\",\"address_1\":\"$street $street_num\",\"city\":\"$city\",\"state\":\"$city\",\"country\":\"IR\"}" \
    --username="${fn}${i}" \
    --password="Customer#${i}!" \
    --allow-root 2>/dev/null

  if [ $((i % 25)) -eq 0 ]; then
    echo "  ✓ Customers $i/200 created"
  fi
done

# ── Orders (300) ───────────────────────────────
echo "[7/7] Creating 300 orders..."

# Get customer IDs
CUST_IDS=$(wp wc customer list --user=admin --fields=id --format=ids --per_page=200 --allow-root 2>/dev/null)
CUST_ARRAY=$(echo "$CUST_IDS" | tr ' ' '\n' | grep -v '^$')

STATUSES="completed,completed,completed,completed,completed,processing,processing,processing,on-hold,refunded,cancelled,failed"
STATUS_ARR=$(echo "$STATUSES" | tr ',' '\n')

PAYMENT_METHODS="bacs,cheque,cod"
PAY_ARR=$(echo "$PAYMENT_METHODS" | tr ',' '\n')

for i in $(seq 1 300); do
  cust_id=$(echo "$CUST_ARRAY" | shuf -n1)
  status=$(echo "$STATUS_ARR" | shuf -n1)
  payment=$(echo "$PAY_ARR" | shuf -n1)

  # Random date in last 6 months
  days_ago=$((RANDOM % 180 + 1))
  order_date=$(date -d "-${days_ago} days" '+%Y-%m-%dT%H:%M:%S' 2>/dev/null || date -v-${days_ago}d '+%Y-%m-%dT%H:%M:%S' 2>/dev/null)

  # 1-5 items per order
  num_items=$((RANDOM % 5 + 1))
  line_items="["

  for j in $(seq 1 $num_items); do
    prod_id=$((RANDOM % 50 + 1))
    qty=$((RANDOM % 4 + 1))
    if [ $j -gt 1 ]; then line_items="${line_items},"; fi
    line_items="${line_items}{\"id\":$prod_id,\"quantity\":$qty}"
  done

  line_items="${line_items}]"

  wp wc order create --user=admin \
    --status="$status" \
    --customer_id="$cust_id" \
    --payment_method="$payment" \
    --line_items="$line_items" \
    --date_created="$order_date" \
    --customer_note="سفارش شماره $i" \
    --allow-root 2>/dev/null

  if [ $((i % 50)) -eq 0 ]; then
    echo "  ✓ Orders $i/300 created"
  fi
done

# ── Coupons (50) ───────────────────────────────
echo "[bonus] Creating 50 coupons..."

COUPON_TYPES="percent,fixed_cart,fixed_product"
TYPE_ARR=$(echo "$COUPON_TYPES" | tr ',' '\n')

for i in $(seq 1 50); do
  ctype=$(echo "$TYPE_ARR" | shuf -n1)
  if [ "$ctype" = "percent" ]; then
    amount=$((RANDOM % 40 + 5))
  else
    amount=$((RANDOM % 500000 + 50000))
  fi
  code="CRM$(printf '%03d' $i)"
  min=$((RANDOM % 5 + 1))
  usage=$((RANDOM % 100 + 1))

  wp wc coupon create --user=admin \
    --code="$code" \
    --discount_type="$ctype" \
    --amount="$amount" \
    --minimum_amount="$((min * 100000))" \
    --usage_limit="$usage" \
    --individual_use=true \
    --description="کوپن تخفیف CRM #$i" \
    --allow-root 2>/dev/null

  if [ $((i % 10)) -eq 0 ]; then
    echo "  ✓ Coupons $i/50 created"
  fi
done

# ── Create REST API Key ─────────────────────────
echo ""
echo "=========================================="
echo "  Creating REST API Key..."
echo "=========================================="
API_RESULT=$(wp wc --user=admin api_key create --description="CRM Integration" --permissions=read_write --allow-root 2>/dev/null)
echo "$API_RESULT"

echo ""
echo "=========================================="
echo "  ✓ SEED COMPLETE!"
echo "  200 customers | 50 products | 300 orders | 50 coupons"
echo "=========================================="
