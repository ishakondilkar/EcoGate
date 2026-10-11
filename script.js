/* =========================
   EcoGate Simulation Script
   ========================= */

/* Global state */
let sensors = {
  occupancy: 0,
  temperature: 0,
  humidity: 0,
  light: 0,
  airQuality: 0,
  energy: 0,
  water: 0
};

let autoSimulation = false;
let autoInterval = null;
let demoInProgress = false;

/* Utility functions */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/* Sensor simulation */
function generateSensors() {
  sensors.occupancy = randomInt(0, 250);
  sensors.temperature = randomInt(18, 35);
  sensors.humidity = randomInt(30, 80);
  sensors.light = randomInt(0, 100);
  sensors.airQuality = randomInt(0, 100); // 0 = excellent, 100 = very poor
  // Energy: base + heating/cooling + lighting
  let base = 10; // base consumption in kW
  let hvac = 0;
  if (sensors.temperature > 28) hvac = 5;
  else if (sensors.temperature > 25) hvac = 3;
  let lighting = clamp(30 - sensors.light, 0, 30); // less light = more artificial
  sensors.energy = (base + hvac + lighting).toFixed(1);
  sensors.water = randomInt(50, 200); // liters per hour
}

/* UI update functions */
function updateSensorUI() {
  document.getElementById('occupancyValue').textContent = sensors.occupancy;
  document.getElementById('tempValue').textContent = sensors.temperature + '°C';
  document.getElementById('humidityValue').textContent = sensors.humidity + '%';
  document.getElementById('lightValue').textContent = sensors.light + '%';
  document.getElementById('airValue').textContent = sensors.airQuality;
  document.getElementById('energyValue').textContent = sensors.energy + ' kW';
  document.getElementById('waterValue').textContent = sensors.water + ' L';
}

/* Decision Engine */
function controlLighting() {
  let lightPercent;
  if (sensors.light > 70) lightPercent = 20;
  else if (sensors.light > 40) lightPercent = 50;
  else lightPercent = 100;
  // Adjust for occupancy: high occupancy → lower lights
  if (sensors.occupancy > 200) lightPercent = Math.max(10, lightPercent - 30);
  return lightPercent;
}

function controlHVAC() {
  if (sensors.temperature > 28 && sensors.occupancy > 100) return 'HIGH';
  if (sensors.temperature > 25) return 'MEDIUM';
  return 'LOW';
}

function controlVentilation() {
  return sensors.airQuality > 70 ? 'HIGH' : 'NORMAL';
}

function waterManagement() {
  return sensors.water > 150 ? 'HIGH' : 'OPTIMAL';
}

/* Recommendations */
function generateRecommendations() {
  const recs = [];

  // Lighting
  const lightLevel = controlLighting();
  if (lightLevel === 20) recs.push('Natural daylight is sufficient. Reduce artificial lighting to 20%.');
  if (lightLevel === 50) recs.push('Natural daylight moderate. Set artificial lighting to 50%.');
  if (lightLevel === 100) recs.push('Natural daylight low. Increase artificial lighting to 100%.');

  // HVAC
  const hvac = controlHVAC();
  if (hvac === 'HIGH') recs.push('High temperature & occupancy detected. Increase HVAC to HIGH.');
  if (hvac === 'MEDIUM') recs.push('Temperature moderate. Set HVAC to MEDIUM.');
  if (hvac === 'LOW') recs.push('Temperature comfortable. Keep HVAC at LOW.');

  // Ventilation
  if (controlVentilation() === 'HIGH')
    recs.push('Air quality poor. Increase ventilation to HIGH.');
  else
    recs.push('Air quality good. Ventilation at NORMAL.');

  // Water
  if (waterManagement() === 'HIGH')
    recs.push('High water usage detected. Consider conservation measures.');
  else
    recs.push('Water usage normal. Continue current practices.');

  // Energy
  if (sensors.energy > 20) recs.push('Energy consumption high. Review usage patterns.');
  else recs.push('Energy consumption within normal limits.');

  return recs;
}

/* Alerts */
function generateAlerts() {
  const alerts = [];
  if (sensors.occupancy > 200) alerts.push({msg: 'Passenger occupancy very high', level: 'critical'});
  if (sensors.temperature > 32) alerts.push({msg: 'Temperature very high', level: 'critical'});
  if (sensors.airQuality > 80) alerts.push({msg: 'Air quality poor', level: 'warning'});
  if (sensors.energy > 25) alerts.push({msg: 'Energy consumption high', level: 'warning'});
  if (sensors.water > 180) alerts.push({msg: 'Water usage high', level: 'warning'});
  return alerts;
}

/* Actuator UI */
function updateActuators() {
  const lightAct = controlLighting();
  const hvacAct = controlHVAC();
  const ventAct = controlVentilation();
  const waterAct = waterManagement();

  document.getElementById('lightAct').textContent = lightAct + '%';
  document.getElementById('lightActStatus').textContent = lightAct <= 30 ? 'ENERGY SAVING' : 'ACTIVE';

  document.getElementById('hvacAct').textContent = hvacAct;
  document.getElementById('hvacActStatus').textContent = 'ACTIVE';

  document.getElementById('ventAct').textContent = ventAct;
  document.getElementById('ventActStatus').textContent = 'ACTIVE';

  document.getElementById('waterAct').textContent = waterAct;
  document.getElementById('waterActStatus').textContent = 'NORMAL';
}

