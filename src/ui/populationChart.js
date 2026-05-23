export function createPopulationChart() {
  const ctx = document.getElementById("popChart");
  if (!ctx) return { pushPoint() {}, keepLast() {} };

  const data = {
    labels: [],
    datasets: [
      {
        label: "Aliens",
        data: [],
        tension: 0.3,
        borderColor: "rgb(200, 112, 240)",
        backgroundColor: "rgba(200, 112, 240, 0.12)",
        pointRadius: 0,
        borderWidth: 1.5,
        fill: false,
      },
      {
        label: "Blobs",
        data: [],
        tension: 0.3,
        borderColor: "rgb(255, 70, 155)",
        backgroundColor: "rgba(255, 70, 155, 0.10)",
        pointRadius: 0,
        borderWidth: 1.5,
        fill: false,
      },
      {
        label: "Mutants",
        data: [],
        tension: 0.3,
        borderColor: "rgb(255, 110, 40)",
        backgroundColor: "rgba(255, 110, 40, 0.10)",
        pointRadius: 0,
        borderWidth: 1.5,
        fill: false,
      },
    ],
  };

  const chart = new Chart(ctx, {
    type: "line",
    data,
    options: {
      responsive: true,
      animation: false,
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: {
            color: "#6070a8",
            font: { size: 9 },
            boxWidth: 10,
            padding: 6,
          },
        },
        title: { display: false },
      },
      scales: {
        x: { display: false },
        y: {
          beginAtZero: true,
          ticks: { precision: 0, color: "#4858a0", font: { size: 9 }, maxTicksLimit: 4 },
          grid: { color: "rgba(80, 100, 180, 0.08)" },
        },
      },
    },
  });

  return {
    pushPoint(tick, nAliens, nBlobs, nAliens2 = 0) {
      data.labels.push(tick);
      data.datasets[0].data.push(nAliens);
      data.datasets[1].data.push(nBlobs);
      data.datasets[2].data.push(nAliens2);
      chart.update("none");
    },
    keepLast(maxPoints) {
      const extra = data.labels.length - maxPoints;
      if (extra > 0) {
        data.labels.splice(0, extra);
        for (const ds of data.datasets) ds.data.splice(0, extra);
      }
    },
  };
}
