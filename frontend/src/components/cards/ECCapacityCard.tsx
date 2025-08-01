import { LayoutGrid } from "lucide-react";
import StatCard from "../StatCard";

interface ECCapacityCardProps {
  count: number;
}

export function ECCapacityCard({ count }: ECCapacityCardProps) {
  return (
    <StatCard
      title="EC Capacity"
      value={count.toLocaleString()}
      icon={<LayoutGrid className="w-5 h-5 text-yellow-500 mr-2" />}
      valueClassName="text-yellow-500"
    />
  );
}
