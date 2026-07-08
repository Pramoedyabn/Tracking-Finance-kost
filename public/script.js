import {
  auth,
  db,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  deleteDoc,
  doc,
  serverTimestamp,
} from "./firebase.js";

// Elements
const loginPage = document.getElementById("login-page");
const dashboardPage = document.getElementById("dashboard-page");
const formLogin = document.getElementById("form-login");
const formPengeluaran = document.getElementById("form-pengeluaran");
const listPengeluaran = document.getElementById("list-pengeluaran");

// State
let currentUser = null;
let expenses = [];
let chartInstance = null;
const BUDGET_AWAL = 500000;
let currentPeriod = { startDay: 1, endDay: 10 }; // diupdate tiap renderDashboard()

// Format Rupiah
const formatRp = (angka) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
};

// ================= AUTHENTICATION =================
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    loginPage.classList.remove("active");
    loginPage.classList.add("hidden");
    dashboardPage.classList.remove("hidden");
    document.getElementById("input-tanggal").valueAsDate = new Date();
    loadData();
  } else {
    currentUser = null;
    loginPage.classList.add("active");
    loginPage.classList.remove("hidden");
    dashboardPage.classList.add("hidden");
  }
});

formLogin.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    // Jika belum ada, register otomatis (Untuk mempermudah demo)
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      Swal.fire("Sukses", "Akun berhasil dibuat dan login!", "success");
    } catch (err) {
      Swal.fire("Error", err.message, "error");
    }
  }
});

document
  .getElementById("btn-logout")
  .addEventListener("click", () => signOut(auth));

// ================= DATA & LOGIC =================
function loadData() {
  const q = query(
    collection(db, "pengeluaran"),
    where("userId", "==", currentUser.uid),
    orderBy("tanggal", "desc")
  );

  onSnapshot(q, (snapshot) => {
    expenses = [];
    snapshot.forEach((doc) => {
      expenses.push({ id: doc.id, ...doc.data() });
    });
    renderDashboard();
  });
}

formPengeluaran.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = {
    userId: currentUser.uid,
    tanggal: document.getElementById("input-tanggal").value,
    kategori: document.getElementById("input-kategori").value,
    nominal: parseFloat(document.getElementById("input-nominal").value),
    keterangan: document.getElementById("input-keterangan").value,
    createdAt: serverTimestamp(),
  };

  try {
    await addDoc(collection(db, "pengeluaran"), data);
    Swal.fire({
      title: "Sukses!",
      text: "Data berhasil disimpan",
      icon: "success",
      timer: 1500,
    });
    formPengeluaran.reset();
    document.getElementById("input-tanggal").valueAsDate = new Date();
  } catch (error) {
    Swal.fire("Error", error.message, "error");
  }
});

window.hapusData = async (id) => {
  const result = await Swal.fire({
    title: "Yakin hapus?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Ya, hapus!",
  });
  if (result.isConfirmed) {
    await deleteDoc(doc(db, "pengeluaran", id));
    Swal.fire({
      title: "Terhapus!",
      text: "Data berhasil dihapus",
      icon: "success",
      timer: 1500,
    });
  }
};

document
  .getElementById("filter-waktu")
  .addEventListener("change", () => renderList(getFilteredExpenses()));

document
  .getElementById("search-input")
  .addEventListener("input", () => renderList(getFilteredExpenses()));

// ================= RENDER UI & CALCULATIONS =================
function renderDashboard() {
  // 1. Logika 10 Hari bawaan Anda
  const today = new Date();
  const dateNum = today.getDate();
  let startDay, endDay, hariBerjalan, sisaHari;

  if (dateNum <= 10) {
    startDay = 1;
    endDay = 10;
    hariBerjalan = dateNum;
    sisaHari = 10 - dateNum;
  } else if (dateNum <= 20) {
    startDay = 11;
    endDay = 20;
    hariBerjalan = dateNum - 10;
    sisaHari = 20 - dateNum;
  } else {
    startDay = 21;
    endDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    hariBerjalan = dateNum - 20;
    sisaHari = endDay - dateNum;
  }

  // Simpan periode saat ini biar bisa dipakai fungsi filter riwayat transaksi
  currentPeriod = { startDay, endDay };

  // Filter transaksi untuk periode saat ini
  const currentPeriodExpenses = expenses.filter((ex) => {
    const d = new Date(ex.tanggal).getDate();
    const m = new Date(ex.tanggal).getMonth();
    return d >= startDay && d <= endDay && m === today.getMonth();
  });

  // ================= HITUNG PENGELUARAN KHUSUS HARI INI =================
  // Menyamakan format tanggal objek Date ke string YYYY-MM-DD (WIB/Lokal)
  const tahun = today.getFullYear();
  const bulan = String(today.getMonth() + 1).padStart(2, "0");
  const tanggal = String(today.getDate()).padStart(2, "0");
  const hariIniString = `${tahun}-${bulan}-${tanggal}`;

  // Jumlahkan semua pengeluaran yang tanggalnya sama dengan hari ini
  const pengeluaranHariIni = expenses
    .filter((ex) => ex.tanggal === hariIniString)
    .reduce((sum, item) => sum + item.nominal, 0);

  const JATAH_HARIAN_AWAL = 50000;
  const sisaJatahHariIni = JATAH_HARIAN_AWAL - pengeluaranHariIni;
  // =====================================================================

  const totalPengeluaran = currentPeriodExpenses.reduce(
    (sum, item) => sum + item.nominal,
    0
  );
  const sisaBudget = BUDGET_AWAL - totalPengeluaran;
  const persentase = (totalPengeluaran / BUDGET_AWAL) * 100;
  const rataHarian = totalPengeluaran / (hariBerjalan || 1);
  const prediksi = rataHarian * (sisaHari || 1);

  // Update UI Card Budget & Rata-rata
  document.getElementById("sisa-budget").innerText = formatRp(sisaBudget);
  document.getElementById("total-pengeluaran").innerText =
    formatRp(totalPengeluaran);
  document.getElementById(
    "hari-tersisa"
  ).innerText = `${sisaHari} hari tersisa dalam periode ini`;
  document.getElementById("rata-harian").innerText = formatRp(rataHarian);

  // ================= UPDATE UI JATAH HARI INI =================
  const jatahElem = document.getElementById("jatah-hari-ini");
  if (jatahElem) {
    jatahElem.innerText = formatRp(sisaJatahHariIni);

    // Jika pengeluaran melebihi jatah harian (minus), otomatis teks berubah merah
    if (sisaJatahHariIni < 0) {
      jatahElem.style.color = "var(--danger)";
    } else {
      jatahElem.style.color = "#2563EB";
    }
  }
  // ============================================================

  const progressBar = document.getElementById("budget-progress");
  const budgetStatus = document.getElementById("budget-status");
  progressBar.style.width = `${Math.min(persentase, 100)}%`;

  if (persentase <= 50) {
    progressBar.style.backgroundColor = "var(--success)";
    budgetStatus.innerText = "Budget Aman (0-50%)";
  } else if (persentase <= 80) {
    progressBar.style.backgroundColor = "var(--warning)";
    budgetStatus.innerText = "Hati-hati (51-80%)";
  } else {
    progressBar.style.backgroundColor = "var(--danger)";
    budgetStatus.innerText =
      persentase > 100 ? "Budget telah terlampaui!" : "Kritis (81-100%)";
  }

  // Update Insight & Target
  const alertBox = document.getElementById("target-alert");
  if (prediksi > sisaBudget && sisaHari > 0) {
    alertBox.className = "alert alert-danger";
    alertBox.innerHTML =
      "⚠ Pengeluaran terlalu tinggi. Budget kemungkinan tidak cukup sampai periode selesai.";
  } else {
    alertBox.className = "alert alert-safe";
    alertBox.innerHTML = "✅ Budget masih aman.";
  }

  renderList(getFilteredExpenses());
  renderChart(currentPeriodExpenses);
}

