"use strict";

// --- 2-Color Modes (Light & Dark Theme) ---
function getInitialTheme() {
  try {
    const saved = localStorage.getItem("dmo-theme");
    if (saved === "light" || saved === "dark") return saved;
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
  } catch (_) {}
  return "light";
}

let currentTheme = getInitialTheme();
document.documentElement.setAttribute("data-theme", currentTheme);

function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem("dmo-theme", theme);
  } catch (_) {}
  
  const lightBtn = document.getElementById("theme-light-btn");
  const darkBtn = document.getElementById("theme-dark-btn");
  if (lightBtn) lightBtn.classList.toggle("active", theme === "light");
  if (darkBtn) darkBtn.classList.toggle("active", theme === "dark");
  
  const quickBtn = document.getElementById("theme-toggle-quick");
  if (quickBtn) {
    quickBtn.textContent = theme === "dark" ? "☀️ โหมดสว่าง" : "🌙 โหมดมืด";
  }
}

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
function updateSealSectionButtons() {
  document.querySelectorAll("#seal-section-filters button").forEach(button =>
    button.classList.toggle("active", button.dataset.section === $("#section").value));
}
function updateSealLineButtons() {
  document.querySelectorAll("#seal-line-filters button").forEach(button =>
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
  return product.kind === "seal" ? (product.pack_size || 1000) : product.kind === "money" ? 1000 : 1;
}
function linePrice(product, quantity) {
  const divisor = product.kind === "seal" ? (product.pack_size || 1000) : 1;
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
  const isSealKind = ["seal", "seal-normal", "seal-base-hard", "seal-susa"].includes(kind);
  const shown = products.filter(product => {
    if (kind === "favorite") {
      if (!favorites.has(product.id)) return false;
    } else if (isSealKind) {
      if (product.kind !== "seal") return false;
    } else if (kind !== "all" && product.kind !== kind) {
      return false;
    }
    if (line !== "all" && product.category !== line) return false;
    if (section !== "all" && (product.section || "NORMAL") !== section) return false;
    if (availableOnly && !product.available) return false;
    return String(product.name).toLocaleLowerCase("th").includes(query);
  });
  const sort = $("#sort").value;
  shown.sort((a, b) => {
    if (a.available !== b.available) return a.available ? -1 : 1;
    if (kind === "all" && a.kind !== b.kind && (a.kind === "set" || b.kind === "set")) {
      return a.kind === "set" ? -1 : 1;
    }
    if (sort === "price-low") {
      const pA = a.price > 0 ? a.price : Infinity;
      const pB = b.price > 0 ? b.price : Infinity;
      return (pA - pB) || a.name.localeCompare(b.name, "th");
    }
    if (sort === "price-high") {
      const pA = a.price > 0 ? a.price : -1;
      const pB = b.price > 0 ? b.price : -1;
      return (pB - pA) || a.name.localeCompare(b.name, "th");
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
    if (product.kind === "set") {
      body.append(element("span", "set-badge", "เซ็ตซีล · " + product.category));
    } else if (product.kind === "seal") {
      if (product.section === "BASE_HARD") {
        body.append(element("span", "section-badge badge-base-hard", "เบสยาก · ขายเดี่ยวเป็นใบ"));
      } else if (product.section === "SUSA") {
        body.append(element("span", "section-badge badge-susa", "ซูซา · ขายเดี่ยวเป็นใบ"));
      }
    }
    const label = product.kind === "seal" ?
      product.category + " · " + (sectionNames[product.section] || "ปกติ") + (product.pack_size === 1 ? " (ขายเป็นใบ)" : "") :
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
  let subtotal = 0, sealSubtotal = 0, hasInquiry = false;
  for (const [id, amount] of cart) {
    const product = productById(id);
    if (!product) continue;
    if (!(product.price > 0)) hasInquiry = true;
    const value = linePrice(product, amount); subtotal += value;
    if (product.kind === "seal" || product.kind === "set") sealSubtotal += value;
  }
  const discount = Math.round(sealSubtotal * 5) / 100;
  return {
    subtotal,
    discount,
    total: subtotal - discount,
    reward: Math.floor(sealSubtotal / 100) * 150,
    hasInquiry
  };
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
    const hasPrice = product.price > 0;
    const priceText = hasPrice ? baht(linePrice(product, amount)) : "สอบถามราคา";
    row.append(title, input, remove, element("span", "line-total" + (hasPrice ? "" : " inquiry"), priceText));
    fragment.append(row);
  }
  if (!rows) fragment.append(element("p", "cart-empty", "ยังไม่ได้เลือกสินค้า"));
  $("#cart-items").replaceChildren(fragment);
  const sum = totals();
  $("#cart-count").textContent = rows + " รายการ";
  $("#mobile-cart-count").textContent = String(rows);
  $("#subtotal").textContent = baht(sum.subtotal);
  $("#discount").textContent = "−" + baht(sum.discount);
  $("#total").textContent = sum.total > 0
    ? (baht(sum.total) + (sum.hasInquiry ? " (+สอบถามราคา)" : ""))
    : (sum.hasInquiry ? "รอร้านแจ้งราคา" : baht(0));
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
    if (product) {
      const priceText = product.price > 0 ? baht(linePrice(product, amount)) : "สอบถามราคา";
      const tag = product.kind === "seal"
        ? (" [" + (product.section === "BASE_HARD" ? "เบสยาก" : product.section === "SUSA" ? "ซูซา" : product.category) + "]")
        : "";
      lines.push(++index + ". " + product.name +
        tag +
        " × " + number.format(amount) + " " + unitLabel(product) + " = " +
        priceText + (product.kind === "set" ?
          " (" + product.members.join(", ") + "; ชนิดละ " + number.format(product.leaves_per_seal) + " ใบ)" : "") +
        (product.available ? "" : " (รอตรวจสต็อก)"));
    }
  }
  const sum = totals();
  lines.push("", "รวมก่อนลด: " + baht(sum.subtotal), "ลด 5%: " + baht(sum.discount),
    "ยอดประมาณ: " + (sum.total > 0 ? baht(sum.total) + (sum.hasInquiry ? " (+ มีรายการสอบถามราคา)" : "") : (sum.hasInquiry ? "รอร้านแจ้งราคา" : baht(0))));
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
function applySealSection(sec) {
  $("#section").value = sec;
  if (sec === "NORMAL") kind = "seal-normal";
  else if (sec === "BASE_HARD") kind = "seal-base-hard";
  else if (sec === "SUSA") kind = "seal-susa";
  else kind = "seal";

  document.querySelectorAll("#filters button").forEach(item =>
    item.classList.toggle("active", item.dataset.filter === kind));

  updateSealSectionButtons();

  $("#section").closest("label").hidden = false;
  $("#seal-line").closest("label").hidden = false;
  $("#set-line-filters").hidden = true;
  $("#seal-section-filters").hidden = false;
  $("#seal-line-filters").hidden = false;

  const titles = {
    seal: "ซีลทั้งหมด",
    "seal-normal": "ซีลปกติ (ชุดละ 1,000 ใบ)",
    "seal-base-hard": "ซีลเบสยาก (ขายเดี่ยวเป็นใบ)",
    "seal-susa": "ซีลซูซา (ขายเดี่ยวเป็นใบ)"
  };
  $("#catalog-title").textContent = titles[kind] || "รายการซีล";
  visibleLimit = 60;
  renderProducts();
}

$("#filters").addEventListener("click", event => {
  const button = event.target.closest("button[data-filter]");
  if (!button) return;
  const filterKind = button.dataset.filter;

  if (filterKind === "seal-normal") {
    applySealSection("NORMAL");
    return;
  }
  if (filterKind === "seal-base-hard") {
    applySealSection("BASE_HARD");
    return;
  }
  if (filterKind === "seal-susa") {
    applySealSection("SUSA");
    return;
  }
  if (filterKind === "seal") {
    applySealSection("all");
    return;
  }

  kind = filterKind;
  document.querySelectorAll("#filters button").forEach(item =>
    item.classList.toggle("active", item === button));

  if (kind !== "set" && kind !== "favorite") $("#seal-line").value = "all";
  $("#section").value = "all";

  $("#section").closest("label").hidden = true;
  $("#seal-line").closest("label").hidden = !(kind === "set" || kind === "favorite");
  $("#set-line-filters").hidden = kind !== "set";
  $("#seal-section-filters").hidden = true;
  $("#seal-line-filters").hidden = true;

  updateSetLineButtons();
  updateSealSectionButtons();
  updateSealLineButtons();

  const titles = {
    all: "สินค้าทั้งหมด",
    set: "เซ็ตซีล",
    item: "รายการไอเทม",
    service: "รายการบริการ",
    money: "เงิน T",
    favorite: "รายการโปรด"
  };
  $("#catalog-title").textContent = titles[kind] || "สินค้า";
  visibleLimit = 60;
  renderProducts();
});
search.addEventListener("input", () => { visibleLimit = 60; renderProducts(); });

$("#section").addEventListener("change", () => {
  applySealSection($("#section").value);
});
$("#seal-line").addEventListener("change", () => {
  visibleLimit = 60;
  updateSetLineButtons();
  updateSealLineButtons();
  renderProducts();
});
[$("#sort"), $("#available-only")].forEach(control =>
  control.addEventListener("change", () => {
    visibleLimit = 60;
    renderProducts();
  }));
$("#seal-section-filters").addEventListener("click", event => {
  const button = event.target.closest("button[data-section]");
  if (!button) return;
  applySealSection(button.dataset.section);
});
$("#seal-line-filters").addEventListener("click", event => {
  const button = event.target.closest("button[data-line]");
  if (!button) return;
  $("#seal-line").value = button.dataset.line;
  visibleLimit = 60;
  updateSealLineButtons();
  renderProducts();
});
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
const guideLink = $("#open-guide-link");
if (guideLink) {
  guideLink.addEventListener("click", event => {
    event.preventDefault();
    const accordion = $("#guide-accordion");
    if (accordion) {
      accordion.open = true;
      accordion.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

// Wire theme toggles
applyTheme(currentTheme);
const lightBtn = $("#theme-light-btn");
const darkBtn = $("#theme-dark-btn");
const quickBtn = $("#theme-toggle-quick");
if (lightBtn) lightBtn.addEventListener("click", () => applyTheme("light"));
if (darkBtn) darkBtn.addEventListener("click", () => applyTheme("dark"));
if (quickBtn) quickBtn.addEventListener("click", () => applyTheme(currentTheme === "dark" ? "light" : "dark"));
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
  const sealLinePills = $("#seal-line-filters");
  sealLinePills.replaceChildren(element("span", "sub-filter-label", "สายซีล:"));
  const allSealLine = element("button", "active", "ทุกสาย");
  allSealLine.type = "button"; allSealLine.dataset.line = "all";
  sealLinePills.append(allSealLine);
  for (const line of ["AT", "HT", "CT", "HP", "DS", "DE", "EV", "BL"]) {
    const btn = element("button", "", line);
    btn.type = "button"; btn.dataset.line = line;
    sealLinePills.append(btn);
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
  // Allow right-click context menu only in form inputs/textarea so customers can paste
  if (event.target.closest("input, textarea")) return;
  event.preventDefault();
  return false;
}, { capture: true });

document.addEventListener("dragstart", event => {
  if (event.target.closest("input, textarea")) return;
  event.preventDefault();
  return false;
}, { capture: true });

document.addEventListener("keydown", event => {
  // Allow normal typing / editing shortcuts inside inputs
  if (event.target.closest("input, textarea")) return;

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
  // Block Ctrl+A (Select All)
  if ((event.ctrlKey || event.metaKey) && (event.key === "a" || event.key === "A")) {
    event.preventDefault();
    return false;
  }
}, { capture: true });

try {
  console.clear();
  console.log(
    "%c[DMO Store Security]%c ข้อมูลและรูปภาพทั้งหมดเป็นลิขสิทธิ์ของ DMO Store ห้ามคัดลอก ดัดแปลง หรือดึงข้อมูลไปใช้ในเชิงพาณิชย์",
    "color: #ef4444; font-weight: bold; font-size: 14px;",
    "color: #94a3b8; font-size: 13px;"
  );
} catch (_) {}
