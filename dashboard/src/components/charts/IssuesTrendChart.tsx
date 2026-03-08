'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface DataPoint {
  date: string;
  errors: number;
  warnings: number;
}

interface IssuesTrendChartProps {
  data: DataPoint[];
}

export default function IssuesTrendChart({ data }: IssuesTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="date"
          stroke="#9CA3AF"
          fontSize={12}
          tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
        <Legend />
        <Line
          type="monotone"
          dataKey="errors"
          stroke="#EF4444"
          strokeWidth={2}
          dot={{ fill: '#EF4444', r: 4 }}
          activeDot={{ r: 6 }}
          name="Errors"
        />
        <Line
          type="monotone"
          dataKey="warnings"
          stroke="#F59E0B"
          strokeWidth={2}
          dot={{ fill: '#F59E0B', r: 4 }}
          activeDot={{ r: 6 }}
          name="Warnings"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
