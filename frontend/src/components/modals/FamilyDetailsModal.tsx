
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../ui/table";
import { Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { FamilyMember } from "@/types/EvacuationCenterDetails";
import { formatDate } from "@/utils/dateFormatter";

export const FamilyDetailsModal = ({ isOpen, onClose, evacuee, centerName, onEditMember }: any) => {
  const navigate = useNavigate();

  if (!isOpen || !evacuee) return null;

  return (
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent size="full">
    <DialogHeader>
      <DialogTitle className="text-green-700 text-xl font-bold">View Family</DialogTitle>
      <DialogDescription className="sr-only">
        View detailed information and demographics for the selected evacuee family.
      </DialogDescription>
    </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Evacuation Center:</label>
              <Input value={centerName} readOnly className="w-full bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Head of the Family:</label>
              <Input value={evacuee.family_head_full_name} readOnly className="w-full bg-gray-50" />

            </div>
            <div className="flex items-center gap-4">
              <div className="w-full">
                <label className="block text-sm font-semibold mb-2">Decampment:</label>
                <Input value={evacuee.decampment || "Not Decamped"} readOnly className="w-full bg-gray-50" />
              </div>
              <Button
                className="bg-green-700 hover:bg-green-800 text-white px-3 py-1 text-sm cursor-pointer self-end"
                onClick={() => navigate(`/decampment/${evacuee.id}`)}
              >
                Decamp
              </Button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-3">Individual Breakdown:</label>
            <div className="overflow-x-auto border rounded-lg">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-center font-semibold">Male</TableHead>
                    <TableHead className="text-center font-semibold">Female</TableHead>
                    <TableHead className="text-center font-semibold">Total</TableHead>
                    <TableHead className="text-center font-semibold">Infant<br/>(1 yr below)</TableHead>
                    <TableHead className="text-center font-semibold">Children<br/>(2-12 yrs)</TableHead>
                    <TableHead className="text-center font-semibold">Youth<br/>(13-17 yrs)</TableHead>
                    <TableHead className="text-center font-semibold">Adult<br/>(18-59 yrs)</TableHead>
                    <TableHead className="text-center font-semibold">Senior<br/>(60+ yrs)</TableHead>
                    <TableHead className="text-center font-semibold">PWD</TableHead>
                    <TableHead className="text-center font-semibold">Pregnant</TableHead>
                    <TableHead className="text-center font-semibold">Lactating</TableHead>
                  </TableRow>
                </TableHeader>
<TableBody>
  <TableRow>
    <TableCell className="text-center">
      {evacuee.list_of_family_members.family_members.filter((m: FamilyMember) => m.sex === "Male").length}
    </TableCell>
    <TableCell className="text-center">
      {evacuee.list_of_family_members.family_members.filter((m: FamilyMember) => m.sex === "Female").length}
    </TableCell>
    <TableCell className="text-center font-semibold">{evacuee.total_individuals}</TableCell>
    <TableCell className="text-center">
      {evacuee.list_of_family_members.family_members.filter((m: FamilyMember) => m.age < 2).length}
    </TableCell>
    <TableCell className="text-center">
      {evacuee.list_of_family_members.family_members.filter((m: FamilyMember) => m.age >= 2 && m.age <= 12).length}
    </TableCell>
    <TableCell className="text-center">
      {evacuee.list_of_family_members.family_members.filter((m: FamilyMember) => m.age >= 13 && m.age <= 17).length}
    </TableCell>
    <TableCell className="text-center">
      {evacuee.list_of_family_members.family_members.filter((m: FamilyMember) => m.age >= 18 && m.age <= 59).length}
    </TableCell>
    <TableCell className="text-center">
      {evacuee.list_of_family_members.family_members.filter((m: FamilyMember) => m.age >= 60).length}
    </TableCell>
    <TableCell className="text-center">
      {evacuee.list_of_family_members.family_members.filter((m: FamilyMember) =>
        m.vulnerability_types?.includes("Person with Disability")
      ).length}
    </TableCell>
    <TableCell className="text-center">
      {evacuee.list_of_family_members.family_members.filter((m: FamilyMember) =>
        m.vulnerability_types?.includes("Pregnant Woman")
      ).length}
    </TableCell>
    <TableCell className="text-center">
      {evacuee.list_of_family_members.family_members.filter((m: FamilyMember) =>
        m.vulnerability_types?.includes("Lactating Woman")
      ).length}
    </TableCell>
  </TableRow>
</TableBody>


              </Table>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-3">List of Family Members:</label>
            <div className="overflow-x-auto border rounded-lg">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Full Name</TableHead>
                    <TableHead className="font-semibold">Age</TableHead>
                    <TableHead className="font-semibold">Barangay of Origin</TableHead>
                    <TableHead className="font-semibold">Sex</TableHead>
                    <TableHead className="font-semibold">Type of Vulnerability</TableHead>
                    <TableHead className="font-semibold">Room Name</TableHead>
                    <TableHead className="font-semibold">Time of Arrival</TableHead>
                    <TableHead className="font-semibold"></TableHead>
                  </TableRow>
                </TableHeader>
<TableBody>
  {evacuee?.list_of_family_members?.family_members?.map((member: any, idx: number) => (
    <TableRow key={idx} className="group hover:bg-gray-50">
      <TableCell className="font-medium">{member.full_name}</TableCell>
      <TableCell>{member.age}</TableCell>
      <TableCell>{member.barangay_of_origin}</TableCell>
      <TableCell>{member.sex}</TableCell>
      <TableCell>
        {(member.vulnerability_types?.length ?? 0) > 0 ? (
          member.vulnerability_types.map((v: string, vIdx: number) => {
            let colorClass = "bg-gray-100 text-gray-600";
            if (v === "Infant") colorClass = "bg-pink-100 text-pink-600";
            else if (v === "Child") colorClass = "bg-blue-100 text-blue-600";
            else if (v === "Youth") colorClass = "bg-green-100 text-green-600";
            else if (v === "Adult") colorClass = "bg-purple-100 text-purple-600";
            else if (v === "Senior Citizen") colorClass = "bg-orange-100 text-orange-600";
            else if (v === "Pregnant Woman") colorClass = "bg-red-100 text-red-600";
            else if (v === "Lactating Woman") colorClass = "bg-rose-100 text-rose-600";
            else if (v === "Person with Disability") colorClass = "bg-yellow-100 text-yellow-600";
            return (
              <span
                key={vIdx}
                className={`inline-block px-2 py-1 mr-1 mb-1 rounded-full text-xs font-medium ${colorClass}`}
              >
                {v}
              </span>
            );
          })
        ) : (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            None
          </span>
        )}
      </TableCell>
      <TableCell>{member.room_name}</TableCell>
      <TableCell>{formatDate(member.arrival_timestamp)}</TableCell>
      <TableCell className="text-right flex justify-end items-center text-foreground">
        <Pencil
          className="w-4 h-4 text-gray-400 group-hover:text-green-700 cursor-pointer"
          onClick={() => onEditMember(member.full_name)}
        />
      </TableCell>
    </TableRow>
  ))}
</TableBody>


              </Table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
