// ===== EcoGate: all sensor data is SIMULATED =====
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);

// Main gate (A1) sensor values. aq = CO2 in ppm (higher = worse), water = litres/hour
let data = { pax: 146, temp: 28, hum: 55, light: 35, aq: 700, water: 180 };
let autoOn = true, autoTimer = null, demoTimer = null, selectedGate = 0;
let history = [];   // for the energy chart

// Gate variations so each gate looks different
const gates = [
  { name: "Gate A1", p: 1,   t: 0,    l: 0 },
  { name: "Gate A2", p: 0.6, t: -1.5, l: 10 },
  { name: "Gate A3", p: 1.2, t: 1.5,  l: -10 },
  { name: "Gate A4", p: 0.4, t: -2,   l: 15 }
];

// ---------- 1. SENSOR SIMULATION ----------
function updateSensors() {   // random small changes (random walk)
  data.pax   = Math.round(clamp(data.pax + rnd(-30, 30), 0, 250));
  data.temp  = +clamp(data.temp + rnd(-1.5, 1.5), 18, 35).toFixed(1);
  data.hum   = Math.round(clamp(data.hum + rnd(-5, 5), 30, 80));
  data.light = Math.round(clamp(data.light + rnd(-20, 20), 0, 100));
  data.aq    = Math.round(clamp(data.aq + rnd(-120, 120) + (data.pax > 150 ? 40 : -10), 400, 1500));
  data.water = Math.round(clamp(data.water + rnd(-40, 40), 50, 400));
}

// Create this gate's readings from main data
function gateData(i) {
  const g = gates[i];
  return {
    pax: Math.round(clamp(data.pax * g.p, 0, 250)),
    temp: +clamp(data.temp + g.t, 18, 35).toFixed(1),
    hum: data.hum,
    light: clamp(data.light + g.l, 0, 100),
    aq: Math.round(clamp(data.aq * (0.8 + g.p * 0.2), 400, 1500)),
    water: Math.round(clamp(data.water * (0.6 + g.p * 0.4), 50, 400))
  };
}

// ---------- 2. DECISION ENGINE ----------
function controlLighting(d) {
  let pct = d.light > 70 ? 20 : d.light >= 40 ? 50 : 100;
  if (d.pax < 20) pct = Math.max(10, pct - 20);          // nobody around: dim more
  else if (d.pax > 150 && pct < 100) pct += 10;          // crowded: a bit brighter
  const status = pct <= 30 ? "ENERGY SAVING" : pct <= 60 ? "BALANCED" : "FULL BRIGHTNESS";
  return { pct, status };
}

function controlHVAC(d) {
  if (d.temp > 28 && d.pax > 100) return { level: "HIGH", reason: "High temperature + high occupancy" };
  if (d.temp > 25 && d.pax < 20)  return { level: "LOW", reason: "Very low occupancy: reduce HVAC" };
  if (d.temp > 25) return { level: "MEDIUM", reason: "Temperature above 25°C" };
  if (d.pax < 20)  return { level: "LOW", reason: "Very low occupancy: reduce HVAC" };
  return { level: "LOW", reason: "Comfortable temperature" };
}

function checkAirQuality(d) {
  if (d.aq > 1000) return { level: "HIGH", label: "POOR", reason: "Poor air quality" };
  if (d.aq > 800)  return { level: "NORMAL", label: "MODERATE", reason: "Moderate air quality" };
  return { level: "NORMAL", label: "GOOD", reason: "Good air quality" };
}

function checkWater(d) {
  return d.water > 300 ? { status: "HIGH USAGE", high: true } : { status: "OPTIMAL", high: false };
}

// ---------- 3. ENERGY ----------
function calculateEnergy(d) {
  const light = controlLighting(d), hvac = controlHVAC(d), vent = checkAirQuality(d);
  const people = d.pax * 0.05;
  const lightKw = 20 * light.pct / 100;
  const hvacKw = { LOW: 10, MEDIUM: 25, HIGH: 45 }[hvac.level];
  const ventKw = vent.level === "HIGH" ? 12 : 5;
  const total = +(lightKw + hvacKw + ventKw + people).toFixed(1);
  const conventional = +(20 + 45 + 12 + people).toFixed(1);   // everything at 100%
  return { total, conventional, saved: +(conventional - total).toFixed(1) };
}

