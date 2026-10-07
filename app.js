"use strict";
const cards = document.querySelector("#products");
const message = document.querySelector("#message");
const search = document.querySelector("#search");
const count = document.querySelector("#count");
let products = [];
let filter = "all";

function render() {
  const query = search.value.trim().toLocaleLowerCase("th");
  const shown = products.filter(p => (filter === "all" || p.kind === filter) &&
    String(p.name).toLocaleLowerCase("th").includes(query));
  cards.replaceChildren();
  const fragment = document.createDocumentFragment();
  for (const product of shown) {
    const card = document.createElement("article"); card.className = "card";
    const imageBox = document.createElement("div"); imageBox.className = "card-image";
    if (product.image && /^assets\/products\/[a-f0-9]{24}\.webp$/.test(product.image)) {
      const image = document.createElement("img");
      image.src = "./" + product.image; image.alt = product.name; image.loading = "lazy";
      imageBox.append(image);
    } else {
      const placeholder = document.createElement("span");
      placeholder.className = "placeholder"; placeholder.textContent = "◈";
      imageBox.append(placeholder);
    }
    const body = document.createElement("div"); body.className = "card-body";
    const category = document.createElement("div"); category.className = "category";
    category.textContent = product.kind === "seal" ? "SEAL · " + product.category : "ITEM";
    const title = document.createElement("h3"); title.textContent = product.name;
    const price = document.createElement("div"); price.className = "price";
    const amount = document.createElement("strong");
    amount.textContent = new Intl.NumberFormat("th-TH", {minimumFractionDigits: 0, maximumFractionDigits: 2}).format(product.price) + " ฿";
    const unit = document.createElement("span"); unit.textContent = "ต่อ " + product.unit;
    price.append(amount, unit); body.append(category, title, price);
    card.append(imageBox, body); fragment.append(card);
  }
  cards.append(fragment);
  count.textContent = shown.length + " รายการ";
  message.hidden = shown.length > 0;
  if (!shown.length) message.textContent = products.length ? "ไม่พบสินค้าที่ค้นหา" : "ยังไม่มีสินค้าพร้อมแสดง";
}

document.querySelector("#filters").addEventListener("click", event => {
  const button = event.target.closest("button[data-filter]");
  if (!button) return;
  filter = button.dataset.filter;
  document.querySelectorAll("#filters button").forEach(item => item.classList.toggle("active", item === button));
  render();
});
search.addEventListener("input", render);
fetch("./catalog.json", {cache: "no-cache"}).then(response => {
  if (!response.ok) throw new Error("catalog unavailable");
  return response.json();
}).then(data => {
  products = Array.isArray(data.products) ? data.products : [];
  const updated = new Date(data.updated_at);
  document.querySelector("#updated").textContent = Number.isNaN(updated.getTime()) ?
    "รายการสินค้าล่าสุด" : "อัปเดต " + updated.toLocaleString("th-TH", {dateStyle: "medium", timeStyle: "short"});
  render();
}).catch(() => { message.textContent = "ยังโหลดรายการสินค้าไม่ได้ กรุณาลองใหม่ภายหลัง"; });
