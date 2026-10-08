/* =========================================================
   EcoGate - Smart Sustainable Airport Gate Management
   Pure Vanilla JavaScript
   Software-based IoT Simulation
   ========================================================= */

"use strict";

/* =========================================================
   1. GATE SENSOR DATA
   ========================================================= */

const gateData = {
  A1: {
    occupancy: 40,
    temperature: 24,
    humidity: 45,
    light: 80,
    airQuality: 85,
    water: 18
  },

  A2: {
    occupancy: 132,
    temperature: 27.5,
    humidity: 55,
    light: 55,
    airQuality: 62,
    water: 31
  },

  A3: {
    occupancy: 205,
    temperature: 30.5,
    humidity: 68,
    light: 25,
    airQuality: 38,
    water: 52
  },

  A4: {
    occupancy: 12,
    temperature: 22,
    humidity: 40,
    light: 65,
    airQuality: 90,
    water: 9
  }
};


/* =========================================================
   2. APPLICATION STATE
   ========================================================= */

let selectedGate = "A1";
let autoSimulation = true;
let autoTimer = null;

let energyHistory = [];
let alertHistory = [];

let demoRunning = false;
let demoTimer = null;

const MAX_ENERGY_HISTORY = 12;


/* =========================================================
   3. HELPER FUNCTIONS
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
  return Math.floor(randomBetween(min, max + 1));
}

function round(value, decimals = 1) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function setText(id, value) {
  const element = $(id);

  if (element) {
    element.textContent = value;
  }
}


/* =========================================================
   4. CLOCK
   ========================================================= */