// ---------- 4. ECO SCORE (0-100) ----------
function calculateEcoScore(d) {
  const e = calculateEnergy(d), light = controlLighting(d);
  const ratio = e.total / e.conventional;
  const energyPts = 30 * clamp(1 - (ratio - 0.4) / 0.6, 0, 1);
  const lightPts = 20 - 12 * light.pct / 100;
  const waterPts = 20 * clamp(1 - (d.water - 150) / 250, 0, 1);
  const airPts = 15 * clamp(1 - (d.aq - 600) / 700, 0, 1);
  const comfortPts = clamp(15 - Math.abs(d.temp - 24) * 1.5 - Math.abs(d.hum - 50) * 0.1, 0, 15);
  return Math.round(energyPts + lightPts + waterPts + airPts + comfortPts);
}

// ---------- 5. ALERTS ----------
function levelOf(v, warn, crit) { return v >= crit ? "red" : v >= warn ? "yellow" : "green"; }
function getAlerts(d) {
  const e = calculateEnergy(d);
  const icon = { green: "🟢", yellow: "🟡", red: "🔴" };
  const list = [
    ["Passenger occupancy", levelOf(d.pax, 150, 200), d.pax + " passengers"],
    ["Temperature", levelOf(d.temp, 29, 32), d.temp + "°C"],
    ["Air quality", levelOf(d.aq, 800, 1000), d.aq + " ppm CO₂"],
    ["Energy consumption", levelOf(e.total, 45, 65), e.total + " kW"],
    ["Water usage", levelOf(d.water, 220, 300), d.water + " L/h"]
  ];
  return list.map(a => ({ level: a[1], icon: icon[a[1]], text: a[0] + ": " + a[2] }));
}

// ---------- 6. RECOMMENDATIONS ----------
function generateRecommendations(d) {
  const r = [], light = controlLighting(d), hvac = controlHVAC(d), air = checkAirQuality(d), e = calculateEnergy(d), w = checkWater(d);
  if (d.light > 70) r.push("☀️ Natural daylight is sufficient. Reduce artificial lighting to " + light.pct + "%.");
  if (d.light < 40) r.push("💡 Natural light is low. Increase artificial lighting to " + light.pct + "%.");
  if (d.pax > 100 && d.temp > 28) r.push("👥 High passenger density detected. Increase HVAC to HIGH.");
  if (d.pax < 20) r.push("🧍 Very few passengers. Reduce HVAC and lighting.");
  if (e.total > 45) r.push("⚡ Energy consumption is above the normal threshold.");
  if (air.level === "HIGH") r.push("🌬️ Air quality is poor. Increase ventilation.");
  if (w.high) r.push("💦 Water usage is high. Consider reducing irrigation/cleaning consumption.");
  if (r.length === 0) r.push("✅ All gate conditions are optimal. Resources are being used efficiently.");
  return r;
}

// ---------- 7. DASHBOARD ----------
function card(icon, label, value, unit) {
  return `<div class="card"><div class="icon">${icon}</div><div class="label">${label}</div><div class="value">${value}</div><div class="unit">${unit}</div></div>`;
}
function badge(text, color) { return `<span class="badge ${color}">${text}</span>`; }