// ================= FILTER RIWAYAT TRANSAKSI =================
function getFilteredExpenses() {
  const filterWaktu = document.getElementById("filter-waktu").value;
  const searchText = document
    .getElementById("search-input")
    .value.trim()
    .toLowerCase();

  const today = new Date();
  const tahun = today.getFullYear();
  const bulan = String(today.getMonth() + 1).padStart(2, "0");
  const tanggal = String(today.getDate()).padStart(2, "0");
  const hariIniString = `${tahun}-${bulan}-${tanggal}`;

  let filtered = expenses;

  if (filterWaktu === "hari-ini") {
    filtered = filtered.filter((ex) => ex.tanggal === hariIniString);
  } else if (filterWaktu === "periode-ini") {
    filtered = filtered.filter((ex) => {
      const d = new Date(ex.tanggal).getDate();
      const m = new Date(ex.tanggal).getMonth();
      return (
        d >= currentPeriod.startDay &&
        d <= currentPeriod.endDay &&
        m === today.getMonth()
      );
    });
  }
  // "semua" -> tidak difilter berdasarkan waktu

  if (searchText) {
    filtered = filtered.filter((ex) =>
      ex.keterangan.toLowerCase().includes(searchText)
    );
  }

  return filtered;
}

function renderList(data) {
  listPengeluaran.innerHTML = "";
  data.forEach((item) => {
    const div = document.createElement("div");
    div.className = "transaction-item";
    div.innerHTML = `
            <div class="tx-info">
                <div class="tx-icon"><i class="fa-solid fa-tag"></i></div>
                <div class="tx-details">
                    <h4>${item.kategori}</h4>
                    <p>${item.tanggal} - ${item.keterangan}</p>
                </div>
            </div>
            <div class="tx-amount">
                ${formatRp(item.nominal)}
                <div class="tx-actions">
                    <button onclick="hapusData('${
                      item.id
                    }')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
    listPengeluaran.appendChild(div);
  });
}

function renderChart(data) {
  const ctx = document.getElementById("pieChart").getContext("2d");

  // Kelompokkan data per kategori
  const categoryTotals = {};
  data.forEach((item) => {
    categoryTotals[item.kategori] =
      (categoryTotals[item.kategori] || 0) + item.nominal;
  });

  const labels = Object.keys(categoryTotals);
  const values = Object.values(categoryTotals);

  // Insight kategori terbesar
  const maxKategori =
    labels.length > 0 ? labels[values.indexOf(Math.max(...values))] : "-";
  document.getElementById("kategori-terbesar").innerText = maxKategori;

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: "pie",
    data: {
      labels: labels,
      datasets: [
        {
          data: values,
          backgroundColor: [
            "#2563EB",
            "#10B981",
            "#F59E0B",
            "#EF4444",
            "#8B5CF6",
            "#EC4899",
            "#14B8A6",
          ],
        },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });
}

// ================= EXPORT & PWA =================
document.getElementById("btn-export-pdf").addEventListener("click", () => {
  const element = document.getElementById("dashboard-page");
  html2pdf().from(element).save("Laporan_Kost.pdf");
});

document.getElementById("btn-export-excel").addEventListener("click", () => {
  const ws = XLSX.utils.json_to_sheet(expenses);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Pengeluaran");
  XLSX.writeFile(wb, "Laporan_Kost.xlsx");
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(console.error);
}
