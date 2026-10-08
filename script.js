/* =========================================================
   EcoGate — Complete JavaScript
   IoT-Based Smart Sustainable Airport Gate Management
   ========================================================= */


/* =========================================================
   1. GATE DATA
   ========================================================= */

const gateData = {

  A1: {
    passengers: 145,
    temperature: 24,
    humidity: 51,
    naturalLight: 72,
    airQuality: 91,
    water: 31
  },

  A2: {
    passengers: 198,
    temperature: 27,
    humidity: 58,
    naturalLight: 48,
    airQuality: 78,
    water: 43
  },

  A3: {
    passengers: 82,
    temperature: 23,
    humidity: 46,
    naturalLight: 88,
    airQuality: 96,
    water: 24
  },

  A4: {
    passengers: 215,
    temperature: 28,
    humidity: 63,
    naturalLight: 35,
    airQuality: 69,
    water: 49
  }

};


/* =========================================================
   2. GLOBAL STATE
   ========================================================= */

let selectedGateId = "A1";

let autoSimulation = true;

let simulationTimer = null;

let energyHistory = [];

let alertHistory = [];

let lastCalculation = null;

let demoMode = false;


/* =========================================================
   3. DOM HELPERS
   ========================================================= */

function get(id) {
  return document.getElementById(id);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
  return Math.floor(randomBetween(min, max + 1));
}


/* =========================================================
   4. CLOCK
   ========================================================= */

function updateClock() {

  const clock = get("clock");

  if (!clock) return;

  const now = new Date();

  clock.textContent = now.toLocaleTimeString(
    [],
    {
      hour12: false
    }
  );
}

setInterval(updateClock, 1000);

updateClock();


/* =========================================================
   5. SENSOR DISPLAY
   ========================================================= */

function updateSensorDisplay(data) {

  get("passengers").textContent = Math.round(data.passengers);

  get("temperature").textContent = data.temperature.toFixed(1);

  get("humidity").textContent = Math.round(data.humidity);

  get("natural-light").textContent =
    Math.round(data.naturalLight);

  get("air-quality").textContent =
    Math.round(data.airQuality);

  get("water").textContent =
    data.water.toFixed(1);
}


/* =========================================================
   6. DECISION ENGINE
   ========================================================= */

function calculateDecisions(data) {

  /*
    Smart Lighting:
    More natural light = less artificial lighting.
  */

  let lighting = clamp(
    100 - data.naturalLight,
    15,
    100
  );

  let lightingDecision;

  if (data.naturalLight >= 75) {
    lightingDecision = "DIMMED";
  }
  else if (data.naturalLight >= 45) {
    lightingDecision = "PARTIAL";
  }
  else {
    lightingDecision = "HIGH";
  }

  let lightingReason =
    `Natural light level is ${Math.round(data.naturalLight)}%.`;


  /*
    HVAC:
    Occupancy + temperature determine HVAC intensity.
  */

  let hvac = 45;

  if (data.passengers > 180) {
    hvac += 20;
  }
  else if (data.passengers < 90) {
    hvac -= 15;
  }

  if (data.temperature > 26) {
    hvac += 25;
  }
  else if (data.temperature < 21) {
    hvac += 10;
  }

  hvac = clamp(hvac, 25, 100);

  let hvacDecision;

  if (hvac >= 80) {
    hvacDecision = "HIGH";
  }
  else if (hvac >= 55) {
    hvacDecision = "MODERATE";
  }
  else {
    hvacDecision = "ECO";
  }

  let hvacReason =
    `${Math.round(data.passengers)} passengers · ${data.temperature.toFixed(1)}°C.`;


  /*
    Ventilation:
    Lower air quality = stronger ventilation.
  */

  let ventilation =
    100 - data.airQuality;

  if (data.passengers > 180) {
    ventilation += 15;
  }

  ventilation = clamp(
    ventilation + 30,
    30,
    100
  );

  let ventilationDecision;

  if (data.airQuality < 70) {
    ventilationDecision = "BOOST";
  }
  else if (data.airQuality < 85) {
    ventilationDecision = "MODERATE";
  }
  else {
    ventilationDecision = "NORMAL";
  }

  let ventilationReason =
    `Air quality score is ${Math.round(data.airQuality)}/100.`;


  /*
    Water:
    High water usage triggers conservation.
  */

  let waterControl = 100;

  if (data.water >= 45) {
    waterControl = 60;
  }
  else if (data.water >= 35) {
    waterControl = 80;
  }
  else {
    waterControl = 100;
  }

  let waterDecision;

  if (data.water >= 45) {
    waterDecision = "CONSERVE";
  }
  else if (data.water >= 35) {
    waterDecision = "MONITOR";
  }
  else {
    waterDecision = "NORMAL";
  }

  let waterReason =
    `Water usage is ${data.water.toFixed(1)} L/hr.`;


  return {
    lighting,
    lightingDecision,
    lightingReason,

    hvac,
    hvacDecision,
    hvacReason,

    ventilation,
    ventilationDecision,
    ventilationReason,

    waterControl,
    waterDecision,
    waterReason
  };
}


