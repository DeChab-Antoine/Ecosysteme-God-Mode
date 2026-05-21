export function createPopulationAliensChart() {
  const ctx = document.getElementById("popChartAliens");

  const dataAliens = {
    labels: [],
    datasets: [{
      label: "Aliens",
      data: [],
      tension: 0.25,
      borderColor: "rgb(215, 152, 152)",      
      backgroundColor: "rgba(215, 152, 152, 0.32)",
      pointRadius: 0,
      borderWidth: 2,
      fill: true
    }]
  };

  const chartAliens = new Chart(ctx, {
    type: "line",
    data: dataAliens,
    options: {
      responsive: true,
      animation: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: "Aliens",
          padding: { top: 6, bottom: 6 }
        }
      },
      scales: {
        x: { display: true, title: { display: true, text: "Days" } },
        y: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true} }
      }
    }
  });

  return {
    pushPoint(t, pop) {
      dataAliens.labels.push(t);
      dataAliens.datasets[0].data.push(pop);
      chartAliens.update("none");
    },
    keepLast(maxPoints) {
      const extra = dataAliens.labels.length - maxPoints;
      if (extra > 0) {
        dataAliens.labels.splice(0, extra);
        dataAliens.datasets[0].data.splice(0, extra);
      }
    }
  };
}


export function createPopulationBlobsChart() {
  const ctx = document.getElementById("popChartBlobs");

  const dataBlobs = {
    labels: [],
    datasets: [{
      label: "Blobs",
      data: [],
      tension: 0.25,
      borderColor: "rgb(255, 0, 136)",      
      backgroundColor: "rgba(255, 0, 136, 0.25)",
      pointRadius: 0,
      borderWidth: 2,
      fill: true
    }]
  };

  const chartBlobs = new Chart(ctx, {
    type: "line",
    data: dataBlobs,
    options: {
      responsive: true,
      animation: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: "Blobs",
          padding: { top: 6, bottom: 6 }
        }
      },
      scales: {
        x: { display: true, title: { display: true, text: "Days" } },
        y: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true} }
      }
    }
  });

  return {
    pushPoint(t, pop) {
      dataBlobs.labels.push(t);
      dataBlobs.datasets[0].data.push(pop);
      chartBlobs.update("none");
    },
    keepLast(maxPoints) {
      const extra = dataBlobs.labels.length - maxPoints;
      if (extra > 0) {
        dataBlobs.labels.splice(0, extra);
        dataBlobs.datasets[0].data.splice(0, extra);
      }
    }
  };
}
