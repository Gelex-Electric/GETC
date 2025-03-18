document.addEventListener("DOMContentLoaded", function () {
    fetchAndProcessCSV('../assets/data/datahd.csv', function(data) {
        // Lưu dữ liệu gốc vào biến toàn cục
        window.originalData = data;
        // Vẽ biểu đồ bán hàng theo tháng cho các MKH có tiền tố xác định
        displayChartsByMKH(data);
        // Cập nhật kết quả tổng hợp (sale và purchase)
        displayResults(data);
    });
});

function displayChartsByMKH(data) {
    // Mảng chứa 4 tiền tố cần lọc
    const salePrefixes = ["KCNTH", "KCNPĐ", "KCN03", "KCNYM"];
    const monthsLabels = [
        "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
        "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
    ];

    salePrefixes.forEach(prefix => {
        // Khởi tạo dữ liệu cho 3 năm: mỗi năm có mảng sản lượng và tiền điện bán cho 12 tháng
        let aggregatedData = {
            "2023": { volume: Array(12).fill(0), amount: Array(12).fill(0) },
            "2024": { volume: Array(12).fill(0), amount: Array(12).fill(0) },
            "2025": { volume: Array(12).fill(0), amount: Array(12).fill(0) }
        };

        // Lọc các dòng có MKH bắt đầu bằng tiền tố hiện tại và chỉ lấy dòng bán hàng (Tổng SL > 0)
        data.forEach(row => {
            const mkh = row['MKH'];
            if (mkh && mkh.startsWith(prefix)) {
                const tongSL = parseFloat(row['Tổng SL']) || 0;
                const tienDien = parseFloat(row['Tiền trước thuế']) || 0;
                if (tongSL > 0) {
                    const dateStr = row['Ngày'];
                    const parts = dateStr.split('/');
                    if (parts.length === 3) {
                        const month = parseInt(parts[1], 10); // giá trị từ 1 đến 12
                        const year = parts[2];
                        const monthIndex = month - 1;
                        if (aggregatedData.hasOwnProperty(year)) {
                            aggregatedData[year].volume[monthIndex] += tongSL;
                            aggregatedData[year].amount[monthIndex] += tienDien;
                        }
                    }
                }
            }
        });

        // Vẽ biểu đồ cho tiền tố hiện tại trên canvas có id "chartSale_<prefix>"
        const canvasId = 'chartSale_' + prefix;
        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (ctx) {
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: monthsLabels,
                    datasets: [
                        {
                            label: 'Năm 2023',
                            data: aggregatedData["2023"].volume,
                            // Lưu mảng tiền điện bán trong thuộc tính tùy chỉnh
                            amountData: aggregatedData["2023"].amount,
                            backgroundColor: 'rgba(0, 105, 148, 0.6)',
                            borderColor: 'rgba(0, 105, 148, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Năm 2024',
                            data: aggregatedData["2024"].volume,
                            amountData: aggregatedData["2024"].amount,
                            backgroundColor: 'rgba(255, 165, 0, 0.6)',
                            borderColor: 'rgba(255, 165, 0, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Năm 2025',
                            data: aggregatedData["2025"].volume,
                            amountData: aggregatedData["2025"].amount,
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
                        title: {
                            display: true,
                            text: `Biểu đồ phụ tải năm`,
                            font: { size: 20 }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(tooltipItem) {
                                    const dataset = tooltipItem.chart.data.datasets[tooltipItem.datasetIndex];
                                    const volumeValue = tooltipItem.raw;
                                    const amountValue = dataset.amountData[tooltipItem.dataIndex];
                                    const formattedVolume = new Intl.NumberFormat('vi-VN').format(volumeValue);
                                    const formattedAmount = new Intl.NumberFormat('vi-VN').format(amountValue);
                                    return `${dataset.label}: Sản lượng: ${formattedVolume} kWh, Tiền điện: ${formattedAmount} đồng`;
                                }
                            }
                        },
                        legend: {
                            onClick: function(e, legendItem, legend) {
                                const chart = legend.chart;
                                const index = legendItem.datasetIndex;
                                const meta = chart.getDatasetMeta(index);
                                // Toggle trạng thái ẩn/hiện của dataset
                                meta.hidden = meta.hidden === null ? !chart.data.datasets[index].hidden : null;
                                chart.update();

                                // Lấy danh sách năm đang hiển thị (loại bỏ "Năm " nếu có)
                                const visibleYears = chart.data.datasets
                                    .filter((dataset, idx) => chart.isDatasetVisible(idx))
                                    .map(dataset => dataset.label.replace('Năm ', ''));

                                // Tính tổng sản lượng và tiền điện từ các dataset đang hiển thị (cho phần sale)
                                let totalVolume = 0;
                                let totalAmount = 0;
                                chart.data.datasets.forEach((dataset, i) => {
                                    if (chart.isDatasetVisible(i)) {
                                        totalVolume += dataset.data.reduce((acc, curr) => acc + curr, 0);
                                        totalAmount += dataset.amountData.reduce((acc, curr) => acc + curr, 0);
                                    }
                                });

                                // Cập nhật DOM cho phần sale của tiền tố hiện tại
                                const saleVolumeElem = document.getElementById("totalVolume_" + prefix);
                                const saleAmountElem = document.getElementById("totalAmount_" + prefix);
                                if (saleVolumeElem) {
                                    saleVolumeElem.innerHTML = `<b>${formatCurrency(totalVolume, 'kWh')}</b>`;
                                }
                                if (saleAmountElem) {
                                    saleAmountElem.innerHTML = `<b>${formatCurrency(totalAmount, 'đồng')}</b>`;
                                }

                                // Cập nhật lại phần purchase bằng cách gọi displayResults với bộ lọc visibleYears
                                // Giả sử dữ liệu gốc được lưu trong window.originalData
                                if (window.originalData) {
                                    displayResults(window.originalData, visibleYears);
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: 'Sản lượng bán (kWh)' }
                        }
                    }
                },
                plugins: [displayValuePlugin]
            });
        }
    });
}

