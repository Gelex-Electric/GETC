document.addEventListener("DOMContentLoaded", function () {
    fetchAndProcessCSV('../assets/data/datahd.csv', displayEachResults);
});

function displayEachResults(data) {
    // Danh sách tiền tố của các khu vực cần phân loại
    const regionPrefixes = ['KCNTH', 'KCNPĐ', 'KCN03', 'KCNYM'];
    
    // Khởi tạo đối tượng lưu kết quả cho từng khu vực
    const regionTotals = {};
    regionPrefixes.forEach(prefix => {
      regionTotals[prefix] = {
        purchaseVolume: 0,  // Tổng SL khi âm (lấy giá trị tuyệt đối)
        saleVolume: 0,      // Tổng SL khi dương
        purchaseAmount: 0,  // Tiền trước thuế khi dương
        saleAmount: 0       // Tiền trước thuế khi âm (lấy giá trị tuyệt đối)
      };
    });
  
    // Duyệt qua từng dòng dữ liệu của file CSV
    data.forEach(row => {
      // Lấy giá trị của cột "Tổng SL" và "Tiền trước thuế", chuyển sang số (nếu không hợp lệ thì dùng 0)
      const tongSL = parseFloat(row['Tổng SL']) || 0;
      const tienDien = parseFloat(row['Tiền trước thuế']) || 0;
      
      // Lấy mã khách hàng
      const mkh = row['MKH'] || '';
      
      // Kiểm tra xem MKH có bắt đầu bằng một trong các tiền tố không
      regionPrefixes.forEach(prefix => {
        if (mkh.startsWith(prefix)) {
          // Xử lý cột "Tổng SL"
          if (tongSL > 0) {
            regionTotals[prefix].saleVolume += tongSL;
          } else {
            regionTotals[prefix].purchaseVolume += Math.abs(tongSL);
          }
          
          // Xử lý cột "Tiền trước thuế"
          if (tienDien > 0) {
            regionTotals[prefix].purchaseAmount += tienDien;
          } else {
            regionTotals[prefix].saleAmount += Math.abs(tienDien);
          }
        }
      });
    });
  
    // Cập nhật kết quả của từng khu vực vào DOM
    regionPrefixes.forEach(prefix => {
      document.getElementById(`region_${prefix}_purchaseVolume`).innerHTML =
        `<b>${formatNumber(regionTotals[prefix].purchaseVolume, 'kWh')}</b>`;
      document.getElementById(`region_${prefix}_saleVolume`).innerHTML =
        `<b>${formatNumber(regionTotals[prefix].saleVolume, 'kWh')}</b>`;
      document.getElementById(`region_${prefix}_purchaseAmount`).innerHTML =
        `<b>${formatNumber(regionTotals[prefix].purchaseAmount, 'đồng')}</b>`;
      document.getElementById(`region_${prefix}_saleAmount`).innerHTML =
        `<b>${formatNumber(regionTotals[prefix].saleAmount, 'đồng')}</b>`;
    });
  }
   