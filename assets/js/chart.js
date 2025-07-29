import { loadCSV } from './csvReader.js';
import { formatNumber, formatNumberWithUnit } from './format.js';

// Chart.js plugin data labels (tải qua <script> trong HTML)
Chart.register(ChartDataLabels);

let cachedData = null;

export async function loadData() {
  if (cachedData) return cachedData;
  const raw = await loadCSV('assets/data/datahdKH.csv');
  cachedData = raw.map(row => {
    const [day, month, year] = row['Ngày chốt chỉ số'].split('/');
    const date = new Date(year, month - 1, day);
    const value = parseFloat(row['Sản lượng'].replace(/\./g, ''));
    const cost  = parseFloat(row['Doanh thu'].replace(/\./g, ''));
    const zone  = row['Địa chỉ sử dụng điện'].split(',')[0].trim();
    return { date, value, cost, zone };
  });
  return cachedData;
}

export function renderChart(ctx, data) {

  // Danh sách năm và khởi tạo tổng theo tháng
  const years = [...new Set(data.map(i => i.date.getFullYear()))].sort();
  const monthlySums = Object.fromEntries(years.map(y => [y, Array(12).fill(0)]));
  data.forEach(({ date, value }) => {
    monthlySums[date.getFullYear()][date.getMonth()] += value;
  });
  const monthlyCosts = Object.fromEntries(years.map(y => [y, Array(12).fill(0)]));
  data.forEach(({ date, cost }) => {
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
  return new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      layout: { padding: { top: 20 } },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Sản lượng (kWh)' }
        }
      },
      plugins: {
        legend: { position: 'bottom' },
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

export function renderStackedChart(ctx, data) {

  // Parse already done in loadData()
  const parsed = data;

  // Determine latest closing month
  const latest = parsed.reduce((m, r) => (r.date > m ? r.date : m), new Date(0));

  // Labels for last 12 months ending at latest
  const labels = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(latest.getFullYear(), latest.getMonth() - i, 1);
    labels.push(`${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`);
  }

  const zones = [...new Set(parsed.map(p => p.zone))];
  const zoneSums  = Object.fromEntries(zones.map(z => [z, Array(12).fill(0)]));
  const zoneCosts = Object.fromEntries(zones.map(z => [z, Array(12).fill(0)]));
  const monthlyTotal = Array(12).fill(0);

  parsed.forEach(({ date, value, cost, zone }) => {
    const diff = (latest.getFullYear() - date.getFullYear()) * 12 + (latest.getMonth() - date.getMonth());
    if (diff >= 0 && diff < 12) {
      const idx = 11 - diff;
      zoneSums[zone][idx] += value;
      zoneCosts[zone][idx] += cost;
      monthlyTotal[idx] += value;
    }
  });

  const datasets = zones.map(z => ({
    label: z,
    data: zoneSums[z],
    borderWidth: 1
  }));

  return new Chart(ctx, {
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
            label: (ctx) => {
              const idx = ctx.dataIndex;
              const zone = zones[ctx.datasetIndex];
              const prod = zoneSums[zone][idx];
              const cost = zoneCosts[zone][idx];
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

