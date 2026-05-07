import {
  ColumnDef,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

type UseDataTableInstanceProps<TData, TValue> = {
  data: TData[];
  columns: ColumnDef<TData, TValue>[];
  enableRowSelection?: boolean;
  defaultPageIndex?: number;
  defaultPageSize?: number;
  getRowId?: (row: TData, index: number) => string;
};

export function useDataTableInstance<TData, TValue>({
  data,
  columns,
  enableRowSelection = true,
  defaultPageIndex = 0,
  defaultPageSize = 10,
  getRowId,
}: UseDataTableInstanceProps<TData, TValue>) {
  const resolveRowId =
    getRowId ??
    ((row: TData) => {
      if (row && typeof row === "object" && "id" in row) {
        const id = (row as { id?: string | number | null }).id;
        return id === undefined || id === null ? "" : String(id);
      }

      return "";
    });

  const table = useReactTable({
    data,
    columns,
    initialState: {
      pagination: {
        pageIndex: defaultPageIndex,
        pageSize: defaultPageSize,
      },
    },

    enableRowSelection,
    getRowId: resolveRowId,

    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  return table;
}
