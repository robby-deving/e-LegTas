import { Users } from "lucide-react";
import StatCard from "../StatCard";

interface RegisteredEvacueesCardProps {
  count: number;
}

export function RegisteredEvacueesCard({ count }: RegisteredEvacueesCardProps) {
  return (
    <StatCard
      title="Registered Evacuees"
      value={count.toLocaleString()}
      icon={<Users className="w-5 h-5 text-green-700 mr-2" />}
      valueClassName="text-green-600"
    />
  );
}
