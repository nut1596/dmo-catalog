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
function productRoundsPerUnit(product) {
  if (!product) return null;
  const unit = String(product.unit || "").trim();
  const name = String(product.name || "").trim();

  // 1. ตรวจจาก unit ก่อน เช่น "4 รอบ"
  const mUnit = unit.match(/(\d+)\s*รอบ/);
  if (mUnit) return parseInt(mUnit[1], 10);
  if (unit.includes("รอบ")) return 1;

  // 2. ตรวจจาก name สำหรับประเภทบริการ/เควส หรือที่มีคำว่า รอบ
  if (product.kind === "service" || unit === "ครั้ง" || unit === "รอบ" || unit === "เควส") {
    const mName = name.match(/(\d+)\s*รอบ/);
    if (mName) return parseInt(mName[1], 10);
    if (/รอบล่?ะ/.test(name)) return 1;
  }

  return null;
}
function maxQuantity(product) {
  if (product && typeof product.stock === "number") {
    return Math.max(0, product.stock);
  }
  return 1000000;
}
function defaultQuantity(product) {
  const maxVal = maxQuantity(product);
  if (product && product.kind === "money") {
    return maxVal > 0 ? Math.min(maxVal, 1000) : 1;
  }
  if (product && product.kind === "seal") {
    const pack = product.pack_size || 1000;
    return maxVal > 0 ? Math.min(maxVal, pack) : 1;
  }
  return maxVal > 0 ? Math.min(maxVal, 1) : 1;
}
function linePrice(product, quantity) {
  const divisor = product.kind === "seal" ? (product.pack_size || 1000) : 1;
  return (product.price || 0) * quantity / divisor;
}
function quantity(value, max = 1000000) {
  const result = Number(value);
  return Number.isInteger(result) && result > 0 && result <= max ? result : null;
}

// --- Customer Details Auto-Memory ---
function initCustomerMemory() {
  const tamerInput = $("#tamer");
  const contactInput = $("#contact");
  const tamerHint = $("#tamer-hint");
  const contactHint = $("#contact-hint");

  try {
    const savedTamer = localStorage.getItem("dmo_saved_tamer");
    const savedContact = localStorage.getItem("dmo_saved_contact");
    if (savedTamer && tamerInput) {
      tamerInput.value = savedTamer;
      if (tamerHint) tamerHint.textContent = "✓ จำชื่อเดิมแล้ว";
    }
    if (savedContact && contactInput) {
      contactInput.value = savedContact;
      if (contactHint) contactHint.textContent = "✓ จำชื่อเดิมแล้ว";
    }
  } catch (_) {}

  if (tamerInput) {
    tamerInput.addEventListener("input", () => {
      try {
        const val = tamerInput.value.trim();
        localStorage.setItem("dmo_saved_tamer", val);
        if (tamerHint) tamerHint.textContent = val ? "✓ บันทึกแล้ว" : "";
      } catch (_) {}
    });
  }
  if (contactInput) {
    contactInput.addEventListener("input", () => {
      try {
        const val = contactInput.value.trim();
        localStorage.setItem("dmo_saved_contact", val);
        if (contactHint) contactHint.textContent = val ? "✓ บันทึกแล้ว" : "";
      } catch (_) {}
    });
  }
}

// --- Mobile Bottom Sheet Drawer Controls ---
function openCartDrawer() {
  const cartEl = $("#cart");
  const backdrop = $("#cart-backdrop");
  if (cartEl) cartEl.classList.add("is-drawer-open");
  if (backdrop) backdrop.classList.add("is-open");
  document.body.style.overflow = "hidden";
}

function closeCartDrawer() {
  const cartEl = $("#cart");
  const backdrop = $("#cart-backdrop");
  if (cartEl) cartEl.classList.remove("is-drawer-open");
  if (backdrop) backdrop.classList.remove("is-open");
  document.body.style.overflow = "";
}

