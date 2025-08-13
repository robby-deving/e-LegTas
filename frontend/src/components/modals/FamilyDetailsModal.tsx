import { useState } from "react";
import axios from "axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { FamilyMember } from "@/types/EvacuationCenterDetails";
import { formatDate } from "@/utils/dateFormatter";

const INVERSE_REL: Record<string, string> = {
  Spouse: "Spouse",
  Partner: "Partner",
  Sibling: "Sibling",
  Child: "Parent",
  Parent: "Child",
  Grandparent: "Grandchild",
  Grandchild: "Grandparent",
  "In-law": "In-law",
  Relative: "Relative",
  "Household Member": "Household Member",
  Boarder: "Boarder",
};

export const FamilyDetailsModal = ({
  isOpen,
  onClose,
  evacuee,
  centerName,
  onEditMember,
}: any) => {
  const navigate = useNavigate();

  // modal state for transfer-head
  const [transferOpen, setTransferOpen] = useState(false);
  const [newHeadEvacueeId, setNewHeadEvacueeId] = useState<string>("");
  const [oldHeadNewRel, setOldHeadNewRel] = useState<string>("");
  const [transferring, setTransferring] = useState(false);

  if (!isOpen || !evacuee) return null;

  const members: any[] = evacuee?.list_of_family_members?.family_members ?? [];

  // exclude current head
  const transferCandidates: any[] = members.filter(
    (m) => m.full_name !== evacuee.family_head_full_name
  );

  const canTransfer =
    transferCandidates.length > 0 &&
    Boolean(evacuee?.id) &&
    Boolean(evacuee?.disaster_evacuation_event_id);

  const handleSelectNewHead = (value: string) => {
    setNewHeadEvacueeId(value);
    const cand = transferCandidates.find((m) => String(m.evacuee_id) === value);
    const relToOldHead: string | undefined = cand?.relationship_to_family_head;
    const inverse =
      relToOldHead && INVERSE_REL[relToOldHead]
        ? INVERSE_REL[relToOldHead]
        : "Relative";
    setOldHeadNewRel(inverse);
  };

  const handleConfirmTransfer = async () => {
    try {
      if (!newHeadEvacueeId) return;
      setTransferring(true);

      // ensure inverse relationship is set
      let rel = oldHeadNewRel;
      if (!rel) {
        const cand = transferCandidates.find(
          (m: any) => String(m.evacuee_id) === String(newHeadEvacueeId)
        );
        const toRel = cand?.relationship_to_family_head;
        rel = toRel && INVERSE_REL[toRel] ? INVERSE_REL[toRel] : "Relative";
        setOldHeadNewRel(rel);
      }

      const url = `http://localhost:3000/api/v1/evacuees/${Number(
        evacuee.disaster_evacuation_event_id
      )}/transfer-head`;

      const body = {
        from_family_head_id: Number(evacuee.id),
        to_evacuee_resident_id: Number(newHeadEvacueeId),
        old_head_new_relationship: rel,
      };

      await axios.post(url, body);
      setTransferOpen(false);
      onClose(); // parent can refetch if needed
    } catch (e: any) {
      console.error("Transfer head failed", e?.response?.data || e);
    } finally {
      setTransferring(false);
    }
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent size="full">
          <DialogHeader>
            <DialogTitle className="text-green-700 text-xl font-bold">
              View Family
            </DialogTitle>
            <DialogDescription className="sr-only">
              View detailed information and demographics for the selected
              evacuee family.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Header section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Evacuation Center:</label>
                <Input
                  value={centerName}
                  readOnly
                  className="w-full bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Head of the Family:</label>
                <div className="flex gap-2">
                  <Input
                    value={evacuee.family_head_full_name}
                    readOnly
                    className="w-full bg-gray-50"
                  />
                  <Button
                    className={`bg-green-700 hover:bg-green-800 text-white px-3 py-1 text-sm cursor-pointer ${
                      !canTransfer ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                    onClick={() => {
                      setTransferOpen(true);
                      setNewHeadEvacueeId("");
                      setOldHeadNewRel("");
                    }}
                    disabled={!canTransfer}
                    title={
                      !canTransfer
                        ? "No other members to transfer to"
                        : "Transfer Head"
                    }
                  >
                    Transfer Head
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-full">
                  <label className="block text-sm font-semibold mb-2">Decampment:</label>
                  <Input
                    value={evacuee.decampment || "Not Decamped"}
                    readOnly
                    className="w-full bg-gray-50"
                  />
                </div>
                <Button
                  className="bg-green-700 hover:bg-green-800 text-white px-3 py-1 text-sm cursor-pointer self-end"
                  onClick={() => navigate(`/decampment/${evacuee.id}`)}
                >
                  Decamp
                </Button>
              </div>
            </div>

            {/* Breakdown table */}
            <div>
              <label className="block text-sm font-semibold mb-3">Individual Breakdown:</label>
              <div className="overflow-x-auto border rounded-lg">
                <div className="max-h-[50vh] overflow-x-auto overflow-y-auto pr-2 pb-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-corner]:bg-transparent dark:[&::-webkit-scrollbar-track]:bg-neutral-700 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500 [scrollbar-width:thin] [scrollbar-color:rgb(209_213_219)_transparent] dark:[scrollbar-color:rgb(115_115_115)_transparent]">
                  <Table className="text-sm">
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="text-center font-semibold">
                          Male
                        </TableHead>
                        <TableHead className="text-center font-semibold">
                          Female
                        </TableHead>
                        <TableHead className="text-center font-semibold">
                          Total
                        </TableHead>
                        <TableHead className="text-center font-semibold">
                          Infant
                          <br />
                          (1 yr below)
                        </TableHead>
                        <TableHead className="text-center font-semibold">
                          Children
                          <br />
                          (2-12 yrs)
                        </TableHead>
                        <TableHead className="text-center font-semibold">
                          Youth
                          <br />
                          (13-17 yrs)
                        </TableHead>
                        <TableHead className="text-center font-semibold">
                          Adult
                          <br />
                          (18-59 yrs)
                        </TableHead>
                        <TableHead className="text-center font-semibold">
                          Senior
                          <br />
                          (60+ yrs)
                        </TableHead>
                        <TableHead className="text-center font-semibold">
                          PWD
                        </TableHead>
                        <TableHead className="text-center font-semibold">
                          Pregnant
                        </TableHead>
                        <TableHead className="text-center font-semibold">
                          Lactating
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="text-center">
                          {
                            members.filter(
                              (m: FamilyMember) => m.sex === "Male"
                            ).length
                          }
                        </TableCell>
                        <TableCell className="text-center">
                          {
                            members.filter(
                              (m: FamilyMember) => m.sex === "Female"
                            ).length
                          }
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {evacuee.total_individuals}
                        </TableCell>
                        <TableCell className="text-center">
                          {members.filter((m: any) => Number(m.age) < 2).length}
                        </TableCell>
                        <TableCell className="text-center">
                          {
                            members.filter(
                              (m: any) =>
                                Number(m.age) >= 2 && Number(m.age) <= 12
                            ).length
                          }
                        </TableCell>
                        <TableCell className="text-center">
                          {
                            members.filter(
                              (m: any) =>
                                Number(m.age) >= 13 && Number(m.age) <= 17
                            ).length
                          }
                        </TableCell>
                        <TableCell className="text-center">
                          {
                            members.filter(
                              (m: any) =>
                                Number(m.age) >= 18 && Number(m.age) <= 59
                            ).length
                          }
                        </TableCell>
                        <TableCell className="text-center">
                          {
                            members.filter((m: any) => Number(m.age) >= 60)
                              .length
                          }
                        </TableCell>
                        <TableCell className="text-center">
                          {
                            members.filter((m: any) =>
                              m.vulnerability_types?.includes(
                                "Person with Disability"
                              )
                            ).length
                          }
                        </TableCell>
                        <TableCell className="text-center">
                          {
                            members.filter((m: any) =>
                              m.vulnerability_types?.includes("Pregnant Woman")
                            ).length
                          }
                        </TableCell>
                        <TableCell className="text-center">
                          {
                            members.filter((m: any) =>
                              m.vulnerability_types?.includes("Lactating Woman")
                            ).length
                          }
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            {/* Members table */}
            <div>
              <label className="block text-sm font-semibold mb-3">List of Family Members:</label>
              <div className="overflow-x-auto border rounded-lg">
                <div className="max-h-[50vh] overflow-x-auto overflow-y-auto pr-2 pb-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-corner]:bg-transparent dark:[&::-webkit-scrollbar-track]:bg-neutral-700 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500 [scrollbar-width:thin] [scrollbar-color:rgb(209_213_219)_transparent] dark:[scrollbar-color:rgb(115_115_115)_transparent]">
                  <Table className="text-sm">
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">
                          Full Name
                        </TableHead>
                        <TableHead className="font-semibold">Age</TableHead>
                        <TableHead className="font-semibold">
                          Barangay of Origin
                        </TableHead>
                        <TableHead className="font-semibold">Sex</TableHead>
                        <TableHead className="font-semibold">
                          Type of Vulnerability
                        </TableHead>
                        <TableHead className="font-semibold">
                          Room Name
                        </TableHead>
                        <TableHead className="font-semibold">
                          Time of Arrival
                        </TableHead>
                        <TableHead className="font-semibold"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member: any, idx: number) => (
                        <TableRow key={idx} className="group hover:bg-gray-50">
                          <TableCell className="font-medium">
                            {member.full_name}
                          </TableCell>
                          <TableCell>{member.age}</TableCell>
                          <TableCell>{member.barangay_of_origin}</TableCell>
                          <TableCell>{member.sex}</TableCell>
                          <TableCell>
                            {(member.vulnerability_types?.length ?? 0) > 0 ? (
                              member.vulnerability_types.map(
                                (v: string, vIdx: number) => {
                                  let colorClass = "bg-gray-100 text-gray-600";
                                  if (v === "Infant")
                                    colorClass = "bg-pink-100 text-pink-600";
                                  else if (v === "Child")
                                    colorClass = "bg-blue-100 text-blue-600";
                                  else if (v === "Youth")
                                    colorClass = "bg-green-100 text-green-600";
                                  else if (v === "Adult")
                                    colorClass =
                                      "bg-purple-100 text-purple-600";
                                  else if (v === "Senior Citizen")
                                    colorClass =
                                      "bg-orange-100 text-orange-600";
                                  else if (v === "Pregnant Woman")
                                    colorClass = "bg-red-100 text-red-600";
                                  else if (v === "Lactating Woman")
                                    colorClass = "bg-rose-100 text-rose-600";
                                  else if (v === "Person with Disability")
                                    colorClass =
                                      "bg-yellow-100 text-yellow-600";
                                  return (
                                    <span
                                      key={vIdx}
                                      className={`inline-block px-2 py-1 mr-1 mb-1 rounded-full text-xs font-medium ${colorClass}`}
                                    >
                                      {v}
                                    </span>
                                  );
                                }
                              )
                            ) : (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                None
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{member.room_name}</TableCell>
                          <TableCell>
                            {formatDate(member.arrival_timestamp)}
                          </TableCell>
                          <TableCell className="text-right flex justify-end items-center text-foreground">
                            <Pencil
                              className="w-4 h-4 text-gray-400 group-hover:text-green-700 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditMember(member);
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer Head Modal (uses your Dialog) */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          {/* X close button */}

          <DialogHeader className="mb-2">
            <DialogTitle className="text-green-700 text-xl font-bold">
              Transfer Head
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Reassign the family head.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Select new head */}
            <div>
              <label className="block text-sm font-medium mb-1">Select new head</label>
              <Select
                value={newHeadEvacueeId}
                onValueChange={handleSelectNewHead}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a family member" />
                </SelectTrigger>
                <SelectContent>
                  {transferCandidates.map((m: any) => (
                    <SelectItem key={m.evacuee_id} value={String(m.evacuee_id)}>
                      {m.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Old head new relationship (read-only, auto) */}
            <div className="mt-3">
              <label className="block text-sm font-medium mb-1">Old head new relationship</label>
              <Input
                value={oldHeadNewRel}
                readOnly
                className="w-full bg-gray-50"
              />
              <p className="mt-1 text-xs text-gray-500">
                Auto-set from the selected member’s current relationship.
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setTransferOpen(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              className="bg-green-700 hover:bg-green-800 text-white cursor-pointer disabled:cursor-not-allowed"
              disabled={
                !newHeadEvacueeId ||
                !canTransfer ||
                transferring ||
                !oldHeadNewRel
              }
              onClick={handleConfirmTransfer}
            >
              {transferring ? "Transferring..." : "Confirm Transfer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
