export function createPopulationChart() {
  const ctx = document.getElementById("popChart");
  const data = {
    labels: [],
    datasets: [{ label: "Humains", data: [], tension: 0.25 }]
  };

  const chart = new Chart(ctx, {
    type: "line",
    data,
    options: {
      responsive: true,
      animation: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { display: true },
        y: { beginAtZero: true, ticks: { precision: 0 } }
      }
    }
  });

  return {
    pushPoint(t, pop) {
      data.labels.push(t);
      data.datasets[0].data.push(pop);
      chart.update("none");
    },
    keepLast(maxPoints) {
      const extra = data.labels.length - maxPoints;
      if (extra > 0) {
        data.labels.splice(0, extra);
        data.datasets[0].data.splice(0, extra);
      }
    }
  };
}