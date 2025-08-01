import { Card, CardHeader, CardTitle } from "../ui/card";

interface EvacuationCenterNameCardProps {
  name: string;
  barangay: string;
}

export function EvacuationCenterNameCard({ name, barangay }: EvacuationCenterNameCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold leading-tight mb-0">{name}</CardTitle>
        <div className="text-muted-foreground text-base font-medium">{barangay}</div>
      </CardHeader>
    </Card>
  );
}
