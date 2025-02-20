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