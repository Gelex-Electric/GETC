import { loadData, renderChart, renderStackedChart } from './chart.js';
import { formatNumberWithUnit } from './format.js';

let chart1 = null;
let chart2 = null;

function updateTotals(data) {
  const totalProd = data.reduce((acc, r) => acc + r.value, 0);
  const totalCost = data.reduce((acc, r) => acc + r.cost, 0);
  document.getElementById('totalProd').textContent =
    formatNumberWithUnit(totalProd, 'kWh');
  document.getElementById('totalCost').textContent =
    formatNumberWithUnit(totalCost, 'đồng');
}

function applyFilter(allData) {
  const yearSel = document.getElementById('yearSelect').value;
  const zoneSel = document.getElementById('zoneSelect').value;

  const filtered = allData.filter(d =>
    (yearSel === 'all' || d.date.getFullYear().toString() === yearSel) &&
    (zoneSel === 'all' || d.zone === zoneSel)
  );

  updateTotals(filtered);

  if (chart1) chart1.destroy();
  if (chart2) chart2.destroy();
  chart1 = renderChart(
    document.getElementById('myChart').getContext('2d'),
    filtered
  );
  chart2 = renderStackedChart(
    document.getElementById('stackedChart').getContext('2d'),
    filtered
  );
}

export async function initDashboard() {
  const data = await loadData();
  const years = [...new Set(data.map(d => d.date.getFullYear()))].sort();
  const zones = [...new Set(data.map(d => d.zone))].sort();

  const yearSelect = document.getElementById('yearSelect');
  yearSelect.innerHTML = '<option value="all">Tất cả</option>';
  years.forEach(y => yearSelect.add(new Option(y, y)));

  const zoneSelect = document.getElementById('zoneSelect');
  zoneSelect.innerHTML = '<option value="all">Tất cả</option>';
  zones.forEach(z => zoneSelect.add(new Option(z, z)));

  yearSelect.addEventListener('change', () => applyFilter(data));
  zoneSelect.addEventListener('change', () => applyFilter(data));

  applyFilter(data);
}

document.addEventListener('DOMContentLoaded', initDashboard);
