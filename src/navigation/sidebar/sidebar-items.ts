import {
  Banknote,
  Calendar1Icon,
  ChartBar,
  Gauge,
  Handshake,
  LayoutDashboard,
  Newspaper,
  PackageIcon,
  Scale,
  ShoppingBagIcon,
  SquareArrowUpRight,
  Store,
  type LucideIcon,
  User,
  UserCog,
  Users,
} from "lucide-react";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
  showIndicator?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
  showIndicator?: boolean;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Dashboards",
    items: [
      {
        title: "Tổng quan",
        url: "/dashboard/default",
        icon: LayoutDashboard,
      },
      {
        title: "CRM",
        url: "/dashboard/crm",
        icon: ChartBar,
      },
      {
        title: "SRX Việt Nam",
        url: "/dashboard/srxvietnam",
        icon: Gauge,
      },
    ],
  },
  {
    id: 2,
    label: "Quản lý",
    items: [
      {
        title: "Đơn hàng",
        url: "/orders",
        icon: ShoppingBagIcon,
      },
      {
        title: "Khách hàng",
        url: "/customers",
        icon: Users,
      },
      {
        title: "Hàng hóa",
        url: "/products",
        icon: PackageIcon,
      },
      {
        title: "Sự kiện",
        url: "/events",
        icon: Calendar1Icon,
      },
      {
        title: "Zalo OA",
        url: "/zalo-oa",
        icon: User,
      },
    ],
  },
  {
    id: 3,
    label: "Website SRX",
    items: [
      {
        title: "Shop",
        url: "#",
        icon: Store,
        subItems: [
          { title: "Đơn hàng", url: "/srx/orders" },
          { title: "Sản phẩm", url: "/srx/products" },
          { title: "Danh mục sản phẩm", url: "/srx/products_categories" },
          { title: "Từ điển thành phần", url: "/srx/product_tags" },
          { title: "Thư viện ảnh", url: "/srx/media-library" },
          { title: "Mã giảm giá", url: "/srx/voucher" },
          { title: "Banner", url: "/srx/banner" },
        ],
      },
      {
        title: "Khách hàng",
        url: "/srx/customers",
        icon: Users,
      },
      {
        title: "Tin tức",
        url: "#",
        icon: Newspaper,
        subItems: [
          { title: "Quản lý tin tức", url: "/srx/news" },
          { title: "Danh mục tin tức", url: "/srx/news_categories" },
          { title: "Thẻ tin tức", url: "/srx/news_tags" },
        ],
      },
      {
        title: "Affiliate",
        url: "#",
        icon: Handshake,
        subItems: [
          { title: "Quản lý affiliate", url: "/srx/affiliates/manage" },
          { title: "Phê duyệt hồ sơ", url: "/srx/affiliates/approval" },
          { title: "Thiết lập hoa hồng", url: "/srx/affiliates/commission" },
        ],
      },
      {
        title: "Ladipage sự kiện",
        url: "/srx/ladipage-events",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    id: 4,
    label: "Khác",
    items: [
      {
        title: "Tài khoản",
        url: "/account",
        icon: UserCog,
      },
      {
        title: "Quy tắc",
        url: "/rules",
        icon: Scale,
      },
      {
        title: "Khác",
        url: "/other",
        icon: SquareArrowUpRight,
      },
    ],
  },
];