/* =========================================================
   7. ENERGY CALCULATION
   ========================================================= */

function calculateEnergy(decisions, data) {

  /*
    Prototype power model.

    Lighting: maximum 10 kW
    HVAC: maximum 22 kW
    Ventilation: maximum 5 kW
    Other airport gate loads: 4 kW
  */

  const lightingPower =
    10 * (decisions.lighting / 100);

  const hvacPower =
    22 * (decisions.hvac / 100);

  const ventilationPower =
    5 * (decisions.ventilation / 100);

  const occupancyPower =
    clamp(data.passengers / 250, 0, 1) * 3;

  const basePower = 4;

  return (
    lightingPower +
    hvacPower +
    ventilationPower +
    occupancyPower +
    basePower
  );
}


/* =========================================================
   8. ECO SCORE
   ========================================================= */

function calculateEcoScore(data, decisions, energy) {

  /*
    Energy score:
    Lower consumption = better.
  */

  const energyScore =
    clamp(
      100 - ((energy - 15) / 25) * 100,
      20,
      100
    );


  /*
    Lighting score:
    Lower artificial lighting is better.
  */

  const lightingScore =
    clamp(
      100 - decisions.lighting * 0.65,
      30,
      100
    );


  /*
    Water score.
  */

  const waterScore =
    clamp(
      100 - ((data.water - 15) / 40) * 100,
      20,
      100
    );


  /*
    Air quality score.
  */

  const airScore =
    clamp(
      data.airQuality,
      0,
      100
    );


  /*
    Passenger comfort.
  */

  let comfortScore = 100;

  if (data.temperature < 21) {
    comfortScore -= (21 - data.temperature) * 10;
  }

  if (data.temperature > 26) {
    comfortScore -= (data.temperature - 26) * 10;
  }

  if (data.humidity < 40) {
    comfortScore -= (40 - data.humidity) * 2;
  }

  if (data.humidity > 60) {
    comfortScore -= (data.humidity - 60) * 2;
  }

  comfortScore =
    clamp(comfortScore, 20, 100);


  /*
    Weighted Eco Score.
  */

  const score = Math.round(
    energyScore * 0.25 +
    lightingScore * 0.20 +
    waterScore * 0.15 +
    airScore * 0.20 +
    comfortScore * 0.20
  );


  return {
    score,
    energyScore: Math.round(energyScore),
    lightingScore: Math.round(lightingScore),
    waterScore: Math.round(waterScore),
    airScore: Math.round(airScore),
    comfortScore: Math.round(comfortScore)
  };
}


/* =========================================================
   9. SCORE LABEL
   ========================================================= */

function getScoreLabel(score) {

  if (score >= 85) {
    return "Excellent Sustainability";
  }

  if (score >= 75) {
    return "Efficient";
  }

  if (score >= 50) {
    return "Moderate";
  }

  return "High Consumption";
}


/* =========================================================
   10. UPDATE ECO SCORE
   ========================================================= */

