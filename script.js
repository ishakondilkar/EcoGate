    if (score >= 75)      { el.textContent = "🟢 Efficient";        el.className = "gate-status gate-ok"; }
    else if (score >= 50) { el.textContent = "🟡 Moderate";         el.className = "gate-status gate-mid"; }
    else                  { el.textContent = "🔴 High Consumption"; el.className = "gate-status gate-bad"; }

    // keep the "All gates — Eco Score comparison" chart in sync
    document.getElementById("gc-score-" + gateId).textContent = String(score);
    const chartFill = document.getElementById("gc-fill-" + gateId);
    chartFill.style.height = score + "%";
    chartFill.className = "gate-chart-fill " +
      (score >= 75 ? "fill-ok" : (score >= 50 ? "fill-mid" : "fill-bad"));

    btn.className = "gate-btn" + (gateId === selectedGateId ? " is-selected" : "");
  });
