export function formatNumber(value: number) {
  return (Number(value) || 0).toLocaleString("vi-VN");
}

export function formatCurrency(value: number) {
  return `${Math.round(Number(value) || 0).toLocaleString("vi-VN")}đ`;
}

export function formatCompactCurrency(value: number) {
  const v = Number(value) || 0;
  const abs = Math.abs(v);

  if (abs >= 1_000_000_000) {
    const scaled = v / 1_000_000_000;
    return `${scaled.toLocaleString("vi-VN", { maximumFractionDigits: scaled >= 10 ? 0 : 1 })} tỷ`;
  }

  if (abs >= 1_000_000) {
    const scaled = v / 1_000_000;
    return `${scaled.toLocaleString("vi-VN", { maximumFractionDigits: scaled >= 10 ? 0 : 1 })} triệu`;
  }

  return `${formatNumber(v)}đ`;
}

export function formatPercent(part: number, total: number) {
  if (!total) return "0%";
  return `${((part / total) * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
}

/** Nhãn trục ngắn: 1,2 tỷ · 350tr · 80k. */
export function formatAxisCurrency(value: number) {
  const v = Number(value) || 0;
  const abs = Math.abs(v);

  if (abs >= 1_000_000_000) return `${(v / 1_000_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tỷ`;
  if (abs >= 1_000_000) return `${(v / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}tr`;
  if (abs >= 1_000) return `${Math.round(v / 1_000).toLocaleString("vi-VN")}k`;
  return v.toLocaleString("vi-VN");
}

/** Số tiền trên thẻ chỉ số: 5,04 tỷ · 380 triệu · 3,93 triệu — đủ chính xác mà vẫn gọn. */
export function formatKpiCurrency(value: number) {
  const v = Number(value) || 0;
  const abs = Math.abs(v);

  if (abs >= 1_000_000_000) return `${(v / 1_000_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tỷ`;
  if (abs >= 1_000_000) {
    const scaled = v / 1_000_000;
    return `${scaled.toLocaleString("vi-VN", { maximumFractionDigits: scaled >= 100 ? 0 : 2 })} triệu`;
  }
  return formatCurrency(v);
}
