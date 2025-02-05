document.addEventListener("DOMContentLoaded", function () {
    fetchAndProcessCSV('/assets/data/datahd.csv', eachdisplayResults);
    fetchAndProcessCSV('/assets/data/datahd.csv', eachdisplaychart);
});

function eachdisplaychartdisplaychart(data) {
    const monthslabels = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];
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

    // render Chart.js
    const ctx = document.getElementById('barChart').getContext('2d');
    new Chart(ctx, {
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

function formatNumber(value, unit) {
    const formatted = value.toLocaleString('vi-VN');
    return `${formatted} ${unit}`;
}

function displayResults(data) {
    let totalPositiveSL = 0;
    let totalNegativeSL = 0;
    let totalPositiveTD = 0;
    let totalNegativeTD = 0;
  
    data.forEach(row => {
      const tongSL = parseFloat(row['Tổng SL']) || 0;
      const tienDien = parseFloat(row['Tiền trước thuế']) || 0;
      // Process SL
      if (tongSL > 0) {
        totalPositiveSL += tongSL;
      } else {
        totalNegativeSL += Math.abs(tongSL);
      }
  
      // Process Tiendien
      if (tienDien > 0) {
        totalPositiveTD += tienDien;
      } else {
        totalNegativeTD += Math.abs(tienDien);
      }
  
    });
  
    document.getElementById("totalPurchaseVolume").innerHTML = `<b>${formatNumber(totalNegativeSL, 'kWh')}</b>`;
    document.getElementById("totalSaleVolume").innerHTML = `<b>${formatNumber(totalPositiveSL, 'kWh')}</b>`;
    document.getElementById("totalPurchaseAmount").innerHTML = `<b>${formatNumber(totalPositiveTD, 'đồng')}</b>`;
    document.getElementById("totalSaleAmount").innerHTML = `<b>${formatNumber(totalNegativeTD, 'đồng')}</b>`;
}
