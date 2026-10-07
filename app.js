"use strict";
const $ = selector => document.querySelector(selector);
const cards = $("#products"), message = $("#message"), search = $("#search");
const number = new Intl.NumberFormat("th-TH", {maximumFractionDigits: 2});
const baht = value => number.format(Math.round(value * 100) / 100) + " ฿";
const cart = new Map();
let products = [], kind = "all";

function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}
function productById(id) { return products.find(product => product.id === id); }
function unitLabel(product) {
  return product.kind === "seal" ? "ใบ" : product.kind === "money" ? "T" :
    product.kind === "service" ? product.unit : "ชิ้น";
}
function defaultQuantity(product) {
  return product.kind === "seal" ? (product.pack_size || 1000) : product.kind === "money" ?
    Math.max(1, Number.parseFloat(product.unit) || 1) : 1;
}
function linePrice(product, quantity) {
  const divisor = product.kind === "seal" ? (product.pack_size || 1000) : product.kind === "money" ?
    Number.parseFloat(product.unit) || 1 : 1;
  return (product.price || 0) * quantity / divisor;
}
function quantity(value) {
  const result = Number(value);
  return Number.isInteger(result) && result > 0 && result <= 1000000 ? result : null;
}

function renderProducts() {
  const query = search.value.trim().toLocaleLowerCase("th");
  const line = $("#seal-line").value, availableOnly = $("#available-only").checked;
  const shown = products.filter(product => (kind === "all" || product.kind === kind) &&
    (line === "all" || (product.kind === "seal" && product.category === line)) &&
    (!availableOnly || product.available) &&
    String(product.name).toLocaleLowerCase("th").includes(query));
  const sort = $("#sort").value;
  shown.sort((a, b) => sort === "price-low" ?
    ((a.price ?? Infinity) - (b.price ?? Infinity)) || a.name.localeCompare(b.name, "th") :
    sort === "price-high" ? ((b.price ?? -1) - (a.price ?? -1)) || a.name.localeCompare(b.name, "th") :
    a.name.localeCompare(b.name, "th"));
  const fragment = document.createDocumentFragment();
  for (const product of shown) {
    const card = element("article", "card" + (product.available ? "" : " unavailable"));
    const imageBox = element("div", "card-image");
    if (product.image && /^assets\/products\/[a-f0-9]{24}\.webp$/.test(product.image)) {
      const image = element("img"); image.src = "./" + product.image;
      image.alt = product.name; image.loading = "lazy"; imageBox.append(image);
    } else imageBox.append(element("span", "placeholder", "◈"));
    const body = element("div", "card-body");
    const label = product.kind === "seal" ? "SEAL · " + product.category :
      product.kind === "service" ? "บริการ · " + product.category :
      product.kind === "money" ? "เงิน T" : "ITEM";
    const price = element("div", "price");
    price.append(element("strong", "", product.price > 0 ? baht(product.price) : "สอบถามราคา"),
      element("span", "", "ต่อ " + product.unit));
    const selector = element("div", "product-select");
    const input = element("input"); input.type = "number"; input.min = "1";
    input.max = "1000000"; input.value = defaultQuantity(product);
    input.setAttribute("aria-label", "จำนวน" + unitLabel(product) + "ของ" + product.name);
    const add = element("button", "", "เพิ่มรายการ"); add.type = "button";
    add.disabled = !(product.price > 0);
    add.addEventListener("click", () => {
      const amount = quantity(input.value);
      if (!amount || (cart.get(product.id) || 0) + amount > 1000000) {
        input.setCustomValidity("กรุณากรอกจำนวน 1–1,000,000"); input.reportValidity(); return;
      }
      input.setCustomValidity(""); cart.set(product.id, (cart.get(product.id) || 0) + amount);
      renderCart(); $("#copy-status").textContent = "เพิ่ม " + product.name + " แล้ว · ตรวจรายการก่อนคัดลอก";
    });
    selector.append(input, add);
    body.append(element("div", "category", label), element("h3", "", product.name),
      element("span", "availability", product.available ? "มีสินค้า" : "สอบถามสต็อก"), price, selector);
    card.append(imageBox, body); fragment.append(card);
  }
  cards.replaceChildren(fragment);
  $("#count").textContent = shown.length + " รายการ";
  message.hidden = shown.length > 0;
  if (!shown.length) message.textContent = products.length ? "ไม่พบสินค้าที่ค้นหา" : "ยังไม่มีสินค้าในแค็ตตาล็อก";
}

