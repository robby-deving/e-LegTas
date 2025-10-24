import ReliefGoodsIcon from "@/assets/ReliefGoods.svg";
import StatCard from "../StatCard";

interface ReliefGoodsCardProps {
  count: number;
}

export function ReliefGoodsCard({ count }: ReliefGoodsCardProps) {
  return (
    <StatCard
      title="Families with Relief Goods"
      value={count.toLocaleString()}
      icon={
        <img
          src={ReliefGoodsIcon}
          alt="Families with Relief Goods"
          className="w-5 h-5 mr-2"
        />
      }
      valueClassName="text-red-500"
    />
  );
}