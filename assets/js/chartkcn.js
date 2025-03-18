document.addEventListener("DOMContentLoaded", function () {
    fetchAndProcessCSV('../assets/data/datahd.csv', function(data) {
        // Vẽ biểu đồ bán hàng theo tháng cho các MKH có tiền tố xác định
        displayChartsByMKH(data);
        // Cập nhật kết quả tổng hợp (bán theo tiền tố và mua theo mapping EVN)
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

function displayResults(data) {
    // Mảng chứa 4 tiền tố cần xử lý cho bán hàng
    const salePrefixes = ["KCNTH", "KCNPĐ", "KCN03", "KCNYM"];
    let saleResults = {};
    salePrefixes.forEach(prefix => {
        saleResults[prefix] = { volume: 0, amount: 0 };
    });

    // Tính tổng bán: đối với dòng có MKH bắt đầu bằng một trong các tiền tố và Tổng SL > 0
    data.forEach(row => {
        const mkh = row['MKH'];
        if (mkh && salePrefixes.some(prefix => mkh.startsWith(prefix))) {
            const tongSL = parseFloat(row['Tổng SL']) || 0;
            const tienDien = parseFloat(row['Tiền trước thuế']) || 0;
            if (tongSL > 0) {
                for (let prefix of salePrefixes) {
                    if (mkh.startsWith(prefix)) {
                        saleResults[prefix].volume += tongSL;
                        saleResults[prefix].amount += tienDien;
                        break;
                    }
                }
            }
        }
    });

    // Phần mua hàng: chỉ nhóm các dòng có MKH nằm trong 4 tiền tố theo mapping EVN
    const purchaseMapping = {
        "KCNTH": "EVN-TH",
        "KCNPĐ": "EVN-PĐ",
        "KCN03": "EVN-AT",
        "KCNYM": "EVN-YM"
    };
    let purchaseResults = {};
    Object.values(purchaseMapping).forEach(mapped => {
        purchaseResults[mapped] = { volume: 0, amount: 0 };
    });
    data.forEach(row => {
        const mkh = row['MKH'];
        if (mkh) {
            for (let prefix of salePrefixes) {
                if (mkh.startsWith(prefix)) {
                    const tongSL = parseFloat(row['Tổng SL']) || 0;
                    const tienDien = parseFloat(row['Tiền trước thuế']) || 0;
                    if (tongSL < 0) { // mua hàng
                        const mapped = purchaseMapping[prefix];
                        purchaseResults[mapped].volume += Math.abs(tongSL);
                        purchaseResults[mapped].amount += Math.abs(tienDien);
                    }
                    break;
                }
            }
        }
    });

    // Cập nhật DOM cho bán hàng: với mỗi tiền tố, cập nhật các id "totalSaleVolume_<prefix>" và "totalSaleAmount_<prefix>"
    salePrefixes.forEach(prefix => {
        const volumeElem = document.getElementById("totalSaleVolume_" + prefix);
        const amountElem = document.getElementById("totalSaleAmount_" + prefix);
        if (volumeElem) {
            volumeElem.innerHTML = `<b>${formatCurrency(saleResults[prefix].volume, 'kWh')}</b>`;
        }
        if (amountElem) {
            amountElem.innerHTML = `<b>${formatCurrency(saleResults[prefix].amount, 'đồng')}</b>`;
        }
    });

    // Cập nhật DOM cho mua hàng: với mỗi EVN theo mapping, cập nhật các id "totalSaleVolume_<EVN>" và "totalSaleAmount_<EVN>"
    Object.keys(purchaseResults).forEach(mapped => {
        const volumeElem = document.getElementById("totalSaleVolume_" + mapped);
        const amountElem = document.getElementById("totalSaleAmount_" + mapped);
        if (volumeElem) {
            volumeElem.innerHTML = `<b>${formatCurrency(purchaseResults[mapped].volume, 'kWh')}</b>`;
        }
        if (amountElem) {
            amountElem.innerHTML = `<b>${formatCurrency(purchaseResults[mapped].amount, 'đồng')}</b>`;
        }
    });
}