function totals() {
  let subtotal = 0, sealSubtotal = 0;
  for (const [id, amount] of cart) {
    const product = productById(id);
    if (!product) continue;
    const value = linePrice(product, amount); subtotal += value;
    if (product.kind === "seal") sealSubtotal += value;
  }
  const discount = Math.round(subtotal * 5) / 100;
  return {subtotal, discount, total: subtotal - discount,
    reward: Math.floor(sealSubtotal / 100) * 150};
}
function renderCart() {
  const fragment = document.createDocumentFragment();
  let rows = 0;
  for (const [id, amount] of cart) {
    const product = productById(id);
    if (!product) { cart.delete(id); continue; }
    rows++;
    const row = element("div", "cart-row");
    const title = element("div"); title.append(element("strong", "", product.name),
      element("small", "", unitLabel(product)));
    const remove = element("button", "", "×"); remove.type = "button";
    remove.setAttribute("aria-label", "ลบ " + product.name);
    remove.addEventListener("click", () => { cart.delete(id); renderCart(); });
    const input = element("input"); input.type = "number"; input.min = "1";
    input.max = "1000000"; input.value = amount;
    input.setAttribute("aria-label", "จำนวน" + product.name);
    input.addEventListener("change", () => {
      const next = quantity(input.value);
      if (!next) { input.value = cart.get(id); return; }
      cart.set(id, next); renderCart();
    });
    row.append(title, remove, input, element("span", "line-total", baht(linePrice(product, amount))));
    fragment.append(row);
  }
  if (!rows) fragment.append(element("p", "cart-empty", "ยังไม่ได้เลือกสินค้า"));
  $("#cart-items").replaceChildren(fragment);
  const sum = totals();
  $("#cart-count").textContent = rows + " รายการ";
  $("#subtotal").textContent = baht(sum.subtotal);
  $("#discount").textContent = "−" + baht(sum.discount);
  $("#total").textContent = baht(sum.total);
  $("#reward").textContent = sum.reward ?
    "🎁 D2 ประมาณ " + number.format(sum.reward) + " อัน" :
    "🎁 ซื้อซีลครบทุก 100 ฿ รับ D2 150 อัน";
  $("#copy-order").disabled = !rows;
}
function orderText() {
  const tamer = $("#tamer").value.trim(), contact = $("#contact").value.trim();
  if (!tamer || !contact) return null;
  const lines = ["รายการที่ต้องการ — DMO Store", "เทมเมอร์: " + tamer,
    "เซิร์ฟเวอร์: ลิเวียมอน", "Facebook: " + contact, ""];
  let index = 0;
  for (const [id, amount] of cart) {
    const product = productById(id);
    if (product) lines.push(++index + ". " + product.name +
      (product.kind === "seal" ? " [" + product.category + "]" : "") +
      " × " + number.format(amount) + " " + unitLabel(product) + " = " +
      baht(linePrice(product, amount)) + (product.available ? "" : " (รอตรวจสต็อก)"));
  }
  const sum = totals();
  lines.push("", "รวมก่อนลด: " + baht(sum.subtotal), "ลด 5%: " + baht(sum.discount),
    "ยอดประมาณ: " + baht(sum.total));
  if (sum.reward) lines.push("D2 แถมประมาณ " + number.format(sum.reward) + " อัน");
  lines.push("กรุณาตรวจสต็อกและยืนยันยอดก่อนชำระเงิน");
  return lines.join("\n");
}
$("#copy-order").addEventListener("click", async () => {
  const content = orderText();
  if (!content) {
    $("#copy-status").textContent = "กรุณากรอกชื่อเทมเมอร์และชื่อ Facebook ก่อนคัดลอก";
    (!$("#tamer").value.trim() ? $("#tamer") : $("#contact")).focus(); return;
  }
  try {
    await navigator.clipboard.writeText(content);
    $("#copy-status").textContent = "คัดลอกแล้ว! วางข้อความในแชต Arnas Arkeh เพื่อส่งร้าน";
  } catch (_) { $("#copy-status").textContent = "คัดลอกไม่สำเร็จ กรุณาอนุญาตคลิปบอร์ดแล้วลองอีกครั้ง"; }
});
$("#filters").addEventListener("click", event => {
  const button = event.target.closest("button[data-filter]");
  if (!button) return;
  kind = button.dataset.filter;
  document.querySelectorAll("#filters button").forEach(item =>
    item.classList.toggle("active", item === button));
  if (kind !== "seal") $("#seal-line").value = "all";
  renderProducts();
});
search.addEventListener("input", renderProducts);
[$("#seal-line"), $("#sort"), $("#available-only")].forEach(control =>
  control.addEventListener("change", renderProducts));
fetch("./catalog.json", {cache: "no-cache"}).then(response => {
  if (!response.ok) throw new Error("catalog unavailable");
  return response.json();
}).then(data => {
  products = Array.isArray(data.products) ? data.products : [];
  const lines = [...new Set(products.filter(p => p.kind === "seal" && p.category)
    .map(p => p.category))].sort();
  for (const line of lines) {
    const option = element("option", "", line); option.value = line;
    $("#seal-line").append(option);
  }
  const updated = new Date(data.updated_at);
  $("#updated").textContent = Number.isNaN(updated.getTime()) ? "รายการสินค้าล่าสุด" :
    "อัปเดต " + updated.toLocaleString("th-TH", {dateStyle: "medium", timeStyle: "short"});
  renderProducts(); renderCart();
}).catch(() => { message.textContent = "ยังโหลดรายการสินค้าไม่ได้ กรุณาลองใหม่ภายหลัง"; });
