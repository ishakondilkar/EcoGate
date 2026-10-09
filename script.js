"use strict";

/* =========================================================
ECOGATE
IoT-Based Smart Sustainable Airport Gate Management
Pure Vanilla JavaScript
Software-Based IoT Simulation
========================================================= */

/* =========================================================

GATE SENSOR DATA
========================================================= */

const gateData = {
A1: {
passengers: 40,
temperature: 24,
humidity: 45,
light: 80,
airQuality: 85,
water: 18
},

A2: {
    passengers: 132,
    temperature: 27.5,
    humidity: 55,
    light: 55,
    airQuality: 62,
    water: 31
},

A3: {
    passengers: 205,
    temperature: 30.5,
    humidity: 68,
    light: 25,
    airQuality: 38,
    water: 52
},

A4: {
    passengers: 12,
    temperature: 22,
    humidity: 40,
    light: 65,
    airQuality: 90,
    water: 9
}

};

let selectedGate = "A1";
let autoSimulation = true;
let autoTimer = null;
let energyHistory = [];
let demoRunning = false;
let demoTimer = null;

/* =========================================================
2. HELPER FUNCTIONS
========================================================= */

function $(id) {
return document.getElementById(id);
}

function clamp(value, min, max) {
return Math.max(min, Math.min(max, value));
}

function randomBetween(min, max) {
return Math.random() * (max - min) + min;
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

function getCurrentGate() {
return gateData[selectedGate];
}

/* =========================================================
3. CLOCK
========================================================= */

function updateClock() {
const clock = $("clock");

if (!clock) return;

const now = new Date();

clock.textContent = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
});

}

setInterval(updateClock, 1000);
updateClock();

/* =========================================================
4. SENSOR → DECISION ENGINE
========================================================= */

function calculateDecisions(data) {

/* -------------------------
   LIGHTING
   ------------------------- */

let lightingPercent;
let lightingReason;

if (data.light > 70) {
    lightingPercent = 20;
    lightingReason = "High natural daylight detected.";
} else if (data.light >= 40) {
    lightingPercent = 50;
    lightingReason = "Moderate daylight detected.";
} else {
    lightingPercent = 100;
    lightingReason = "Low natural daylight detected.";
}

if (data.passengers < 20) {
    lightingPercent = Math.min(lightingPercent, 40);
    lightingReason += " Low occupancy reduces lighting demand.";
}


/* -------------------------
   HVAC
   ------------------------- */

let hvacDecision;
let hvacPercent;
let hvacReason;

if (data.passengers < 20) {
    hvacDecision = "LOW";
    hvacPercent = 30;
    hvacReason = "Low occupancy detected.";
} else if (data.temperature > 28 && data.passengers > 100) {
    hvacDecision = "HIGH";
    hvacPercent = 100;
    hvacReason = "High temperature and high occupancy.";
} else if (data.temperature > 25) {
    hvacDecision = "MEDIUM";
    hvacPercent = 60;
    hvacReason = "Temperature above comfort range.";
} else {
    hvacDecision = "LOW";
    hvacPercent = 30;
    hvacReason = "Temperature within comfortable range.";
}


/* -------------------------
   VENTILATION
   ------------------------- */

let ventilationPercent;
let ventilationReason;

if (data.airQuality < 40) {
    ventilationPercent = 100;
    ventilationReason = "Poor air quality detected. Maximum ventilation required.";
} else {
    ventilationPercent = 50;
    ventilationReason = "Air quality is within acceptable range.";
}


/* -------------------------
   WATER
   ------------------------- */

let waterPercent;
let waterReason;

if (data.water > 45) {
    waterPercent = 100;
    waterReason = "High water consumption detected. Check for wastage.";
} else {
    waterPercent = 50;
    waterReason = "Water consumption is within normal range.";
}

return {
    lightingPercent,
    lightingReason,
    hvacDecision,
    hvacPercent,
    hvacReason,
    ventilationPercent,
    ventilationReason,
    waterPercent,
    waterReason
};

}

/* =========================================================
5. ENERGY CALCULATION
========================================================= */

