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
import { parseSrxBanner, type SrxBanner, type SrxBannerMutationInput } from "@/lib/srx-website.shared";

import { BannerFormDialog } from "./banner-form-dialog";

function getPositionLabel(position: SrxBanner["position"]): string {
  switch (position) {
    case "homepage_hero":
      return "Hero trang chủ";
    case "homepage_secondary":
      return "Banner phụ trang chủ";
    case "category_sidebar":
      return "Sidebar danh mục";
    case "popup":
      return "Popup";
    case "header_strip":
      return "Thanh đầu trang";
    default:
      return position;
  }
}

function sortBanners(banners: SrxBanner[]): SrxBanner[] {
  return [...banners].sort((left, right) => {
    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order;
    }

    return right.created_at.getTime() - left.created_at.getTime();
  });
}

export function BannersManager({ initialBanners }: { initialBanners: SrxBanner[] }) {
  const [banners, setBanners] = React.useState<SrxBanner[]>(sortBanners(initialBanners));
  const [searchTerm, setSearchTerm] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingBanner, setEditingBanner] = React.useState<SrxBanner | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);

  const filteredBanners = React.useMemo(() => {
    if (!searchTerm.trim()) {
      return banners;
    }

    const term = searchTerm.toLowerCase();
    return banners.filter(
      (banner) =>
        banner.title.toLowerCase().includes(term) ||
        banner.slug.toLowerCase().includes(term) ||
        banner.description.toLowerCase().includes(term) ||
        banner.link_target.toLowerCase().includes(term),
    );
  }, [banners, searchTerm]);

  const handleSubmit = React.useCallback(
    async (value: SrxBannerMutationInput) => {
      try {
        setIsSubmitting(true);

        const response = await fetch(editingBanner ? `/api/srx/banners/${editingBanner.id}` : "/api/srx/banners", {
          method: editingBanner ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(value),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.message ?? "Không thể lưu banner");
        }

        const banner = parseSrxBanner(result.banner);

        setBanners((current) =>
          sortBanners(
            editingBanner
              ? current.map((item) => (item.id === editingBanner.id ? banner : item))
              : [...current, banner],
          ),
        );

        toast.success(editingBanner ? "Đã cập nhật banner" : "Đã tạo banner mới");
        setFormOpen(false);
        setEditingBanner(null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể lưu banner");
      } finally {
        setIsSubmitting(false);
      }
    },
    [editingBanner],
  );

  const deleteBannerRequest = React.useCallback(async (bannerId: string) => {
    const response = await fetch(`/api/srx/banners/${bannerId}`, {
      method: "DELETE",
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.message ?? "Không thể xóa banner");
    }
  }, []);

  const handleDelete = React.useCallback(
    async (banner: SrxBanner) => {
      if (!window.confirm(`Xóa banner "${banner.title}"?`)) {
        return;
      }

      try {
        await deleteBannerRequest(banner.id);
        setBanners((current) => current.filter((item) => item.id !== banner.id));
        toast.success("Đã xóa banner");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể xóa banner");
      }
    },
    [deleteBannerRequest],
  );

  const columns = React.useMemo<ColumnDef<SrxBanner>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="Chọn tất cả banner"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label={`Chọn banner ${row.original.title}`}
            />
          </div>
        ),
        enableHiding: false,
        enableSorting: false,
      },
      {
        accessorKey: "title",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Banner" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="bg-muted h-14 w-24 overflow-hidden rounded-md border">
              {row.original.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.original.image_url} alt={row.original.title} className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div>
              <div className="font-medium">{row.original.title}</div>
              <div className="text-muted-foreground text-xs">{row.original.slug}</div>
            </div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "position",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Vị trí" />,
        cell: ({ row }) => (
          <div>
            <div>{getPositionLabel(row.original.position)}</div>
            <div className="text-muted-foreground text-xs">Thứ tự: {row.original.sort_order}</div>
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "link_target",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Liên kết" />,
        cell: ({ row }) => (
          <div className="max-w-[260px]">
            <div className="truncate">{row.original.link_target || "Không có liên kết"}</div>
            <div className="text-muted-foreground text-xs">
              {row.original.open_in_new_tab ? "Mở tab mới" : "Mở cùng tab"}
            </div>
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
        header: ({ column }) => <DataTableColumnHeader column={column} title="Lịch chạy" />,
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
        accessorKey: "updated_at",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Cập nhật" />,
        cell: ({ row }) => <span>{row.original.updated_at.toLocaleDateString("vi-VN")}</span>,
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
                setEditingBanner(row.original);
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
    data: filteredBanners,
    columns,
    getRowId: (row) => row.id,
  });

  const selectedBanners = table.getFilteredSelectedRowModel().rows.map((row) => row.original);
  const selectedBannerCount = selectedBanners.length;

  async function handleBulkDelete() {
    if (selectedBanners.length === 0) {
      return;
    }

    if (!window.confirm(`Xóa ${selectedBanners.length} banner đã chọn?`)) {
      return;
    }

    try {
      setIsBulkDeleting(true);

      const results = await Promise.allSettled(
        selectedBanners.map(async (banner) => {
          await deleteBannerRequest(banner.id);
          return banner.id;
        }),
      );

      const deletedIds = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
      const failedCount = results.length - deletedIds.length;

      if (deletedIds.length > 0) {
        setBanners((current) => current.filter((item) => !deletedIds.includes(item.id)));
      }

      table.resetRowSelection();

      if (failedCount === 0) {
        toast.success(`Đã xóa ${deletedIds.length} banner`);
        return;
      }

      toast.error(`Đã xóa ${deletedIds.length}/${selectedBanners.length} banner. ${failedCount} mục không thể xóa.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa các banner đã chọn");
    } finally {
      setIsBulkDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Banner</h1>
        <p className="text-muted-foreground">Quản lý banner hiển thị trên website, lịch chạy và liên kết điều hướng.</p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-10"
            placeholder="Tìm theo tiêu đề, slug, liên kết..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          {selectedBannerCount > 0 ? (
            <Button variant="destructive" onClick={() => void handleBulkDelete()} disabled={isBulkDeleting}>
              <Trash2 className="size-4" />
              {isBulkDeleting ? "Đang xóa..." : `Xóa đã chọn (${selectedBannerCount})`}
            </Button>
          ) : null}

          <Button
            onClick={() => {
              setEditingBanner(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" />
            Thêm banner
          </Button>
        </div>
      </div>

      <div className="nice-scroll overflow-hidden rounded-lg">
        <DataTable table={table} columns={columns} />
      </div>

      <BannerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initialValue={editingBanner}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
