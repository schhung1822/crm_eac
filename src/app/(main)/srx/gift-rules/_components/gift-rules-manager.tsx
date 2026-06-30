/* eslint-disable max-lines */
"use client";

import * as React from "react";

import { ColumnDef } from "@tanstack/react-table";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { filterBySearchTerm } from "@/lib/search-utils";
import { parseSrxGiftRule, type SrxGiftRule, type SrxGiftRuleMutationInput } from "@/lib/srx-website.shared";

import { GiftRuleFormDialog, type GiftProductOption } from "./gift-rule-form-dialog";

function formatCurrency(value: number | null): string {
  if (value === null) {
    return "—";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function getRuleTypeLabel(ruleType: SrxGiftRule["rule_type"]): string {
  switch (ruleType) {
    case "product_quantity":
      return "Số lượng sản phẩm";
    case "order_subtotal":
      return "Giá trị đơn hàng";
    default:
      return ruleType;
  }
}

function getConditionLabel(giftRule: SrxGiftRule): string {
  if (giftRule.rule_type === "order_subtotal") {
    return `Đơn từ ${formatCurrency(giftRule.min_subtotal)}`;
  }

  const productName = giftRule.product_name || "Tất cả sản phẩm";
  const variantName = giftRule.variant_name ? ` / ${giftRule.variant_name}` : "";

  return `${productName}${variantName} x ${giftRule.min_quantity}`;
}

function sortGiftRules(giftRules: SrxGiftRule[]): SrxGiftRule[] {
  return [...giftRules].sort((left, right) => {
    if (left.is_active !== right.is_active) {
      return left.is_active ? -1 : 1;
    }

    if (left.priority !== right.priority) {
      return right.priority - left.priority;
    }

    return right.created_at.getTime() - left.created_at.getTime();
  });
}

export function GiftRulesManager({
  initialGiftRules,
  productOptions,
}: {
  initialGiftRules: SrxGiftRule[];
  productOptions: GiftProductOption[];
}) {
  const [giftRules, setGiftRules] = React.useState<SrxGiftRule[]>(sortGiftRules(initialGiftRules));
  const [searchTerm, setSearchTerm] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingGiftRule, setEditingGiftRule] = React.useState<SrxGiftRule | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);

  const filteredGiftRules = React.useMemo(() => {
    return filterBySearchTerm(giftRules, searchTerm, (giftRule) => [
      giftRule.name,
      giftRule.description,
      giftRule.product_name,
      giftRule.variant_name,
      giftRule.gift_name,
      giftRule.gift_sku,
      giftRule.gift_variant_name,
    ]);
  }, [giftRules, searchTerm]);

  const handleSubmit = React.useCallback(
    async (value: SrxGiftRuleMutationInput) => {
      try {
        setIsSubmitting(true);

        const response = await fetch(
          editingGiftRule ? `/api/srx/gift-rules/${editingGiftRule.id}` : "/api/srx/gift-rules",
          {
            method: editingGiftRule ? "PATCH" : "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(value),
          },
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.message ?? "Không thể lưu chương trình quà tặng");
        }

        const giftRule = parseSrxGiftRule(result.giftRule);

        setGiftRules((current) =>
          sortGiftRules(
            editingGiftRule
              ? current.map((item) => (item.id === editingGiftRule.id ? giftRule : item))
              : [...current, giftRule],
          ),
        );

        toast.success(editingGiftRule ? "Đã cập nhật chương trình quà tặng" : "Đã tạo chương trình quà tặng");
        setFormOpen(false);
        setEditingGiftRule(null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể lưu chương trình quà tặng");
      } finally {
        setIsSubmitting(false);
      }
    },
    [editingGiftRule],
  );

  const deleteGiftRuleRequest = React.useCallback(async (giftRuleId: string) => {
    const response = await fetch(`/api/srx/gift-rules/${giftRuleId}`, {
      method: "DELETE",
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.message ?? "Không thể xóa chương trình quà tặng");
    }
  }, []);

  const handleDelete = React.useCallback(
    async (giftRule: SrxGiftRule) => {
      if (!window.confirm(`Xóa chương trình quà tặng "${giftRule.name}"?`)) {
        return;
      }

      try {
        await deleteGiftRuleRequest(giftRule.id);
        setGiftRules((current) => current.filter((item) => item.id !== giftRule.id));
        toast.success("Đã xóa chương trình quà tặng");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể xóa chương trình quà tặng");
      }
    },
    [deleteGiftRuleRequest],
  );

  const columns = React.useMemo<ColumnDef<SrxGiftRule>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="Chọn tất cả chương trình quà tặng"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label={`Chọn chương trình ${row.original.name}`}
            />
          </div>
        ),
        enableHiding: false,
        enableSorting: false,
      },
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Chương trình" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            {row.original.gift_img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={row.original.gift_img} alt="" className="size-12 rounded-md border object-cover" />
            ) : (
              <div className="bg-muted size-12 rounded-md border" />
            )}
            <div>
              <div className="font-medium">{row.original.name}</div>
              <div className="text-muted-foreground line-clamp-1 text-xs">{row.original.description || "—"}</div>
            </div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "rule_type",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Điều kiện" />,
        cell: ({ row }) => (
          <div>
            <div>{getRuleTypeLabel(row.original.rule_type)}</div>
            <div className="text-muted-foreground line-clamp-2 text-xs">{getConditionLabel(row.original)}</div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "gift_name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Quà tặng" />,
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.gift_name}</div>
            <div className="text-muted-foreground text-xs">
              {row.original.gift_sku || "Không có SKU"} · SL {row.original.gift_quantity}
            </div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "limit_quantity",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Giới hạn" />,
        cell: ({ row }) => (
          <div>
            <div>{row.original.limit_quantity === null ? "Không giới hạn" : `${row.original.limit_quantity} quà`}</div>
            <div className="text-muted-foreground text-xs">Ưu tiên {row.original.priority}</div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "is_active",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Trạng thái" />,
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "default" : "secondary"}>
            {row.original.is_active ? "Đang bật" : "Đang tắt"}
          </Badge>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "ends_at",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Hiệu lực" />,
        cell: ({ row }) => (
          <div className="text-sm">
            <div>{row.original.starts_at ? row.original.starts_at.toLocaleDateString("vi-VN") : "Bắt đầu ngay"}</div>
            <div className="text-muted-foreground text-xs">
              {row.original.ends_at ? `Đến ${row.original.ends_at.toLocaleDateString("vi-VN")}` : "Không giới hạn"}
            </div>
          </div>
        ),
        enableSorting: false,
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingGiftRule(row.original);
                setFormOpen(true);
              }}
            >
              Sửa
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void handleDelete(row.original)}>
              Xóa
            </Button>
          </div>
        ),
        enableSorting: false,
      },
    ],
    [handleDelete],
  );

  const table = useDataTableInstance({
    data: filteredGiftRules,
    columns,
    getRowId: (row) => row.id,
  });
  const tableRenderKey = `${searchTerm}|${filteredGiftRules.length}`;
  const rowSelection = table.getState().rowSelection;
  const selectedGiftRules = React.useMemo(
    () => filteredGiftRules.filter((giftRule) => rowSelection[giftRule.id]),
    [filteredGiftRules, rowSelection],
  );
  const selectedGiftRuleCount = selectedGiftRules.length;

  async function handleBulkDelete() {
    if (selectedGiftRules.length === 0) {
      return;
    }

    if (!window.confirm(`Xóa ${selectedGiftRules.length} chương trình quà tặng đã chọn?`)) {
      return;
    }

    try {
      setIsBulkDeleting(true);
      const results = await Promise.allSettled(
        selectedGiftRules.map(async (giftRule) => {
          await deleteGiftRuleRequest(giftRule.id);
          return giftRule.id;
        }),
      );
      const deletedIds = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
      const failedCount = results.length - deletedIds.length;

      if (deletedIds.length > 0) {
        setGiftRules((current) => current.filter((item) => !deletedIds.includes(item.id)));
      }

      table.resetRowSelection();

      if (failedCount === 0) {
        toast.success(`Đã xóa ${deletedIds.length} chương trình quà tặng`);
        return;
      }

      toast.error(`Đã xóa ${deletedIds.length}/${selectedGiftRules.length} chương trình. ${failedCount} mục không thể xóa.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa các chương trình quà tặng đã chọn");
    } finally {
      setIsBulkDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Chương trình quà tặng</h1>
        <p className="text-muted-foreground">Quản lý điều kiện nhận quà, số lượng quà và thumbnail hiển thị cho website SRX.</p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-10"
            placeholder="Tìm theo tên, sản phẩm, SKU quà..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          {selectedGiftRuleCount > 0 ? (
            <Button variant="destructive" onClick={() => void handleBulkDelete()} disabled={isBulkDeleting}>
              <Trash2 className="size-4" />
              {isBulkDeleting ? "Đang xóa..." : `Xóa đã chọn (${selectedGiftRuleCount})`}
            </Button>
          ) : null}

          <Button
            onClick={() => {
              setEditingGiftRule(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" />
            Thêm chương trình
          </Button>
        </div>
      </div>

      <div className="nice-scroll overflow-hidden rounded-lg">
        <DataTable key={tableRenderKey} table={table} columns={columns} />
      </div>

      <GiftRuleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initialValue={editingGiftRule}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        productOptions={productOptions}
      />
    </div>
  );
}