function renderCardVisual(imageBox, product) {
  imageBox.textContent = "";
  const isValidImagePath = Boolean(product.image && /^assets\/products\/[a-zA-Z0-9._-]+\.(webp|png|svg|jpg|jpeg)$/i.test(product.image));

  if (isValidImagePath) {
    const image = element("img");
    image.src = "./" + product.image;
    image.alt = product.name;
    image.loading = "lazy";
    image.setAttribute("draggable", "false");

    image.onerror = () => {
      image.remove();
      renderCardFallback(imageBox, product);
    };

    const shield = element("div", "image-shield");
    shield.setAttribute("aria-hidden", "true");
    shield.addEventListener("contextmenu", e => e.preventDefault());
    const watermark = element("span", "image-watermark", "DMO STORE");
    imageBox.append(image, shield, watermark);
  } else {
    renderCardFallback(imageBox, product);
  }
}

function renderCardFallback(imageBox, product) {
  imageBox.textContent = "";
  if (product.kind === "service") {
    const banner = element("div", "service-card-fallback");
    const cat = String(product.category || "");
    let icon = "🎯";
    let catClass = "svc-dungeon";
    let catLabel = "เควสดันเจียน";
    if (cat.includes("เควส") || cat === "รับทำเควส") {
      icon = "📜";
      catClass = "svc-quest";
      catLabel = "รับทำเควส";
    } else if (cat.includes("เวล") || cat === "รับเวล") {
      icon = "⚡";
      catClass = "svc-leveling";
      catLabel = "บริการรับเวล";
    } else if (cat.includes("ดัน") || cat.includes("บอส")) {
      icon = "⚔️";
      catClass = "svc-dungeon";
      catLabel = "ดันเจียนรายสัปดาห์";
    }
    banner.classList.add(catClass);

    const iconSpan = element("span", "svc-icon", icon);
    const badge = element("span", "svc-cat-tag", cat || catLabel);
    const nameEl = element("span", "svc-title", product.name);
    banner.append(iconSpan, badge, nameEl);

    const watermark = element("span", "image-watermark", "DMO STORE");
    imageBox.append(banner, watermark);
  } else {
    imageBox.append(element("span", "placeholder", "◈"));
  }
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
    renderCardVisual(imageBox, product);

    const body = element("div", "card-body");
    if (product.kind === "set") {
      const badgeText = product.category === "ALL" ? "เซ็ตซีล · ครบทุกสาย" : "เซ็ตซีล · " + product.category;
      body.append(element("span", "set-badge", badgeText));
    } else if (product.kind === "seal") {
      if (product.section === "BASE_HARD") {
        body.append(element("span", "section-badge badge-base-hard", "เบสยาก · ขายเดี่ยวเป็นใบ"));
      } else if (product.section === "SUSA") {
        body.append(element("span", "section-badge badge-susa", "ซูซา · ขายเดี่ยวเป็นใบ"));
      }
    }

    const label = product.kind === "seal" ?
      product.category + " · " + (sectionNames[product.section] || "ปกติ") + (product.pack_size === 1 ? " (ขายเป็นใบ)" : "") :
      product.kind === "set" ? (product.category === "ALL" ? "ครบทุกสาย · เซ็ตซีล" : product.category + " · เซ็ตซีล") :
      product.kind === "service" ? "บริการ · " + product.category :
      product.kind === "money" ? "เงิน T" : "ITEM";
    const price = element("div", "price", (product.price > 0 ? baht(product.price) : "สอบถามราคา") + " / " + product.unit);

    const top = element("div", "card-top");
    const statCategory = String(product.category || "").toUpperCase();
    const isStat = ["AT", "HT", "CT", "HP", "DS", "DE", "EV", "BL", "ALL"].includes(statCategory);
    const title = element("h3");
    if (isStat) {
      title.append(element("span", "stat-badge stat-" + statCategory.toLowerCase(), statCategory));
    }
    title.append(document.createTextNode(product.name));

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
    const input = element("input", "stepper-input"); input.type = "number"; input.min = "1";
    const maxVal = maxQuantity(product);
    const def = defaultQuantity(product);
    input.max = String(maxVal); input.value = def;
    input.defaultValue = def;
    input.setAttribute("value", def);
    input.setAttribute("aria-label", "จำนวน" + unitLabel(product) + "ของ" + product.name);
    input.placeholder = "ระบุจำนวน";

    const step = (product.kind === "seal" && (product.pack_size || 1000) >= 1000) ? 1000 : 1;
    const stepperWrap = element("div", "stepper-wrap");
    const btnMinus = element("button", "stepper-btn stepper-minus", "−");
    btnMinus.type = "button";
    btnMinus.setAttribute("aria-label", "ลดจำนวน");
    btnMinus.addEventListener("click", () => {
      let cur = Number(input.value) || step;
      let next = Math.max(step, cur - step);
      input.value = next;
      input.dispatchEvent(new Event("input"));
    });

    const btnPlus = element("button", "stepper-btn stepper-plus", "+");
    btnPlus.type = "button";
    btnPlus.setAttribute("aria-label", "เพิ่มจำนวน");
    btnPlus.addEventListener("click", () => {
      let cur = Number(input.value) || 0;
      let next = Math.min(maxVal, cur + step);
      input.value = next;
      input.dispatchEvent(new Event("input"));
    });
    stepperWrap.append(btnMinus, input, btnPlus);

    let quickChips = null;
    if (product.available && maxVal >= 1000 && product.kind === "seal" && (product.pack_size || 1000) >= 1000) {
      quickChips = element("div", "quick-chips");
      for (const chipQty of [1000, 3000, 5000]) {
        if (chipQty <= maxVal) {
          const chip = element("button", "chip-btn", number.format(chipQty));
          chip.type = "button";
          chip.title = "ตั้งจำนวนเป็น " + number.format(chipQty) + " ใบ";
          chip.addEventListener("click", () => {
            input.value = chipQty;
            input.dispatchEvent(new Event("input"));
          });
          quickChips.append(chip);
        }
      }
      if (maxVal > 5000) {
        const chipMax = element("button", "chip-btn", "Max");
        chipMax.type = "button";
        chipMax.title = "เลือกจำนวนสูงสุดที่มี (" + number.format(maxVal) + " ใบ)";
        chipMax.addEventListener("click", () => {
          input.value = maxVal;
          input.dispatchEvent(new Event("input"));
        });
        quickChips.append(chipMax);
      }
    }

    const add = element("button", "product-add-btn", "+ ตะกร้า"); add.type = "button";

    const roundsPerUnit = productRoundsPerUnit(product);
    let dualInputsContainer = null;
    let roundsHint = null;
    if (roundsPerUnit && product.available && maxVal >= 1) {
      dualInputsContainer = element("div", "rounds-dual-inputs");
      roundsHint = element("div", "rounds-hint");
      const unitPrice = linePrice(product, 1);

      // 1. Box ยอดเงิน (บาท)
      const priceGroup = element("div", "rounds-field");
      const priceLabel = element("label", "rounds-field-label", "💰 ยอดเงิน (บาท)");
      const priceWrap = element("div", "rounds-input-wrap");
      const inputPrice = element("input", "rounds-input-price");
      inputPrice.type = "number";
      inputPrice.min = unitPrice > 0 ? String(unitPrice) : "1";
      inputPrice.step = unitPrice >= 1 ? "1" : "any";
      inputPrice.placeholder = "บาท";
      const priceSuffix = element("span", "rounds-input-suffix", "฿");
      priceWrap.append(inputPrice, priceSuffix);
      priceGroup.append(priceLabel, priceWrap);

      // Icon สลับ ⇄
      const arrowIcon = element("div", "rounds-field-arrow", "⇄");
      arrowIcon.title = "คำนวณสลับอัตโนมัติ (กรอกบาทหรือรอบก็ได้)";

      // 2. Box จำนวนรอบ (รอบ)
      const roundsGroup = element("div", "rounds-field");
      const roundsLabel = element("label", "rounds-field-label", "🎯 จำนวนรอบ");
      const roundsWrap = element("div", "rounds-input-wrap");
      const inputRounds = element("input", "rounds-input-rounds");
      inputRounds.type = "number";
      inputRounds.min = String(roundsPerUnit);
      inputRounds.step = String(roundsPerUnit >= 1 ? roundsPerUnit : 1);
      inputRounds.placeholder = "รอบ";
      const roundsSuffix = element("span", "rounds-input-suffix", "รอบ");
      roundsWrap.append(inputRounds, roundsSuffix);
      roundsGroup.append(roundsLabel, roundsWrap);

      dualInputsContainer.append(priceGroup, arrowIcon, roundsGroup);

      let currentUnits = Math.max(1, Math.min(maxVal, def || 1));

      const updateUI = (source) => {
        const totalRounds = currentUnits * roundsPerUnit;
        const totalCost = currentUnits * unitPrice;

        if (source !== "price") {
          inputPrice.value = totalCost;
        }
        if (source !== "rounds") {
          inputRounds.value = totalRounds;
        }

        input.value = currentUnits;
        roundsHint.innerHTML = `🎯 ยอด <strong>${baht(totalCost)}</strong> = ได้ทั้งหมด <strong>${number.format(totalRounds)} รอบ</strong>`;
      };

      inputPrice.addEventListener("input", () => {
        const raw = Number(inputPrice.value);
        if (raw > 0 && unitPrice > 0) {
          let u = Math.round(raw / unitPrice);
          if (u < 1) u = 1;
          if (u > maxVal) u = maxVal;
          currentUnits = u;
          updateUI("price");
        }
      });

      inputPrice.addEventListener("change", () => {
        const raw = Number(inputPrice.value);
        if (raw <= 0 || isNaN(raw)) {
          currentUnits = 1;
        } else if (unitPrice > 0) {
          let u = Math.round(raw / unitPrice);
          if (u < 1) u = 1;
          if (u > maxVal) u = maxVal;
          currentUnits = u;
        }
        updateUI();
      });

      inputRounds.addEventListener("input", () => {
        const raw = Number(inputRounds.value);
        if (raw > 0 && roundsPerUnit > 0) {
          let u = Math.ceil(raw / roundsPerUnit);
          if (u < 1) u = 1;
          if (u > maxVal) u = maxVal;
          currentUnits = u;
          updateUI("rounds");
        }
      });

      inputRounds.addEventListener("change", () => {
        const raw = Number(inputRounds.value);
        if (raw <= 0 || isNaN(raw)) {
          currentUnits = 1;
        } else if (roundsPerUnit > 0) {
          let u = Math.ceil(raw / roundsPerUnit);
          if (u < 1) u = 1;
          if (u > maxVal) u = maxVal;
          currentUnits = u;
        }
        updateUI();
      });

      updateUI();
      stepperWrap.style.display = "none";
      selector.classList.add("has-dual-inputs");
    }

    input.addEventListener("input", () => {
      const val = Number(input.value);
      if (val > maxVal) {
        input.value = maxVal;
        input.setCustomValidity("จำนวนที่เลือกเกินสต็อกที่มี");
        input.reportValidity();
      } else if (val < 1 && input.value !== "") {
        input.setCustomValidity("กรุณากรอกจำนวนอย่างน้อย 1 " + unitLabel(product));
      } else {
        input.setCustomValidity("");
      }
    });

    if (!product.available || maxVal < 1) {
      add.disabled = true;
      add.textContent = "หมด (สามารถสอบถามได้)";
      add.title = "สินค้าหมดสต็อก สามารถทักแชตสอบถามกับทางร้านได้ครับ";
      input.disabled = true;
      btnMinus.disabled = true;
      btnPlus.disabled = true;
    } else {
      add.disabled = false;
      add.textContent = "+ ตะกร้า";
      input.disabled = false;
      btnMinus.disabled = false;
      btnPlus.disabled = false;
      add.addEventListener("click", () => {
        let val = Number(input.value);
        if (val > maxVal) {
          input.value = maxVal;
          val = maxVal;
        }
        const amount = quantity(val, maxVal);
        if (!amount) {
          input.setCustomValidity("กรุณากรอกจำนวนที่ถูกต้อง (ไม่เกินสต็อกที่มี)");
          input.reportValidity();
          return;
        }
        const currentInCart = cart.get(product.id) || 0;
        if (currentInCart + amount > maxVal) {
          input.setCustomValidity("ไม่สามารถเลือกเกินสต็อกที่มีได้");
          input.reportValidity();
          return;
        }
        input.setCustomValidity("");
        const currentTotal = currentInCart + amount;
        cart.set(product.id, currentTotal);
        renderCart();
        if (roundsPerUnit) {
          $("#copy-status").textContent = "เพิ่ม " + product.name + " (" + number.format(currentTotal * roundsPerUnit) + " รอบ · " + baht(linePrice(product, currentTotal)) + ") แล้ว";
          add.textContent = "✓ เพิ่มแล้ว (" + number.format(currentTotal * roundsPerUnit) + " รอบ)";
        } else {
          $("#copy-status").textContent = "เพิ่ม " + product.name + " (" + number.format(currentTotal) + " " + unitLabel(product) + ") แล้ว";
          add.textContent = "✓ เพิ่มแล้ว (" + number.format(currentTotal) + ")";
        }
        add.classList.add("added");
        setTimeout(() => {
          add.textContent = "+ ตะกร้า";
          add.classList.remove("added");
        }, 900);
      });
    }

    selector.append(stepperWrap, add);
    const availText = (!product.available || maxVal < 1)
      ? "หมด (สามารถสอบถามได้)"
      : "มีสินค้า";
    body.append(top, element("div", "category", label), price,
      element("span", "availability", availText));
    if (dualInputsContainer) {
      body.append(dualInputsContainer);
    }
    if (roundsHint) {
      body.append(roundsHint);
    }
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
    if (quickChips) {
      body.append(quickChips);
    }
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
    const validAmount = Math.min(amount, maxQuantity(product));
    if (validAmount < 1) continue;
    if (!(product.price > 0)) hasInquiry = true;
    const value = linePrice(product, validAmount); subtotal += value;
    if (product.kind === "seal" || product.kind === "set") sealSubtotal += value;
  }
  const rawDiscount = sealSubtotal * 0.05;
  const netSeal = Math.max(0, sealSubtotal - rawDiscount);
  const total = sealSubtotal > 0
    ? Math.max(0, Math.floor(subtotal - rawDiscount))
    : Math.round(subtotal * 100) / 100;
  const discount = Math.max(0, Math.round((subtotal - total) * 100) / 100);
  const currentTierCount = Math.floor(netSeal / 100);
  const reward = currentTierCount * 150;
  const nextTier = (currentTierCount + 1) * 100;
  const neededMore = Math.max(0, Math.ceil((nextTier - netSeal) * 100) / 100);
  return {
    subtotal,
    discount,
    total,
    sealSubtotal,
    netSeal,
    reward,
    nextReward: (currentTierCount + 1) * 150,
    neededMore,
    hasInquiry
  };
}

