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
                // Chỉ hiển thị giá trị nếu khác null, undefined và khác 0
                if (value !== null && value !== undefined && value !== 0) {
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
    id: 'stackedValueLabels',
    afterDatasetsDraw(chart, easing) {
        const ctx = chart.ctx;
        ctx.save();
        // Lặp qua từng cột (mỗi label trên trục x)
        chart.data.labels.forEach((label, index) => {
            // Tính tổng sản lượng của cột tại vị trí index
            let total = 0;
            chart.data.datasets.forEach((dataset, datasetIndex) => {
                const meta = chart.getDatasetMeta(datasetIndex);
                if (!meta.hidden) {
                    total += Number(dataset.data[index]) || 0;
                }
            });
            // Với mỗi dataset của cột đó, kiểm tra điều kiện và vẽ nhãn
            chart.data.datasets.forEach((dataset, datasetIndex) => {
                const meta = chart.getDatasetMeta(datasetIndex);
                if (!meta.hidden) {
                    const value = Number(dataset.data[index]) || 0;
                    // Nếu giá trị nhỏ hơn 10% tổng sản lượng thì bỏ qua
                    if (total > 0 && value / total < 0.1) {
                        return;
                    }
                    const bar = meta.data[index];
                    // Tính tọa độ trung tâm của phân đoạn: trung bình giữa y và base
                    const centerY = (bar.y + bar.base) / 2;
                    const centerX = bar.x;
                    ctx.fillStyle = 'black'; // Màu chữ, có thể thay đổi theo nhu cầu
                    ctx.font = '12px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    // Định dạng giá trị với dấu chấm phân cách hàng nghìn
                    const formattedValue = new Intl.NumberFormat('vi-VN').format(value);
                    ctx.fillText(formattedValue, centerX, centerY);
                }
            });
        });
        ctx.restore();
    }
};