/* Eco Score */
let scoreChart;
function initScoreChart() {
  const ctx = document.getElementById('scoreChart').getContext('2d');
  scoreChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [0, 100],
        backgroundColor: ['#4caf50', '#e0e0e0'],
        borderWidth: 0
      }],
      labels: ['Score', 'Remaining']
    },
    options: {
      responsive: true,
      cutout: '70%',
      plugins: { legend: { display: false } }
    }
  });
}
function updateEcoScore() {
  // Simple weighted calculation
  const energyScore = clamp(100 - sensors.energy * 2, 0, 100);
  const lightingScore = clamp(100 - controlLighting(), 0, 100);
  const waterScore = clamp(100 - (sensors.water > 150 ? 30 : 0), 0, 100);
  const airScore = clamp(100 - sensors.airQuality, 0, 100);
  const comfortScore = clamp(100 - Math.abs(sensors.temperature - 22) * 5, 0, 100);

  const ecoScore = Math.round((energyScore + lightingScore + waterScore + airScore + comfortScore) / 5);
  document.getElementById('scoreLabel').textContent = `${ecoScore} / 100`;
  scoreChart.data.datasets[0].data = [ecoScore, 100 - ecoScore];
  scoreChart.update();
}

/* Energy Analytics */
let energyChart;
function initEnergyChart() {
  const ctx = document.getElementById('energyChart').getContext('2d');
  energyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Now'],
      datasets: [{
        label: 'Energy (kW)',
        data: [sensors.energy],
        borderColor: '#2196f3',
        backgroundColor: 'rgba(33,150,243,0.2)',
        fill: true
      }]
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true } }
    }
  });
}
function updateEnergyAnalytics() {
  document.getElementById('currentEnergy').textContent = sensors.energy + ' kW';
  const daily = (sensors.energy * 24).toFixed(1);
  document.getElementById('dailyEnergy').textContent = daily + ' kWh';
  const saved = (20 - sensors.energy).toFixed(1);
  document.getElementById('savedEnergy').textContent = saved > 0 ? saved + ' kWh' : '0 kWh';

  energyChart.data.labels.push('Now');
  energyChart.data.datasets[0].data.push(parseFloat(sensors.energy));
  if (energyChart.data.datasets[0].data.length > 10) {
    energyChart.data.labels.shift();
    energyChart.data.datasets[0].data.shift();
  }
  energyChart.update();
}

/* Gate Map interaction */
const gates = {
  'gateA1': { occupancy: 80, temperature: 24, light: 80, airQuality: 30 },
  'gateA2': { occupancy: 150, temperature: 27, light: 50, airQuality: 60 },
  'gateA3': { occupancy: 200, temperature: 30, light: 20, airQuality: 85 },
  'gateA4': { occupancy: 50, temperature: 22, light: 90, airQuality: 20 }
};

function initGateMap() {
  Object.keys(gates).forEach(id => {
    document.getElementById(id).addEventListener('click', () => {
      const g = gates[id];
      const info = `<h3>${id.toUpperCase()}</h3>
        <p>Passengers: ${g.occupancy}</p>
        <p>Temperature: ${g.temperature}°C</p>
        <p>Natural Light: ${g.light}%</p>
        <p>Air Quality: ${g.airQuality}</p>`;
      document.getElementById('gateDetails').innerHTML = info;
    });
  });
}

/* Demo Scenario */
function runDemo() {
  demoInProgress = true;
  let step = 0;
  const interval = setInterval(() => {
    if (step === 0) {
      sensors.occupancy = 40;
      sensors.temperature = 24;
      sensors.light = 80;
      sensors.airQuality = 30;
      sensors.water = 80;
    } else if (step === 1) {
      sensors.occupancy = 180;
      sensors.temperature = 30;
      sensors.light = 20;
      sensors.airQuality = 80;
      sensors.water = 170;
    } else {
      clearInterval(interval);
      demoInProgress = false;
      return;
    }
    updateAll();
    step++;
  }, 2000);
}

/* Main update routine */
function updateAll() {
  updateSensorUI();
  updateActuators();
  const recs = generateRecommendations();
  const recList = document.getElementById('recList');
  recList.innerHTML = recs.map(r => `<li>${r}</li>`).join('');
  const alerts = generateAlerts();
  const alertList = document.getElementById('alertList');
  alertList.innerHTML = alerts.map(a => `<li class="${a.level}">${a.msg}</li>`).join('');
  updateEcoScore();
  updateEnergyAnalytics();
}

/* Auto simulation */
function toggleAuto() {
  autoSimulation = !autoSimulation;
  const btn = document.getElementById('autoBtn');
  if (autoSimulation) {
    btn.textContent = 'Auto Simulation ON';
    autoInterval = setInterval(() => { generateSensors(); updateAll(); }, 3000);
  } else {
    btn.textContent = 'Auto Simulation OFF';
    clearInterval(autoInterval);
  }
}

/* Event listeners */
document.getElementById('simulateBtn').addEventListener('click', () => {
  if (demoInProgress) return;
  generateSensors(); updateAll();
});

document.getElementById('autoBtn').addEventListener('click', toggleAuto);
document.getElementById('demoBtn').addEventListener('click', () => {
  if (demoInProgress) return;
  runDemo();
});

/* Initialization on load */
window.addEventListener('load', () => {
  initScoreChart();
  initEnergyChart();
  initGateMap();
  generateSensors(); updateAll();
});
