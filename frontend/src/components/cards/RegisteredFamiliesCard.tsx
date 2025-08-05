import registeredFamiliesIcon from "@/assets/registeredFamilies.svg";
import StatCard from "../StatCard";

interface RegisteredFamiliesCardProps {
  count: number;
}

export function RegisteredFamiliesCard({ count }: RegisteredFamiliesCardProps) {
  return (
    <StatCard
      title="Registered Families"
      value={count.toLocaleString()}
      icon={
        <img
          src={registeredFamiliesIcon}
          alt="Registered Families"
          className="w-5 h-5 mr-2"
        />
      }
      valueClassName="text-blue-500"
    />
  );
}
