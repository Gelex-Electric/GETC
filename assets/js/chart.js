import { loadCSV } from './csvReader.js';
import { formatNumber, formatNumberWithUnit } from './format.js';

// Chart.js plugin data labels (tải qua <script> trong HTML)
Chart.register(ChartDataLabels);

export async function renderChart(ctx) {
  const data = await loadCSV('assets/data/datahdKH.csv');

  // Parse
  const parsed = data.map(row => {
    const [day, month, year] = row['Ngày chốt chỉ số'].split('/');
    const date = new Date(year, month - 1, day);
    const value = parseFloat(row['Sản lượng'].replace(/\./g, ''));
    const cost  = parseFloat(row['Doanh thu'].replace(/\./g, ''));
    return { date, value, cost };
  });

  // Danh sách năm và khởi tạo tổng theo tháng
  const years = [...new Set(parsed.map(i => i.date.getFullYear()))].sort();
  const monthlySums = Object.fromEntries(years.map(y => [y, Array(12).fill(0)]));
  parsed.forEach(({ date, value }) => {
    monthlySums[date.getFullYear()][date.getMonth()] += value;
  });
  const monthlyCosts = Object.fromEntries(years.map(y => [y, Array(12).fill(0)]));
  parsed.forEach(({ date, cost }) => {
    monthlyCosts[date.getFullYear()][date.getMonth()] += cost;
  });
  // Nhãn trục X: Tháng 1–12
  const labels = Array.from({ length: 12 }, (_, i) => `Tháng ${i+1}`);

  // Tạo datasets, mỗi năm một dataset
  const datasets = years.map(y => ({
    label: `Năm ${y}`,
    data: monthlySums[y],
    borderWidth: 1
  }));

  // Vẽ biểu đồ cột nhóm
  new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      layout: { padding: { top: 20 } },
      scales: { y: { beginAtZero: true } },
      plugins: {
        legend: { position: 'right' },
        // Hiển thị số trên đỉnh cột (không kèm đơn vị)
        datalabels: {
          anchor: 'end',
          align: 'top',
          formatter: (value) => formatNumber(value)
        },
        // Tooltip hiển thị số kèm ' kWh'
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const month = ctx.dataIndex;
              const year  = years[ctx.datasetIndex];
              const prod  = ctx.raw;
              const cost  = monthlyCosts[year][month];
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

export async function renderStackedChart(ctx) {
  const data = await loadCSV('assets/data/datahdKH.csv');

  // Parse: date, production and industrial zone name
  const parsed = data.map(row => {
    const [day, month, year] = row['Ngày chốt chỉ số'].split('/');
    const date = new Date(year, month - 1, day);
    const value = parseFloat(row['Sản lượng'].replace(/\./g, ''));
    const addr = row['Địa chỉ sử dụng điện'];
    const match = addr.match(/KCN[^,]*/);
    const zone = match ? match[0].trim() : 'Khác';
    return { date, value, zone };
  });

  // Determine latest closing month
  const latest = parsed.reduce((m, r) => (r.date > m ? r.date : m), new Date(0));

  // Labels for last 12 months ending at latest
  const labels = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(latest.getFullYear(), latest.getMonth() - i, 1);
    labels.push(`${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`);
  }

  const zones = [...new Set(parsed.map(p => p.zone))];
  const zoneSums = Object.fromEntries(zones.map(z => [z, Array(12).fill(0)]));

  parsed.forEach(({ date, value, zone }) => {
    const diff = (latest.getFullYear() - date.getFullYear()) * 12 + (latest.getMonth() - date.getMonth());
    if (diff >= 0 && diff < 12) {
      const idx = 11 - diff;
      zoneSums[zone][idx] += value;
    }
  });

  const datasets = zones.map(z => ({
    label: z,
    data: zoneSums[z],
    borderWidth: 1
  }));

  new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
      plugins: {
        legend: { position: 'right' },
        datalabels: {
          anchor: 'center',
          align: 'center',
          color: '#fff',
          formatter: v => formatNumber(v)
        }
      }
    },
    plugins: [ChartDataLabels]
  });
}

// Tự động gọi vẽ khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
  const ctx = document.getElementById('myChart').getContext('2d');
  renderChart(ctx);

  const stackedEl = document.getElementById('stackedChart');
  if (stackedEl) {
    renderStackedChart(stackedEl.getContext('2d'));
  }
});
