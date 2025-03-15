// Function
/**
Hàm parse CSV
 */
function fetchAndProcessCSV(filePath, callback) {
    fetch(filePath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(text => {
            Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                complete: function (results) {
                    if (callback) callback(results.data); // Gọi callback nếu được truyền vào
                },
                error: function (error) {
                    console.error("Error parsing CSV:", error);
                }
            });
        })
        .catch(error => console.error("Error loading CSV:", error));
}
/**
 * Định dạng số "###.### "
 */
function formatCurrency(value, unit) {
    const num = parseFloat(value) || 0;
    return num.toLocaleString('vi-VN') + unit;
  }
  /**
  * format dd/mm/yyyy -> Date
  */
function parseDateDMY(dateStr) {
    const [day, month, year] = dateStr.split('/');
    return new Date(year, month - 1, day);
  }
  /**
  * Format Date -> dd/mm/yyyy
  */
function formatDateDMY(date) {
    const day = ('0' + date.getDate()).slice(-2);
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  
// Plugin
const displayValuePlugin = {
    id: 'displayValuePlugin',
    afterDatasetsDraw(chart) {
        const { ctx } = chart;
        chart.data.datasets.forEach((dataset, i) => {
            const meta = chart.getDatasetMeta(i);
            if (meta.hidden) return;

            meta.data.forEach((bar, index) => {
                const value = dataset.data[index];
                if (value !== null && value !== undefined) {
                    const formattedValue = new Intl.NumberFormat('vi-VN').format(value);
                    ctx.fillStyle = 'black';
                    ctx.font = '10px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(formattedValue, bar.x, bar.y - 5);
                }
            });
        });
    }
};

const stackedValuePlugin = {
    id: 'stackedValuePlugin',
    afterDatasetsDraw: function(chart, easing) {
        const ctx = chart.ctx;
        const metaDatasets = chart.data.datasets.map((ds, idx) => chart.getDatasetMeta(idx));
        // Duyệt qua từng cột (mỗi nhãn trục x)
        chart.data.labels.forEach((label, i) => {
            // Tính tổng sản lượng của các dataset đang hiển thị cho cột đó
            let total = 0;
            metaDatasets.forEach((meta, idx) => {
                if (!meta.hidden) {
                    const value = chart.data.datasets[idx].data[i] || 0;
                    total += value;
                }
            });
            // Vẽ label cho từng stack nếu giá trị >= 10% tổng của cột
            metaDatasets.forEach((meta, idx) => {
                if (!meta.hidden) {
                    const value = chart.data.datasets[idx].data[i] || 0;
                    if (total > 0 && value >= 0.1 * total) {
                        const element = meta.data[i];
                        // Tính vị trí vẽ label: ở giữa phần stack
                        const centerX = element.x;
                        // Lấy vị trí trung bình theo chiều dọc của segment
                        const centerY = element.y + element.height / 2;
                        ctx.save();
                        ctx.fillStyle = 'black';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.font = '12px sans-serif';
                        ctx.fillText(new Intl.NumberFormat('vi-VN').format(value), centerX, centerY);
                        ctx.restore();
                    }
                }
            });
        });
    }
};