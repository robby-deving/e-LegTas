import activeECIcon from "@/assets/activeEC.svg";
import StatCard from "../StatCard";

interface ECCapacityCardProps {
  count: number;
}

export function ECCapacityCard({ count }: ECCapacityCardProps) {
  return (
    <StatCard
      title="EC Capacity"
      value={count.toLocaleString()}
      icon={
        <img
          src={activeECIcon}
          alt="EC Capacity"
          className="w-5 h-5 mr-2"
        />
      }
      valueClassName="text-yellow-500"
    />
  );
}