function renderCart() {
  const fragment = document.createDocumentFragment();
  let rows = 0;
  for (const [id, amount] of cart) {
    const product = productById(id);
    if (!product) { cart.delete(id); continue; }
    const maxVal = maxQuantity(product);
    let validAmount = amount;
    if (validAmount > maxVal) {
      validAmount = maxVal;
      cart.set(id, validAmount);
    }
    if (validAmount < 1) { cart.delete(id); continue; }
    rows++;
    const roundsPerUnit = productRoundsPerUnit(product);
    const row = element("div", "cart-row");
    const topRow = element("div", "cart-row-top");
    const title = element("div", "cart-row-title");
    if (roundsPerUnit) {
      const totalRounds = validAmount * roundsPerUnit;
      const badge = element("small", "cart-rounds-badge");
      badge.innerHTML = `🎯 รวม <strong>${number.format(totalRounds)} รอบ</strong> (${number.format(validAmount)} × ${number.format(roundsPerUnit)} รอบ)`;
      title.append(element("strong", "", product.name), badge);
    } else {
      title.append(element("strong", "", product.name),
        element("small", "", unitLabel(product)));
    }
    const remove = element("button", "cart-row-remove", "✕"); remove.type = "button";
    remove.setAttribute("aria-label", "ลบ " + product.name);
    remove.title = "ลบรายการนี้ออกจากตะกร้า";
    remove.addEventListener("click", () => { cart.delete(id); renderCart(); });
    topRow.append(title, remove);

    const bottomRow = element("div", "cart-row-bottom");
    const step = (product.kind === "seal" && (product.pack_size || 1000) >= 1000) ? 1000 : 1;
    const stepper = element("div", "stepper-wrap cart-row-stepper");
    const btnMinus = element("button", "stepper-btn stepper-minus", "−");
    btnMinus.type = "button";
    btnMinus.setAttribute("aria-label", "ลดจำนวน");
    btnMinus.addEventListener("click", () => {
      if (validAmount <= step) {
        cart.delete(id);
      } else {
        cart.set(id, validAmount - step);
      }
      renderCart();
    });

    const input = element("input", "stepper-input"); input.type = "number"; input.min = "1";
    input.max = String(maxVal); input.value = validAmount;
    input.defaultValue = validAmount;
    input.setAttribute("value", validAmount);
    input.setAttribute("aria-label", "จำนวน" + product.name);
    input.addEventListener("change", () => {
      let next = quantity(input.value, maxVal);
      if (!next) {
        if (Number(input.value) > maxVal) {
          next = maxVal;
          input.value = maxVal;
          $("#copy-status").textContent = "ปรับจำนวน " + product.name + " เป็นจำนวนสูงสุดที่มีแล้ว";
        } else {
          input.value = cart.get(id);
          return;
        }
      }
      cart.set(id, next);
      renderCart();
    });

    const btnPlus = element("button", "stepper-btn stepper-plus", "+");
    btnPlus.type = "button";
    btnPlus.setAttribute("aria-label", "เพิ่มจำนวน");
    btnPlus.addEventListener("click", () => {
      if (validAmount + step <= maxVal) {
        cart.set(id, validAmount + step);
        renderCart();
      }
    });
    stepper.append(btnMinus, input, btnPlus);

    const hasPrice = product.price > 0;
    let priceText = hasPrice ? baht(linePrice(product, validAmount)) : "สอบถามราคา";
    if (hasPrice && roundsPerUnit) {
      const totalRounds = validAmount * roundsPerUnit;
      priceText += ` (${number.format(totalRounds)} รอบ)`;
    }
    const pricing = element("div", "cart-row-pricing");
    pricing.append(element("span", "line-total" + (hasPrice ? "" : " inquiry"), priceText));
    bottomRow.append(stepper, pricing);

    row.append(topRow, bottomRow);
    fragment.append(row);
  }

  if (!rows) fragment.append(element("p", "cart-empty", "ยังไม่ได้เลือกสินค้า"));
  $("#cart-items").replaceChildren(fragment);

  const sum = totals();
  $("#cart-count").textContent = rows + " รายการ";

  const mobileCount = $("#mobile-cart-count");
  if (mobileCount) mobileCount.textContent = String(rows);

  const barCount = $("#bar-count");
  if (barCount) barCount.textContent = String(rows);

  const barTotal = $("#bar-total");
  if (barTotal) {
    barTotal.textContent = sum.total > 0 ? baht(sum.total) : (sum.hasInquiry ? "สอบถามราคา" : "0 ฿");
  }

  const bottomBar = $("#mobile-bottom-bar");
  if (bottomBar) {
    bottomBar.classList.toggle("is-visible", rows > 0);
  }

  if (rows === 0) {
    closeCartDrawer();
  }

  $("#subtotal").textContent = baht(sum.subtotal);
  $("#discount").textContent = "−" + baht(sum.discount);
  $("#total").textContent = sum.total > 0
    ? (baht(sum.total) + (sum.hasInquiry ? " (+สอบถามราคา)" : ""))
    : (sum.hasInquiry ? "รอร้านแจ้งราคา" : baht(0));
  const rewardEl = $("#reward");
  if (rewardEl) {
    if (sum.sealSubtotal <= 0) {
      rewardEl.textContent = "🎁 ซื้อซีลครบทุก 100 ฿ (หลังลด 5%) รับฟรี D2 150 อัน";
    } else if (sum.reward === 0) {
      rewardEl.textContent = "🎁 ซื้อซีลเพิ่มอีก " + baht(sum.neededMore) + " รับฟรี D2 150 อัน!";
    } else {
      rewardEl.textContent = "🎁 D2 ฟรี " + number.format(sum.reward) + " อัน · ซื้อซีลเพิ่มอีก " + baht(sum.neededMore) + " รับ D2 เพิ่มเป็น " + number.format(sum.nextReward) + " อัน!";
    }
  }

  $("#copy-order").disabled = !rows;
  const sendMessengerBtn = $("#send-messenger");
  if (sendMessengerBtn) sendMessengerBtn.disabled = !rows;
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
      const validAmount = Math.min(amount, maxQuantity(product));
      if (validAmount < 1) continue;
      const priceText = product.price > 0 ? baht(linePrice(product, validAmount)) : "สอบถามราคา";
      const tag = product.kind === "seal"
        ? (" [" + (product.section === "BASE_HARD" ? "เบสยาก" : product.section === "SUSA" ? "ซูซา" : product.category) + "]")
        : "";
      const roundsPerUnit = productRoundsPerUnit(product);
      let qtyUnitStr = " × " + number.format(validAmount) + " " + unitLabel(product);
      if (roundsPerUnit) {
        const totalRounds = validAmount * roundsPerUnit;
        qtyUnitStr = " × " + number.format(validAmount) + " " + unitLabel(product) + " (ได้ทั้งหมด " + number.format(totalRounds) + " รอบ)";
      }
      lines.push(++index + ". " + product.name +
        tag +
        qtyUnitStr + " = " +
        priceText + (product.kind === "set" ?
          " (" + product.members.join(", ") + "; ชนิดละ " + number.format(product.leaves_per_seal) + " ใบ)" : "") +
        (product.available ? "" : " (รอตรวจสต็อก)"));
    }
  }
  const sum = totals();
  lines.push("", "รวมก่อนลด: " + baht(sum.subtotal), "ลด 5%: " + baht(sum.discount),
    "ยอดประมาณ: " + (sum.total > 0 ? baht(sum.total) + (sum.hasInquiry ? " (+ มีรายการสอบถามราคา)" : "") : (sum.hasInquiry ? "รอร้านแจ้งราคา" : baht(0))));
  if (sum.reward > 0) lines.push("D2 แถมฟรี: " + number.format(sum.reward) + " อัน (คิดจากยอดซีลหลังลด 5%)");
  lines.push("กรุณาตรวจสต็อกและยืนยันยอดก่อนชำระเงิน");
  return lines.join("\n");
}

