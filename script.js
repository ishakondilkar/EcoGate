
/* EcoGate: software-only IoT simulation. */
"use strict";

const gateData = {
  A1: { occupancy: 40, temperature: 24, humidity: 45, light: 80, air: 85, water: 18 },
  A2: { occupancy: 132, temperature: 27.5, humidity: 55, light: 55, air: 62, water: 31 },
  A3: { occupancy: 205, temperature: 30.5, humidity: 68, light: 25, air: 38, water: 52 },
  A4: { occupancy: 12, temperature: 22, humidity: 40, light: 65, air: 90, water: 9 }
};

const state = {
  gate: "A1",
  auto: true,
  timer: null,
  history: [24, 22, 21, 19, 20, 18, 17, 19, 18, 21, 20, 18],
  alerts: [],
  act: { light: true, hvac: true, ventilation: true, water: true },
  tour: 0
};

const $ = id => document.getElementById(id);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const rnd = (n, d = 0) => Number(n.toFixed(d));

function init() {
  $("simulate-btn").onclick = () => {
    simulate(state.gate);
    render();
    alertAdd("Sensor readings updated", state.gate + " telemetry was simulated.", "info");
    toast("Sensor readings updated");
  };

  $("auto-btn").onclick = toggleAuto;
  $("demo-btn").onclick = demo;
  $("export-btn").onclick = exportCSV;
  $("presentation-btn").onclick = () => state.tour < 0 ? startTour() : exitTour();

  $("clear-alerts").onclick = () => {
    state.alerts = [];
    renderAlerts();
    toast("Alerts cleared");
  };

  document.querySelectorAll("[data-gate]").forEach(el => {
    el.addEventListener("click", () => {
      state.gate = el.dataset.gate;
      render();
      toast("Now viewing Gate " + state.gate);
    });
  });

  ["light", "hvac", "ventilation", "water"].forEach(k => {
    $("switch-" + k).addEventListener("change", e => {
      state.act[k] = e.target.checked;
      alertAdd(
        k.toUpperCase() + " actuator " + (e.target.checked ? "enabled" : "disabled"),
        "Simulated control changed for Gate " + state.gate,
        e.target.checked ? "info" : "warn"
      );
      render();
    });
  });

  $("tour-prev").onclick = () => moveTour(-1);
  $("tour-next").onclick = () => moveTour(1);
  $("tour-exit").onclick = exitTour;

  state.tour = -1;
  clock();
  setInterval(clock, 1000);
  render();
  startAuto();
  alertAdd("Simulation initialized", "EcoGate is monitoring the simulated airport environment.", "info");
}

function clock() {
  $("clock").textContent = new Date().toLocaleTimeString([], { hour12: false });
}

function simulate(g) {
  const d = gateData[g];
  d.occupancy = clamp(Math.round(d.occupancy + (Math.random() - 0.46) * 64), 5, 240);
  d.temperature = rnd(clamp(d.temperature + (Math.random() - 0.48) * 2.8, 18, 34), 1);
  d.humidity = clamp(Math.round(d.humidity + (Math.random() - 0.5) * 12), 25, 85);
  d.light = clamp(Math.round(d.light + (Math.random() - 0.5) * 26), 5, 100);
  d.air = clamp(Math.round(d.air + (Math.random() - 0.5) * 18), 20, 100);
  d.water = clamp(Math.round(d.water + (Math.random() - 0.48) * 15), 3, 65);
}

function toggleAuto() {
  state.auto = !state.auto;
  $("auto-btn").textContent = state.auto
    ? "Ⅱ Auto Simulation: ON"
    : "▶ Auto Simulation: OFF";

  state.auto ? startAuto() : stopAuto();
  toast("Auto simulation " + (state.auto ? "enabled" : "paused"));
}

function startAuto() {
  stopAuto();

  if (state.auto) {
    state.timer = setInterval(() => {
      const keys = Object.keys(gateData);
      state.gate = keys[Math.floor(Math.random() * keys.length)];
      simulate(state.gate);
      render();
    }, 4000);
  }
}

