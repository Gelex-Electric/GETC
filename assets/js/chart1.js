document.addEventListener("DOMContentLoaded", function () {
    // Load dữ liệu CSV và gọi cả 2 hàm displaychart và updateTotals
    fetchAndProcessCSV('./assets/data/datahd.csv', function(data){
         // Lưu dữ liệu CSV toàn cục để dùng cho việc cập nhật totals
         window.csvData = data;
         displaychart(data);
         displayStackedChart(data);
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
    // Nếu không có dataset thì không thực hiện gì
    if (!chart.data.datasets || chart.data.datasets.length === 0) return;

    // Kiểm tra kiểu biểu đồ dựa trên label của dataset đầu tiên
    const firstLabel = chart.data.datasets[0].label;
    
    if (firstLabel.startsWith("Năm ")) {
        // Biểu đồ theo năm
        let totalPositiveSL = 0;
        let totalNegativeSL = 0;
        let totalPositiveTD = 0;
        let totalNegativeTD = 0;
        const visibleYears = [];
        
        // Lấy danh sách năm của các dataset đang hiển thị
        chart.data.datasets.forEach((ds, index) => {
            const meta = chart.getDatasetMeta(index);
            if (!meta.hidden) {
                const parts = ds.label.split(' ');
                if (parts.length > 1) {
                    visibleYears.push(parts[1]);
                }
            }
        });

        // Duyệt qua CSV dữ liệu và cộng dồn theo năm nếu năm nằm trong danh sách hiển thị
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
  
        // Cập nhật DOM cho biểu đồ theo năm
        document.getElementById("totalPurchaseVolume").innerHTML = `<b>${formatCurrency(totalNegativeSL, 'kWh')}</b>`;
        document.getElementById("totalSaleVolume").innerHTML = `<b>${formatCurrency(totalPositiveSL, 'kWh')}</b>`;
        document.getElementById("totalPurchaseAmount").innerHTML = `<b>${formatCurrency(totalPositiveTD, 'đồng')}</b>`;
        document.getElementById("totalSaleAmount").innerHTML = `<b>${formatCurrency(totalNegativeTD, 'đồng')}</b>`;
    } else {
        // Giả sử đây là biểu đồ xếp chồng theo nhóm MKH (legend là: KCNTH, KCNPĐ, KCN03, KCNYM)
        let totals = {
            KCNTH: 0,
            KCNPĐ: 0,
            KCN03: 0,
            KCNYM: 0
        };
        const visibleCategories = [];
        
        // Lấy các nhóm MKH đang hiển thị dựa trên legend của dataset
        chart.data.datasets.forEach((ds, index) => {
            const meta = chart.getDatasetMeta(index);
            if (!meta.hidden) {
                visibleCategories.push(ds.label); // ví dụ: "KCNTH"
            }
        });

        // Duyệt qua CSV dữ liệu và cộng dồn sản lượng cho các nhóm tương ứng
        if (window.csvData) {
            window.csvData.forEach(row => {
                const mkh = row['MKH'] || "";
                const tongSL = parseFloat(row['Tổng SL']) || 0;
                visibleCategories.forEach(category => {
                    if (mkh.startsWith(category)) {
                        totals[category] += tongSL;
                    }
                });
            });
        }

        // Cập nhật DOM cho biểu đồ xếp chồng (giả sử có các phần tử DOM với id như sau)
        if (document.getElementById("totalKCNTH")) {
            document.getElementById("totalKCNTH").innerHTML = `<b>${formatCurrency(totals.KCNTH, 'kWh')}</b>`;
        }
        if (document.getElementById("totalKCNPĐ")) {
            document.getElementById("totalKCNPĐ").innerHTML = `<b>${formatCurrency(totals.KCNPĐ, 'kWh')}</b>`;
        }
        if (document.getElementById("totalKCN03")) {
            document.getElementById("totalKCN03").innerHTML = `<b>${formatCurrency(totals.KCN03, 'kWh')}</b>`;
        }
        if (document.getElementById("totalKCNYM")) {
            document.getElementById("totalKCNYM").innerHTML = `<b>${formatCurrency(totals.KCNYM, 'kWh')}</b>`;
        }
    }
}


function displayStackedChart(data) {
    // Bước 1: Tìm ngày mới nhất trong data
    let latestDate = new Date(0);
    data.forEach(row => {
        const dateStr = row['Ngày'];
        const [day, month, year] = dateStr.split('/');
        const rowDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (rowDate > latestDate) {
            latestDate = rowDate;
        }
    });

    // Bước 2: Tạo mảng 12 tháng liên tiếp: từ (latestDate - 11 tháng) đến latestDate
    let months = [];
    const startDate = new Date(latestDate.getFullYear(), latestDate.getMonth() - 11, 1);
    for (let i = 0; i < 12; i++) {
        let d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
        months.push({
            year: d.getFullYear(),
            month: d.getMonth() // 0-index (0: Tháng 1, 11: Tháng 12)
        });
    }
    // Tạo mapping từ key "yyyy-mm" đến chỉ số trong mảng months
    let monthKeyIndex = {};
    months.forEach((m, index) => {
        let key = m.year + '-' + String(m.month + 1).padStart(2, '0');
        monthKeyIndex[key] = index;
    });

    // Bước 3: Khởi tạo các mảng chứa tổng sản lượng cho từng nhóm MKH
    let categoryKCNTH = Array(12).fill(0);
    let categoryKCNPĐ = Array(12).fill(0);
    let categoryKCN03 = Array(12).fill(0);
    let categoryKCNYM = Array(12).fill(0);

    // Bước 4: Duyệt qua data và gom nhóm theo tháng và MKH
    data.forEach(row => {
        const dateStr = row['Ngày'];
        const tongSL = parseFloat(row['Tổng SL']) || 0;
        const [day, month, year] = dateStr.split('/');
        const rowDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        let key = rowDate.getFullYear() + '-' + String(rowDate.getMonth() + 1).padStart(2, '0');
        // Nếu dữ liệu thuộc trong khoảng 12 tháng được chọn
        if (monthKeyIndex.hasOwnProperty(key)) {
            let idx = monthKeyIndex[key];
            let mkh = row['MKH'] || "";
            if (mkh.startsWith("KCNTH")) {
                categoryKCNTH[idx] += tongSL;
            } else if (mkh.startsWith("KCNPĐ")) {
                categoryKCNPĐ[idx] += tongSL;
            } else if (mkh.startsWith("KCN03")) {
                categoryKCN03[idx] += tongSL;
            } else if (mkh.startsWith("KCNYM")) {
                categoryKCNYM[idx] += tongSL;
            }
        }
    });

    // Bước 5: Tạo nhãn cho trục x theo định dạng MM/YYYY
    let labels = months.map(m => String(m.month + 1).padStart(2, '0') + '/' + m.year);

    // Bước 6: Tạo biểu đồ xếp chồng với Chart.js
    const ctx = document.getElementById('stackedBarChart').getContext('2d');
    window.myStackedChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'KCNTH',
                    data: categoryKCNTH,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'KCNPĐ',
                    data: categoryKCNPĐ,
                    backgroundColor: 'rgba(255, 206, 86, 0.6)',
                    borderColor: 'rgba(255, 206, 86, 1)',
                    borderWidth: 1
                },
                {
                    label: 'KCN03',
                    data: categoryKCN03,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                },
                {
                    label: 'KCNYM',
                    data: categoryKCNYM,
                    backgroundColor: 'rgba(153, 102, 255, 0.6)',
                    borderColor: 'rgba(153, 102, 255, 1)',
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
                    text: 'Biểu đồ xếp chồng 12 tháng',
                    font: {
                        size: 20
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(tooltipItem) {
                            const value = tooltipItem.raw;
                            return tooltipItem.dataset.label + ': ' + new Intl.NumberFormat('vi-VN').format(value) + ' kWh';
                        }
                    }
                },
                legend: {
                    onClick: function(e, legendItem, legend) {
                        // Sử dụng hành vi mặc định của Chart.js
                        Chart.defaults.plugins.legend.onClick(e, legendItem, legend);
                    }
                }
            },
            scales: {
                x: {
                    stacked: true
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Sản lượng (kWh)'
                    }
                }
            }
        }
    });
}
