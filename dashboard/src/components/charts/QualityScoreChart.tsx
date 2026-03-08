'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface DataPoint {
  date: string;
  value: number;
}

interface QualityScoreChartProps {
  data: DataPoint[];
}

export default function QualityScoreChart({ data }: QualityScoreChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No data available
      </div>
    );
  }

  // Calculate average
  const average = data.length > 0
    ? Math.round(data.reduce((sum, d) => sum + d.value, 0) / data.length)
    : 0;

  return (
    <div>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="qualityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="date"
            stroke="#9CA3AF"
            fontSize={12}
            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          />
          <YAxis
            stroke="#9CA3AF"
            fontSize={12}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#F9FAFB' }}
            itemStyle={{ color: '#F9FAFB' }}
            labelFormatter={(value) => new Date(value).toLocaleDateString()}
            formatter={(value) => [`${value}%`, 'Quality Score']}
          />
          <ReferenceLine
            y={average}
            stroke="#F59E0B"
            strokeDasharray="5 5"
            label={{ value: `Avg: ${average}%`, fill: '#F59E0B', fontSize: 12 }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#10B981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#qualityGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-6 mt-4 text-sm">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 bg-red-500 rounded"></span>
          0-40: Poor
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 bg-yellow-500 rounded"></span>
          40-70: Fair
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 bg-green-500 rounded"></span>
          70-100: Good
        </span>
      </div>
    </div>
  );
}