async function copyOrderContent() {
  const content = orderText();
  if (!content) {
    $("#copy-status").textContent = "⚠️ กรุณากรอกชื่อเทมเมอร์และชื่อ Facebook ก่อนส่งรายการ";
    (!$("#tamer").value.trim() ? $("#tamer") : $("#contact")).focus();
    return false;
  }
  let copied = false;
  if (window.isSecureContext && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(content);
      copied = true;
    } catch (_) {}
  }
  if (!copied) {
    try {
      const temp = document.createElement("textarea");
      temp.value = content;
      temp.setAttribute("readonly", "");
      temp.style.position = "fixed";
      temp.style.left = "-9999px";
      temp.style.top = "0";
      document.body.appendChild(temp);
      temp.focus();
      temp.select();
      temp.setSelectionRange(0, temp.value.length);
      copied = document.execCommand("copy");
      document.body.removeChild(temp);
    } catch (_) {}
  }
  return copied;
}

$("#copy-order").addEventListener("click", async () => {
  const copied = await copyOrderContent();
  if (copied) {
    $("#copy-status").textContent = "คัดลอกรายการแล้ว! กดเปิด Messenger ร้าน แล้ววางข้อความส่งแชตได้เลย";
  } else {
    $("#copy-status").textContent = "คัดลอกไม่สำเร็จ กรุณาอนุญาตคลิปบอร์ดแล้วลองอีกครั้ง";
  }
});

