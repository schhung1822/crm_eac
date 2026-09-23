"use client";

import { DataTable } from "@/components/data-table/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";

import { channelColumns } from "./columns.crm";
import type { ChannelSummary } from "./schema";

type Props = {
  channels: ChannelSummary[];
};

export function TableCards({ channels }: Props) {
  const table = useDataTableInstance({
    data: channels,
    columns: channelColumns,
    getRowId: (row) => row.kenh_ban,
  });
  const sortingKey = table
    .getState()
    .sorting.map((item) => `${item.id}:${item.desc ? "desc" : "asc"}`)
    .join("|");

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b px-4 py-4">
        <CardTitle>Hiệu suất theo kênh bán</CardTitle>
      </CardHeader>
      <CardContent className="px-0 py-2">
        <div className="overflow-hidden">
          <DataTable key={sortingKey} table={table} columns={channelColumns} />
        </div>
      </CardContent>
    </Card>
  );
}
