"use client";

import { LoaderCircle } from "lucide-react";

import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

import { Users } from "./schema";

const statusActions: Array<{ status: Users["status"]; label: string }> = [
  { status: "active", label: "Kích hoạt" },
  { status: "inactive", label: "Tạm ngưng" },
  { status: "banned", label: "Khóa tài khoản" },
];

export function CustomerRowActions({
  customer,
  isPending,
  onStatusChange,
}: {
  customer: Users;
  isPending: boolean;
  onStatusChange: (customerId: string, status: Users["status"]) => Promise<void>;
}) {
  return (
    <>
      <DropdownMenuLabel>Khách hàng website</DropdownMenuLabel>
      <DropdownMenuSeparator />
      {statusActions.map((action) => (
        <DropdownMenuItem
          key={action.status}
          disabled={isPending || customer.status === action.status}
          onClick={() => void onStatusChange(customer.id, action.status)}
        >
          {isPending && customer.status !== action.status ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {action.label}
        </DropdownMenuItem>
      ))}
    </>
  );
}