const sendMessengerBtn = $("#send-messenger");
if (sendMessengerBtn) {
  sendMessengerBtn.addEventListener("click", async () => {
    const copied = await copyOrderContent();
    if (copied) {
      $("#copy-status").textContent = "🚀 คัดลอกรายการแล้ว! กำลังเปิดแชต Messenger... วาง (Paste) ส่งได้เลยครับ";
      setTimeout(() => {
        window.open("https://m.me/kakachi.kung.5", "_blank");
      }, 300);
    }
  });
}

// Drawer event listeners
const openCartBtn = $("#open-cart-btn");
if (openCartBtn) openCartBtn.addEventListener("click", openCartDrawer);
const openCartBarInfo = $("#open-cart-bar-info");
if (openCartBarInfo) openCartBarInfo.addEventListener("click", openCartDrawer);
const closeCartBtn = $("#close-cart-drawer");
if (closeCartBtn) closeCartBtn.addEventListener("click", closeCartDrawer);
const backdropEl = $("#cart-backdrop");
if (backdropEl) backdropEl.addEventListener("click", closeCartDrawer);

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

// Search input & Clear button
const clearSearchBtn = $("#clear-search");
if (clearSearchBtn) {
  clearSearchBtn.addEventListener("click", () => {
    search.value = "";
    clearSearchBtn.hidden = true;
    visibleLimit = 60;
    renderProducts();
    search.focus();
  });
}
search.addEventListener("input", () => {
  if (clearSearchBtn) clearSearchBtn.hidden = !search.value.trim();
  visibleLimit = 60;
  renderProducts();
});

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

