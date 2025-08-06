import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  valueClassName?: string;
  onClick?: () => void;
  cardClassName?: string;
  iconClassName?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  valueClassName = "",
  onClick,
  cardClassName = "cursor-pointer",
  iconClassName = "ml-auto",
}) => (
  <Card className={cardClassName} onClick={onClick}>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-base font-medium">
        {title}
        {icon && <span className={iconClassName}>{icon}</span>}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <span className={`text-2xl font-bold ${valueClassName}`}>{value}</span>
    </CardContent>
  </Card>
);

export default StatCard;