function updateClock() {
  const clock = $("clock");

  if (!clock) return;

  const now = new Date();

  clock.textContent = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

setInterval(updateClock, 1000);
updateClock();


/* =========================================================
   5. SENSOR DISPLAY
   ========================================================= */

function updateSensorDisplay(data) {

  setText("val-occupancy", `${Math.round(data.occupancy)} pax`);
  setText("val-temperature", `${round(data.temperature, 1)} °C`);
  setText("val-humidity", `${Math.round(data.humidity)} %`);
  setText("val-light", `${Math.round(data.light)} %`);
  setText("val-airQuality", `${Math.round(data.airQuality)}`);
  setText("val-water", `${round(data.water, 1)} L/hr`);

  /*
   * Sensor meters
   */

  updateMeter("meter-occupancy", data.occupancy / 250 * 100);
  updateMeter("meter-temperature", ((data.temperature - 18) / 17) * 100);
  updateMeter("meter-humidity", data.humidity);
  updateMeter("meter-light", data.light);
  updateMeter("meter-airQuality", data.airQuality);
  updateMeter("meter-water", (data.water / 70) * 100);
}

function updateMeter(id, percentage) {

  const meter = $(id);

  if (!meter) return;

  const value = clamp(percentage, 0, 100);

  meter.style.width = `${value}%`;
}


/* =========================================================
   6. DECISION ENGINE
   ========================================================= */

function calculateDecisions(data) {

  /* -----------------------------
     Lighting
     ----------------------------- */

  let lightingLevel;
  let lightingReason;

  if (data.light > 70) {
    lightingLevel = 20;
    lightingReason = "High natural daylight detected — dim artificial lighting.";
  } else if (data.light >= 40) {
    lightingLevel = 50;
    lightingReason = "Moderate daylight available — maintain balanced lighting.";
  } else {
    lightingLevel = 100;
    lightingReason = "Low natural light — increase artificial lighting.";
  }

  /*
   * Very low occupancy limits lighting.
   */

  if (data.occupancy < 20) {
    lightingLevel = Math.min(lightingLevel, 40);
    lightingReason = "Low occupancy detected — lighting capped for energy saving.";
  }


  /* -----------------------------
     HVAC
     ----------------------------- */

  let hvacMode;
  let hvacReason;

  if (data.occupancy < 20) {

    hvacMode = "LOW";
    hvacReason = "Low occupancy — HVAC reduced.";

  } else if (data.temperature > 28 && data.occupancy > 100) {

    hvacMode = "HIGH";
    hvacReason = "High temperature and high occupancy — HVAC increased.";

  } else if (data.temperature > 25) {

    hvacMode = "MEDIUM";
    hvacReason = "Temperature above comfort range — moderate HVAC.";

  } else {

    hvacMode = "LOW";
    hvacReason = "Comfortable temperature — HVAC kept low.";
  }


  /* -----------------------------
     Ventilation
     ----------------------------- */

  let ventilationMode;
  let ventilationReason;

  if (data.airQuality < 40) {

    ventilationMode = "HIGH";
    ventilationReason =
      "Poor air quality detected — ventilation increased immediately.";

  } else {

    ventilationMode = "NORMAL";
    ventilationReason =
      "Air quality within acceptable range — normal ventilation.";
  }


  /* -----------------------------
     Water
     ----------------------------- */

  let waterLevel;
  let waterReason;

  if (data.water > 45) {

    waterLevel = "ALERT";
    waterReason =
      "High water consumption detected — inspect usage and reduce wastage.";

  } else if (data.water > 30) {

    waterLevel = "MEDIUM";
    waterReason =
      "Moderate water consumption — monitor usage.";

  } else {

    waterLevel = "LOW";
    waterReason =
      "Water consumption is efficient.";
  }


  return {
    lightingLevel,
    lightingReason,

    hvacMode,
    hvacReason,

    ventilationMode,
    ventilationReason,

    waterLevel,
    waterReason
  };
}


/* =========================================================
   7. ENERGY CALCULATION
   ========================================================= */

function calculateEnergy(data, decisions) {

  /*
   * Emergent specification:
   *
   * Base = 10 kW
   * Lighting <= 6 kW
   * HVAC = 6 / 14 / 24 kW
   * Ventilation = 3 / 8 kW
   */

  const baseEnergy = 10;

  const lightingEnergy =
    (decisions.lightingLevel / 100) * 6;

  let hvacEnergy = 6;

  if (decisions.hvacMode === "MEDIUM") {
    hvacEnergy = 14;
  }

  if (decisions.hvacMode === "HIGH") {
    hvacEnergy = 24;
  }

  let ventilationEnergy = 3;

  if (decisions.ventilationMode === "HIGH") {
    ventilationEnergy = 8;
  }

  const occupancyEnergy =
    clamp(data.occupancy / 250, 0, 1) * 3;

  const total =
    baseEnergy +
    lightingEnergy +
    hvacEnergy +
    ventilationEnergy +
    occupancyEnergy;

  return round(total, 1);
}


/* =========================================================
   8. ECO SCORE
   ========================================================= */

function calculateEcoScore(data, decisions, energy) {

  /*
   * Emergent specification:
   *
   * Energy      = 25%
   * Lighting    = 15%
   * Water       = 15%
   * Air         = 20%
   * Comfort     = 25%
   */

  /* Energy score */

  const energyScore = clamp(
    100 - ((energy - 10) / 45) * 100,
    0,
    100
  );


  /* Lighting score */

  let lightingScore;

  if (data.light > 70) {
    lightingScore = 100 - Math.abs(decisions.lightingLevel - 20);
  } else if (data.light >= 40) {
    lightingScore = 85 - Math.abs(decisions.lightingLevel - 50);
  } else {
    lightingScore = 70;
  }

  lightingScore = clamp(lightingScore, 0, 100);


  /* Water score */

  const waterScore = clamp(
    100 - ((data.water - 5) / 65) * 100,
    0,
    100
  );


  /* Air score */

  const airScore = clamp(data.airQuality, 0, 100);


  /* Comfort score */

  let temperatureComfort =
    100 - Math.abs(data.temperature - 24) * 12;

  temperatureComfort = clamp(
    temperatureComfort,
    0,
    100
  );

  let humidityComfort =
    100 - Math.abs(data.humidity - 50) * 1.8;

  humidityComfort = clamp(
    humidityComfort,
    0,
    100
  );

  const comfortScore =
    (temperatureComfort + humidityComfort) / 2;


  /* Weighted Eco Score */

  const score =
    energyScore * 0.25 +
    lightingScore * 0.15 +
    waterScore * 0.15 +
    airScore * 0.20 +
    comfortScore * 0.25;

  return {
    total: Math.round(clamp(score, 0, 100)),
    energy: Math.round(energyScore),
    lighting: Math.round(lightingScore),
    water: Math.round(waterScore),
    air: Math.round(airScore),
    comfort: Math.round(comfortScore)
  };
}


/* =========================================================
   9. UPDATE ECO SCORE UI
   ========================================================= */

function updateEcoScore(scoreData) {

  setText("eco-score", scoreData.total);
  setText("factor-energy", `${scoreData.energy}%`);
  setText("factor-lighting", `${scoreData.lighting}%`);
  setText("factor-water", `${scoreData.water}%`);
  setText("factor-air", `${scoreData.air}%`);
  setText("factor-comfort", `${scoreData.comfort}%`);

  /*
   * Support possible ring SVG implementation.
   */

  const ring = $("eco-ring");

  if (ring) {

    const circumference = 2 * Math.PI * 52;

    ring.style.strokeDasharray = circumference;

    const offset =
      circumference -
      (scoreData.total / 100) * circumference;

    ring.style.strokeDashoffset = offset;
  }
}


/* =========================================================
   10. DECISION ENGINE UI
   ========================================================= */

function updateDecisionEngine(decisions) {

  setText(
    "lighting-reason",
    decisions.lightingReason
  );

  setText(
    "lighting-level",
    `${decisions.lightingLevel}%`
  );

  setText(
    "lighting-state",
    decisions.lightingLevel <= 40
      ? "DIM"
      : decisions.lightingLevel <= 70
        ? "BALANCED"
        : "FULL"
  );


  setText(
    "hvac-reason",
    decisions.hvacReason
  );

  setText(
    "hvac-mode",
    decisions.hvacMode
  );

  setText(
    "hvac-status",
    decisions.hvacMode === "HIGH"
      ? "HIGH LOAD"
      : decisions.hvacMode === "MEDIUM"
        ? "ACTIVE"
        : "LOW"
  );


  setText(
    "vent-reason",
    decisions.ventilationReason
  );

  setText(
    "vent-mode",
    decisions.ventilationMode
  );

  setText(
    "vent-status",
    decisions.ventilationMode === "HIGH"
      ? "BOOST"
      : "NORMAL"
  );


  setText(
    "water-reason",
    decisions.waterReason
  );

  setText(
    "water-level",
    decisions.waterLevel
  );

  setText(
    "water-status",
    decisions.water > 45
      ? "CHECK REQUIRED"
      : "MONITORING"
  );
}


/* =========================================================
   11. ACTUATOR UI
   ========================================================= */

function updateActuators(decisions) {

  /* Lighting */

  setText(
    "act-lighting-value",
    `${decisions.lightingLevel}%`
  );

  setText(
    "act-lighting-chip",
    decisions.lightingLevel <= 40
      ? "ENERGY SAVING"
      : decisions.lightingLevel <= 70
        ? "BALANCED"
        : "FULL POWER"
  );

  updateBar(
    "act-lighting-bar",
    decisions.lightingLevel
  );


  /* HVAC */

  let hvacPercent = 25;

  if (decisions.hvacMode === "MEDIUM") {
    hvacPercent = 58;
  }

  if (decisions.hvacMode === "HIGH") {
    hvacPercent = 92;
  }

  setText(
    "act-hvac-value",
    `${hvacPercent}%`
  );

  setText(
    "act-hvac-chip",
    decisions.hvacMode
  );

  updateBar(
    "act-hvac-bar",
    hvacPercent
  );


  /* Ventilation */

  const ventilationPercent =
    decisions.ventilationMode === "HIGH"
      ? 90
      : 45;

  setText(
    "act-ventilation-value",
    `${ventilationPercent}%`
  );

  setText(
    "act-ventilation-chip",
    decisions.ventilationMode
  );

  updateBar(
    "act-ventilation-bar",
    ventilationPercent
  );


  /* Water */

  const waterPercent =
    decisions.waterLevel === "ALERT"
      ? 90
      : decisions.waterLevel === "MEDIUM"
        ? 60
        : 25;

  setText(
    "act-water-value",
    `${waterPercent}%`
  );

  setText(
    "act-water-chip",
    decisions.waterLevel
  );

  updateBar(
    "act-water-bar",
    waterPercent
  );
}


function updateBar(id, percentage) {

  const element = $(id);

  if (!element) return;

  element.style.width =
    `${clamp(percentage, 0, 100)}%`;
}


/* =========================================================
   12. RECOMMENDATIONS
   ========================================================= */

function updateRecommendations(
  data,
  decisions,
  scoreData
) {

  const list = $("rec-list");

  if (!list) return;

  const recommendations = [];


  if (data.light > 70) {

    recommendations.push(
      "☀️ Reduce artificial lighting because natural daylight is sufficient."
    );
  }

  if (data.light < 40) {

    recommendations.push(
      "💡 Increase artificial lighting to maintain passenger visibility."
    );
  }


  if (data.temperature > 28) {

    recommendations.push(
      "❄️ Increase HVAC cooling because the gate temperature is high."
    );
  }


  if (data.airQuality < 40) {

    recommendations.push(
      "🌬️ Increase ventilation immediately due to poor air quality."
    );
  }


  if (data.water > 45) {

    recommendations.push(
      "💧 Investigate high water consumption and check for wastage."
    );
  }


  if (data.occupancy > 180) {

    recommendations.push(
      "👥 High passenger occupancy detected — optimize HVAC and ventilation."
    );
  }


  if (scoreData.total >= 80) {

    recommendations.push(
      "🌱 Gate is operating efficiently. Maintain current sustainability settings."
    );
  }


  if (recommendations.length === 0) {

    recommendations.push(
      "✅ Gate conditions are stable. Continue monitoring IoT sensor data."
    );
  }


  list.innerHTML = recommendations
    .map(item => `<li>${item}</li>`)
    .join("");
}


/* =========================================================
   13. GATE STATUS
   ========================================================= */

function updateGateStatus(gateId, score) {

  const status = $(`gate-status-${gateId}`);

  if (!status) return;

  if (score >= 75) {

    status.textContent = "Efficient";
    status.className = "gate-status good";

  } else if (score >= 50) {

    status.textContent = "Moderate";
    status.className = "gate-status medium";

  } else {

    status.textContent = "High Consumption";
    status.className = "gate-status bad";
  }
}


/* =========================================================
   14. GATE MAP SELECTION
   ========================================================= */

function updateGateSelection() {

  ["A1", "A2", "A3", "A4"].forEach(gate => {

    const button = $(`gate-btn-${gate}`);

    if (!button) return;

    if (gate === selectedGate) {

      button.classList.add("active");

    } else {

      button.classList.remove("active");
    }
  });
}


function selectGate(gateId) {

  if (!gateData[gateId]) return;

  selectedGate = gateId;

  updateGateSelection();

  updateDashboard();
}


/* =========================================================
   15. GATE SCORE CALCULATION
   ========================================================= */

function calculateGateScore(gateId) {

  const data = gateData[gateId];

  if (!data) return 0;

  const decisions = calculateDecisions(data);

  const energy =
    calculateEnergy(data, decisions);

  return calculateEcoScore(
    data,
    decisions,
    energy
  ).total;
}


/* =========================================================
   16. GATE COMPARISON
   ========================================================= */

function updateGateComparison() {

  ["A1", "A2", "A3", "A4"].forEach(gateId => {

    const score =
      calculateGateScore(gateId);

    updateGateStatus(
      gateId,
      score
    );

    /*
     * Support gate chart if present.
     */

    const scoreElement =
      $(`gate-score-${gateId}`);

    if (scoreElement) {
      scoreElement.textContent = score;
    }

    const fillElement =
      $(`gate-fill-${gateId}`);

    if (fillElement) {
      fillElement.style.width = `${score}%`;
    }
  });
}


/* =========================================================
   17. ENERGY HISTORY
   ========================================================= */

function addEnergyHistory(value) {

  energyHistory.push({
    time: new Date(),
    value
  });

  if (
    energyHistory.length >
    MAX_ENERGY_HISTORY
  ) {

    energyHistory.shift();
  }
}


/* =========================================================
   18. ENERGY CHART
   ========================================================= */

function updateEnergyChart() {

  const chart = $("energy-chart");

  if (!chart) return;

  if (energyHistory.length === 0) return;

  const maxEnergy = Math.max(
    ...energyHistory.map(item => item.value),
    1
  );

  chart.innerHTML =
    energyHistory
      .map(item => {

        const height =
          clamp(
            (item.value / maxEnergy) * 100,
            5,
            100
          );

        return `
          <div
            class="energy-bar"
            style="height:${height}%"
            title="${item.value} kW"
          ></div>
        `;

      })
      .join("");
}


/* =========================================================
   19. ANALYTICS
   ========================================================= */

function updateAnalytics(
  energy,
  data
) {

  setText(
    "stat-current",
    `${energy} kW`
  );


  /*
   * Estimated daily energy.
   */

  const dailyEnergy =
    round(energy * 12, 0);

  setText(
    "stat-daily",
    `${dailyEnergy} kWh`
  );


  /*
   * Estimated savings compared
   * with inefficient operation.
   */

  const baseline = 58;

  const saved =
    Math.max(
      0,
      ((baseline - energy) / baseline) * 100
    );

  setText(
    "stat-saved",
    `${Math.round(saved)}%`
  );


  /*
   * Before / After comparison.
   */

  const lightingBefore = 100;

  const lightingAfter =
    data.light > 70
      ? 20
      : data.light >= 40
        ? 50
        : 100;

  setText(
    "compare-lighting",
    `${lightingBefore}% → ${lightingAfter}%`
  );


  let hvacBefore = 100;

  if (data.temperature <= 25) {
    hvacBefore = 55;
  }

  let hvacAfter = 25;

  if (data.temperature > 28 && data.occupancy > 100) {
    hvacAfter = 92;
  } else if (data.temperature > 25) {
    hvacAfter = 58;
  }

  setText(
    "compare-hvac",
    `${hvacBefore}% → ${hvacAfter}%`
  );


  updateEnergyChart();
}


/* =========================================================
   20. ALERT SYSTEM
   ========================================================= */

function generateAlerts(data) {

  const alerts = [];


  if (data.temperature > 28) {

    alerts.push({
      type: "warning",
      message:
        `High temperature at ${selectedGate}: ${round(data.temperature, 1)}°C`
    });
  }


  if (data.airQuality < 40) {

    alerts.push({
      type: "danger",
      message:
        `Poor air quality at ${selectedGate}: ${Math.round(data.airQuality)}`
    });
  }


  if (data.water > 45) {

    alerts.push({
      type: "warning",
      message:
        `High water usage at ${selectedGate}: ${round(data.water, 1)} L/hr`
    });
  }


  if (data.occupancy > 180) {

    alerts.push({
      type: "warning",
      message:
        `High passenger occupancy at ${selectedGate}: ${Math.round(data.occupancy)}`
    });
  }


  return alerts;
}


/* =========================================================
   21. ALERT UI
   ========================================================= */

function updateAlerts(data) {

  const list = $("alert-list");

  if (!list) return;

  const alerts =
    generateAlerts(data);

  if (alerts.length === 0) {

    list.innerHTML = `
      <div class="alert-item success">
        <span>✓</span>
        <div>
          <strong>All systems normal</strong>
          <p>No critical sustainability alerts detected.</p>
        </div>
      </div>
    `;

    return;
  }


  list.innerHTML =
    alerts
      .map(alert => `
        <div class="alert-item ${alert.type}">
          <span>⚠</span>
          <div>
            <strong>${alert.type === "danger" ? "Critical Alert" : "Warning"}</strong>
            <p>${alert.message}</p>
          </div>
        </div>
      `)
      .join("");
}


/* =========================================================
   22. SIMULATE SENSOR CHANGE
   ========================================================= */

function simulateSensorChange() {

  const data =
    gateData[selectedGate];

  data.occupancy =
    randomInt(5, 230);

  data.temperature =
    round(randomBetween(20, 32), 1);

  data.humidity =
    randomInt(35, 75);

  data.light =
    randomInt(10, 95);

  data.airQuality =
    randomInt(25, 98);

  data.water =
    round(randomBetween(8, 60), 1);


  updateDashboard();
}


/* =========================================================
   23. AUTO SIMULATION
   ========================================================= */

function startAutoSimulation() {

  stopAutoSimulation();

  autoTimer =
    setInterval(() => {

      if (!demoRunning) {
        simulateSensorChange();
      }

    }, 4000);
}


function stopAutoSimulation() {

  if (autoTimer) {

    clearInterval(autoTimer);

    autoTimer = null;
  }
}


/* =========================================================
   24. AUTO BUTTON
   ========================================================= */

function updateAutoButton() {

  const button = $("btn-auto");

  if (!button) return;

  if (autoSimulation) {

    button.textContent =
      "⏸ Auto Simulation: ON";

    button.classList.add("active");

  } else {

    button.textContent =
      "▶ Auto Simulation: OFF";

    button.classList.remove("active");
  }
}


function toggleAutoSimulation() {

  autoSimulation =
    !autoSimulation;

  updateAutoButton();

  if (autoSimulation) {

    startAutoSimulation();

  } else {

    stopAutoSimulation();
  }
}


/* =========================================================
   25. DEMO SCENARIO
   ========================================================= */

function runDemoScenario() {

  if (demoRunning) return;

  demoRunning = true;

  stopAutoSimulation();

  const button = $("btn-demo");

  if (button) {
    button.disabled = true;
    button.textContent =
      "▶ Demo Running...";
  }


  const data =
    gateData.A1;


  /*
   * Demo starts with a quiet,
   * efficient morning.
   */

  const steps = [

    {
      delay: 0,
      occupancy: 40,
      temperature: 24,
      light: 80,
      airQuality: 85,
      humidity: 45,
      water: 18
    },

    {
      delay: 3200,
      occupancy: 80,
      temperature: 26,
      light: 60,
      airQuality: 72,
      humidity: 50,
      water: 25
    },

    {
      delay: 6400,
      occupancy: 130,
      temperature: 28,
      light: 40,
      airQuality: 55,
      humidity: 57,
      water: 32
    },

    {
      delay: 9600,
      occupancy: 180,
      temperature: 30,
      light: 20,
      airQuality: 32,
      humidity: 63,
      water: 52
    },

    {
      delay: 12800,
      occupancy: 40,
      temperature: 24,
      light: 80,
      airQuality: 85,
      humidity: 45,
      water: 18
    }
  ];


  steps.forEach(step => {

    setTimeout(() => {

      data.occupancy =
        step.occupancy;

      data.temperature =
        step.temperature;

      data.light =
        step.light;

      data.airQuality =
        step.airQuality;

      data.humidity =
        step.humidity;

      data.water =
        step.water;

      updateDashboard();

    }, step.delay);
  });


  demoTimer =
    setTimeout(() => {

      demoRunning = false;

      if (button) {

        button.disabled = false;

        button.textContent =
          "▶ Demo Scenario";
      }


      if (autoSimulation) {
        startAutoSimulation();
      }

    }, 15000);
}


/* =========================================================
   26. CSV EXPORT
   ========================================================= */

function exportCSV() {

  const rows = [
    [
      "Gate",
      "Occupancy",
      "Temperature",
      "Humidity",
      "Natural Light",
      "Air Quality",
      "Water Usage"
    ]
  ];


  Object.keys(gateData).forEach(gate => {

    const data =
      gateData[gate];

    rows.push([
      gate,
      data.occupancy,
      data.temperature,
      data.humidity,
      data.light,
      data.airQuality,
      data.water
    ]);
  });


  const csv =
    rows
      .map(row =>
        row.join(",")
      )
      .join("\n");


  const blob =
    new Blob(
      [csv],
      { type: "text/csv;charset=utf-8;" }
    );


  const url =
    URL.createObjectURL(blob);


  const link =
    document.createElement("a");

  link.href = url;

  link.download =
    "ecogate-sensor-data.csv";

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}


/* =========================================================
   27. NAVIGATION
   ========================================================= */

function setupNavigation() {

  document
    .querySelectorAll("[data-section]")
    .forEach(link => {

      link.addEventListener(
        "click",
        event => {

          event.preventDefault();

          const target =
            link.getAttribute("data-section");

          const section =
            $(target);

          if (section) {

            section.scrollIntoView({
              behavior: "smooth",
              block: "start"
            });
          }
        }
      );
    });
}


/* =========================================================
   28. BUTTON EVENT LISTENERS
   ========================================================= */

function setupControls() {

  const simulateButton =
    $("btn-simulate");

  if (simulateButton) {

    simulateButton.addEventListener(
      "click",
      simulateSensorChange
    );
  }


  const autoButton =
    $("btn-auto");

  if (autoButton) {

    autoButton.addEventListener(
      "click",
      toggleAutoSimulation
    );
  }


  const demoButton =
    $("btn-demo");

  if (demoButton) {

    demoButton.addEventListener(
      "click",
      runDemoScenario
    );
  }


  const exportButton =
    $("btn-export");

  if (exportButton) {

    exportButton.addEventListener(
      "click",
      exportCSV
    );
  }


  /*
   * Gate buttons
   */

  ["A1", "A2", "A3", "A4"]
    .forEach(gate => {

      const button =
        $(`gate-btn-${gate}`);

      if (button) {

        button.addEventListener(
          "click",
          () => selectGate(gate)
        );
      }
    });
}


/* =========================================================
   29. MAIN DASHBOARD UPDATE
   ========================================================= */

function updateDashboard() {

  const data =
    gateData[selectedGate];


  /*
   * Sensor values
   */

  updateSensorDisplay(data);


  /*
   * Decision engine
   */

  const decisions =
    calculateDecisions(data);


  /*
   * Energy
   */

  const energy =
    calculateEnergy(
      data,
      decisions
    );


  /*
   * Eco score
   */

  const scoreData =
    calculateEcoScore(
      data,
      decisions,
      energy
    );


  /*
   * Update UI
   */

  updateEcoScore(scoreData);

  updateDecisionEngine(decisions);

  updateActuators(decisions);

  updateRecommendations(
    data,
    decisions,
    scoreData
  );

  updateAlerts(data);

  updateAnalytics(
    energy,
    data
  );


  /*
   * Energy history
   */

  addEnergyHistory(energy);


  /*
   * Update comparison
   */

  updateGateComparison();

  updateGateSelection();


  /*
   * Current gate display
   */

  setText(
    "current-gate",
    selectedGate
  );
}


/* =========================================================
   30. INITIALIZATION
   ========================================================= */

function initializeEcoGate() {

  setupControls();

  setupNavigation();

  updateAutoButton();

  updateDashboard();

  /*
   * Initial energy readings
   */

  for (let i = 0; i < 6; i++) {

    const data =
      gateData[selectedGate];

    const decisions =
      calculateDecisions(data);

    const energy =
      calculateEnergy(
        data,
        decisions
      );

    energyHistory.push({
      time: new Date(),
      value: energy
    });
  }


  updateEnergyChart();


  /*
   * Start automatic simulation.
   */

  if (autoSimulation) {

    startAutoSimulation();
  }


  console.log(
    "EcoGate initialized successfully."
  );

  console.log(
    "Current Gate:",
    selectedGate
  );

  console.log(
    "Simulation Mode: ACTIVE"
  );
}


/* =========================================================
   31. START APPLICATION
   ========================================================= */

if (
  document.readyState === "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initializeEcoGate
  );

} else {

  initializeEcoGate();
}
