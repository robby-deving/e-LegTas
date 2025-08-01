import { Home } from "lucide-react";
import StatCard from "../StatCard";

interface RegisteredFamiliesCardProps {
  count: number;
}

export function RegisteredFamiliesCard({ count }: RegisteredFamiliesCardProps) {
  return (
    <StatCard
      title="Registered Families"
      value={count.toLocaleString()}
      icon={<Home className="w-5 h-5 text-blue-600 mr-2" />}
      valueClassName="text-blue-500"
    />
  );
}
