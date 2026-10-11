```javascript
"use strict";

const gates = {
  A1: { passengers: 40, temperature: 24, humidity: 45, light: 80, air: 85, water: 18 },
  A2: { passengers: 132, temperature: 27.5, humidity: 55, light: 55, air: 62, water: 31 },
  A3: { passengers: 205, temperature: 30.5, humidity: 68, light: 25, air: 38, water: 52 },
  A4: { passengers: 12, temperature: 22, humidity: 40, light: 65, air: 90, water: 9 }
};

let selectedGate = "A1";
let autoSimulation = true;
let autoTimer = null;
let demoTimer = null;
let demoRunning = false;
let demoStep = 0;
let history = [];
let presentationStep = 0;

const $ = id => document.getElementById(id);
const current = () => gates[selectedGate];
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const round = (n, places = 1) => Number(n.toFixed(places));
const text = (id, value) => {
  if ($(id)) $(id).textContent = value;
};
const meter = (id, value) => {
  if ($(id)) $(id).style.width = clamp(value, 0, 100) + "%";
};

function decisions(d) {
  let lighting = d.light > 70 ? 20 : d.light >= 40 ? 50 : 100;
  if (d.passengers < 20) lighting = Math.min(lighting, 40);

  let hvac, hvacPercent, hvacReason;
  if (d.passengers < 20) {
    hvac = "LOW"; hvacPercent = 30; hvacReason = "Low occupancy: reduce HVAC demand.";
  } else if (d.temperature > 28 && d.passengers > 100) {
    hvac = "HIGH"; hvacPercent = 100; hvacReason = "High temperature and passenger occupancy.";
  } else if (d.temperature > 25) {
    hvac = "MEDIUM"; hvacPercent = 60; hvacReason = "Temperature is above the comfort target.";
  } else {
    hvac = "LOW"; hvacPercent = 30; hvacReason = "Temperature is within the target range.";
  }

  const ventilation = d.air < 40 ? 100 : 50;
  const water = d.water > 45 ? 100 : 50;

  return {
    lighting,
    lightingReason: d.light > 70
      ? "Daylight is sufficient; reduce artificial lighting."
      : d.light >= 40
        ? "Moderate daylight; use partial artificial lighting."
        : "Low daylight; increase artificial lighting.",
    hvac, hvacPercent, hvacReason,
    ventilation,
    ventilationReason: d.air < 40
      ? "Poor air-quality index; increase ventilation."
      : "Air-quality index is acceptable.",
    water,
    waterReason: d.water > 45
      ? "High water usage; inspect for possible wastage."
      : "Water consumption is within the configured limit."
  };
}

function calculateEnergy(d, x) {
  const base = 10;
  const light = 6 * x.lighting / 100;
  const hvac = x.hvac === "HIGH" ? 24 : x.hvac === "MEDIUM" ? 14 : 6;
  const ventilation = x.ventilation === 100 ? 8 : 3;
  return round(base + light + hvac + ventilation);
}

function calculateScore(d, x, energy) {
  const energyScore = clamp(100 - (energy / 50) * 100, 0, 100);
  const lightingScore = clamp(100 - Math.max(0, x.lighting - 20) * 0.8, 0, 100);
  const waterScore = clamp(100 - d.water / 70 * 100, 0, 100);
  const airScore = clamp(d.air, 0, 100);
  const temperatureScore = clamp(100 - Math.abs(d.temperature - 24) * 12, 0, 100);
  const occupancyScore = clamp(100 - Math.max(0, d.passengers - 150) / 100 * 100, 0, 100);
  const comfortScore = (temperatureScore + occupancyScore) / 2;

  return {
    energy: Math.round(energyScore),
    lighting: Math.round(lightingScore),
    water: Math.round(waterScore),
    air: Math.round(airScore),
    comfort: Math.round(comfortScore),
    total: Math.round(
      energyScore * 0.25 + lightingScore * 0.15 +
      waterScore * 0.15 + airScore * 0.20 + comfortScore * 0.25
    )
  };
}

function updateDashboard() {
  const d = current();
  const x = decisions(d);
  const energy = calculateEnergy(d, x);
  const score = calculateScore(d, x, energy);

  text("current-gate", selectedGate);
  text("passengers", Math.round(d.passengers));
  text("temperature", round(d.temperature) + " °C");
  text("humidity", Math.round(d.humidity) + "%");
  text("natural-light", Math.round(d.light) + "%");
  text("air-quality", Math.round(d.air) + " AQ");
  text("water", round(d.water) + " L/hr");
  text("energy", energy + " kW");

  text("lighting-decision", x.lighting + "%");
  text("lighting-reason", x.lightingReason);
  meter("lighting-decision-meter", x.lighting);

  text("hvac-decision", x.hvac);
  text("hvac-reason", x.hvacReason);
  meter("hvac-meter", x.hvacPercent);

  text("ventilation-decision", x.ventilation === 100 ? "HIGH" : "NORMAL");
  text("ventilation-reason", x.ventilationReason);
  meter("ventilation-meter", x.ventilation);

  text("water-decision", x.water === 100 ? "CHECK" : "NORMAL");
  text("water-reason", x.waterReason);
  meter("water-decision-meter", x.water);

  text("actuator-light-percent", x.lighting + "%");
  text("actuator-light-state", x.lighting <= 40 ? "ENERGY SAVING" : x.lighting < 100 ? "PARTIAL LIGHTING" : "FULL LIGHTING");
  meter("act-light-meter", x.lighting);

  text("actuator-hvac-percent", x.hvacPercent + "%");
  text("actuator-hvac-state", x.hvac + " COOLING");
  meter("act-hvac-meter", x.hvacPercent);

  text("actuator-ventilation-percent", x.ventilation + "%");
  text("actuator-ventilation-state", x.ventilation === 100 ? "HIGH VENTILATION" : "NORMAL VENTILATION");
  meter("act-vent-meter", x.ventilation);

  text("actuator-water-percent", x.water + "%");
  text("actuator-water-state", x.water === 100 ? "INSPECTION ADVISED" : "NORMAL MONITORING");
  meter("act-water-meter", x.water);

  text("eco-score", score.total);
  text("score-label", score.total >= 80 ? "EXCELLENT" : score.total >= 60 ? "GOOD" : score.total >= 40 ? "FAIR" : "NEEDS IMPROVEMENT");
  ["energy", "lighting", "water", "air", "comfort"].forEach(key => {
    text(key + "-score", score[key]);
    meter(key + "-meter", score[key]);
  });

  const ring = $("score-ring");
  if (ring) ring.style.background =
    `conic-gradient(var(--green) ${score.total * 3.6}deg, #203449 0deg)`;

  text("current-energy", energy + " kW");
  text("daily-energy", round(energy * 12) + " kWh");
  const baseline = 40;
  text("energy-saved", Math.round(clamp((baseline - energy) / baseline * 100, 0, 100)) + "%");

  updateRecommendations(d, x);
  updateAlerts(d);
  updateGateSummary();
  updateHistory(energy);
}

