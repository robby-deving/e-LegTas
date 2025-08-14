// src/components/announcements/AnnouncementsPagination.tsx
import { Pagination } from "../ui/pagination";

type AnnouncementsPaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  rowsPerPage: number;
  totalRows: number;
  onRowsPerPageChange: (value: string) => void;
  selectedRowsCount: number;
};

export default function AnnouncementsPagination({
  currentPage,
  totalPages,
  onPageChange,
  rowsPerPage,
  totalRows,
  onRowsPerPageChange,
  selectedRowsCount,
}: AnnouncementsPaginationProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex-1 text-sm text-muted-foreground">
        {selectedRowsCount > 0 && (
          <span className="mr-4">
            {selectedRowsCount} of {totalRows} row(s) selected.
          </span>
        )}
        {totalRows > 0 && (
          <span>
            {(currentPage - 1) * rowsPerPage + 1}-
            {Math.min(currentPage * rowsPerPage, totalRows)} of {totalRows} row(s) shown.
          </span>
        )}
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        rowsPerPage={rowsPerPage}
        totalRows={totalRows}
        onRowsPerPageChange={onRowsPerPageChange}
      />
    </div>
  );
}