function updateEcoScore(scoreData) {

  get("eco-score").textContent =
    scoreData.score;

  get("score-label").textContent =
    getScoreLabel(scoreData.score);

  get("energy-score").textContent =
    scoreData.energyScore;

  get("lighting-score").textContent =
    scoreData.lightingScore;

  get("water-score").textContent =
    scoreData.waterScore;

  get("air-score").textContent =
    scoreData.airScore;

  get("comfort-score").textContent =
    scoreData.comfortScore;
}


/* =========================================================
   11. UPDATE DECISION ENGINE
   ========================================================= */

function updateDecisionEngine(decisions) {

  get("lighting-decision").textContent =
    decisions.lightingDecision;

  get("lighting-percent").textContent =
    Math.round(decisions.lighting);

  get("lighting-reason").textContent =
    decisions.lightingReason;


  get("hvac-decision").textContent =
    decisions.hvacDecision;

  get("hvac-percent").textContent =
    Math.round(decisions.hvac) + "%";

  get("hvac-reason").textContent =
    decisions.hvacReason;


  get("ventilation-decision").textContent =
    decisions.ventilationDecision;

  get("ventilation-percent").textContent =
    Math.round(decisions.ventilation) + "%";

  get("ventilation-reason").textContent =
    decisions.ventilationReason;


  get("water-decision").textContent =
    decisions.waterDecision;

  get("water-percent").textContent =
    Math.round(decisions.waterControl) + "%";

  get("water-reason").textContent =
    decisions.waterReason;
}


/* =========================================================
   12. UPDATE ACTUATORS
   ========================================================= */

function updateActuators(decisions) {

  get("actuator-light").textContent =
    "ACTIVE";

  get("actuator-light-percent").textContent =
    Math.round(decisions.lighting) + "%";

  get("actuator-light-state").textContent =
    "Virtual smart lighting actuator";


  get("actuator-hvac").textContent =
    "ACTIVE";

  get("actuator-hvac-percent").textContent =
    Math.round(decisions.hvac) + "%";

  get("actuator-hvac-state").textContent =
    "Virtual HVAC controller";


  get("actuator-ventilation").textContent =
    "ACTIVE";

  get("actuator-ventilation-percent").textContent =
    Math.round(decisions.ventilation) + "%";

  get("actuator-ventilation-state").textContent =
    "Virtual ventilation actuator";


  get("actuator-water").textContent =
    decisions.waterDecision;

  get("actuator-water-percent").textContent =
    Math.round(decisions.waterControl) + "%";

  get("actuator-water-state").textContent =
    "Virtual smart water valve";
}


/* =========================================================
   13. RECOMMENDATIONS
   ========================================================= */

function updateRecommendations(data, decisions, scoreData) {

  const list = get("recommendations-list");

  const recommendations = [];


  if (data.naturalLight > 70) {
    recommendations.push(
      "High natural light detected — reduce artificial lighting to save energy."
    );
  }

  if (data.passengers > 180) {
    recommendations.push(
      "High passenger occupancy — maintain stronger HVAC and ventilation."
    );
  }

  if (data.temperature > 26) {
    recommendations.push(
      "Temperature is above the comfort band — increase HVAC intensity."
    );
  }

  if (data.airQuality < 75) {
    recommendations.push(
      "Air quality is reduced — activate enhanced ventilation."
    );
  }

  if (data.water >= 45) {
    recommendations.push(
      "Water usage is high — activate conservation mode."
    );
  }

  if (scoreData.score >= 80) {
    recommendations.push(
      "Gate is operating efficiently. Continue current EcoGate settings."
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "All monitored parameters are within normal operating ranges."
    );
  }

  list.innerHTML = "";

  recommendations.slice(0, 5).forEach(function (text) {

    const item =
      document.createElement("div");

    item.className =
      "recommendation";

    item.textContent =
      text;

    list.appendChild(item);
  });
}


/* =========================================================
   14. UPDATE GATE STATUS
   ========================================================= */

