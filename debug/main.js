const socket = io();
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 0 },
  hover: { animationDuration: 0 },
  responsiveAnimationDuration: 0,
  elements: { line: { tension: 0 } },
  scales: { y: { beginAtZero: true } },
};

const actionButtons = [...document.querySelectorAll('[data-action]')];

const leftMotorChart = createMotorTicksChart(document.getElementById('leftMotorChart').getContext('2d'), chartOptions);
const rightMotorChart = createMotorTicksChart(document.getElementById('rightMotorChart').getContext('2d'), chartOptions);
const leftMotorPWMChart = createMotorPWMChart(document.getElementById('leftMotorPWMChart').getContext('2d'), chartOptions);
const rightMotorPWMChart = createMotorPWMChart(document.getElementById('rightMotorPWMChart').getContext('2d'), chartOptions);

let loopTimeCounter = 0;

function init() {
  socket.on('debug', ({ loopTime, left, right }) => {
    loopTimeCounter++;

    if (left.speedTicksInput !== 0) {
      addData(leftMotorChart, loopTimeCounter * loopTime, [left.speedSetpoint, left.speedTicksInput]);
      addData(leftMotorPWMChart, loopTimeCounter * loopTime, [left.speedPwmOutput]);

      if (loopTimeCounter % 5 === 0) {
        leftMotorChart.update();
        leftMotorPWMChart.update();
      }
    }

    if (right.speedTicksInput !== 0) {
      addData(rightMotorChart, loopTimeCounter * loopTime, [right.speedSetpoint, right.speedTicksInput]);
      addData(rightMotorPWMChart, loopTimeCounter * loopTime, [right.speedPwmOutput]);

      if (loopTimeCounter % 5 === 0) {
        rightMotorChart.update();
        rightMotorPWMChart.update();
      }
    }
  });

  actionButtons.forEach(button => {
    button.addEventListener('click', onActionButtonClick);
  });
}

function createMotorTicksChart(context, options) {
  return new Chart(context, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Setpoint',
          data: [],
          borderColor: ['red'],
          borderWidth: 1,
        },
        {
          label: 'Actual',
          data: [],
          borderColor: ['blue'],
          borderWidth: 1,
        },
      ],
    },
    options,
  });
}

function createMotorPWMChart(context, options) {
  return new Chart(context, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'PWM Output',
          data: [],
          borderColor: ['green'],
          borderWidth: 1,
        },
      ],
    },
    options,
  });
}

function onActionButtonClick(event) {
  const method = event.target.dataset.method;
  let params = [];

  switch (method) {
    case 'distanceCalibrationTest':
      params = [
        document.getElementById('calibrationDistance').value,
      ];
      break;

    case 'distanceHeading':
      params = [
        document.getElementById('distance').value,
        document.getElementById('heading').value,
      ];
      break;

    case 'rotate':
      const angleDegrees = document.getElementById('angle').value;
      const direction = document.getElementById('direction').checked ? -1 : 1;
      const angle = direction * ((angleDegrees * Math.PI) / 180);

      params = [angle];
      break;
  }

  resetCharts();
  socket.emit('action', { method, params });
}

function resetCharts() {
  loopTimeCounter = 0;
  resetChart(leftMotorChart);
  resetChart(rightMotorChart);
  resetChart(leftMotorPWMChart);
  resetChart(rightMotorPWMChart);
}

function resetChart(chart) {
  chart.data.labels = [];
  chart.data.datasets[0].data = [];

  if (chart.data.datasets[1]) {
    chart.data.datasets[1].data = [];
  }

  chart.update();
}

function addData(chart, label, data) {
  if (data[0]) {
    chart.data.labels.push(label);
    chart.data.datasets[0].data.push(data[0]);

    if (data[1]) {
      chart.data.datasets[1].data.push(data[1]);
    }
  }
}

init();