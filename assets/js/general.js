
function fetchAndProcessCSV() {

    fetch('./assets/js/general.csv')
        .then(response => response.text())
        .then(text => {
            Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                complete: function (results) {
                    displayResults(results.data);
                },
                error: function (error) {
                    console.error("Erorr CSV:", error);
                }
            });
        })
        .catch(error => console.error("Load CSV:", error));
}
function formatNumber(value, unit) {
    const formatted = value.toLocaleString('vi-VN');
    return `${formatted} ${unit}`;
}
function displayResults(data) {
    let totalPurchaseAmount = 0;
    let totalSaleAmount = 0;
    let totalPurchaseVolume = 0;
    let totalSaleVolume = 0;


    data.forEach(row => {
        totalPurchaseAmount += parseFloat(row["Tổng tiền điện mua"] || 0);
        totalSaleAmount += parseFloat(row["Tổng tiền điện bán"] || 0);
        totalPurchaseVolume += parseFloat(row["Sản lượng mua"] || 0);
        totalSaleVolume += parseFloat(row["Sản lượng bán"] || 0);
    });


    document.getElementById("totalPurchaseVolume").innerHTML = `<b>${formatNumber(totalPurchaseVolume, 'kWh')}</b>`;
    document.getElementById("totalSaleVolume").innerHTML = `<b>${formatNumber(totalSaleVolume, 'kWh')}</b>`;
    document.getElementById("totalPurchaseAmount").innerHTML = `<b>${formatNumber(totalPurchaseAmount, 'đồng')}</b>`;
    document.getElementById("totalSaleAmount").innerHTML = `<b>${formatNumber(totalSaleAmount, 'đồng')}</b>`;
}


document.addEventListener("DOMContentLoaded", fetchAndProcessCSV);