function stopAuto() {
  if (state.timer) clearInterval(state.timer);
  state.timer = null;
}

function demo() {
  const was = state.auto;
  state.auto = false;
  stopAuto();
  $("auto-btn").textContent = "▶ Auto Simulation: OFF";

  state.gate = "A1";
  Object.assign(gateData.A1, {
    occupancy: 40, temperature: 24, humidity: 45,
    light: 80, air: 85, water: 18
  });

  render();
  alertAdd(
    "Demo scenario started",
    "Gate A1 transitions from a quiet morning to an evening peak.",
    "info"
  );

  const steps = [
    { occupancy: 75, temperature: 25, humidity: 48, light: 65, air: 78, water: 22 },
    { occupancy: 120, temperature: 27, humidity: 53, light: 45, air: 68, water: 30 },
    { occupancy: 180, temperature: 30, humidity: 61, light: 20, air: 48, water: 43 },
    { occupancy: 180, temperature: 30, humidity: 61, light: 20, air: 35, water: 52 }
  ];

  steps.forEach((s, i) => {
    setTimeout(() => {
      Object.assign(gateData.A1, s);
      state.gate = "A1";
      render();

      if (i === 2) {
        alertAdd("Peak occupancy detected", "HVAC and ventilation recommendations have increased.", "warn");
      }

      if (i === 3) {
        alertAdd("Demo scenario complete", "Review Gate A1 energy and sustainability changes.", "info");
        state.auto = was;
        $("auto-btn").textContent = was
          ? "Ⅱ Auto Simulation: ON"
          : "▶ Auto Simulation: OFF";

        if (was) startAuto();
      }
    }, (i + 1) * 3200);
  });
}

function calc(d) {
  let lighting = d.light > 70 ? 20 : d.light >= 40 ? 50 : 100;
  if (d.occupancy < 20) lighting = Math.min(lighting, 40);

  let hvac = d.temperature > 28 && d.occupancy > 100
    ? 85
    : d.temperature > 25 ? 55 : 25;

  if (d.occupancy < 20) hvac = 15;

  const ventilation = d.air < 40 ? 90 : d.air < 60 ? 65 : 35;
  const waterOutput = d.water > 45 ? 80 : d.water > 30 ? 50 : 30;

  const energy = rnd(
    10 + lighting / 100 * 6 +
    (hvac >= 80 ? 24 : hvac >= 50 ? 14 : 6) +
    (ventilation >= 80 ? 8 : 3),
    1
  );

  const energyScore = clamp(Math.round(100 - energy * 1.7), 10, 100);
  const lightingScore = clamp(Math.round(100 - lighting * 0.55 + d.light * 0.15), 15, 100);
  const waterScore = clamp(Math.round(100 - d.water * 0.75), 10, 100);
  const airScore = d.air;
  const comfortScore = clamp(
    Math.round(100 - Math.abs(d.temperature - 23.5) * 5 - Math.max(0, d.occupancy - 150) * 0.12),
    10, 100
  );

  const eco = Math.round(
    energyScore * 0.25 +
    lightingScore * 0.15 +
    waterScore * 0.15 +
    airScore * 0.2 +
    comfortScore * 0.25
  );

  return {
    lighting, hvac, ventilation, waterOutput, energy,
    energyScore, lightingScore, waterScore, airScore, comfortScore, eco
  };
}

function text(id, value) {
  if ($(id)) $(id).textContent = value;
}

function meter(id, value) {
  if ($("bar-" + id)) {
    $("bar-" + id).style.width = clamp(value, 0, 100) + "%";
  }
}

function status(id, value, kind = "") {
  if ($("status-" + id)) {
    $("status-" + id).textContent = value;
    $("status-" + id).className = kind;
  }
}

