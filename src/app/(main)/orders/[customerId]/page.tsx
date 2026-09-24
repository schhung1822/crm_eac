export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import Link from "next/link";

import { ArrowLeft, MapPin, Phone, ReceiptText } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getOrdersByCustomer } from "@/lib/ordersByCustomer";
import { getInitials } from "@/lib/utils";

import type { Channel } from "../_components/schema";

import { DataTable } from "./_components/data-table";

function CustomerOverview({ customerId, customer }: { customerId: string; customer: Channel | undefined }) {
  const customerName = customer?.name_customer ?? "Khách hàng không xác định";

  return (
    <section className="from-card to-muted/40 rounded-2xl border bg-gradient-to-br p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar className="border-background size-14 shrink-0 border-2 shadow-sm md:size-16">
            <AvatarImage src="/avatars/avatar.webp" alt={customerName} className="object-cover" />
            <AvatarFallback>{getInitials(customerName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="text-muted-foreground mb-1 flex items-center gap-2 text-sm">
              <ReceiptText className="size-4" />
              Lịch sử đơn hàng
            </div>
            <h1 className="truncate text-xl font-semibold md:text-2xl">{customerName}</h1>
            <Badge variant="outline" className="bg-background/60 mt-2">
              Mã khách: {customerId}
            </Badge>
          </div>
        </div>

        <div className="grid gap-2 text-sm md:max-w-md">
          <div className="bg-background/60 flex items-center gap-2 rounded-lg border px-3 py-2">
            <Phone className="text-muted-foreground size-4 shrink-0" />
            <span className="truncate">{customer?.phone ?? "Chưa có số điện thoại"}</span>
          </div>
          <div className="bg-background/60 flex items-start gap-2 rounded-lg border px-3 py-2">
            <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <span className="line-clamp-2">{customer?.address ?? "Chưa có địa chỉ"}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function Page({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId: rawCustomerId } = await params;
  const customerId = rawCustomerId.trim();

  if (!customerId) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <h1 className="text-xl font-semibold">Thiếu customer ID</h1>
        <pre className="text-muted-foreground mt-2 text-xs">
          {JSON.stringify({ rawCustomerId, customerId }, null, 2)}
        </pre>
      </div>
    );
  }

  const { rows } = await getOrdersByCustomer(customerId);
  const customer = rows.at(0);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/customers">
            <ArrowLeft className="size-4" />
            Danh sách khách hàng
          </Link>
        </Button>
      </div>

      <CustomerOverview customerId={customerId} customer={customer} />

      <DataTable data={rows} customerId={customerId} />
    </div>
  );
}
