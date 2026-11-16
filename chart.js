const palette = [
  { color: "#283c63", label: "≤ 6.5°C" },
  { color: "#3f7890", label: "6.5–7.1°C" },
  { color: "#82b29a", label: "7.1–7.7°C" },
  { color: "#e9c46a", label: "7.7–8.3°C" },
  { color: "#e98754", label: "8.3–8.9°C" },
  { color: "#c43d32", label: "≥ 8.9°C" },
];
const colorBreaks = [6.5, 7.1, 7.7, 8.3, 8.9];
const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const svgNamespace = "http://www.w3.org/2000/svg";

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(svgNamespace, name);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }
  return element;
}

function colorForTemperature(temperature) {
  const index = colorBreaks.findIndex((limit) => temperature < limit);
  return palette[index === -1 ? palette.length - 1 : index].color;
}

function showTooltip(cell, event) {
  const tooltip = document.getElementById("tooltip");
  const year = cell.dataset.year;
  const month = Number(cell.dataset.month);
  const temperature = Number(cell.dataset.temp);
  tooltip.dataset.year = year;
  tooltip.innerHTML = `<span class="tooltip-date">${monthNames[month]} ${year}</span><span class="tooltip-temperature">${temperature.toFixed(2)}°C</span>`;
  tooltip.classList.add("visible");
  moveTooltip(event);
}

function moveTooltip(event) {
  const tooltip = document.getElementById("tooltip");
  const x = event.clientX ?? event.currentTarget.getBoundingClientRect().left;
  const y = event.clientY ?? event.currentTarget.getBoundingClientRect().top;
  tooltip.style.left = `${Math.min(x, window.innerWidth - 180)}px`;
  tooltip.style.top = `${Math.min(y, window.innerHeight - 80)}px`;
}

function hideTooltip() {
  document.getElementById("tooltip").classList.remove("visible");
}

function renderHeatMap(data) {
  const svg = document.getElementById("heatmap");
  const status = document.getElementById("chart-status");
  const years = data.monthlyVariance.map((entry) => entry.year);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const width = 1280;
  const height = 545;
  const margin = { top: 24, right: 28, bottom: 62, left: 102 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const yearCount = maxYear - minYear + 1;
  const cellWidth = plotWidth / yearCount;
  const cellHeight = plotHeight / monthNames.length;
  const plotBottom = margin.top + plotHeight;

  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("preserveAspectRatio", "xMinYMin meet");
  svg.replaceChildren();

  const cells = svgElement("g", { class: "cells" });
  for (const entry of data.monthlyVariance) {
    const month = entry.month - 1;
    const temperature = data.baseTemperature + entry.variance;
    const rect = svgElement("rect", {
      class: "cell",
      x: margin.left + (entry.year - minYear) * cellWidth,
      y: margin.top + month * cellHeight,
      width: cellWidth,
      height: cellHeight,
      fill: colorForTemperature(temperature),
      "data-month": month,
      "data-year": entry.year,
      "data-temp": temperature.toFixed(3),
      "data-variance": entry.variance,
      tabindex: "0",
      role: "img",
      "aria-label": `${monthNames[month]} ${entry.year}: ${temperature.toFixed(2)} degrees Celsius`,
    });
    rect.addEventListener("mouseenter", (event) => showTooltip(rect, event));
    rect.addEventListener("mousemove", moveTooltip);
    rect.addEventListener("mouseleave", hideTooltip);
    rect.addEventListener("focus", (event) => showTooltip(rect, event));
    rect.addEventListener("blur", hideTooltip);
    cells.appendChild(rect);
  }
  svg.appendChild(cells);

  const xAxis = svgElement("g", {
    id: "x-axis",
    class: "x-axis",
    transform: `translate(0 ${plotBottom})`,
  });
  xAxis.appendChild(svgElement("line", {
    class: "axis-line",
    x1: margin.left,
    x2: width - margin.right,
    y1: 0,
    y2: 0,
  }));
  const tickYears = [minYear + 1];
  for (let year = Math.ceil(minYear / 20) * 20; year <= maxYear; year += 20) {
    if (year > minYear + 1) tickYears.push(year);
  }
  if (tickYears[tickYears.length - 1] !== maxYear) tickYears.push(maxYear);
  for (const year of tickYears) {
    const x = margin.left + (year - minYear + 0.5) * cellWidth;
    const tick = svgElement("g", {
      class: "tick",
      transform: `translate(${x} 0)`,
      "data-year": year,
    });
    tick.appendChild(svgElement("line", { class: "tick-mark", y1: 0, y2: 6 }));
    const label = svgElement("text", { x: 0, y: 22, "text-anchor": "middle" });
    label.textContent = year;
    tick.appendChild(label);
    xAxis.appendChild(tick);
  }
  svg.appendChild(xAxis);

  const yAxis = svgElement("g", { id: "y-axis", class: "y-axis" });
  yAxis.appendChild(svgElement("line", {
    class: "axis-line",
    x1: margin.left,
    x2: margin.left,
    y1: margin.top,
    y2: plotBottom,
  }));
  monthNames.forEach((month, index) => {
    const y = margin.top + (index + 0.5) * cellHeight;
    const tick = svgElement("g", {
      class: "tick",
      transform: `translate(${margin.left} ${y})`,
      "data-month": index,
    });
    tick.appendChild(svgElement("line", { class: "tick-mark", x1: -5, x2: 0, y1: 0, y2: 0 }));
    const label = svgElement("text", { x: -11, y: 4, "text-anchor": "end" });
    label.textContent = month;
    tick.appendChild(label);
    yAxis.appendChild(tick);
  });
  svg.appendChild(yAxis);

  renderLegend();
  status.textContent = `Heat map loaded: ${data.monthlyVariance.length.toLocaleString()} monthly readings from ${minYear} to ${maxYear}.`;
}

function renderLegend() {
  const legend = document.getElementById("legend");
  const width = 410;
  const swatchWidth = 62;
  const gap = 4;
  const height = 52;
  legend.setAttribute("viewBox", `0 0 ${width} ${height}`);
  legend.replaceChildren();

  palette.forEach((item, index) => {
    const x = index * (swatchWidth + gap);
    legend.appendChild(svgElement("rect", {
      x,
      y: 3,
      width: swatchWidth,
      height: 13,
      rx: 1,
      fill: item.color,
    }));
    const label = svgElement("text", { x, y: 34 });
    label.textContent = item.label;
    legend.appendChild(label);
  });
}

async function loadHeatMap() {
  const status = document.getElementById("chart-status");
  try {
    const response = await fetch("/api/data");
    if (!response.ok) {
      throw new Error(`Dataset request failed (${response.status} ${response.statusText}).`);
    }
    const data = await response.json();
    if (
      !Number.isFinite(data.baseTemperature) ||
      !Array.isArray(data.monthlyVariance) ||
      data.monthlyVariance.length === 0 ||
      data.monthlyVariance.some((entry) =>
        !Number.isInteger(entry.year) ||
        !Number.isInteger(entry.month) ||
        entry.month < 1 ||
        entry.month > 12 ||
        !Number.isFinite(entry.variance)
      )
    ) {
      throw new Error("The temperature dataset has an invalid or incomplete format.");
    }
    renderHeatMap(data);
  } catch (error) {
    status.textContent = `Unable to display the heat map: ${error.message}`;
    status.classList.remove("sr-only");
    status.classList.add("load-error");
    console.error("Unable to load the heat-map dataset.", error);
  }
}

loadHeatMap();