function updateGateStatus(gateId, score) {

  const el =
    get("status-" + gateId);

  if (!el) return;

  if (score >= 75) {

    el.textContent =
      "🟢 Efficient";

    el.className =
      "gate-status gate-ok";

  }
  else if (score >= 50) {

    el.textContent =
      "🟡 Moderate";

    el.className =
      "gate-status gate-mid";

  }
  else {

    el.textContent =
      "🔴 High Consumption";

    el.className =
      "gate-status gate-bad";
  }


  /* Keep the All Gates Eco Score chart in sync */

  const scoreElement =
    get("gc-score-" + gateId);

  const chartFill =
    get("gc-fill-" + gateId);

  if (scoreElement) {
    scoreElement.textContent =
      String(score);
  }

  if (chartFill) {

    chartFill.style.height =
      score + "%";

    chartFill.className =
      "gate-chart-fill " +
      (
        score >= 75
          ? "fill-ok"
          : score >= 50
            ? "fill-mid"
            : "fill-bad"
      );
  }
}


/* =========================================================
   15. UPDATE ALL GATE SCORES
   ========================================================= */

function updateAllGateScores() {

  Object.keys(gateData).forEach(function (gateId) {

    const data =
      gateData[gateId];

    const decisions =
      calculateDecisions(data);

    const energy =
      calculateEnergy(decisions, data);

    const scoreData =
      calculateEcoScore(
        data,
        decisions,
        energy
      );

    updateGateStatus(
      gateId,
      scoreData.score
    );
  });
}


/* =========================================================
   16. ENERGY HISTORY
   ========================================================= */

function updateEnergyChart() {

  const chart =
    get("energy-chart");

  if (!chart) return;

  chart.innerHTML = "";

  if (energyHistory.length === 0) {

    chart.innerHTML =
      '<div class="chart-empty">Waiting for readings...</div>';

    return;
  }


  const max =
    Math.max(
      40,
      ...energyHistory
    );


  energyHistory.forEach(function (value) {

    const bar =
      document.createElement("div");

    bar.className =
      "energy-bar";

    bar.style.height =
      ((value / max) * 100) + "%";

    bar.title =
      value.toFixed(1) + " kW";

    chart.appendChild(bar);
  });
}


/* =========================================================
   17. ANALYTICS
   ========================================================= */

function updateAnalytics(
  energy,
  decisions
) {

  get("current-energy").textContent =
    energy.toFixed(1);

  const dailyEnergy =
    energy * 12;

  get("daily-energy").textContent =
    dailyEnergy.toFixed(1);


  /*
    Conventional baseline.
  */

  const conventionalEnergy =
    41;

  const saved =
    Math.max(
      0,
      (conventionalEnergy - energy) * 12
    );

  get("energy-saved").textContent =
    saved.toFixed(1);


  get("compare-lighting").textContent =
    Math.round(decisions.lighting) + "%";

  get("compare-hvac").textContent =
    Math.round(decisions.hvac) + "%";
}


/* =========================================================
   18. ALERTS
   ========================================================= */

function createAlerts(data) {

  const alerts = [];


  if (data.temperature > 28) {

    alerts.push({
      type: "critical",
      icon: "🔴",
      text:
        "Temperature is critically high."
    });

  }
  else if (data.temperature > 26) {

    alerts.push({
      type: "warning",
      icon: "🟡",
      text:
        "Temperature is above the comfort band."
    });
  }


  if (data.airQuality < 70) {

    alerts.push({
      type: "critical",
      icon: "🔴",
      text:
        "Poor air quality detected. Ventilation increased."
    });

  }
  else if (data.airQuality < 85) {

    alerts.push({
      type: "warning",
      icon: "🟡",
      text:
        "Air quality is below the preferred level."
    });
  }


  if (data.water >= 45) {

    alerts.push({
      type: "warning",
      icon: "🟡",
      text:
        "High water consumption detected."
    });
  }


  if (data.passengers > 210) {

    alerts.push({
      type: "warning",
      icon: "🟡",
      text:
        "Gate occupancy is approaching capacity."
    });
  }


  if (alerts.length === 0) {

    alerts.push({
      type: "normal",
      icon: "🟢",
      text:
        "All monitored parameters are within normal limits."
    });
  }


  return alerts;
}