fetch("./catalog.json?v=" + Date.now(), {cache: "no-cache"}).then(response => {
  if (!response.ok) throw new Error("catalog unavailable");
  return response.json();
}).then(data => {
  products = Array.isArray(data.products) ? data.products : [];
  for (const p of products) {
    if (p && p.kind === "set" && typeof p.price === "number") {
      p.price = Math.floor(p.price);
    }
  }
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
  const setLineOrder = { ALL: 0, AT: 1, HT: 2, CT: 3, HP: 4, DS: 5, DE: 6, EV: 7, BL: 8 };
  const setCategories = [...new Set(products.filter(p => p.kind === "set").map(p => p.category))]
    .sort((a, b) => (setLineOrder[a] ?? 99) - (setLineOrder[b] ?? 99));
  for (const line of setCategories) {
    const label = line === "ALL" ? "ครบทุกสาย (ALL)" : line;
    const button = element("button", "", label); button.type = "button";
    button.dataset.line = line; $("#set-line-filters").append(button);
  }
  updateSetLineButtons();
  const updated = new Date(data.updated_at);
  $("#updated").textContent = Number.isNaN(updated.getTime()) ? "รายการสินค้าล่าสุด" :
    "อัปเดต " + updated.toLocaleString("th-TH", {dateStyle: "medium", timeStyle: "short"});
  $("#favorite-count").textContent = "(" + favorites.size + ")";
  initCustomerMemory();
  renderProducts(); renderCart();
}).catch(() => { message.textContent = "ยังโหลดรายการสินค้าไม่ได้ กรุณาลองใหม่ภายหลัง"; });

// Keyboard Shortcuts & Anti-theft Protections
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
  if (event.key === "Escape") {
    closeCartDrawer();
    if (document.activeElement === search && search.value) {
      search.value = "";
      if (clearSearchBtn) clearSearchBtn.hidden = true;
      visibleLimit = 60;
      renderProducts();
    }
    return;
  }

  // Allow normal typing / editing shortcuts inside inputs
  if (event.target.closest("input, textarea")) return;

  // Shortcut: '/' or 'Ctrl+K' focuses search input
  if (event.key === "/" || ((event.ctrlKey || event.metaKey) && (event.key === "k" || event.key === "K"))) {
    event.preventDefault();
    search.focus();
    search.select();
    return false;
  }

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
