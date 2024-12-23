import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

interface DonutChartProps {
  completedCount: number | null;
  totalCount: number;
}

const DonutChart = ({ completedCount, totalCount }: DonutChartProps) => {
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
    <div
      className="flex flex-col items-center justify-center"
      style={{
        width: "150px",
        height: "150px", // Ensure all divs have the same size
      }}
    >
      <div style={{ width: "100px", height: "100px" }}>
        <Doughnut data={data} options={options} />
      </div>
      <div
        className="text-lg font-semibold mt-2"
        style={{
          color: "#00000f", // Consistent text color
          textAlign: "center", // Center align text
        }}
      >
        {safeCompletedCount > 0 ? `${safeCompletedCount} Requests` : "No Data"}
      </div>
    </div>
  );
};

export default DonutChart;
