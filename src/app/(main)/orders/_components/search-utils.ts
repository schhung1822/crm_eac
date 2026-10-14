import type { Channel } from "./schema";

function normalizeSearchValue(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeCompactSearchValue(value: unknown) {
  return normalizeSearchValue(value).replace(/[^a-z0-9]/g, "");
}

function normalizeCodeSearchValue(value: unknown) {
  return normalizeCompactSearchValue(value).replace(/\d+/g, (digits) => digits.replace(/^0+/, "") || "0");
}

function getOrderSearchFields(item: Channel) {
  return [
    item.order_ID,
    item.customer_ID,
    item.brand,
    item.name_customer,
    item.phone,
    item.address,
    item.seller,
    item.kenh_ban,
    item.note,
    item.status,
    item.pro_ID,
    item.name_pro,
    item.brand_pro,
  ];
}

type SearchFieldIndex = { text: string; compact: string; code: string };

// Chuẩn hoá chữ (bỏ dấu, rút gọn mã) là phần tốn nhất, nên chỉ làm một lần cho mỗi dòng
// thay vì lặp lại cho từng dòng sau mỗi phím gõ.
const searchIndexCache = new WeakMap<Channel, SearchFieldIndex[]>();

function getSearchIndex(item: Channel): SearchFieldIndex[] {
  const cached = searchIndexCache.get(item);

  if (cached) {
    return cached;
  }

  const index = getOrderSearchFields(item).map((field) => ({
    text: normalizeSearchValue(field),
    compact: normalizeCompactSearchValue(field),
    code: normalizeCodeSearchValue(field),
  }));

  searchIndexCache.set(item, index);
  return index;
}

export function filterOrdersBySearchTerm(data: Channel[], searchTerm: string) {
  const normalizedTerm = normalizeSearchValue(searchTerm);

  if (!normalizedTerm) {
    return data;
  }

  const compactTerm = normalizeCompactSearchValue(searchTerm);
  const codeTerm = normalizeCodeSearchValue(searchTerm);

  return data.filter((item) =>
    getSearchIndex(item).some(
      (field) =>
        field.text.includes(normalizedTerm) ||
        (compactTerm !== "" && field.compact.includes(compactTerm)) ||
        (codeTerm !== "" && field.code.includes(codeTerm)),
    ),
  );
}
