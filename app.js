"use strict";
const $ = selector => document.querySelector(selector);
const cards = $("#products"), message = $("#message"), search = $("#search");
const number = new Intl.NumberFormat("th-TH", {maximumFractionDigits: 2});
const baht = value => number.format(Math.round(value * 100) / 100) + " ฿";
const cart = new Map();
let products = [], kind = "all", visibleLimit = 60;
let favorites;
try { favorites = new Set(JSON.parse(localStorage.getItem("dmo-catalog-favorites") || "[]")); }
catch (_) { favorites = new Set(); }
const sectionNames = {NORMAL: "ปกติ", BASE_HARD: "เบสยาก", SUSA: "ซูซา", SET: "เซ็ต"};
function updateSetLineButtons() {
  document.querySelectorAll("#set-line-filters button").forEach(button =>
    button.classList.toggle("active", button.dataset.line === $("#seal-line").value));
}

function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}
function productById(id) { return products.find(product => product.id === id); }
function unitLabel(product) {
  return product.kind === "seal" ? "ใบ" : product.kind === "set" ? "ชุด" : product.kind === "money" ? "T" :
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
  const line = $("#seal-line").value, section = $("#section").value;
  const availableOnly = $("#available-only").checked;
  const shown = products.filter(product => (kind === "favorite" ? favorites.has(product.id) :
    kind === "all" || product.kind === kind) &&
    (line === "all" || product.category === line) &&
    (section === "all" || (product.section || "NORMAL") === section) &&
    (!availableOnly || product.available) &&
    String(product.name).toLocaleLowerCase("th").includes(query));
  const sort = $("#sort").value;
  shown.sort((a, b) => {
    if (a.available !== b.available) return a.available ? -1 : 1;
    if (kind === "all" && a.kind !== b.kind && (a.kind === "set" || b.kind === "set")) {
      return a.kind === "set" ? -1 : 1;
    }
    if (sort === "price-low") {
      return ((a.price ?? Infinity) - (b.price ?? Infinity)) || a.name.localeCompare(b.name, "th");
    }
    if (sort === "price-high") {
      return ((b.price ?? -1) - (a.price ?? -1)) || a.name.localeCompare(b.name, "th");
    }
    return a.name.localeCompare(b.name, "th");
  });
  const fragment = document.createDocumentFragment();
  let renderedUnavailableDivider = false;

  for (const product of shown.slice(0, visibleLimit)) {
    if (!product.available && !renderedUnavailableDivider) {
      renderedUnavailableDivider = true;
      const divider = element("div", "out-of-stock-divider");
      const info = element("div", "divider-info");
      const titleRow = element("div", "divider-title-row");
      titleRow.append(
        element("span", "divider-badge", "สินค้าหมด"),
        element("h3", "", "สินค้าหมด (สามารถสอบถามได้)")
      );
      const desc = element("p", "", "รายการด้านล่างนี้หมดสต็อกชั่วคราว สามารถติดต่อสอบถามหรือสั่งจองกับทางร้านได้ครับ");
      info.append(titleRow, desc);

      const contactBtn = element("a", "divider-contact", "💬 ทักแชตสอบถาม ↗");
      contactBtn.href = "https://m.me/kakachi.kung.5";
      contactBtn.target = "_blank";
      contactBtn.rel = "noopener noreferrer";

      divider.append(info, contactBtn);
      fragment.append(divider);
    }

    const card = element("article", "card" + (product.available ? "" : " unavailable") +
      (product.kind === "set" ? " set-card" : ""));
    const imageBox = element("div", "card-image");
    if (product.image && /^assets\/products\/[a-f0-9]{24}\.webp$/.test(product.image)) {
      const image = element("img"); image.src = "./" + product.image;
      image.alt = product.name; image.loading = "lazy";
      image.setAttribute("draggable", "false");
      const shield = element("div", "image-shield");
      shield.setAttribute("aria-hidden", "true");
      shield.addEventListener("contextmenu", e => e.preventDefault());
      const watermark = element("span", "image-watermark", "DMO STORE");
      imageBox.append(image, shield, watermark);
    } else imageBox.append(element("span", "placeholder", "◈"));
    const body = element("div", "card-body");
    if (product.kind === "set") body.append(element("span", "set-badge", "เซ็ตซีล · " + product.category));
    const label = product.kind === "seal" ? product.category + " · " + (sectionNames[product.section] || "ปกติ") :
      product.kind === "set" ? product.category + " · เซ็ตซีล" :
      product.kind === "service" ? "บริการ · " + product.category :
      product.kind === "money" ? "เงิน T" : "ITEM";
    const price = element("div", "price", (product.price > 0 ? baht(product.price) : "สอบถามราคา") + " / " + product.unit);
    const top = element("div", "card-top");
    const title = element("h3", "", product.name);
    const favorite = element("button", "favorite-toggle" + (favorites.has(product.id) ? " selected" : ""),
      favorites.has(product.id) ? "♥" : "♡");
    favorite.type = "button"; favorite.setAttribute("aria-label", "รายการโปรด " + product.name);
    favorite.addEventListener("click", () => {
      if (favorites.has(product.id)) favorites.delete(product.id); else favorites.add(product.id);
      try { localStorage.setItem("dmo-catalog-favorites", JSON.stringify([...favorites])); } catch (_) {}
      $("#favorite-count").textContent = "(" + favorites.size + ")";
      renderProducts();
    });
    top.append(title, favorite);
    const selector = element("div", "product-select");
    const input = element("input"); input.type = "number"; input.min = "1";
    const def = defaultQuantity(product);
    input.max = "1000000"; input.value = def;
    input.defaultValue = def;
    input.setAttribute("value", def);
    input.setAttribute("aria-label", "จำนวน" + unitLabel(product) + "ของ" + product.name);
    const add = element("button", "", "เพิ่มรายการ"); add.type = "button";

    if (!product.available) {
      add.disabled = true;
      add.textContent = "หมด (สามารถสอบถามได้)";
      add.title = "สินค้าหมดสต็อก สามารถทักแชตสอบถามกับทางร้านได้ครับ";
      input.disabled = true;
    } else if (!(product.price > 0)) {
      add.disabled = true;
      add.textContent = "สอบถามราคา";
      input.disabled = true;
    } else {
      add.disabled = false;
      add.textContent = "เพิ่มรายการ";
      input.disabled = false;
      add.addEventListener("click", () => {
        const amount = quantity(input.value);
        if (!amount || (cart.get(product.id) || 0) + amount > 1000000) {
          input.setCustomValidity("กรุณากรอกจำนวน 1–1,000,000"); input.reportValidity(); return;
        }
        input.setCustomValidity("");
        const currentTotal = (cart.get(product.id) || 0) + amount;
        cart.set(product.id, currentTotal);
        renderCart();
        $("#copy-status").textContent = "เพิ่ม " + product.name + " (" + number.format(currentTotal) + " " + unitLabel(product) + ") แล้ว";
        add.textContent = "✓ เพิ่มแล้ว (" + number.format(currentTotal) + ")";
        add.classList.add("added");
        setTimeout(() => {
          add.textContent = "เพิ่มรายการ";
          add.classList.remove("added");
        }, 900);
      });
    }

    selector.append(input, add);
    body.append(top, element("div", "category", label), price,
      element("span", "availability", product.available ? "มีสินค้า" : "หมด (สามารถสอบถามได้)"));
    if (product.kind === "set" && Array.isArray(product.members)) {
      const detail = element("details", "set-members");
      detail.append(element("summary", "", "ดูรายชื่อในเซ็ต " + product.members.length + " ตัว · ตัวละ " +
        number.format(product.leaves_per_seal) + " ใบ"));
      const list = element("ol");
      for (const member of product.members) list.append(element("li", "", member));
      detail.append(list);
      body.append(detail);
    }
    body.append(selector);
    card.append(imageBox, body); fragment.append(card);
  }
  cards.replaceChildren(fragment);
  const inStockCount = shown.filter(p => p.available).length;
  $("#count").textContent = "พบ " + shown.length + " รายการ" +
    (inStockCount > 0 ? " (มีสินค้า " + inStockCount + " รายการ)" : " (สินค้าหมด)") +
    (shown.length > visibleLimit ? " · แสดง " + visibleLimit + " รายการแรก" : "");
  $("#show-more").hidden = shown.length <= visibleLimit;
  message.hidden = shown.length > 0;
  if (!shown.length) message.textContent = products.length ? "ไม่พบสินค้าที่ค้นหา" : "ยังไม่มีสินค้าในแค็ตตาล็อก";
}

