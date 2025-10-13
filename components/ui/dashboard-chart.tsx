"use client"

import * as React from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export interface ChartData {
  name: string
  value: number
  [key: string]: unknown
}

interface DashboardChartProps {
  title: string
  data: ChartData[]
  type: "bar" | "donut" | "line"
  className?: string
  dataKey?: string
  xAxisDataKey?: string
  xAxisLabel?: string
  yAxisLabel?: string
  description?: string
}

const CHART_COLORS = [
  "var(--primary)",
  "var(--secondary)",
  "var(--accent)",
  "var(--action-edit)",
  "var(--action-info)",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7300"
]

export function DashboardChart({
  title,
  data,
  type,
  className,
  dataKey = "value",
  xAxisDataKey = "name",
  xAxisLabel,
  yAxisLabel,
  description
}: DashboardChartProps) {
  // Function to get color based on data item name
  const getBarColor = (entry: ChartData, index: number) => {
    if (entry.name === "At Risk") {
      return "var(--destructive)" // Red color for "At Risk"
    }
    if (entry.name === "On Track") {
      return "var(--primary)" // Green color for "On Track"
    }
    return CHART_COLORS[index % CHART_COLORS.length]
  }

  const renderChart = () => {
    switch (type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey={xAxisDataKey}
                stroke="var(--muted-foreground)"
                fontSize={12}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={12}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: "var(--popover-foreground)"
                }}
              />
              <Bar
                dataKey={dataKey}
                radius={[4, 4, 0, 0]}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry, index)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )

      case "donut":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey={dataKey}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: "var(--popover-foreground)"
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )

      case "line":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey={xAxisDataKey}
                stroke="var(--muted-foreground)"
                fontSize={12}
                label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5 } : undefined}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={12}
                label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'outside', textAnchor: 'middle', offset: -20 } : undefined}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: "var(--popover-foreground)"
                }}
              />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke="var(--primary)"
                strokeWidth={2}
                dot={{ fill: "var(--primary)", strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )

      default:
        return null
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          {description && (
            <div className="relative group">
              <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-muted-foreground cursor-help">
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 16v-4"/>
                  <path d="M12 8h.01"/>
                </svg>
              </div>
              <div className="absolute right-0 top-6 w-64 p-2 bg-popover border border-border rounded-md shadow-lg text-sm text-popover-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                {description}
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {renderChart()}
      </CardContent>
    </Card>
  )
}
