import { loadCSV } from './csvReader.js';
import { formatNumber, formatNumberWithUnit } from './format.js';

Chart.register(ChartDataLabels);

let rawData = [];
let years = [];
let zones = [];
let chart1;
let chart2;

function updateTotals(data) {
  const totalProd = data.reduce((s, r) => s + r.value, 0);
  const totalCost = data.reduce((s, r) => s + r.cost, 0);
  document.getElementById('totalProduction').textContent =
    formatNumberWithUnit(totalProd, 'kWh');
  document.getElementById('totalRevenue').textContent =
    formatNumberWithUnit(totalCost, 'đồng');
}
function renderMainChart(filtered, yearFilters) {
  const ctx = document.getElementById('myChart').getContext('2d');
  if (chart1) {
    chart1.destroy();
  }
  const yearsToShow = yearFilters.length
    ? yearFilters.map(y => parseInt(y, 10))
    : [];
  const monthly = {};
  const monthlyCost = {};
  yearsToShow.forEach(y => {
    monthly[y] = Array(12).fill(0);
    monthlyCost[y] = Array(12).fill(0);
  });
  filtered.forEach(r => {
    const y = r.date.getFullYear();
    if (!monthly[y]) return;
    monthly[y][r.date.getMonth()] += r.value;
    monthlyCost[y][r.date.getMonth()] += r.cost;
  });
  const labels = Array.from({ length: 12 }, (_, i) => `Tháng ${i + 1}`);
  const datasets = yearsToShow.map(y => ({
    label: `Năm ${y}`,
    data: monthly[y],
    borderWidth: 1
  }));
  chart1 = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      layout: { padding: { top: 20 } },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: 'Sản lượng (kWh)' } }
      },
      plugins: {
        legend: { position: 'bottom' },
        datalabels: {
          anchor: 'end',
          align: 'top',
          formatter: v => formatNumber(v)
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const m = ctx.dataIndex;
              const y = yearsToShow[ctx.datasetIndex];
              const prod = ctx.raw;
              const cost = monthlyCost[y][m];
              return [
                `Sản lượng: ${formatNumberWithUnit(prod, 'kWh')}`,
                `Doanh thu: ${formatNumberWithUnit(cost, 'đồng')}`
              ];
            }
          }
        }
      }
    },
    plugins: [ChartDataLabels]
  });
}
function renderStacked(filtered, zoneFilters) {
  const ctx = document.getElementById('stackedChart').getContext('2d');
  if (chart2) {
    chart2.destroy();
  }
  const latest = filtered.reduce((m, r) => (r.date > m ? r.date : m), new Date(0));
  const labels = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(latest.getFullYear(), latest.getMonth() - i, 1);
    labels.push(`${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`);
  }
  const zonesToShow = zoneFilters.length ? zoneFilters : [];
  const zoneSum = Object.fromEntries(zonesToShow.map(z => [z, Array(12).fill(0)]));
  const zoneCost = Object.fromEntries(zonesToShow.map(z => [z, Array(12).fill(0)]));
  const monthlyTotal = Array(12).fill(0);

  filtered.forEach(r => {
    if (!zonesToShow.includes(r.zone)) return;
    const diff = (latest.getFullYear() - r.date.getFullYear()) * 12 +
                 (latest.getMonth() - r.date.getMonth());
    if (diff >= 0 && diff < 12) {
      const idx = 11 - diff;
      zoneSum[r.zone][idx] += r.value;
      zoneCost[r.zone][idx] += r.cost;
      monthlyTotal[idx] += r.value;
    }
  });
  const datasets = zonesToShow.map(z => ({ label: z, data: zoneSum[z], borderWidth: 1 }));
  chart2 = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      scales: {
        x: { stacked: true },
        y: {
          stacked: true,
          beginAtZero: true,
          title: { display: true, text: 'Sản lượng (kWh)' }
        }
      },
      plugins: {
        legend: { position: 'bottom' },
        datalabels: {
          anchor: 'center',
          align: 'center',
          color: '#000',
          formatter: (v, ctx) => {
            const idx = ctx.dataIndex;
            return v >= monthlyTotal[idx] * 0.1 ? formatNumber(v) : '';
          }
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const idx = ctx.dataIndex;
              const z = zonesToShow[ctx.datasetIndex];
              const prod = zoneSum[z][idx];
              const cost = zoneCost[z][idx];
              return [
                `Sản lượng: ${formatNumberWithUnit(prod, 'kWh')}`,
                `Doanh thu: ${formatNumberWithUnit(cost, 'đồng')}`
              ];
            }
          }
        }
      }
    },
    plugins: [ChartDataLabels]
  });
}
function getCheckedValues(listId) {
  return Array.from(
    document.querySelectorAll(`#${listId} input[type="checkbox"]:checked`)
  ).map(cb => cb.value);
}
function applyFilters() {
  const yearValues = getCheckedValues('yearList');
  const zoneValues = getCheckedValues('zoneList');
  const filtered = rawData.filter(r =>
    yearValues.includes(String(r.date.getFullYear())) &&
    zoneValues.includes(r.zone)
  );
  updateTotals(filtered);
  renderMainChart(filtered, yearValues);
  renderStacked(filtered, zoneValues);
}
async function init() {
  const data = await loadCSV('assets/data/datahdKH.csv');
  rawData = data.map(row => {
    const [d, m, y] = row['Ngày chốt chỉ số'].split('/');
    const date = new Date(y, m - 1, d);
    const value = parseFloat(row['Sản lượng'].replace(/\./g, '')) || 0;
    const cost = parseFloat(row['Doanh thu'].replace(/\./g, '')) || 0;
    const match = row['Địa chỉ sử dụng điện'].match(/KCN[^,]*/);
    const zone = match ? match[0].trim() : 'Khác';
    return { date, value, cost, zone };
  });
  years = [...new Set(rawData.map(r => r.date.getFullYear()))].sort();
  zones = [...new Set(rawData.map(r => r.zone))].sort();
  const yearList = document.getElementById('yearList');
  const zoneList = document.getElementById('zoneList');
  if (yearList) {
    yearList.innerHTML = years
      .map(
        y =>
          `<li class="list-group-item"><label><input class="form-check-input me-1" type="checkbox" value="${y}" checked> ${y}</label></li>`
      )
      .join('');
    yearList.addEventListener('change', applyFilters);
  }
  if (zoneList) {
    zoneList.innerHTML = zones
      .map(
        z =>
          `<li class="list-group-item"><label><input class="form-check-input me-1" type="checkbox" value="${z}" checked> ${z}</label></li>`
      )
      .join('');
    zoneList.addEventListener('change', applyFilters);
  }
  applyFilters();
}
document.addEventListener('DOMContentLoaded', init);
