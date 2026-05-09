import type { Channel } from "./schema";

function normalizeSearchValue(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\u0111/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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

export function filterOrdersBySearchTerm(data: Channel[], searchTerm: string) {
  const normalizedTerm = normalizeSearchValue(searchTerm);

  if (!normalizedTerm) {
    return data;
  }

  const compactTerm = normalizeCompactSearchValue(searchTerm);
  const codeTerm = normalizeCodeSearchValue(searchTerm);

  return data.filter((item) => {
    const fields = getOrderSearchFields(item);

    return fields.some((field) => {
      const normalizedField = normalizeSearchValue(field);

      if (normalizedField.includes(normalizedTerm)) {
        return true;
      }

      if (compactTerm && normalizeCompactSearchValue(field).includes(compactTerm)) {
        return true;
      }

      if (codeTerm && normalizeCodeSearchValue(field).includes(codeTerm)) {
        return true;
      }

      return false;
    });
  });
}