function calculateEnergy(data, decisions) {

const baseEnergy = 10;

const lightingEnergy =
    6 * (decisions.lightingPercent / 100);

let hvacEnergy;

if (decisions.hvacDecision === "HIGH") {
    hvacEnergy = 24;
} else if (decisions.hvacDecision === "MEDIUM") {
    hvacEnergy = 14;
} else {
    hvacEnergy = 6;
}

const ventilationEnergy =
    decisions.ventilationPercent >= 100 ? 8 : 3;

return round(
    baseEnergy +
    lightingEnergy +
    hvacEnergy +
    ventilationEnergy,
    1
);

}

/* =========================================================
6. ECO SCORE
========================================================= */

function calculateEcoScore(data, decisions, energy) {

/* Energy score */
const energyScore = clamp(
    100 - ((energy - 15) / 35) * 100,
    0,
    100
);

/* Lighting score */
const lightingScore = clamp(
    100 - Math.abs(decisions.lightingPercent - 35),
    0,
    100
);

/* Water score */
const waterScore = clamp(
    100 - (data.water / 70) * 100,
    0,
    100
);

/* Air quality */
const airScore = clamp(
    data.airQuality,
    0,
    100
);

/* Comfort */
let temperatureComfort =
    100 - Math.abs(data.temperature - 24) * 12;

temperatureComfort = clamp(
    temperatureComfort,
    0,
    100
);

let occupancyComfort;

if (data.passengers <= 150) {
    occupancyComfort = 100;
} else {
    occupancyComfort = clamp(
        100 - ((data.passengers - 150) / 100) * 100,
        0,
        100
    );
}

const comfortScore =
    (temperatureComfort + occupancyComfort) / 2;

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
7. UPDATE SENSOR CARDS
========================================================= */

function updateSensorDisplay(data) {

setText("passengers", Math.round(data.passengers));

setText(
    "temperature",
    `${round(data.temperature, 1)} °C`
);

setText(
    "humidity",
    `${Math.round(data.humidity)} %`
);

setText(
    "natural-light",
    `${Math.round(data.light)} %`
);

setText(
    "air-quality",
    `${Math.round(data.airQuality)} AQ`
);

setText(
    "water",
    `${round(data.water, 1)} L/hr`
);

}

/* =========================================================
8. UPDATE DECISION ENGINE
========================================================= */

function updateDecisionDisplay(decisions) {

setText(
    "lighting-decision",
    decisions.lightingPercent >= 100
        ? "FULL"
        : decisions.lightingPercent >= 50
            ? "MEDIUM"
            : "LOW"
);

setText(
    "lighting-percent",
    `${decisions.lightingPercent}%`
);

setText(
    "lighting-reason",
    decisions.lightingReason
);


setText(
    "hvac-decision",
    decisions.hvacDecision
);

setText(
    "hvac-percent",
    `${decisions.hvacPercent}%`
);

setText(
    "hvac-reason",
    decisions.hvacReason
);


setText(
    "ventilation-decision",
    decisions.ventilationPercent >= 100
        ? "HIGH"
        : "NORMAL"
);

setText(
    "ventilation-percent",
    `${decisions.ventilationPercent}%`
);

setText(
    "ventilation-reason",
    decisions.ventilationReason
);


setText(
    "water-decision",
    decisions.waterPercent >= 100
        ? "CHECK"
        : "NORMAL"
);

setText(
    "water-percent",
    `${decisions.waterPercent}%`
);

setText(
    "water-reason",
    decisions.waterReason
);

}

/* =========================================================
9. UPDATE ACTUATORS
========================================================= */

function updateActuators(decisions) {

setText(
    "actuator-light-percent",
    `${decisions.lightingPercent}%`
);

setText(
    "actuator-light-state",
    decisions.lightingPercent >= 100
        ? "FULL POWER"
        : decisions.lightingPercent >= 50
            ? "DIMMED"
            : "ENERGY SAVING"
);


setText(
    "actuator-hvac-percent",
    `${decisions.hvacPercent}%`
);

setText(
    "actuator-hvac-state",
    decisions.hvacDecision
);


setText(
    "actuator-ventilation-percent",
    `${decisions.ventilationPercent}%`
);

setText(
    "actuator-ventilation-state",
    decisions.ventilationPercent >= 100
        ? "HIGH"
        : "NORMAL"
);


setText(
    "actuator-water-percent",
    `${decisions.waterPercent}%`
);

setText(
    "actuator-water-state",
    decisions.waterPercent >= 100
        ? "CHECK REQUIRED"
        : "NORMAL"
);

}

/* =========================================================
10. UPDATE ECO SCORE
========================================================= */

function updateEcoScore(score) {

setText("eco-score", score.total);

let label = "EXCELLENT";

if (score.total < 40) {
    label = "POOR";
} else if (score.total < 60) {
    label = "FAIR";
} else if (score.total < 80) {
    label = "GOOD";
}

setText("score-label", label);

setText("energy-score", score.energy);
setText("lighting-score", score.lighting);
setText("water-score", score.water);
setText("air-score", score.air);
setText("comfort-score", score.comfort);

}

/* =========================================================
11. UPDATE ENERGY
========================================================= */

function updateEnergyDisplay(energy) {

setText(
    "energy",
    `${energy} kW`
);

setText(
    "current-energy",
    `${energy} kW`
);

const dailyEnergy = energy * 12;

setText(
    "daily-energy",
    `${round(dailyEnergy, 1)} kWh`
);

const saved =
    Math.max(0, 40 - energy);

setText(
    "energy-saved",
    `${round(saved, 1)}%`
);

}

/* =========================================================
12. ENERGY HISTORY
========================================================= */

function updateEnergyHistory(energy) {

energyHistory.push(energy);

if (energyHistory.length > 12) {
    energyHistory.shift();
}

drawEnergyChart();

}

/* =========================================================
13. ENERGY CHART
========================================================= */

function drawEnergyChart() {

const chart = $("energy-chart");

if (!chart) return;

if (energyHistory.length === 0) {
    chart.innerHTML = "";
    return;
}

const maxEnergy =
    Math.max(...energyHistory, 40);

chart.innerHTML = "";

energyHistory.forEach(value => {

    const bar = document.createElement("div");

    bar.className = "energy-bar";

    const height =
        Math.max(
            5,
            (value / maxEnergy) * 100
        );

    bar.style.height = `${height}%`;

    bar.title = `${value} kW`;

    chart.appendChild(bar);
});

}

/* =========================================================
14. BEFORE VS AFTER
========================================================= */

function updateBeforeAfter(data, decisions) {

const uncontrolledLighting = 100;

const lightingSaved =
    Math.max(
        0,
        uncontrolledLighting -
        decisions.lightingPercent
    );

const hvacSaved =
    decisions.hvacDecision === "LOW"
        ? 60
        : decisions.hvacDecision === "MEDIUM"
            ? 35
            : 10;

setText(
    "compare-lighting",
    `${Math.round(lightingSaved)}% saved`
);

setText(
    "compare-hvac",
    `${Math.round(hvacSaved)}% optimized`
);

}

/* =========================================================
15. RECOMMENDATIONS
========================================================= */

function updateRecommendations(data, decisions) {

const container = $("recommendations-list");

if (!container) return;

const recommendations = [];

if (data.light > 70) {
    recommendations.push(
        "Reduce artificial lighting because sufficient natural daylight is available."
    );
}

if (data.passengers < 20) {
    recommendations.push(
        "Low occupancy detected. Keep lighting and HVAC in energy-saving mode."
    );
}

if (data.passengers > 150) {
    recommendations.push(
        "High passenger occupancy detected. Increase HVAC and ventilation according to demand."
    );
}

if (data.temperature > 28) {
    recommendations.push(
        "Temperature is high. Increase cooling to maintain passenger comfort."
    );
}

if (data.airQuality < 40) {
    recommendations.push(
        "Poor air quality detected. Activate high ventilation."
    );
}

if (data.water > 45) {
    recommendations.push(
        "Water usage is high. Inspect washrooms and water systems for possible wastage."
    );
}

if (recommendations.length === 0) {
    recommendations.push(
        "Gate conditions are optimal. Continue current sustainable operating strategy."
    );
}

container.innerHTML = "";

recommendations.forEach((recommendation, index) => {

    const item = document.createElement("div");

    item.className = "recommendation-item";

    item.innerHTML = `
        <span class="recommendation-number">
            ${index + 1}
        </span>
        <span>${recommendation}</span>
    `;

    container.appendChild(item);
});

}

/* =========================================================
16. ALERTS
========================================================= */

function updateAlerts(data) {

const container = $("alert-stream");

if (!container) return;

const alerts = [];

if (data.airQuality < 40) {
    alerts.push({
        type: "WARNING",
        text: "Poor air quality detected."
    });
}

if (data.passengers > 180) {
    alerts.push({
        type: "HIGH",
        text: "Gate occupancy is very high."
    });
}

if (data.temperature > 30) {
    alerts.push({
        type: "WARNING",
        text: "High temperature detected."
    });
}

if (data.water > 45) {
    alerts.push({
        type: "WARNING",
        text: "High water consumption detected."
    });
}

if (alerts.length === 0) {
    alerts.push({
        type: "OK",
        text: "No critical sustainability alerts."
    });
}

container.innerHTML = "";

alerts.forEach(alert => {

    const item = document.createElement("div");

    item.className = "alert-item";

    item.innerHTML = `
        <strong>${alert.type}</strong>
        <span>${alert.text}</span>
    `;

    container.appendChild(item);
});

}

/* =========================================================
17. GATE STATUS / ECO SCORE COMPARISON
========================================================= */

function calculateGateSummary(gate) {

const data = gateData[gate];

const decisions =
    calculateDecisions(data);

const energy =
    calculateEnergy(data, decisions);

const score =
    calculateEcoScore(
        data,
        decisions,
        energy
    );

return {
    score: score.total,
    energy
};

}

function updateGateChart() {

Object.keys(gateData).forEach(gate => {

    const result =
        calculateGateSummary(gate);

    setText(
        `gc-score-${gate}`,
        result.score
    );

    const fill =
        $(`gc-fill-${gate}`);

    if (fill) {
        fill.style.width =
            `${result.score}%`;
    }

    const status =
        $(`status-${gate}`);

    if (status) {

        if (result.score >= 80) {
            status.textContent = "Excellent";
        } else if (result.score >= 60) {
            status.textContent = "Good";
        } else if (result.score >= 40) {
            status.textContent = "Fair";
        } else {
            status.textContent = "Poor";
        }
    }
});

}

/* =========================================================
18. UPDATE COMPLETE DASHBOARD
========================================================= */

function updateDashboard() {

const data = getCurrentGate();

const decisions =
    calculateDecisions(data);

const energy =
    calculateEnergy(
        data,
        decisions
    );

const score =
    calculateEcoScore(
        data,
        decisions,
        energy
    );

updateSensorDisplay(data);

updateDecisionDisplay(decisions);

updateActuators(decisions);

updateEcoScore(score);

updateEnergyDisplay(energy);

updateRecommendations(
    data,
    decisions
);

updateAlerts(data);

updateBeforeAfter(
    data,
    decisions
);

updateGateChart();

updateEnergyHistory(energy);

}

/* =========================================================
19. SIMULATE SENSOR CHANGE
========================================================= */

function simulateSensorChange() {

const data = getCurrentGate();

data.passengers = Math.round(
    clamp(
        data.passengers +
        randomBetween(-30, 30),
        0,
        250
    )
);

data.temperature = round(
    clamp(
        data.temperature +
        randomBetween(-1.5, 1.5),
        18,
        35
    ),
    1
);

data.humidity = Math.round(
    clamp(
        data.humidity +
        randomBetween(-5, 5),
        30,
        80
    )
);

data.light = Math.round(
    clamp(
        data.light +
        randomBetween(-15, 15),
        0,
        100
    )
);

data.airQuality = Math.round(
    clamp(
        data.airQuality +
        randomBetween(-15, 15),
        0,
        100
    )
);

data.water = round(
    clamp(
        data.water +
        randomBetween(-8, 8),
        5,
        70
    ),
    1
);

updateDashboard();

}

/* =========================================================
20. AUTO SIMULATION
========================================================= */

function startAutoSimulation() {

if (autoTimer) {
    clearInterval(autoTimer);
}

autoTimer = setInterval(() => {

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
21. AUTO BUTTON
========================================================= */

function updateAutoButton() {

const button = $("auto-btn");

if (!button) return;

if (autoSimulation) {

    button.textContent =
        "Auto Simulation: ON";

    button.classList.add("active");

} else {

    button.textContent =
        "Auto Simulation: OFF";

    button.classList.remove("active");
}

}

/* =========================================================
22. GATE SELECTION
========================================================= */

function selectGate(gate) {

if (!gateData[gate]) return;

selectedGate = gate;

setText(
    "current-gate",
    gate
);

document
    .querySelectorAll(".gate-btn")
    .forEach(button => {

        button.classList.toggle(
            "active",
            button.dataset.gate === gate
        );
    });

document
    .querySelectorAll(".gate-chart-col")
    .forEach(button => {

        button.classList.toggle(
            "active",
            button.dataset.gate === gate
        );
    });

updateDashboard();

}

/* =========================================================
23. DEMO SCENARIO
========================================================= */

const demoSteps = [

{
    passengers: 40,
    temperature: 24,
    humidity: 45,
    light: 80,
    airQuality: 85,
    water: 18
},

{
    passengers: 80,
    temperature: 25,
    humidity: 48,
    light: 65,
    airQuality: 75,
    water: 24
},

{
    passengers: 120,
    temperature: 27,
    humidity: 55,
    light: 45,
    airQuality: 62,
    water: 32
},

{
    passengers: 160,
    temperature: 29,
    humidity: 60,
    light: 30,
    airQuality: 48,
    water: 43
},

{
    passengers: 180,
    temperature: 30,
    humidity: 65,
    light: 20,
    airQuality: 32,
    water: 52
}

];

function runDemoScenario() {

if (demoRunning) return;

demoRunning = true;

stopAutoSimulation();

autoSimulation = false;

updateAutoButton();

selectGate("A1");

let step = 0;

const runStep = () => {

    if (step >= demoSteps.length) {

        demoRunning = false;

        autoSimulation = true;

        updateAutoButton();

        startAutoSimulation();

        return;
    }

    const demoData =
        demoSteps[step];

    gateData.A1 = {
        ...demoData
    };

    selectedGate = "A1";

    updateDashboard();

    step++;

    demoTimer = setTimeout(
        runStep,
        3200
    );
};

runStep();

}

/* =========================================================
24. CSV EXPORT
========================================================= */

function exportCSV() {

const data = getCurrentGate();

const decisions =
    calculateDecisions(data);

const energy =
    calculateEnergy(
        data,
        decisions
    );

const score =
    calculateEcoScore(
        data,
        decisions,
        energy
    );

const rows = [

    [
        "Gate",
        "Passengers",
        "Temperature",
        "Humidity",
        "Natural Light",
        "Air Quality",
        "Water Usage",
        "Energy",
        "Eco Score"
    ],

    [
        selectedGate,
        data.passengers,
        data.temperature,
        data.humidity,
        data.light,
        data.airQuality,
        data.water,
        energy,
        score.total
    ]
];

const csv =
    rows
        .map(row =>
            row
                .map(value =>
                    `"${String(value).replace(/"/g, '""')}"`
                )
                .join(",")
        )
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

link.href = url;

link.download =
    `EcoGate_${selectedGate}_data.csv`;

document.body.appendChild(link);

link.click();

document.body.removeChild(link);

URL.revokeObjectURL(url);

}

/* =========================================================
25. PRESENTATION MODE
========================================================= */

let presentationActive = false;

const presentationSteps = [
{
title: "Live IoT Sensor Monitoring",
description:
"EcoGate continuously monitors simulated passenger occupancy, temperature, humidity, natural light, air quality, energy and water consumption."
},

{
    title: "Intelligent Decision Engine",
    description:
        "Sensor readings are processed through sustainability rules to determine optimal lighting, HVAC, ventilation and water-management actions."
},

{
    title: "Smart Actuator Simulation",
    description:
        "The system simulates the actions that real IoT actuators could perform inside an airport gate."
},

{
    title: "Eco Score",
    description:
        "The Eco Score combines energy efficiency, lighting, water usage, air quality and passenger comfort."
},

{
    title: "Sustainable Airport Management",
    description:
        "EcoGate demonstrates how IoT-based automation can reduce resource consumption while maintaining passenger comfort."
}

];

let presentationStep = 0;

function showPresentationStep() {

const step =
    presentationSteps[presentationStep];

setText(
    "tour-title",
    step.title
);

setText(
    "tour-description",
    step.description
);

setText(
    "tour-progress",
    `${presentationStep + 1} / ${presentationSteps.length}`
);

}

function openPresentationMode() {

const bar = $("tour-bar");

if (!bar) return;

presentationActive = true;

presentationStep = 0;

bar.classList.add("active");

showPresentationStep();

}

function closePresentationMode() {

const bar = $("tour-bar");

if (!bar) return;

presentationActive = false;

bar.classList.remove("active");

}

function nextPresentationStep() {

if (
    presentationStep <
    presentationSteps.length - 1
) {

    presentationStep++;

    showPresentationStep();

} else {

    closePresentationMode();
}

}

function previousPresentationStep() {

if (presentationStep > 0) {

    presentationStep--;

    showPresentationStep();
}

}

/* =========================================================
26. EVENT LISTENERS
========================================================= */

document.addEventListener(
"DOMContentLoaded",
() => {

    /* Gate buttons */

    document
        .querySelectorAll(".gate-btn")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    selectGate(
                        button.dataset.gate
                    );
                }
            );
        });


    /* Gate chart buttons */

    document
        .querySelectorAll(".gate-chart-col")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    selectGate(
                        button.dataset.gate
                    );
                }
            );
        });


    /* Simulate */

    const simulateButton =
        $("simulate-btn");

    if (simulateButton) {

        simulateButton.addEventListener(
            "click",
            simulateSensorChange
        );
    }


    /* Auto simulation */

    const autoButton =
        $("auto-btn");

    if (autoButton) {

        autoButton.addEventListener(
            "click",
            () => {

                autoSimulation =
                    !autoSimulation;

                updateAutoButton();

                if (autoSimulation) {
                    startAutoSimulation();
                } else {
                    stopAutoSimulation();
                }
            }
        );
    }


    /* Demo */

    const demoButton =
        $("demo-btn");

    if (demoButton) {

        demoButton.addEventListener(
            "click",
            runDemoScenario
        );
    }


    /* CSV */

    const exportButton =
        $("export-btn");

    if (exportButton) {

        exportButton.addEventListener(
            "click",
            exportCSV
        );
    }


    /* Presentation */

    const presentationButton =
        $("presentation-btn");

    if (presentationButton) {

        presentationButton.addEventListener(
            "click",
            openPresentationMode
        );
    }


    const nextButton =
        $("tour-next");

    if (nextButton) {

        nextButton.addEventListener(
            "click",
            nextPresentationStep
        );
    }


    const previousButton =
        $("tour-prev");

    if (previousButton) {

        previousButton.addEventListener(
            "click",
            previousPresentationStep
        );
    }


    const exitButton =
        $("tour-exit");

    if (exitButton) {

        exitButton.addEventListener(
            "click",
            closePresentationMode
        );
    }


    /* Initial state */

    selectGate("A1");

    updateAutoButton();

    startAutoSimulation();

    updateDashboard();
}

);

/* =========================================================
27. KEYBOARD SHORTCUTS
========================================================= */

document.addEventListener(
"keydown",
event => {

    if (!presentationActive) return;

    if (event.key === "ArrowRight") {
        nextPresentationStep();
    }

    if (event.key === "ArrowLeft") {
        previousPresentationStep();
    }

    if (event.key === "Escape") {
        closePresentationMode();
    }
}

);

/* =========================================================
28. CONSOLE INFORMATION
========================================================= */

console.log(
"%cEcoGate IoT Simulation",
"font-size:20px;font-weight;"
);

console.log(
"Software-based IoT simulation initialized."
);

console.log(
"No physical sensors or actuators are connected."
);
