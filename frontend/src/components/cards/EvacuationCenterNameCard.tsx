import { Card, CardHeader, CardTitle } from "../ui/card";
import { Navigation } from "lucide-react"; // ✅ use direction icon instead of MapPin

interface EvacuationCenterNameCardProps {
  name: string;
  barangay: string;
}

export function EvacuationCenterNameCard({ name, barangay }: EvacuationCenterNameCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold leading-tight mb-0">{name}</CardTitle>
        <div className="flex items-center text-muted-foreground text-base font-medium">
          <Navigation className="w-4 h-4 mr-2" />
          {barangay}
        </div>
      </CardHeader>
    </Card>
  );
}