function totals() {
  let subtotal = 0, sealSubtotal = 0;
  for (const [id, amount] of cart) {
    const product = productById(id);
    if (!product) continue;
    const value = linePrice(product, amount); subtotal += value;
    if (product.kind === "seal" || product.kind === "set") sealSubtotal += value;
  }
  const discount = Math.round(sealSubtotal * 5) / 100;
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
    input.defaultValue = amount;
    input.setAttribute("value", amount);
    input.setAttribute("aria-label", "จำนวน" + product.name);
    input.addEventListener("change", () => {
      const next = quantity(input.value);
      if (!next) { input.value = cart.get(id); return; }
      cart.set(id, next); renderCart();
    });
    row.append(title, input, remove, element("span", "line-total", baht(linePrice(product, amount))));
    fragment.append(row);
  }
  if (!rows) fragment.append(element("p", "cart-empty", "ยังไม่ได้เลือกสินค้า"));
  $("#cart-items").replaceChildren(fragment);
  const sum = totals();
  $("#cart-count").textContent = rows + " รายการ";
  $("#mobile-cart-count").textContent = String(rows);
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
      baht(linePrice(product, amount)) + (product.kind === "set" ?
        " (" + product.members.join(", ") + "; ชนิดละ " + number.format(product.leaves_per_seal) + " ใบ)" : "") +
      (product.available ? "" : " (รอตรวจสต็อก)"));
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
    $("#copy-status").textContent = "คัดลอกแล้ว! กดเปิด Facebook ร้าน แล้ววางข้อความส่งแชต";
  } catch (_) { $("#copy-status").textContent = "คัดลอกไม่สำเร็จ กรุณาอนุญาตคลิปบอร์ดแล้วลองอีกครั้ง"; }
});
$("#filters").addEventListener("click", event => {
  const button = event.target.closest("button[data-filter]");
  if (!button) return;
  kind = button.dataset.filter;
  document.querySelectorAll("#filters button").forEach(item =>
    item.classList.toggle("active", item === button));
  if (!(["seal", "set", "favorite"].includes(kind))) $("#seal-line").value = "all";
  if (kind !== "seal") $("#section").value = "all";
  $("#section").closest("label").hidden = kind !== "seal";
  $("#seal-line").closest("label").hidden = !(kind === "seal" || kind === "favorite");
  $("#set-line-filters").hidden = kind !== "set";
  updateSetLineButtons();
  $("#catalog-title").textContent = ({all: "สินค้าทั้งหมด", seal: "รายการซีล", item: "รายการไอเทม", service: "รายการบริการ",
    money: "เงิน T", set: "เซ็ตซีล", favorite: "รายการโปรด"})[kind];
  visibleLimit = 60;
  renderProducts();
});
search.addEventListener("input", () => { visibleLimit = 60; renderProducts(); });
[$("#seal-line"), $("#section"), $("#sort"), $("#available-only")].forEach(control =>
  control.addEventListener("change", () => { visibleLimit = 60; updateSetLineButtons(); renderProducts(); }));
