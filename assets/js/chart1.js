// Plugin
const displayValuePlugin = {
    id: 'displayValuePlugin',
    afterDatasetsDraw(chart) {
        const { ctx } = chart;
        chart.data.datasets.forEach((dataset, i) => {
            const meta = chart.getDatasetMeta(i);
            if (meta.hidden) {
                return;
            }

            meta.data.forEach((bar, index) => {
                const value = dataset.data[index];
                if (value !== null && value !== undefined) {
                    const formattedValue = new Intl.NumberFormat('vi-VN').format(value); // ###.###
                    ctx.fillStyle = 'black'; 
                    ctx.font = '12px Arial'; 
                    ctx.textAlign = 'center';
                    ctx.fillText(formattedValue, bar.x, bar.y - 5);
                }
            });
        });
    }
};

// Load CSV and render chart
document.addEventListener("DOMContentLoaded", function () {
    fetch('./assets/data/chart1.csv')
        .then(response => response.text())
        .then(csvText => {
            Papa.parse(csvText, {
                header: true, // Parse CSV with headers
                skipEmptyLines: true,
                complete: function (results) {
                    const data = results.data;
                    renderChart(data);
                }
            });
        });
});

// Function to render chart using Chart.js
function renderChart(data) {
    // Extract labels (months) and values (load) from CSV
    const labels = data.map(row => row['Tháng']); // Replace 'Month' with your CSV column name
    const values2023 = data.map(row => parseFloat(row['2023']));
    const values2024 = data.map(row => parseFloat(row['2024']));

    // Chart.js configuration
    const ctx = document.getElementById('barChart').getContext('2d');
    new Chart(ctx, {
        data: {
            labels: labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Năm 2023',
                    data: values2023,
                    backgroundColor: 'rgba(0, 105, 148, 0.6)', // Bar background color
                    borderColor: 'rgba(0, 105, 148, 1)', // Bar border color
                    borderWidth: 1
                },
                {
                    type: 'bar',
                    label: 'Năm 2024',
                    data: values2024,
                    backgroundColor: 'rgba(255, 165, 0, 0.6)', // Bar background color
                    borderColor: 'rgba(255, 165, 0, 1)', // Bar border color
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Biểu đồ phụ tải năm',
                    font: {
                        size: 20 // Increase font size of title
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(tooltipItem) {
                            const value = tooltipItem.raw;
                            const formattedValue = new Intl.NumberFormat('vi-VN').format(value); // Định dạng số ###.###
                            return `${tooltipItem.dataset.label}: ${formattedValue} kWh`; // Hiển thị thêm đơn vị
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Sản lượng (kWh)'
                    }
                }
            }
        },
        plugins: [displayValuePlugin]
    });
}
