import { loadCSV } from './csvReader.js';

// Dynamic CSS for conditional coloring and checkmark
const style = document.createElement('style');
style.textContent = `
  .parent-row.fully-paid { background-color: #c8e6c9; }
  .parent-row:not(.fully-paid) { background-color: #ffcdd2; }
  .child-paid { background-color: #e8f5e9; }
  .child-unpaid { background-color: #ffebee; }
  .checkmark { color: green; font-size: 1.2em; text-align: center; }
`;
document.head.appendChild(style);

function parseDDMMYYYY(str) {
  if (!str || !str.trim()) return null;
  const [d, m, y] = str.split('/');
  return new Date(+y, +m - 1, +d);
}

document.addEventListener('DOMContentLoaded', async () => {
  const raw = await loadCSV('assets/data/datahdKH.csv');
  const data = raw.map(r => {
    const pd = parseDDMMYYYY(r['Ngày thanh toán']);
    const cd = parseDDMMYYYY(r['Ngày chốt chỉ số']);
    return {
      name: r['Tên khách hàng'],
      address: r['Địa chỉ sử dụng điện'],
      period: r['Kỳ'],
      paymentDate: pd,
      closingDate: cd,
      hasPayment: pd !== null,
      amount: parseFloat(r['Số tiền sau thuế'].replace(/\./g, '')) || 0,
      active: parseFloat(r['Sản lượng'].replace(/\./g, '')) || 0,
      reactive: parseFloat(r['Sản lượng phản kháng'].replace(/\./g, '')) || 0
    };
  });

  // Initialize period select (last 12 months by closingDate)
  const periodSelect = document.getElementById('periodSelect');
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    periodSelect.add(new Option(key, key));
  }
  periodSelect.value = periodSelect.options[0].value;

  const containerIds = ['pivotContainer1', 'pivotContainer2', 'pivotContainer3', 'pivotContainer4'];
  const addresses = Array.from(new Set(data.map(r => r.address)));

  function renderPivot() {
    const [selM, selY] = periodSelect.value.split('/').map(n => +n);
    // Filter by closingDate
    const filtered = data.filter(r =>
      r.closingDate &&
      r.closingDate.getMonth() + 1 === selM &&
      r.closingDate.getFullYear() === selY
    );

    containerIds.forEach((cid, idx) => {
      const container = document.getElementById(cid);
      container.innerHTML = '';
      const addr = addresses[idx];
      if (!addr) return;
      const addrData = filtered.filter(r => r.address === addr);
      if (!addrData.length) return;

      // Group by customer
      const groups = {};
      addrData.forEach(r => {
        if (!groups[r.name]) {
          groups[r.name] = { totals: { amount: 0, active: 0, reactive: 0 }, items: [] };
        }
        groups[r.name].totals.amount += r.amount;
        groups[r.name].totals.active += r.active;
        groups[r.name].totals.reactive += r.reactive;
        groups[r.name].items.push(r);
      });

      // Build table
      const table = document.createElement('table');
      table.classList.add('table', 'table-bordered');
      table.innerHTML = `
        <thead>
          <tr>
            <th></th>
            <th>Khách hàng / Đợt</th>
            <th>Ngày thanh toán</th>
            <th>Số tiền</th>
            <th>Sản lượng</th>
            <th>Phản kháng</th>
          </tr>
        </thead>`;
      const tbody = document.createElement('tbody');

      Object.entries(groups).forEach(([name, grp], gIdx) => {
        const isFully = grp.items.every(it => it.hasPayment);
        const trP = document.createElement('tr');
        trP.classList.add('parent-row');
        if (isFully) trP.classList.add('fully-paid');
        // parent rows without full payment get red background via CSS
        const mark = isFully ? '<td class="checkmark">✔</td>' : '<td></td>';
        trP.innerHTML = `
          <td><button class="toggle-btn" data-key="${idx}_${gIdx}">+</button></td>
          <td>${name}</td>
          ${mark}
          <td>${grp.totals.amount.toLocaleString()}</td>
          <td>${grp.totals.active.toLocaleString()}</td>
          <td>${grp.totals.reactive.toLocaleString()}</td>
        `;
        tbody.appendChild(trP);

        grp.items.forEach(it => {
          const pd = it.paymentDate;
          const pdStr = pd ? `${String(pd.getDate()).padStart(2, '0')}/${String(pd.getMonth() + 1).padStart(2, '0')}/${pd.getFullYear()}` : '';
          const month = it.closingDate ? it.closingDate.getMonth() + 1 : '';
          const reactiveTag = it.reactive > 0 ? ' (phản kháng)' : '';
          const periodText = `Kỳ ${it.period}/tháng ${month}${reactiveTag}`;

          const trC = document.createElement('tr');
          trC.classList.add(`group-${idx}_${gIdx}`);
          if (it.hasPayment) trC.classList.add('child-paid');
          else trC.classList.add('child-unpaid');
          trC.style.display = 'none';
          trC.innerHTML = `
            <td></td>
            <td>${periodText}</td>
            <td>${pdStr}</td>
            <td>${it.amount.toLocaleString()}</td>
            <td>${it.active.toLocaleString()}</td>
            <td>${it.reactive.toLocaleString()}</td>
          `;
          tbody.appendChild(trC);
        });
      });

      table.appendChild(tbody);
      container.appendChild(table);
    });
  }

  periodSelect.addEventListener('change', renderPivot);
  renderPivot();

  document.body.addEventListener('click', e => {
    if (!e.target.matches('.toggle-btn')) return;
    const key = e.target.dataset.key;
    const rows = document.querySelectorAll(`.group-${key}`);
    const show = rows[0].style.display === 'none';
    rows.forEach(r => r.style.display = show ? '' : 'none');
    e.target.textContent = show ? '–' : '+';
  });
});