/* =========================================================
   19. UPDATE ALERT PANEL
   ========================================================= */

function updateAlerts(data) {

  const stream =
    get("alert-stream");

  if (!stream) return;

  const alerts =
    createAlerts(data);

  alertHistory =
    alerts.concat(alertHistory)
      .slice(0, 8);

  stream.innerHTML = "";

  alertHistory
    .slice(0, 6)
    .forEach(function (alert) {

      const item =
        document.createElement("div");

      item.className =
        "alert-item alert-" +
        alert.type;

      const icon =
        document.createElement("span");

      icon.textContent =
        alert.icon;

      const text =
        document.createElement("span");

      text.textContent =
        alert.text;

      item.appendChild(icon);
      item.appendChild(text);

      stream.appendChild(item);
    });
}


/* =========================================================
   20. MAIN DASHBOARD UPDATE
   ========================================================= */

function updateDashboard() {

  const data =
    gateData[selectedGateId];


  /*
    Calculate decision engine.
  */

  const decisions =
    calculateDecisions(data);


  /*
    Calculate energy.
  */

  const energy =
    calculateEnergy(
      decisions,
      data
    );


  /*
    Calculate Eco Score.
  */

  const scoreData =
    calculateEcoScore(
      data,
      decisions,
      energy
    );


  /*
    Save last calculation.
  */

  lastCalculation = {
    gate: selectedGateId,
    data,
    decisions,
    energy,
    scoreData
  };


  /*
    Update UI.
  */

  updateSensorDisplay(data);

  get("energy").textContent =
    energy.toFixed(1);

  get("current-gate").textContent =
    selectedGateId;

  updateEcoScore(scoreData);

  updateDecisionEngine(decisions);

  updateActuators(decisions);

  updateRecommendations(
    data,
    decisions,
    scoreData
  );

  updateAnalytics(
    energy,
    decisions
  );

  updateAlerts(data);


  /*
    Add energy reading.
  */

  energyHistory.push(energy);

  if (energyHistory.length > 12) {
    energyHistory.shift();
  }

  updateEnergyChart();


  /*
    Update all gate comparison scores.
  */

  updateAllGateScores();
}


/* =========================================================
   21. SIMULATE SENSOR CHANGE
   ========================================================= */

function simulateSensorChange() {

  const data =
    gateData[selectedGateId];


  data.passengers =
    clamp(
      data.passengers +
      randomInt(-25, 25),
      10,
      250
    );


  data.temperature =
    clamp(
      data.temperature +
      randomBetween(-1.4, 1.4),
      18,
      32
    );


  data.humidity =
    clamp(
      data.humidity +
      randomBetween(-5, 5),
      25,
      75
    );


  data.naturalLight =
    clamp(
      data.naturalLight +
      randomInt(-12, 12),
      5,
      100
    );


  data.airQuality =
    clamp(
      data.airQuality +
      randomInt(-8, 8),
      45,
      100
    );


  data.water =
    clamp(
      data.water +
      randomBetween(-5, 5),
      10,
      60
    );


  updateDashboard();
}


/* =========================================================
   22. GATE SELECTION
   ========================================================= */

function selectGate(gateId) {

  if (!gateData[gateId]) return;

  selectedGateId =
    gateId;


  document
    .querySelectorAll(".gate-btn")
    .forEach(function (btn) {

      btn.classList.toggle(
        "is-selected",
        btn.dataset.gate === gateId
      );
    });


  document
    .querySelectorAll(".gate-chart-col")
    .forEach(function (btn) {

      btn.classList.toggle(
        "is-selected",
        btn.dataset.gate === gateId
      );
    });


  /*
    Clear recent energy history when
    switching gates.
  */

  energyHistory = [];

  alertHistory = [];

  updateDashboard();

  window.location.hash = "sensors";
}


/* =========================================================
   23. GATE BUTTON EVENTS
   ========================================================= */

