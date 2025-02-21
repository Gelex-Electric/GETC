document.addEventListener("DOMContentLoaded", function () {
    // Load dữ liệu CSV và gọi cả 2 hàm displaychart và updateTotals
    fetchAndProcessCSV('./assets/data/datahd.csv', function(data){
         // Lưu dữ liệu CSV toàn cục để dùng cho việc cập nhật totals
         window.csvData = data;
         displaychart(data);
         // Khi biểu đồ mới được khởi tạo, các năm đều hiển thị nên updateTotals sẽ tính tổng cho tất cả
         updateTotals(window.myChart);
    });
});

function displaychart(data) {
    const monthslabels = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];
    const values2023 = Array(12).fill(0); 
    const values2024 = Array(12).fill(0);
    const values2025 = Array(12).fill(0);

    data.forEach(row => {
        const date = row['Ngày'];
        const tongSL = parseFloat(row['Tổng SL']) || 0;
        const [day, month, year] = date.split('/');
        const monthIndex = parseInt(month, 10) - 1; 

        if (tongSL > 0) {
            if (year === '2023') {
                values2023[monthIndex] += tongSL;
            }
            if (year === '2024') {
                values2024[monthIndex] += tongSL;
            } 
            if (year === '2025') {
                values2025[monthIndex] += tongSL;
            } 
        }   
    });

    const ctx = document.getElementById('barChart').getContext('2d');
    // Lưu instance của Chart vào biến toàn cục
    window.myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: monthslabels,
            datasets: [
                {
                    label: 'Năm 2023',
                    data: values2023,
                    backgroundColor: 'rgba(0, 105, 148, 0.6)',
                    borderColor: 'rgba(0, 105, 148, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Năm 2024',
                    data: values2024,
                    backgroundColor: 'rgba(255, 165, 0, 0.6)',
                    borderColor: 'rgba(255, 165, 0, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Năm 2025',
                    data: values2025,
                    backgroundColor: 'rgba(255, 0, 0, 0.6)',
                    borderColor: 'rgb(255, 0, 106)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    // Tùy chỉnh onClick: dùng hàm mặc định để toggle dataset, sau đó cập nhật tổng
                    onClick: function(e, legendItem, legend) {
                        const index = legendItem.datasetIndex;
                        const chart = legend.chart;
                        // Gọi hành vi mặc định của Chart.js để toggle hiển thị dataset
                        Chart.defaults.plugins.legend.onClick(e, legendItem, legend);
                        // Sau khi toggle, cập nhật lại tổng dựa trên các dataset hiển thị
                        updateTotals(chart);
                    }
                },
                title: {
                    display: true,
                    text: 'Biểu đồ phụ tải năm',
                    font: {
                        size: 20
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (tooltipItem) {
                            const value = tooltipItem.raw;
                            const formattedValue = new Intl.NumberFormat('vi-VN').format(value);
                            return `${tooltipItem.dataset.label}: ${formattedValue} kWh`;
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

// Hàm cập nhật tổng dựa trên các năm đang hiển thị trong biểu đồ
function updateTotals(chart) {
    let totalPositiveSL = 0;
    let totalNegativeSL = 0;
    let totalPositiveTD = 0;
    let totalNegativeTD = 0;
  
    const visibleYears = [];
    // Lặp qua các dataset để kiểm tra dataset nào không bị ẩn
    chart.data.datasets.forEach((ds, index) => {
        const meta = chart.getDatasetMeta(index);
        if (meta.hidden !== true) {
            // Giả sử label có dạng "Năm 2023", lấy năm bằng cách tách chuỗi
            const year = ds.label.split(' ')[1];
            visibleYears.push(year);
        }
    });
  
    // Duyệt qua toàn bộ dữ liệu CSV và tính tổng chỉ với những năm hiển thị
    if (window.csvData) {
        window.csvData.forEach(row => {
            const date = row['Ngày'];
            const tongSL = parseFloat(row['Tổng SL']) || 0;
            const tienDien = parseFloat(row['Tiền trước thuế']) || 0;
            const [day, month, year] = date.split('/');
            if (visibleYears.includes(year)) {
                if (tongSL > 0) {
                    totalPositiveSL += tongSL;
                } else {
                    totalNegativeSL += Math.abs(tongSL);
                }
                if (tienDien > 0) {
                    totalPositiveTD += tienDien;
                } else {
                    totalNegativeTD += Math.abs(tienDien);
                }
            }
        });
    }
  
    // Cập nhật giá trị hiển thị cho các phần tử DOM
    document.getElementById("totalPurchaseVolume").innerHTML = `<b>${formatCurrency(totalNegativeSL, 'kWh')}</b>`;
    document.getElementById("totalSaleVolume").innerHTML = `<b>${formatCurrency(totalPositiveSL, 'kWh')}</b>`;
    document.getElementById("totalPurchaseAmount").innerHTML = `<b>${formatCurrency(totalPositiveTD, 'đồng')}</b>`;
    document.getElementById("totalSaleAmount").innerHTML = `<b>${formatCurrency(totalNegativeTD, 'đồng')}</b>`;
}