$("#set-line-filters").addEventListener("click", event => {
  const button = event.target.closest("button[data-line]");
  if (!button) return;
  $("#seal-line").value = button.dataset.line;
  visibleLimit = 60;
  updateSetLineButtons(); renderProducts();
});
$("#show-more").addEventListener("click", () => { visibleLimit += 60; renderProducts(); });
$("#clear-cart").addEventListener("click", () => { cart.clear(); renderCart(); $("#copy-status").textContent = "ล้างรายการแล้ว"; });
$("#refresh").addEventListener("click", () => { window.location.reload(); });
if ("IntersectionObserver" in window) {
  new IntersectionObserver(entries => {
    $(".mobile-cart").classList.toggle("is-hidden", entries[0].isIntersecting);
  }, {threshold: 0}).observe($("#cart"));
}
fetch("./catalog.json", {cache: "no-cache"}).then(response => {
  if (!response.ok) throw new Error("catalog unavailable");
  return response.json();
}).then(data => {
  products = Array.isArray(data.products) ? data.products : [];
  const lines = [...new Set(products.filter(p => (p.kind === "seal" || p.kind === "set") && p.category)
    .map(p => p.category))].sort();
  for (const line of lines) {
    const option = element("option", "", line); option.value = line;
    $("#seal-line").append(option);
  }
  const allSets = element("button", "", "ทุกสาย");
  allSets.type = "button"; allSets.dataset.line = "all";
  $("#set-line-filters").append(allSets);
  for (const line of [...new Set(products.filter(p => p.kind === "set").map(p => p.category))].sort()) {
    const button = element("button", "", line); button.type = "button";
    button.dataset.line = line; $("#set-line-filters").append(button);
  }
  updateSetLineButtons();
  const updated = new Date(data.updated_at);
  $("#updated").textContent = Number.isNaN(updated.getTime()) ? "รายการสินค้าล่าสุด" :
    "อัปเดต " + updated.toLocaleString("th-TH", {dateStyle: "medium", timeStyle: "short"});
  $("#favorite-count").textContent = "(" + favorites.size + ")";
  renderProducts(); renderCart();
}).catch(() => { message.textContent = "ยังโหลดรายการสินค้าไม่ได้ กรุณาลองใหม่ภายหลัง"; });

