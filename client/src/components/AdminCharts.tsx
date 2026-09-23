import type { JSX } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import type { ChartData, ChartOptions } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import type { HospitalLocationCount, RatingCount, TrendPoint } from '../types/admin';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
);

const PRIMARY = '#0e7490';
const PALETTE = ['#0e7490', '#155e6b', '#22a5bb', '#7ccbdc', '#b8e3ec', '#64748b', '#94a3b8'];
const STATUS_COLORS = {
  pending: '#f59e0b',
  approved: '#15803d',
  rejected: '#dc2626',
  cancelled: '#94a3b8',
  completed: '#1d4ed8',
};

function formatDay(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

const CHART_HEIGHT = 240;

export function PatientRegistrationsChart({ data }: { data: TrendPoint[] }): JSX.Element {
  const chartData: ChartData<'line'> = {
    labels: data.map((p) => formatDay(p.date)),
    datasets: [
      {
        label: 'New patient registrations',
        data: data.map((p) => p.count),
        borderColor: PRIMARY,
        backgroundColor: 'rgba(14, 116, 144, 0.15)',
        fill: true,
        tension: 0.3,
      },
    ],
  };
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0 } },
      x: { ticks: { maxRotation: 45, autoSkip: true, maxTicksLimit: 7 } },
    },
  };
  return <Line data={chartData} options={options} height={CHART_HEIGHT} />;
}

export function AppointmentsTrendChart({ data }: { data: TrendPoint[] }): JSX.Element {
  const chartData: ChartData<'bar'> = {
    labels: data.map((p) => formatDay(p.date)),
    datasets: [
      {
        label: 'Appointments booked',
        data: data.map((p) => p.count),
        backgroundColor: PRIMARY,
        borderRadius: 4,
      },
    ],
  };
  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0 } },
      x: { ticks: { maxRotation: 45, autoSkip: true, maxTicksLimit: 7 } },
    },
  };
  return <Bar data={chartData} options={options} height={CHART_HEIGHT} />;
}

export function AppointmentStatusChart({ counts }: { counts: Record<string, number> }): JSX.Element {
  const labels = ['Pending', 'Approved', 'Rejected', 'Cancelled', 'Completed'];
  const chartData: ChartData<'doughnut'> = {
    labels,
    datasets: [
      {
        data: labels.map((label) => counts[label.toLowerCase()] ?? 0),
        backgroundColor: [
          STATUS_COLORS.pending,
          STATUS_COLORS.approved,
          STATUS_COLORS.rejected,
          STATUS_COLORS.cancelled,
          STATUS_COLORS.completed,
        ],
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  };
  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
  };
  return <Doughnut data={chartData} options={options} height={CHART_HEIGHT} />;
}

export function FeedbackRatingChart({ data }: { data: RatingCount[] }): JSX.Element {
  const counts = new Map(data.map((r) => [r.rating, r.count]));
  const labels = [1, 2, 3, 4, 5];
  const chartData: ChartData<'bar'> = {
    labels: labels.map((n) => `${n} star${n === 1 ? '' : 's'}`),
    datasets: [
      {
        label: 'Feedback count',
        data: labels.map((n) => counts.get(n) ?? 0),
        backgroundColor: '#f59e0b',
        borderRadius: 4,
      },
    ],
  };
  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0 } },
    },
  };
  return <Bar data={chartData} options={options} height={CHART_HEIGHT} />;
}

export function HospitalsByLocationChart({ data }: { data: HospitalLocationCount[] }): JSX.Element {
  const sorted = [...data].sort((a, b) => a.count - b.count);
  const chartData: ChartData<'bar'> = {
    labels: sorted.map((h) => h.label),
    datasets: [
      {
        label: 'Hospitals',
        data: sorted.map((h) => h.count),
        backgroundColor: sorted.map((_, i) => PALETTE[i % PALETTE.length]),
        borderRadius: 4,
      },
    ],
  };
  const options: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { beginAtZero: true, ticks: { precision: 0 } },
    },
  };
  return <Bar data={chartData} options={options} height={CHART_HEIGHT} />;
}
