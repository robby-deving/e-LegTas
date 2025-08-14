import * as React from "react"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

const Pagination = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
    onRowsPerPageChange: (value: string) => void
    rowsPerPage: number
    totalRows: number
  }
>(({
  currentPage,
  totalPages,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPage,
  totalRows,
  className,
  ...props
}, ref) => {


  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-between border-border px-4 py-3 sm:px-0",
        className
      )}
      {...props}
    >
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="relative inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted cursor-pointer"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="relative ml-3 inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted cursor-pointer"
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-end sm:space-x-6">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={`${rowsPerPage}`}
            onValueChange={onRowsPerPageChange}
          >
            <SelectTrigger className="h-8 w-[70px] cursor-pointer">
              <SelectValue placeholder={rowsPerPage} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`} className="cursor-pointer">
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Page {currentPage} of {totalPages}
        </div>
        <div>
          <div className="inline-flex items-center gap-2">
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted cursor-pointer"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

Pagination.displayName = "Pagination"

export { Pagination }