function displayResults(data, visibleYears) {
    // Mảng chứa tiền tố bán và mã EVN mua (riêng biệt, không liên hệ theo index)
    const salePrefixes = ["KCNTH", "KCNPĐ", "KCN03", "KCNYM"];
    const purchasePrefixes = ["EVN-TH", "EVN-PĐ", "EVN-YM", "EVN-03"];

    let saleResults = {};
    let purchaseResults = {};
    
    salePrefixes.forEach(prefix => {
        saleResults[prefix] = { volume: 0, amount: 0 };
    });
    purchasePrefixes.forEach(prefix => {
        purchaseResults[prefix] = { volume: 0, amount: 0 };
    });

    data.forEach(row => {
        // Nếu có bộ lọc năm được bật, lấy năm từ ngày (giả sử định dạng "dd/mm/yyyy")
        if (visibleYears && visibleYears.length > 0) {
            const dateStr = row['Ngày'];
            if (dateStr) {
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    const year = parts[2];
                    if (!visibleYears.includes(year)) {
                        return; // bỏ qua dòng không thuộc năm đang bật
                    }
                }
            }
        }
        const mkh = row['MKH'];
        if (mkh) {
            const tongSL = parseFloat(row['Tổng SL']) || 0;
            const tienDien = parseFloat(row['Tiền trước thuế']) || 0;
            // Giao dịch bán: salePrefixes (Tổng SL > 0)
            salePrefixes.forEach(prefix => {
                if (mkh.startsWith(prefix) && tongSL > 0) {
                    saleResults[prefix].volume += tongSL;
                    saleResults[prefix].amount += tienDien;
                }
            });
            // Giao dịch mua: purchasePrefixes (Tổng SL < 0)
            purchasePrefixes.forEach(prefix => {
                if (mkh.startsWith(prefix) && tongSL < 0) {
                    purchaseResults[prefix].volume += tongSL;
                    purchaseResults[prefix].amount += tienDien;
                }
            });
        }
    });

    // Cập nhật DOM cho bán hàng (sale)
    salePrefixes.forEach(prefix => {
        const volumeElem = document.getElementById("totalVolume_" + prefix);
        const amountElem = document.getElementById("totalAmount_" + prefix);
        if (volumeElem) {
            volumeElem.innerHTML = `<b>${formatCurrency(saleResults[prefix].volume, 'kWh')}</b>`;
        }
        if (amountElem) {
            amountElem.innerHTML = `<b>${formatCurrency(saleResults[prefix].amount, 'đồng')}</b>`;
        }
    });

    // Cập nhật DOM cho mua hàng (purchase) - hiển thị giá trị tuyệt đối
    purchasePrefixes.forEach(prefix => {
        const volumeElem = document.getElementById("totalVolume_" + prefix);
        const amountElem = document.getElementById("totalAmount_" + prefix);
        if (volumeElem) {
            volumeElem.innerHTML = `<b>${formatCurrency(Math.abs(purchaseResults[prefix].volume), 'kWh')}</b>`;
        }
        if (amountElem) {
            amountElem.innerHTML = `<b>${formatCurrency(Math.abs(purchaseResults[prefix].amount), 'đồng')}</b>`;
        }
    });
}