function render() {
  const g = state.gate;
  const d = gateData[g];
  const c = calc(d);

  text("current-gate", "Gate " + g);

  [
    ["passengers", d.occupancy],
    ["temperature", d.temperature.toFixed(1)],
    ["humidity", d.humidity],
    ["natural-light", d.light],
    ["air-quality", d.air],
    ["energy", c.energy.toFixed(1)],
    ["water", d.water]
  ].forEach(([id, value]) => text(id, value));

  meter("passengers", d.occupancy / 240 * 100);
  meter("temperature", (d.temperature - 18) / 16 * 100);
  meter("humidity", d.humidity);
  meter("light", d.light);
  meter("air", d.air);
  meter("energy", c.energy / 45 * 100);
  meter("water", d.water / 65 * 100);

  status("passengers", d.occupancy > 170 ? "HIGH LOAD" : d.occupancy < 20 ? "QUIET" : "NORMAL", d.occupancy > 170 ? "warn" : "");
  status("temperature", d.temperature > 28 ? "WARM" : "NORMAL", d.temperature > 28 ? "warn" : "");
  status("humidity", d.humidity > 70 ? "HIGH" : "NORMAL", d.humidity > 70 ? "warn" : "");
  status("light", d.light > 70 ? "GOOD" : d.light < 30 ? "LOW" : "MODERATE", d.light < 30 ? "warn" : "");
  status("air", d.air < 40 ? "POOR" : d.air < 60 ? "FAIR" : "GOOD", d.air < 40 ? "bad" : d.air < 60 ? "warn" : "");
  status("energy", c.energy > 35 ? "HIGH DEMAND" : "OPTIMIZED", c.energy > 35 ? "warn" : "");
  status("water", d.water > 45 ? "HIGH FLOW" : "NORMAL", d.water > 45 ? "warn" : "");

  document.querySelectorAll(".gate").forEach(el => {
    el.classList.toggle("selected", el.dataset.gate === g);
  });

  Object.keys(gateData).forEach(id => {
    const gd = gateData[id];
    const gc = calc(gd);
    text("gc-score-" + id, gc.eco);
    $("gc-fill-" + id).style.width = gc.eco + "%";
    text("status-" + id,
      gd.occupancy > 170 ? "BUSY" :
      gd.occupancy < 20 ? "QUIET" :
      gd.occupancy > 90 ? "MODERATE" : "LOW LOAD"
    );
  });

  text("eco-score", c.eco);
  $(".ring").style.background =
    `conic-gradient(var(--cyan) 0 ${c.eco}%,#23384d ${c.eco}% 100%)`;

  text("score-label", c.eco >= 80 ? "Excellent" : c.eco >= 65 ? "Good" : c.eco >= 45 ? "Needs attention" : "Critical");
  text("score-summary",
    c.eco >= 80 ? "Conditions are efficient and comfortable." :
    c.eco >= 60 ? "Some operating conditions could be improved." :
    "Review environmental conditions and system demand."
  );

  [
    ["energy", c.energyScore],
    ["lighting", c.lightingScore],
    ["water", c.waterScore],
    ["air", c.airScore],
    ["comfort", c.comfortScore]
  ].forEach(([key, value]) => {
    text(key + "-score", value);
    if ($(key + "-score-bar")) $(key + "-score-bar").style.width = value + "%";
  });

  const rows = [
    ["lighting", c.lighting, c.lighting >= 80 ? "HIGH" : c.lighting >= 40 ? "BALANCED" : "OPTIMIZED",
      d.light > 70 ? "High daylight detected. Artificial lighting reduced." :
      d.light >= 40 ? "Partial daylight available. Lighting set to a balanced level." :
      "Low daylight detected. Higher artificial lighting is recommended.", "light"],

    ["hvac", c.hvac, c.hvac >= 80 ? "HIGH" : c.hvac >= 50 ? "MEDIUM" : "LOW",
      d.occupancy < 20 ? "Low occupancy detected. HVAC demand is reduced." :
      d.temperature > 28 ? "Warm conditions and high occupancy call for stronger cooling." :
      d.temperature > 25 ? "Moderate cooling is recommended to maintain comfort." :
      "Comfort conditions are within target range.", "hvac"],

    ["ventilation", c.ventilation, d.air < 40 ? "BOOST" : d.air < 60 ? "INCREASED" : "NORMAL",
      d.air < 40 ? "Poor air-quality score. Increase ventilation and inspect the environment." :
      d.air < 60 ? "Air quality needs attention. Ventilation is increased." :
      "Air quality is acceptable. Standard ventilation active.", "ventilation"],

    ["water", c.waterOutput, d.water > 45 ? "CHECK FLOW" : "NORMAL",
      d.water > 45 ? "High water flow detected. Check for leaks or unnecessary usage." :
      "Water use is within the normal simulated range.", "water"]
  ];

  rows.forEach(([key, pct, label, reason, actuator]) => {
    const enabled = state.act[actuator];

    text(key + "-decision", enabled ? label : "DISABLED");
    text(key + "-percent", pct + "%");
    text(key + "-reason", enabled ? reason : "This simulated actuator is disabled by the operator.");

    $("actuator-" + actuator).style.width = (enabled ? pct : 0) + "%";
    text("actuator-" + actuator + "-percent", pct + "%");
    text("actuator-" + actuator + "-state", enabled ? "Enabled" : "Disabled");
    $("switch-" + actuator).checked = enabled;
  });

  recommendations(d, c);
  analytics(c);
  historyAdd(c.energy);
  chart();

  text("table-lighting", (state.act.light ? c.lighting : 0) + "% output");
  text("table-hvac",
    state.act.hvac
      ? (c.hvac >= 80 ? "High / demand-aware" : c.hvac >= 50 ? "Medium / demand-aware" : "Low / demand-aware")
      : "Disabled by operator"
  );
  text("table-baseline", "30 kW");
  text("table-energy", c.energy + " kW");
  text("table-saving", Math.max(0, Math.round((30 - c.energy) / 30 * 100)) + "% lower");

  renderAlerts();
}

