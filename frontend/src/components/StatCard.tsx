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
  cardClassName = "",
  iconClassName = "ml-auto",
}) => (
  <Card className={`${cardClassName} flex-1`} onClick={onClick}>
    <CardHeader className="flex-grow">
      <CardTitle className="flex items-start gap-2 text-base font-medium">
        {title}
        {icon && <span className={`${iconClassName} inline-flex items-center justify-center w-6 h-6 flex-shrink-0`}>{icon}</span>}
      </CardTitle>
    </CardHeader>
    <CardContent className="mt-auto">
      <span className={`text-2xl font-bold ${valueClassName}`}>{value}</span>
    </CardContent>
  </Card>
);

export default StatCard;
