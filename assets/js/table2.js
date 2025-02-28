document.addEventListener("DOMContentLoaded", function () {
  fetchAndProcessCSV('../assets/data/datahd.csv', processData);
});

function processData(data) {
  // Chuyển đổi cột "Ngày" và "Ngày thanh toán" sang đối tượng Date
  data.forEach(r => {
    r.creationDateObj = parseDateDMY(r['Ngày']) || new Date(0);
    r.paymentDateObj = parseDateDMY(r['Ngày thanh toán']) || new Date(0);
  });

  // Tạo 4 nhóm theo tiền tố của MKH
  const groupsTH = {};   // cho mã bắt đầu bằng "KCNTH"
  const groupsPD = {};   // cho mã bắt đầu bằng "KCNPĐ"
  const groupsYM = {};   // cho mã bắt đầu bằng "KCNYM"
  const groups03 = {};   // cho mã bắt đầu bằng "KCN03"

  data.forEach(r => {
    const mkh = r["Tên Tắt"];
    if (mkh.startsWith("TH")) {
      if (!groupsTH[mkh]) groupsTH[mkh] = [];
      groupsTH[mkh].push(r);
    } else if (mkh.startsWith("PĐ")) {
      if (!groupsPD[mkh]) groupsPD[mkh] = [];
      groupsPD[mkh].push(r);
    } else if (mkh.startsWith("YM")) {
      if (!groupsYM[mkh]) groupsYM[mkh] = [];
      groupsYM[mkh].push(r);
    } else if (mkh.startsWith("03")) {
      if (!groups03[mkh]) groups03[mkh] = [];
      groups03[mkh].push(r);
    }
  });

  // Xây dựng bảng cho từng nhóm
  buildTableHTML(groupsTH, "tablepayableTH");
  buildTableHTML(groupsPD, "tablepayablePĐ");
  buildTableHTML(groupsYM, "tablepayableYM");
  buildTableHTML(groups03, "tablepayable03");
}

// Hàm so sánh ngày (nếu chưa có)
function isSameDate(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

function buildTableHTML(groups, tableId) {
  // Tìm ngày lớn nhất (global) từ cột "Ngày" trong tất cả các nhóm
  let globalLatestDate = new Date(0);
  for (let mkh in groups) {
    groups[mkh].forEach(r => {
      if (r.creationDateObj > globalLatestDate) {
        globalLatestDate = r.creationDateObj;
      }
    });
  }

  const dayList = [];
  for (let i = 0; i < 15; i++) {
    const d = new Date(globalLatestDate);
    d.setDate(d.getDate() + i);
    dayList.push(d);
  }

  // Tổng số tiền thanh toán của nhóm
  let totalPayment = 0;

  // Xây dựng bảng HTML
  let html = `<table id="table_${tableId}" class="display" style="width:100%">`;

  // --- HEADER ---
  html += '<thead><tr>';
  html += '<th>Mã_khách_hàng</th>';
  html += '<th>Số_tiền_thanh_toán</th>';
  dayList.forEach(d => {
    html += `<th>${formatDateDMY(d)}</th>`;
  });
  html += '</tr></thead>';

  // --- BODY ---
  html += '<tbody>';
  for (let mkh in groups) {
    const records = groups[mkh];
    // Lọc các bản ghi có creationDateObj bằng globalLatestDate và cộng dồn giá trị 'Tiền sau thuế'
    const matchingRows = records.filter(r => r.creationDateObj.getTime() === globalLatestDate.getTime());
    let numericPayment = matchingRows.reduce((sum, r) => sum + (parseFloat(r['Tiền sau thuế']) || 0), 0);

    // Bỏ qua dòng nếu số tiền thanh toán bằng 0
    if (numericPayment === 0) continue;

    totalPayment += numericPayment;
    const paymentValue = formatCurrency(numericPayment, "");

    // Kiểm tra xem dòng có chứa ít nhất 1 ô "Thanh toán" hay không
    const rowHasPayment = dayList.some(d =>
      records.some(r => formatDateDMY(r.paymentDateObj) === formatDateDMY(d))
    );

    // Nếu dòng có thanh toán: toàn dòng nền lightgreen, chữ màu xanh
    const trStyle = rowHasPayment ? ' style="background-color: lightgreen; color: green;"' : '';
    html += `<tr${trStyle}>`;
    html += `<td>${mkh}</td>`;
    html += `<td>${paymentValue}</td>`;

    // Duyệt qua từng ô của dayList (các cột ngày)
    dayList.forEach((d, i) => {
      // Khởi tạo style cơ bản cho ô: padding và đường phân cách giữa các cột
      let cellStyle = "padding:5px; border-right:2px solid #ccc;";

      if (rowHasPayment) {
        // Nếu dòng có thanh toán, kiểm tra xem ô này có thanh toán hay không
        const hasPayment = records.some(r => formatDateDMY(r.paymentDateObj) === formatDateDMY(d));
        html += `<td style="${cellStyle}">${hasPayment ? "<strong>Thanh toán</strong>" : ""}</td>`;
      } else {
        if (i === 0) {
          cellStyle += "background-color: lightblue;";
        } else if (i === 5) {
          cellStyle += "background-color: yellow;";
        } else if (i === dayList.length - 1) {
          cellStyle += "background-color: lightcoral;";
        }
        html += `<td style="${cellStyle}"></td>`;
      }
    });

    html += '</tr>';
  }
  html += '</tbody>';

  // --- FOOTER ---
  html += '<tfoot><tr>';
  html += `<td colspan="1"></td>`;
  html += `<td>${formatCurrency(totalPayment, "đồng")}</td>`;
  dayList.forEach(() => {
    html += '<td></td>';
  });
  html += '</tr></tfoot>';

  html += '</table>';

  // Chèn HTML vào phần tử có id tương ứng
  document.getElementById(tableId).innerHTML = html;

  // Khởi tạo DataTables
  $(() => {
    $(`#table_${tableId}`).DataTable({
      paging: false,
      searching: false,
      ordering: true,
      info: false,
      autoWidth: false,
      scrollX: true,
      columnDefs: [
        { targets: 0, width: "200px" },
        { targets: 1, width: "250px" }
      ],
      drawCallback: function(settings) {
        $(this.api().table().footer()).find('tr').css({'font-weight': 'bold'});
      }
    });
  });
}


