"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { getDirectoryLabel } from "./media-library-utils";

type MediaLibraryFiltersProps = {
  directories: readonly string[];
  directoryCounts: Map<string, number>;
  itemCount: number;
  onSearchTermChange: (value: string) => void;
  onSelectedDirectoryChange: (value: string) => void;
  searchTerm: string;
  selectedDirectory: string;
};

export function MediaLibraryFilters({
  directories,
  directoryCounts,
  itemCount,
  onSearchTermChange,
  onSelectedDirectoryChange,
  searchTerm,
  selectedDirectory,
}: MediaLibraryFiltersProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <Tabs value={selectedDirectory} onValueChange={onSelectedDirectoryChange}>
        <TabsList className="h-auto flex-wrap justify-start gap-1 p-1">
          <TabsTrigger value="all" className="flex-none text-xs">
            Tất cả
            <span className="text-muted-foreground">{itemCount}</span>
          </TabsTrigger>
          {directories.map((directory) => (
            <TabsTrigger key={directory} value={directory} className="flex-none text-xs">
              {getDirectoryLabel(directory)}
              <span className="text-muted-foreground">{directoryCounts.get(directory) ?? 0}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="relative lg:w-72">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          className="pl-9"
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          placeholder="Tìm theo tên file, đường dẫn..."
          aria-label="Tìm ảnh"
        />
      </div>
    </div>
  );
}