function updateRecommendations(d, x) {
  const list = $("recommendations-list");
  if (!list) return;

  const items = [];
  if (d.light > 70) items.push("Use available daylight to reduce artificial lighting.");
  if (d.passengers < 20) items.push("Low occupancy: use energy-saving lighting and HVAC settings.");
  if (d.passengers > 150) items.push("High passenger volume: monitor comfort and ventilation.");
  if (d.temperature > 28) items.push("High temperature: increase cooling as needed.");
  if (d.air < 40) items.push("Poor air-quality index: increase ventilation and investigate the source.");
  if (d.water > 45) items.push("High water usage: inspect washrooms and water fixtures.");
  if (!items.length) items.push("Conditions look stable. Continue monitoring resource consumption.");

  list.replaceChildren();
  items.forEach((item, i) => {
    const row = document.createElement("div");
    row.className = "recommendation-item";
    const number = document.createElement("span");
    number.className = "recommendation-number";
    number.textContent = i + 1;
    const message = document.createElement("span");
    message.textContent = item;
    row.append(number, message);
    list.appendChild(row);
  });
}

function updateAlerts(d) {
  const box = $("alert-stream");
  if (!box) return;

  const alerts = [];
  if (d.air < 40) alerts.push(["WARNING", "Poor air-quality index detected.", "danger"]);
  if (d.passengers > 180) alerts.push(["HIGH", "Very high passenger occupancy.", "danger"]);
  if (d.temperature > 30) alerts.push(["WARNING", "High temperature detected.", "danger"]);
  if (d.water > 45) alerts.push(["WATER", "Water consumption exceeds the configured threshold.", ""]);
  if (!alerts.length) alerts.push(["ALL CLEAR", "No critical alerts in the current simulation.", "ok"]);

  box.replaceChildren();
  alerts.forEach(([type, message, cls]) => {
    const row = document.createElement("div");
    row.className = "alert-item " + cls;
    const label = document.createElement("strong");
    label.textContent = type;
    const detail = document.createElement("span");
    detail.textContent = message;
    row.append(label, detail);
    box.appendChild(row);
  });
}

