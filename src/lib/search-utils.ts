export type SearchValue = unknown | SearchValue[];

function flattenSearchValues(values: SearchValue[]): string[] {
  return values.flatMap((value) => {
    if (Array.isArray(value)) {
      return flattenSearchValues(value);
    }

    if (value === null || value === undefined) {
      return [];
    }

    return [String(value)];
  });
}

export function normalizeSearchValue(value: unknown) {
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

export function matchesSearchTerm(searchTerm: string, values: SearchValue[]) {
  const normalizedTerm = normalizeSearchValue(searchTerm);

  if (!normalizedTerm) {
    return true;
  }

  const normalizedFields = flattenSearchValues(values).map(normalizeSearchValue).filter(Boolean);

  if (normalizedFields.length === 0) {
    return false;
  }

  const compactFields = normalizedFields.map(normalizeCompactSearchValue);
  const codeFields = normalizedFields.map(normalizeCodeSearchValue);

  const normalizedTokens = normalizedTerm.split(" ").filter(Boolean);
  const compactTerm = normalizeCompactSearchValue(searchTerm);
  const compactTokens = normalizeSearchValue(compactTerm).split(" ").filter(Boolean);
  const codeTerm = normalizeCodeSearchValue(searchTerm);

  if (normalizedTokens.every((token) => normalizedFields.some((field) => field.includes(token)))) {
    return true;
  }

  if (compactTerm && compactFields.some((field) => field.includes(compactTerm))) {
    return true;
  }

  if (
    compactTokens.length > 0 &&
    compactTokens.every((token) => compactFields.some((field) => field.includes(token)))
  ) {
    return true;
  }

  if (codeTerm && codeFields.some((field) => field.includes(codeTerm))) {
    return true;
  }

  return false;
}

export function filterBySearchTerm<T>(items: T[], searchTerm: string, getValues: (item: T) => SearchValue[]) {
  if (!normalizeSearchValue(searchTerm)) {
    return items;
  }

  return items.filter((item) => matchesSearchTerm(searchTerm, getValues(item)));
}
