// frontend/src/components/cards/BarangayNameCard.tsx
import { Card, CardHeader, CardTitle } from "../ui/card";
import locationIcon from "@/assets/direction.svg"; // reuse same icon if you like

interface BarangayNameCardProps {
  barangay: string;
}

export function BarangayNameCard({ barangay }: BarangayNameCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold leading-tight mb-0">Barangay</CardTitle>
        <div className="flex items-center text-muted-foreground text-base font-medium">
          <img src={locationIcon} alt="location" className="w-4 h-4 mr-2" />
          {barangay}
        </div>
      </CardHeader>
    </Card>
  );
}