function updateDashboard() {
  const d = gateData(selectedGate);
  const e = calculateEnergy(d), light = controlLighting(d), hvac = controlHVAC(d), air = checkAirQuality(d), w = checkWater(d);
  $("gateTitle").textContent = "(" + gates[selectedGate].name + ")";

  $("sensors").innerHTML =
    card("👥", "Passenger Occupancy", d.pax, "Passengers") +
    card("🌡️", "Temperature", d.temp + "°C", "") +
    card("💧", "Humidity", d.hum + "%", "") +
    card("☀️", "Natural Light", d.light + "%", "") +
    card("🌬️", "Air Quality", d.aq, "ppm CO₂ (" + air.label + ")") +
    card("⚡", "Energy", e.total + " kW", "") +
    card("💦", "Water Usage", d.water, "Litres/hour");

  const lc = light.pct <= 30 ? "green" : light.pct <= 60 ? "yellow" : "red";
  const hc = { LOW: "green", MEDIUM: "yellow", HIGH: "red" }[hvac.level];
  $("actuators").innerHTML =
    card("💡", "Smart Lights", light.pct + "%", badge(light.status, lc)) +
    card("❄️", "HVAC", hvac.level, badge("ACTIVE", hc) + "<br>Reason: " + hvac.reason) +
    card("🌬️", "Ventilation", air.level, badge(air.level === "HIGH" ? "⚠️ BOOSTED" : "NORMAL", air.level === "HIGH" ? "red" : "green")) +
    card("💧", "Water Management", w.status, badge(w.high ? "⚠️ High Water Usage Detected" : "OK", w.high ? "red" : "green"));

  // Eco score ring
  const score = calculateEcoScore(d);
  $("scoreText").textContent = score;
  $("ring").style.strokeDashoffset = 314 * (1 - score / 100);
  $("ring").style.stroke = score >= 70 ? "#2ecc71" : score >= 45 ? "#f1c40f" : "#e74c3c";

  $("alerts").innerHTML = getAlerts(d).map(a => `<div class="alert ${a.level}">${a.icon} ${a.text}</div>`).join("");
  $("recs").innerHTML = generateRecommendations(d).map(t => `<li>${t}</li>`).join("");

  $("energyCards").innerHTML =
    card("⚡", "Current Energy", e.total, "kW") +
    card("📅", "Daily Estimated Energy", Math.round(e.total * 24), "kWh (if conditions stay same)") +
    card("🌿", "Estimated Energy Saved", e.saved, "kW vs conventional");

  // Gate map
  $("gates").innerHTML = gates.map((g, i) => {
    const t = calculateEnergy(gateData(i)).total;
    const st = t < 40 ? ["🟢 Efficient", "green"] : t < 60 ? ["🟡 Moderate", "yellow"] : ["🔴 High Consumption", "red"];
    return `<div class="gate ${i === selectedGate ? "sel" : ""}" onclick="selectGate(${i})"><b>${g.name}</b><br>${t} kW<br>${badge(st[0], st[1])}</div>`;
  }).join("");

  history.push({ eco: e.total, conv: e.conventional });
  if (history.length > 25) history.shift();
  drawChart();
}

function selectGate(i) { selectedGate = i; history = []; updateDashboard(); }

// Simple line chart on canvas (no library)
function drawChart() {
  const c = $("chart"), ctx = c.getContext("2d");
  ctx.clearRect(0, 0, c.width, c.height);
  const max = 100, step = c.width / 24;
  const line = (key, color, dash) => {
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.setLineDash(dash);
    history.forEach((p, i) => {
      const x = 20 + i * step, y = c.height - 20 - (p[key] / max) * (c.height - 40);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();
  };
  line("conv", "#e74c3c", [8, 6]);
  line("eco", "#2ecc71", []);
  ctx.setLineDash([]); ctx.fillStyle = "#8fa8c8"; ctx.font = "12px Arial";
  ctx.fillText("kW (0-100)", 4, 12);
}

// ---------- 8. BUTTONS, AUTO MODE, DEMO ----------
function simulateOnce() { updateSensors(); updateDashboard(); }

function startAuto() { clearInterval(autoTimer); autoTimer = setInterval(simulateOnce, 3000); }

$("btnSim").onclick = simulateOnce;
$("btnAuto").onclick = () => {
  autoOn = !autoOn;
  $("btnAuto").textContent = "Auto Simulation: " + (autoOn ? "ON" : "OFF");
  autoOn ? startAuto() : clearInterval(autoTimer);
};

$("btnDemo").onclick = () => {
  clearInterval(autoTimer); clearInterval(demoTimer);
  selectedGate = 0; history = [];
  const normal = { pax: 40, temp: 24, light: 80, aq: 600, hum: 50, water: 120 };
  const busy   = { pax: 180, temp: 30, light: 20, aq: 1100, hum: 65, water: 320 };
  Object.assign(data, normal);
  $("demoBanner").classList.remove("hidden");
  $("demoBanner").textContent = "🎬 DEMO: Normal gate (40 passengers, 24°C, bright daylight)...";
  updateDashboard();
  let step = 0;
  setTimeout(() => {
    demoTimer = setInterval(() => {
      step++;
      const f = step / 10;   // 0 → 1 over 10 steps
      for (const k in normal) data[k] = Math.round(normal[k] + (busy[k] - normal[k]) * f);
      $("demoBanner").textContent = "🎬 DEMO: Gate is getting busy... (" + step * 10 + "%)";
      updateDashboard();
      if (step >= 10) {
        clearInterval(demoTimer);
        $("demoBanner").textContent = "🎬 DEMO complete: busy gate → HVAC, lights and ventilation increased!";
        if (autoOn) setTimeout(() => { $("demoBanner").classList.add("hidden"); startAuto(); }, 6000);
      }
    }, 1200);
  }, 3000);
};

// ---------- START ----------
updateDashboard();
startAuto();