document
  .querySelectorAll(".gate-btn")
  .forEach(function (button) {

    button.addEventListener(
      "click",
      function () {

        selectGate(
          button.dataset.gate
        );

      }
    );
  });


document
  .querySelectorAll(".gate-chart-col")
  .forEach(function (button) {

    button.addEventListener(
      "click",
      function () {

        selectGate(
          button.dataset.gate
        );

      }
    );
  });


/* =========================================================
   24. AUTO SIMULATION
   ========================================================= */

function startAutoSimulation() {

  stopAutoSimulation();

  if (!autoSimulation) return;

  simulationTimer =
    setInterval(
      simulateSensorChange,
      4000
    );
}


function stopAutoSimulation() {

  if (simulationTimer !== null) {

    clearInterval(
      simulationTimer
    );

    simulationTimer = null;
  }
}


function updateAutoButton() {

  const button =
    get("auto-btn");

  if (!button) return;

  button.textContent =
    autoSimulation
      ? "⏸ Auto Simulation: ON"
      : "▶ Auto Simulation: OFF";
}


get("auto-btn")
  .addEventListener(
    "click",
    function () {

      autoSimulation =
        !autoSimulation;

      updateAutoButton();

      if (autoSimulation) {
        startAutoSimulation();
      }
      else {
        stopAutoSimulation();
      }

    }
  );


/* =========================================================
   25. SIMULATE BUTTON
   ========================================================= */

get("simulate-btn")
  .addEventListener(
    "click",
    function () {

      simulateSensorChange();

    }
  );


/* =========================================================
   26. DEMO SCENARIO
   ========================================================= */

function runDemoScenario() {

  demoMode = true;

  /*
    Create a clear scenario for presentation:
    high occupancy + high temperature +
    low natural light + lower air quality.
  */

  gateData.A1 = {

    passengers: 225,

    temperature: 28.5,

    humidity: 64,

    naturalLight: 28,

    airQuality: 67,

    water: 51
  };


  selectGate("A1");

  updateDashboard();


  /*
    After a few seconds, demonstrate
    the optimized condition.
  */

  setTimeout(function () {

    gateData.A1 = {

      passengers: 135,

      temperature: 24.2,

      humidity: 50,

      naturalLight: 82,

      airQuality: 94,

      water: 27
    };


    updateDashboard();

    demoMode = false;

  }, 6500);
}


get("demo-btn")
  .addEventListener(
    "click",
    runDemoScenario
  );


/* =========================================================
   27. CSV EXPORT
   ========================================================= */

