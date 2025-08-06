import * as Recharts from 'recharts';
import React from 'react';

interface EvacueeStatisticsChartProps {
  data: { label: string; value: number }[];
  height?: number;
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
  if (!active || !payload || !payload.length) return null;
  const { value } = payload[0];
  return (
    <div className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-1.5 shadow border border-gray-200">
      <span className="text-gray-700 text-sm font-medium">{payload[0].payload.label}</span>
      <span className="ml-4 text-black text-sm font-bold">{Number(value).toLocaleString()}</span>
    </div>
  );
};

const EvacueeStatisticsChart: React.FC<EvacueeStatisticsChartProps> = ({ data, height = 275 }) => (
  <Recharts.ResponsiveContainer width="100%" height={height}>
    <Recharts.BarChart
      data={data}
      layout="vertical"
      margin={{ left: 0, right: 10, top: 0, bottom: 0 }}
      barCategoryGap={9}
    >
      <Recharts.YAxis
        dataKey="label"
        type="category"
        tickLine={false}
        axisLine={false}
        width={150}
        tick={{ fontSize: 14, fill: "#888888" }}
      />
      <Recharts.XAxis type="number" hide />
      <Recharts.Tooltip content={<CustomTooltip />} cursor={false} />
      <Recharts.Bar dataKey="value" fill="#16a34a" radius={8} />
    </Recharts.BarChart>
  </Recharts.ResponsiveContainer>
);

export default EvacueeStatisticsChart; 