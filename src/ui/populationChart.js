export function createPopulationHumansChart() {
  const ctx = document.getElementById("popChartHumans");

  const dataHumans = {
    labels: [],
    datasets: [{
      label: "Humains",
      data: [],
      tension: 0.25,
      borderColor: "rgb(215, 152, 152)",      
      backgroundColor: "rgba(215, 152, 152, 0.32)",
      pointRadius: 0,
      borderWidth: 2,
      fill: true
    }]
  };

  const chartHumans = new Chart(ctx, {
    type: "line",
    data: dataHumans,
    options: {
      responsive: true,
      animation: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: "Humans",
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
      dataHumans.labels.push(t);
      dataHumans.datasets[0].data.push(pop);
      chartHumans.update("none");
    },
    keepLast(maxPoints) {
      const extra = dataHumans.labels.length - maxPoints;
      if (extra > 0) {
        dataHumans.labels.splice(0, extra);
        dataHumans.datasets[0].data.splice(0, extra);
      }
    }
  };
}


export function createPopulationPigsChart() {
  const ctx = document.getElementById("popChartPigs");

  const dataPigs = {
    labels: [],
    datasets: [{
      label: "Cochons",
      data: [],
      tension: 0.25,
      borderColor: "rgb(255, 0, 136)",      
      backgroundColor: "rgba(255, 0, 136, 0.25)",
      pointRadius: 0,
      borderWidth: 2,
      fill: true
    }]
  };

  const chartPigs = new Chart(ctx, {
    type: "line",
    data: dataPigs,
    options: {
      responsive: true,
      animation: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: "Pigs",
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
      dataPigs.labels.push(t);
      dataPigs.datasets[0].data.push(pop);
      chartPigs.update("none");
    },
    keepLast(maxPoints) {
      const extra = dataPigs.labels.length - maxPoints;
      if (extra > 0) {
        dataPigs.labels.splice(0, extra);
        dataPigs.datasets[0].data.splice(0, extra);
      }
    }
  };
}