function exportCSV() {

  if (!lastCalculation) return;

  const d =
    lastCalculation.data;

  const dec =
    lastCalculation.decisions;

  const score =
    lastCalculation.scoreData;


  const rows = [

    [
      "EcoGate Sensor / Decision Data"
    ],

    [
      "Gate",
      "Passengers",
      "Temperature °C",
      "Humidity %",
      "Natural Light %",
      "Air Quality",
      "Water L/hr",
      "Energy kW",
      "Eco Score",
      "Lighting %",
      "HVAC %",
      "Ventilation %",
      "Water Control %"
    ],

    [
      selectedGateId,
      Math.round(d.passengers),
      d.temperature.toFixed(1),
      Math.round(d.humidity),
      Math.round(d.naturalLight),
      Math.round(d.airQuality),
      d.water.toFixed(1),
      lastCalculation.energy.toFixed(1),
      score.score,
      Math.round(dec.lighting),
      Math.round(dec.hvac),
      Math.round(dec.ventilation),
      Math.round(dec.waterControl)
    ]

  ];


  const csv =
    rows
      .map(function (row) {

        return row
          .map(function (cell) {

            const value =
              String(cell)
                .replace(/"/g, '""');

            return `"${value}"`;

          })
          .join(",");

      })
      .join("\n");


  const blob =
    new Blob(
      [csv],
      {
        type: "text/csv;charset=utf-8;"
      }
    );


  const url =
    URL.createObjectURL(blob);


  const link =
    document.createElement("a");

  link.href =
    url;

  link.download =
    "EcoGate_" +
    selectedGateId +
    "_data.csv";


  document.body.appendChild(link);

  link.click();

  link.remove();

  URL.revokeObjectURL(url);
}


get("export-btn")
  .addEventListener(
    "click",
    exportCSV
  );


/* =========================================================
   28. PRESENTATION MODE
   ========================================================= */

const tourSteps = [

  {
    selector: "#sensors",
    title: "Live Sensor Data",
    description:
      "EcoGate receives simulated occupancy, temperature, humidity, light, air quality and water readings."
  },

  {
    selector: "#gates",
    title: "Airport Gate Map",
    description:
      "Each airport gate has its own simulated IoT environment and Eco Score."
  },

  {
    selector: "#score",
    title: "Eco Score",
    description:
      "The prototype combines energy, lighting, water, air quality and passenger comfort into one sustainability score."
  },

  {
    selector: "#decision",
    title: "Decision Engine",
    description:
      "Rule-based logic automatically decides lighting, HVAC, ventilation and water-control levels."
  },

  {
    selector: "#actuators",
    title: "Simulated Actuators",
    description:
      "The dashboard simulates virtual smart lights, HVAC, ventilation and water valves."
  },

  {
    selector: "#analytics",
    title: "Energy Analytics",
    description:
      "EcoGate estimates energy consumption and potential savings compared with a conventional baseline."
  },

  {
    selector: "#architecture",
    title: "IoT Architecture",
    description:
      "In a real deployment, ESP32 or Arduino sensors can send data through an IoT gateway to the decision engine."
  }

];


let tourIndex = 0;


function clearTourHighlight() {

  document
    .querySelectorAll(".tour-highlight")
    .forEach(function (element) {

      element.classList.remove(
        "tour-highlight"
      );

    });


  document
    .querySelectorAll("main > section")
    .forEach(function (section) {

      section.classList.remove(
        "tour-dimmed"
      );

    });
}


function showTourStep(index) {

  if (
    index < 0 ||
    index >= tourSteps.length
  ) {
    return;
  }


  clearTourHighlight();


  tourIndex =
    index;


  const step =
    tourSteps[tourIndex];


  const target =
    document.querySelector(
      step.selector
    );


  if (!target) return;


  target.classList.add(
    "tour-highlight"
  );


  document
    .querySelectorAll("main > section")
    .forEach(function (section) {

      if (section !== target) {

        section.classList.add(
          "tour-dimmed"
        );

      }

    });


  get("tour-title").textContent =
    step.title;

  get("tour-description").textContent =
    step.description;


  get("tour-progress").style.width =
    (
      ((tourIndex + 1) /
        tourSteps.length) *
      100
    ) + "%";


  target.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}


function startPresentationMode() {

  const bar =
    get("tour-bar");

  if (!bar) return;

  bar.hidden = false;

  document.body.classList.add(
    "tour-active"
  );

  showTourStep(0);
}


function exitPresentationMode() {

  const bar =
    get("tour-bar");

  if (!bar) return;

  bar.hidden = true;

  document.body.classList.remove(
    "tour-active"
  );

  clearTourHighlight();
}


get("presentation-btn")
  .addEventListener(
    "click",
    startPresentationMode
  );


get("tour-next")
  .addEventListener(
    "click",
    function () {

      if (
        tourIndex <
        tourSteps.length - 1
      ) {

        showTourStep(
          tourIndex + 1
        );

      }
      else {

        exitPresentationMode();

      }

    }
  );


get("tour-prev")
  .addEventListener(
    "click",
    function () {

      if (tourIndex > 0) {

        showTourStep(
          tourIndex - 1
        );

      }

    }
  );


get("tour-exit")
  .addEventListener(
    "click",
    exitPresentationMode
  );


/* =========================================================
   29. INITIALIZE APPLICATION
   ========================================================= */

function initializeEcoGate() {

  updateAutoButton();

  updateDashboard();

  startAutoSimulation();

}


/* Start */

initializeEcoGate();
