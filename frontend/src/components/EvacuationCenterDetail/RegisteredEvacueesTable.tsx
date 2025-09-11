// src/components/EvacuationCenterDetail/RegisteredEvacueesTable.tsx
import { ArrowRight, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { formatDate } from "@/utils/dateFormatter";
import type { FamilyEvacueeInformation, SortKey, SortState } from "@/types/EvacuationCenterDetails";

type Props = {
  loading: boolean;
  search: string;
  onSearchChange: (v: string) => void;

  paginatedEvacuees: FamilyEvacueeInformation[];
  totalRows: number;
  totalPages: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (p: number) => void;
  onRowsPerPageChange: (v: number) => void;

  sort: SortState;
  onToggleSort: (key: SortKey) => void;

  onRowClick: (id: number) => void;

  // top-right actions
  canEndOperation: boolean;
  isEventEnded: boolean;
  onOpenEndFlow: () => void;
  onRegisterClick: () => void;
  onShowEndedInfo: () => void;
};

export default function RegisteredEvacueesTable({
  loading,
  search,
  onSearchChange,
  paginatedEvacuees,
  totalRows,
  totalPages,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  sort,
  onToggleSort,
  onRowClick,
  canEndOperation,
  isEventEnded,
  onOpenEndFlow,
  onRegisterClick,
  onShowEndedInfo,
}: Props) {
  return (
    <div className="py-1">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold">
            Registered Evacuees
            <span className="ml-2 text-md text-muted-foreground">(per Family)</span>
          </h3>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
          <div className="w-full max-w-xs">
            <Input
              placeholder="Search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full border-border"
            />
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            {isEventEnded ? (
              <Button
                type="button"
                onClick={onShowEndedInfo}
                className="h-10 px-6 bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 cursor-pointer"
                title="Evacuation operation already ended"
              >
                Evacuation operation ended
              </Button>
            ) : (
              canEndOperation && (
                <Button
                  className="h-10 bg-red-600 hover:bg-red-700 text-white px-6 cursor-pointer"
                  onClick={onOpenEndFlow}
                >
                  End Evacuation Operation
                </Button>
              )
            )}

            <Button
              className={`bg-green-700 hover:bg-green-800 text-white px-6 flex gap-2 items-center cursor-pointer ${
                isEventEnded ? "opacity-60" : ""
              }`}
              onClick={() => (isEventEnded ? onShowEndedInfo() : onRegisterClick())}
              title={isEventEnded ? "Evacuation operation already ended" : "Register a new evacuee"}
              aria-disabled={isEventEnded}
            >
              <span className="text-lg">+</span> Register Evacuee
            </Button>
          </div>
        </div>

        <div className="rounded-md border border-input">
          <div className="max-h-[70vh] overflow-x-auto overflow-y-auto pr-2 pb-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-corner]:bg-transparent dark:[&::-webkit-scrollbar-track]:bg-neutral-700 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500 [scrollbar-width:thin] [scrollbar-color:rgb(209_213_219)_transparent] dark:[scrollbar-color:rgb(115_115_115)_transparent]">
            <Table className="text-sm">
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="text-left font-semibold">
                    <button
                      type="button"
                      onClick={() => onToggleSort("family_head_full_name")}
                      className="inline-flex items-center gap-1 hover:text-gray-900"
                      aria-sort={
                        sort?.key === "family_head_full_name"
                          ? sort.dir === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      Family Head
                      <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </TableHead>

                  <TableHead className="text-left font-semibold">Barangay</TableHead>

                  <TableHead className="text-left font-semibold">
                    <button
                      type="button"
                      onClick={() => onToggleSort("total_individuals")}
                      className="inline-flex items-center gap-1 hover:text-gray-900"
                      aria-sort={
                        sort?.key === "total_individuals"
                          ? sort.dir === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      Total Individuals
                      <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </TableHead>

                  <TableHead className="text-left font-semibold">Room Name</TableHead>

                  <TableHead className="text-left font-semibold">
                    <button
                      type="button"
                      onClick={() => onToggleSort("decampment_timestamp")}
                      className="inline-flex items-center gap-1 hover:text-gray-900"
                      aria-sort={
                        sort?.key === "decampment_timestamp"
                          ? sort.dir === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      Decampment
                      <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </TableHead>

                  <TableHead />
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center">
                      <div role="status" className="inline-flex flex-col items-center gap-3">
                        <svg
                          aria-hidden="true"
                          className="inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-green-500"
                          viewBox="0 0 100 101"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                            fill="currentColor"
                          />
                          <path
                            d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                            fill="currentFill"
                          />
                        </svg>
                        <span className="text-sm text-muted-foreground">Loading Registered Evacuees…</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedEvacuees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No results.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedEvacuees.map((evac) => (
                    <TableRow
                      key={evac.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => onRowClick(evac.id)}
                    >
                      <TableCell className="text-foreground font-medium">
                        {evac.family_head_full_name}
                      </TableCell>
                      <TableCell className="text-foreground">{evac.barangay}</TableCell>
                      <TableCell className="text-foreground">
                        {evac.total_individuals.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-foreground">{evac.room_name}</TableCell>
                      <TableCell className="text-foreground">
                        {evac.decampment_timestamp ? formatDate(evac.decampment_timestamp) : "—"}
                      </TableCell>
                      <TableCell className="flex justify-end items-center text-foreground">
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex-1 text-sm text-muted-foreground">
            {paginatedEvacuees.length} of {totalRows} row(s) shown.
          </div>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
            rowsPerPage={rowsPerPage}
            totalRows={totalRows}
            onRowsPerPageChange={(value) => onRowsPerPageChange(Number(value))}
          />
        </div>
      </div>
    </div>
  );
}
