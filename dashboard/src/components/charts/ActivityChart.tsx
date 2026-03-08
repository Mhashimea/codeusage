'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DataPoint {
  date: string;
  reports: number;
  filesChanged: number;
}

interface ActivityChartProps {
  data: DataPoint[];
}

export default function ActivityChart({ data }: ActivityChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No activity data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="date"
          stroke="#9CA3AF"
          fontSize={12}
          tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'short' })}
        />
        <YAxis stroke="#9CA3AF" fontSize={12} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1F2937',
            border: '1px solid #374151',
            borderRadius: '8px',
          }}
          labelStyle={{ color: '#F9FAFB' }}
          itemStyle={{ color: '#F9FAFB' }}
          labelFormatter={(value) => new Date(value).toLocaleDateString()}
        />
        <Bar dataKey="reports" fill="#F97316" name="Reports" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
