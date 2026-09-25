"use client";

import type { CrmCustomerInsights } from "@/lib/crm-customers";

import { ReportHeader } from "./crm-dashboard-header";
import { CustomerInsightCards } from "./customer-insight-cards";

export default function CustomerDashboardClient(customerInsights: CrmCustomerInsights) {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <ReportHeader
        title="Báo cáo khách hàng"
        description="Toàn bộ khách hàng trong danh bạ CRM. Bộ lọc thời gian áp dụng cho biểu đồ khách hàng mới."
      />
      <CustomerInsightCards {...customerInsights} />
    </div>
  );
}