// Anti-theft & Scraping Protections
document.addEventListener("contextmenu", event => {
  event.preventDefault();
  return false;
}, { capture: true });

document.addEventListener("dragstart", event => {
  event.preventDefault();
  return false;
}, { capture: true });

document.addEventListener("keydown", event => {
  // Block F12
  if (event.key === "F12" || event.keyCode === 123) {
    event.preventDefault();
    return false;
  }
  // Block Ctrl+Shift+I / J / C (DevTools) & Mac equivalents
  if ((event.ctrlKey || event.metaKey) && event.shiftKey &&
      ["I", "i", "J", "j", "C", "c"].includes(event.key)) {
    event.preventDefault();
    return false;
  }
  // Block Ctrl+U (View Source) & Mac equivalent
  if ((event.ctrlKey || event.metaKey) && (event.key === "u" || event.key === "U")) {
    event.preventDefault();
    return false;
  }
  // Block Ctrl+S (Save Page) & Mac equivalent
  if ((event.ctrlKey || event.metaKey) && (event.key === "s" || event.key === "S")) {
    event.preventDefault();
    return false;
  }
  // Block Ctrl+P (Print Page) & Mac equivalent
  if ((event.ctrlKey || event.metaKey) && (event.key === "p" || event.key === "P")) {
    event.preventDefault();
    return false;
  }
}, { capture: true });

try {
  console.clear();
  console.log(
    "%c[DMO Store Security]%c ข้อมูลและรูปภาพทั้งหมดเป็นลิขสิทธิ์ของ DMO Store ห้ามคัดลอก ทำซ้ำ หรือดึงข้อมูลไปใช้ในเชิงพาณิชย์",
    "color: #ef4444; font-weight: bold; font-size: 14px;",
    "color: #94a3b8; font-size: 13px;"
  );
} catch (_) {}