function recommendations(d, c) {
  const r = [];

  if (d.light > 65) {
    r.push(["☼", "Use natural daylight", "Daylight availability is high. Reduce artificial lighting where safe.", "ENERGY"]);
  } else if (d.light < 30) {
    r.push(["☼", "Support low daylight", "Keep required lighting levels while avoiding unnecessary zones.", "LIGHTING"]);
  }

  if (d.temperature > 27 || d.occupancy > 150) {
    r.push(["♨", "Review passenger comfort", "High temperature or occupancy suggests monitoring HVAC performance.", "COMFORT"]);
  } else {
    r.push(["♧", "Maintain comfortable conditions", "Continue monitoring temperature and passenger occupancy.", "COMFORT"]);
  }

  if (d.air < 50) {
    r.push(["◎", "Improve air quality", "Increase ventilation and investigate the low air-quality score.", "AIR QUALITY"]);
  }

  if (d.water > 45) {
    r.push(["≋", "Inspect water flow", "The simulated flow rate is elevated. Check for leaks.", "WATER"]);
  } else {
    r.push(["≋", "Keep tracking water use", "Water flow is within the normal simulated range.", "WATER"]);
  }

  if (c.energy > 30) {
    r.push(["ϟ", "Reduce energy demand", "Review HVAC intensity and lighting settings.", "ENERGY"]);
  }

  $("recommendations-list").innerHTML = r.slice(0, 3).map(item => `
    <article class="recommendation">
      <span>${item[0]}</span>
      <div>
        <strong>${item[1]}</strong>
        <p>${item[2]}</p>
        <em>${item[3]}</em>
      </div>
    </article>
  `).join("");
}

function analytics(c) {
  const save = Math.max(0, Math.round((30 - c.energy) / 30 * 100));

  text("current-energy", c.energy.toFixed(1));
  text("daily-energy", Math.round(c.energy * 24));
  text("energy-saved", save);
  text("compare-conventional", "30 kW");
  text("compare-eco", c.energy + " kW");
  text("compare-saving", save + "% lower demand");

  $("compare-conventional-bar").style.width = "100%";
  $("compare-eco-bar").style.width = clamp(c.energy / 30 * 100, 0, 100) + "%";

  text("compare-lighting", c.lighting + "%");
  text("compare-hvac", c.hvac >= 80 ? "HIGH" : c.hvac >= 50 ? "MEDIUM" : "LOW");
}