function updateGateSummary() {
  Object.keys(gates).forEach(gate => {
    const d = gates[gate];
    const x = decisions(d);
    const score = calculateScore(d, x, calculateEnergy(d, x)).total;
    text("gc-score-" + gate, score);
    text("status-" + gate, score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Needs improvement");

    const button = document.querySelector(`.gate-btn[data-gate="${gate}"]`);
    if (button) button.classList.toggle("active", gate === selectedGate);
  });
}

function updateHistory(energy) {
  history.push(energy);
  if (history.length > 12) history.shift();

  const chart = $("energy-chart");
  if (!chart) return;
  chart.replaceChildren();

  const max = Math.max(40, ...history);
  history.forEach((value, index) => {
    const bar = document.createElement("div");
    bar.className = "energy-bar";
    bar.style.height = Math.max(5, value / max * 100) + "%";
    bar.title = `Reading ${index + 1}: ${value} kW`;
    chart.appendChild(bar);
  });
  text("chart-range", `${history.length} recent readings`);
}

function selectGate(gate) {
  if (!gates[gate]) return;
  selectedGate = gate;
  updateDashboard();
}

function simulateChange() {
  const d = current();
  d.passengers = Math.round(clamp(d.passengers + (Math.random() * 60 - 30), 0, 250));
  d.temperature = round(clamp(d.temperature + (Math.random() * 3 - 1.5), 18, 35));
  d.humidity = Math.round(clamp(d.humidity + (Math.random() * 10 - 5), 30, 80));
  d.light = Math.round(clamp(d.light + (Math.random() * 30 - 15), 0, 100));
  d.air = Math.round(clamp(d.air + (Math.random() * 20 - 10), 0, 100));
  d.water = round(clamp(d.water + (Math.random() * 12 - 6), 5, 70));
  updateDashboard();
}

function startAuto() {
  stopAuto();
  autoTimer = setInterval(() => {
    if (!demoRunning) simulateChange();
  }, 4000);
}

function stopAuto() {
  if (autoTimer) clearInterval(autoTimer);
  autoTimer = null;
}

function setAuto(enabled) {
  autoSimulation = enabled;
  text("auto-status", enabled ? "ON · Every 4 seconds" : "PAUSED");
  text("auto-btn", enabled ? "Pause Simulation" : "Resume Simulation");
  if (enabled) startAuto();
  else stopAuto();
}

const demoSteps = [
  { passengers: 40, temperature: 24, humidity: 45, light: 80, air: 85, water: 18 },
  { passengers: 80, temperature: 25, humidity: 48, light: 65, air: 75, water: 24 },
  { passengers: 120, temperature: 27, humidity: 55, light: 45, air: 62, water: 32 },
  { passengers: 160, temperature: 29, humidity: 60, light: 30, air: 48, water: 43 },
  { passengers: 180, temperature: 30, humidity: 65, light: 20, air: 32, water: 52 }
];

function runDemo() {
  if (demoRunning) return;
  demoRunning = true;
  setAuto(false);
  selectGate("A1");
  demoStep = 0;

  function next() {
    if (demoStep >= demoSteps.length) {
      demoRunning = false;
      if (autoSimulation) startAuto();
      return;
    }
    gates.A1 = { ...demoSteps[demoStep] };
    selectedGate = "A1";
    updateDashboard();
    demoStep++;
    demoTimer = setTimeout(next, 3200);
  }
  next();
}

function exportCSV() {
  const d = current();
  const x = decisions(d);
  const energy = calculateEnergy(d, x);
  const score = calculateScore(d, x, energy);
  const rows = [
    ["Gate", "Passengers", "Temperature C", "Humidity %", "Natural Light %", "Air Index", "Water L/hr", "Estimated Energy kW", "Eco Score"],
    [selectedGate, d.passengers, d.temperature, d.humidity, d.light, d.air, d.water, energy, score.total]
  ];
  const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `EcoGate-${selectedGate}-readings.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const tour = [
  ["Live sensor monitoring", "EcoGate monitors simulated passenger occupancy, temperature, humidity, natural light, air quality and water usage."],
  ["Intelligent decision engine", "Rule-based logic estimates appropriate lighting, HVAC, ventilation and water-management settings."],
  ["Simulated actuators", "The dashboard displays virtual equipment states. No physical devices are being controlled."],
  ["Eco Score", "The illustrative score combines energy efficiency, lighting, water usage, air quality and passenger comfort."],
  ["Sustainable airport vision", "Future versions could connect real sensors, microcontrollers, MQTT and cloud services."]
];

function showTour() {
  const step = tour[presentationStep];
  text("tour-title", step[0]);
  text("tour-description", step[1]);
  text("tour-progress", `${presentationStep + 1} / ${tour.length}`);
}

function closeTour() {
  if ($("tour-bar")) $("tour-bar").classList.remove("active");
}

function init() {
  text("clock", new Date().toLocaleTimeString());
  setInterval(() => text("clock", new Date().toLocaleTimeString()), 1000);

  document.querySelectorAll(".gate-btn").forEach(button => {
    button.addEventListener("click", () => selectGate(button.dataset.gate));
  });

  $("simulate-btn").addEventListener("click", simulateChange);
  $("auto-btn").addEventListener("click", () => setAuto(!autoSimulation));
  $("demo-btn").addEventListener("click", runDemo);
  $("export-btn").addEventListener("click", exportCSV);

  $("presentation-btn").addEventListener("click", () => {
    presentationStep = 0;
    showTour();
    $("tour-bar").classList.add("active");
  });

  $("tour-next").addEventListener("click", () => {
    if (presentationStep < tour.length - 1) {
      presentationStep++;
      showTour();
    } else closeTour();
  });

  $("tour-prev").addEventListener("click", () => {
    if (presentationStep > 0) {
      presentationStep--;
      showTour();
    }
  });

  $("tour-exit").addEventListener("click", closeTour);

  document.addEventListener("keydown", event => {
    if (!$("tour-bar").classList.contains("active")) return;
    if (event.key === "Escape") closeTour();
    if (event.key === "ArrowRight") $("tour-next").click();
    if (event.key === "ArrowLeft") $("tour-prev").click();
  });

  updateDashboard();
  setAuto(true);
}

document.addEventListener("DOMContentLoaded", init);
```
