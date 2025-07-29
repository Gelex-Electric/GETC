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


function renderMainChart(filtered, yearFilter) {
  const ctx = document.getElementById('myChart').getContext('2d');
  if (chart1) {
    chart1.destroy();
    ctx.canvas.style.width = '100%';
    ctx.canvas.style.height = '400px';
  }



function renderMainChart(filtered, yearFilter) {
  const ctx = document.getElementById('myChart').getContext('2d');
  if (chart1) chart1.destroy();

  const yearsToShow = yearFilter === 'all' ? years : [parseInt(yearFilter, 10)];
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

function renderStacked(filtered, zoneFilter) {
  const ctx = document.getElementById('stackedChart').getContext('2d');

  if (chart2) {
    chart2.destroy();
    ctx.canvas.style.width = '100%';
    ctx.canvas.style.height = '400px';
  }
  if (chart2) chart2.destroy();


  const latest = filtered.reduce((m, r) => (r.date > m ? r.date : m), new Date(0));
  const labels = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(latest.getFullYear(), latest.getMonth() - i, 1);
    labels.push(`${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`);
  }

  const zonesToShow = zoneFilter === 'all' ? zones : [zoneFilter];
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


function getActiveValue(listId) {
  const active = document.querySelector(`#${listId} .active`);
  return active ? active.dataset.value : 'all';
}

function applyFilters() {
  const yearValue = getActiveValue('yearList');
  const zoneValue = getActiveValue('zoneList');
function applyFilters() {
  const yearValue = document.getElementById('yearSelect').value;
  const zoneValue = document.getElementById('zoneSelect').value;
 main
  const filtered = rawData.filter(r =>
    (yearValue === 'all' || r.date.getFullYear() === parseInt(yearValue, 10)) &&
    (zoneValue === 'all' || r.zone === zoneValue)
  );
  updateTotals(filtered);
  renderMainChart(filtered, yearValue);
  renderStacked(filtered, zoneValue);
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
    yearList.innerHTML =
      '<li class="list-group-item active" data-value="all">Tất cả</li>' +
      years.map(y => `<li class="list-group-item" data-value="${y}">${y}</li>`).join('');
    yearList.addEventListener('click', e => {
      const item = e.target.closest('li');
      if (!item) return;
      yearList.querySelectorAll('li').forEach(li => li.classList.remove('active'));
      item.classList.add('active');
      applyFilters();
    });
  }
  if (zoneList) {
    zoneList.innerHTML =
      '<li class="list-group-item active" data-value="all">Tất cả</li>' +
      zones.map(z => `<li class="list-group-item" data-value="${z}">${z}</li>`).join('');
    zoneList.addEventListener('click', e => {
      const item = e.target.closest('li');
      if (!item) return;
      zoneList.querySelectorAll('li').forEach(li => li.classList.remove('active'));
      item.classList.add('active');
      applyFilters();
    });
  }

  const yearSelect = document.getElementById('yearSelect');
  const zoneSelect = document.getElementById('zoneSelect');
  if (yearSelect) {
    yearSelect.innerHTML = '<option value="all">Tất cả</option>' +
      years.map(y => `<option value="${y}">${y}</option>`).join('');
  }
  if (zoneSelect) {
    zoneSelect.innerHTML = '<option value="all">Tất cả</option>' +
      zones.map(z => `<option value="${z}">${z}</option>`).join('');
  }
  yearSelect.addEventListener('change', applyFilters);
  zoneSelect.addEventListener('change', applyFilters);
main

  applyFilters();
}

document.addEventListener('DOMContentLoaded', init);