function historyAdd(value) {
  if (Math.abs(state.history[state.history.length - 1] - value) > 0.2) {
    state.history.push(value);
    if (state.history.length > 12) state.history.shift();
  }
}

function chart() {
  const values = state.history;
  const max = Math.max(30, ...values);

  $("energy-chart").innerHTML = values.map((value, i) => `
    <div style="height:${Math.max(8, value / max * 100)}%">
      <em>${value} kW</em>
      <span>${i + 1}</span>
    </div>
  `).join("");
}

function alertAdd(title, message, type = "info") {
  state.alerts.unshift({
    title, message, type,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  });

  state.alerts = state.alerts.slice(0, 8);
  renderAlerts();
}

function renderAlerts() {
  if (!state.alerts.length) {
    $("alert-stream").innerHTML = `
      <div class="alert">
        <span>●</span>
        <div><b>No active alerts</b><p>New simulation events will appear here.</p></div>
      </div>`;
    return;
  }

  $("alert-stream").innerHTML = state.alerts.map(a => `
    <div class="alert ${a.type}">
      <span>${a.type === "warn" ? "◆" : "●"}</span>
      <div><b>${safe(a.title)}</b><p>${safe(a.message)}</p></div>
      <time>${a.time}</time>
    </div>
  `).join("");
}

function safe(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  }[c]));
}

function exportCSV() {
  const rows = [[
    "Gate", "Passengers", "Temperature C", "Humidity %",
    "Natural light %", "Air quality score", "Water L per hour",
    "Estimated energy kW", "Eco Score"
  ]];

  Object.entries(gateData).forEach(([g, d]) => {
    const c = calc(d);
    rows.push([
      g, d.occupancy, d.temperature, d.humidity, d.light,
      d.air, d.water, c.energy, c.eco
    ]);
  });

  const csv = rows.map(row =>
    row.map(value => '"' + String(value).replace(/"/g, '""') + '"').join(",")
  ).join("\r\n");

  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "ecogate-sensor-report.csv";
  a.click();
  URL.revokeObjectURL(url);
  toast("CSV report exported");
}

const slides = [
  ["Welcome to EcoGate", "A software-based IoT simulation for sustainable airport gate management."],
  ["Live sensor readings", "Review occupancy, temperature, humidity, daylight, air quality, energy and water."],
  ["Airport gate map", "Select A1–A4 to inspect different simulated gate conditions and flight information."],
  ["Decision engine", "See how threshold rules recommend lighting, HVAC, ventilation and water settings."],
  ["Analytics and impact", "Review estimated energy demand, alerts, recommendations and IoT architecture."]
];

function startTour() {
  state.tour = 0;
  document.body.classList.add("presentation-mode");
  $("tour-bar").hidden = false;
  showTour();
}

function showTour() {
  text("tour-title", slides[state.tour][0]);
  text("tour-description", slides[state.tour][1]);
  text("tour-progress", (state.tour + 1) + " / " + slides.length);
  $("tour-prev").disabled = state.tour === 0;
  $("tour-next").textContent = state.tour === slides.length - 1 ? "Finish" : "Next";

  document.querySelectorAll("main section")[
    Math.min(state.tour, document.querySelectorAll("main section").length - 1)
  ].scrollIntoView({ behavior: "smooth", block: "start" });
}

function moveTour(n) {
  state.tour += n;

  if (state.tour >= slides.length) {
    exitTour();
    return;
  }

  state.tour = Math.max(0, state.tour);
  showTour();
}

function exitTour() {
  state.tour = -1;
  $("tour-bar").hidden = true;
  document.body.classList.remove("presentation-mode");
  toast("Presentation mode closed");
}

let toastTimer;

function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2200);
}

document.addEventListener("DOMContentLoaded", init);
