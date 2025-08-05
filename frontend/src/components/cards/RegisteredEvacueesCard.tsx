import registeredEvacueesIcon from "@/assets/registeredEvacuees.svg";
import StatCard from "../StatCard";

interface RegisteredEvacueesCardProps {
  count: number;
}

export function RegisteredEvacueesCard({ count }: RegisteredEvacueesCardProps) {
  return (
    <StatCard
      title="Registered Evacuees"
      value={count.toLocaleString()}
      icon={
        <img
          src={registeredEvacueesIcon}
          alt="Registered Evacuees"
          className="w-5 h-5 mr-2"
        />
      }
      valueClassName="text-green-600"
    />
  );
}
