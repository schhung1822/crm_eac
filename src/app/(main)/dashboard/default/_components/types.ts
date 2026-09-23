export type DashboardStats = {
  totalOrders: number;
  totalTienHang: number;
  totalDiscount: number;
  totalThanhTien: number;
  completedRevenue: number;
  totalQuantity: number;
};

export type ChartPoint = {
  date: string;
  orders: number;
  revenue: number;
};

export type ChannelSummary = {
  kenh_ban: string;
  order_count: number;
  quantity: number;
  tien_hang: number;
  giam_gia: number;
  thanh_tien: number;
};

export type OrderStatusSummary = {
  status: string;
  orders: number;
  revenue: number;
};
