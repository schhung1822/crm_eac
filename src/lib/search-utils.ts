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
    .trim()
    .toLowerCase();
}

export function matchesSearchTerm(searchTerm: string, values: SearchValue[]) {
  const term = normalizeSearchValue(searchTerm);

  if (!term) {
    return true;
  }

  return flattenSearchValues(values).some((value) => normalizeSearchValue(value).includes(term));
}

export function filterBySearchTerm<T>(items: T[], searchTerm: string, getValues: (item: T) => SearchValue[]) {
  const term = normalizeSearchValue(searchTerm);

  if (!term) {
    return items;
  }

  return items.filter((item) => matchesSearchTerm(term, getValues(item)));
}
