import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

interface DonutChartProps {
  completedCount: number | null;
  totalCount: number;
  label?: string;
}

const DonutChart = ({ completedCount, totalCount, label = "Requests" }: DonutChartProps) => {
  // Handle null or 0 values
  const safeCompletedCount = completedCount ?? 0; // Default to 0 if null
  const remainingCount = totalCount - safeCompletedCount;

  const data = {
    labels: ["Completed", "Remaining"],
    datasets: [
      {
        data: safeCompletedCount > 0 ? [safeCompletedCount, remainingCount] : [0, 100], // Ensure visible border when null or 0
        backgroundColor: safeCompletedCount > 0 ? ["#face39", "#f5f5f5"] : ["#f5f5f5", "#f5f5f5"], // Border-only style when null
        borderColor: ["#face39", "#f5f5f5"],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
      },
    },
    maintainAspectRatio: false,
    cutout: "70%",
  };

  return (
    <div className="flex flex-col items-center justify-center w-[150px] h-[150px]">
      <div className="w-[100px] h-[100px]">
        <Doughnut data={data} options={options} />
      </div>
      <div className="text-lg font-semibold mt-2 text-[#00000f] text-center">
        {safeCompletedCount > 0 ? `${safeCompletedCount} ${label}` : "No Data"}
      </div>
    </div>
  );
};

export default DonutChart;
