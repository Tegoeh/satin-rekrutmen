/**
 * SATIN RECRUITMENT DASHBOARD 2026/2027
 * Core Application Logic - Vanilla ES6+ JS
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- APP STATE ---
    let applicants = [];
    let activeView = 'grid'; // 'grid' | 'table'
    let activeTab = 'pendaftar-tab'; // 'pendaftar-tab' | 'statistik-tab' | 'struktur-tab'
    let admissions = JSON.parse(localStorage.getItem('rekrutmen_admissions')) || {};
    let processedAdmissions = {};
    let schoolChartInstance = null;
    let positionChartInstance = null;
    let lastApplicantsStr = '';
    let lastAdmissionsStr = '';
    const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT9z00JrLv9Molf8m4AiByB4ZMPzkb3nOgMnWoez06vSRe8VSuSRTKzIClqfnyGnHXXAAjtZDKs4izE/pub?gid=643422287&single=true&output=csv';
    const appsScriptUrl = 'https://script.google.com/macros/s/AKfycbzmv_C2ZNarXxP0_VfQaed_ch3rt02gDuxSwxTd-BX3p037XXJXr43mI3U_bPq0Qppg-g/exec';

    // --- DOM ELEMENTS ---
    const btnRefresh = document.getElementById('btn-refresh');
    const btnRetry = document.getElementById('btn-retry');
    const refreshIcon = document.getElementById('refresh-icon');
    const lastSyncTimeEl = document.getElementById('last-sync-time');
    
    const statTotalPendaftar = document.getElementById('stat-total-pendaftar');
    const statAvgCommitment = document.getElementById('stat-avg-commitment');
    const statTopSchool = document.getElementById('stat-top-school');
    const statHighCommitment = document.getElementById('stat-high-commitment');

    const searchInput = document.getElementById('search-input');
    const filterPosisi = document.getElementById('filter-posisi');
    const filterSekolah = document.getElementById('filter-sekolah');
    const sortSelect = document.getElementById('sort-select');

    const viewGridBtn = document.getElementById('view-grid');
    const viewTableBtn = document.getElementById('view-table');

    const loadingOverlay = document.getElementById('loading-overlay');
    const errorOverlay = document.getElementById('error-overlay');
    const emptyOverlay = document.getElementById('empty-overlay');
    const errorMessage = document.getElementById('error-message');

    const gridViewContainer = document.getElementById('grid-view-container');
    const tableViewContainer = document.getElementById('table-view-container');
    const tableBody = document.getElementById('table-body');

    // Modal DOM Elements
    const detailModal = document.getElementById('detail-modal');
    const modalClose = document.getElementById('modal-close');
    const modalAvatar = document.getElementById('modal-avatar');
    const modalNama = document.getElementById('modal-nama');
    const modalSekolah = document.getElementById('modal-sekolah');
    const modalPhone = document.getElementById('modal-phone');
    const modalEmail = document.getElementById('modal-email');
    const modalAlamat = document.getElementById('modal-alamat');
    const modalPilihan1 = document.getElementById('modal-pilihan1');
    const modalPilihan2 = document.getElementById('modal-pilihan2');
    const modalKomitmenVal = document.getElementById('modal-komitmen-val');
    const modalKomitmenBar = document.getElementById('modal-komitmen-bar');
    const modalAlasan = document.getElementById('modal-alasan');
    const modalHarapan = document.getElementById('modal-harapan');
    const modalWhatsappLink = document.getElementById('modal-whatsapp-link');

    // Selection Panel DOM Elements
    const btnSaveDecision = document.getElementById('btn-save-decision');
    const newRoleContainer = document.getElementById('new-role-container');
    const newRoleDropdown = document.getElementById('new-role-dropdown');
    let currentSelectedStatus = 'belum'; // Temp BPH decision state

    // AI Formatur Assistant DOM Elements
    const aiPasswordModal = document.getElementById('ai-password-modal');
    const aiPasswordClose = document.getElementById('ai-password-close');
    const aiPasswordSubmit = document.getElementById('ai-password-submit');
    const aiPasswordInput = document.getElementById('ai-password-input');
    const aiPasswordError = document.getElementById('ai-password-error');
    
    const aiDashboardModal = document.getElementById('ai-dashboard-modal');
    const aiDashboardClose = document.getElementById('ai-dashboard-close');
    const aiApiKeyInput = document.getElementById('ai-api-key-input');
    const aiSaveApiKey = document.getElementById('ai-save-api-key');
    const aiTotalCandidates = document.getElementById('ai-total-candidates');
    const btnRunAi = document.getElementById('btn-run-ai');
    const aiConsoleOutput = document.getElementById('ai-console-output');
    const btnCopyAiOutput = document.getElementById('btn-copy-ai-output');

    // --- CSV PARSER ENGINE (Supports quotes & embedded newlines) ---
    const parseCSV = (text) => {
        const lines = [];
        let row = [""];
        let inQuotes = false;
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const nextChar = text[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    row[row.length - 1] += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                row.push("");
            } else if ((char === '\r' || char === '\n') && !inQuotes) {
                if (char === '\r' && nextChar === '\n') {
                    i++;
                }
                lines.push(row);
                row = [""];
            } else {
                row[row.length - 1] += char;
            }
        }
        if (row.length > 1 || row[0] !== "") {
            lines.push(row);
        }
        return lines;
    };

    // --- DATA CLEANING FUNCTIONS (Matching Python backend standard) ---
    const cleanName = (name) => {
        if (!name) return "";
        return name.trim().split(/\s+/).map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(" ");
    };

    const cleanSchool = (school) => {
        if (!school) return "";
        let s = school.trim().replace(/\s+/g, ' ');
        let sLower = s.toLowerCase();
        
        sLower = sLower.replace(/sma negeri/g, 'sman');
        sLower = sLower.replace(/sma n/g, 'sman');
        sLower = sLower.replace(/smk negeri/g, 'smkn');
        sLower = sLower.replace(/smk n/g, 'smkn');
        
        if (sLower.includes('sman 1 pekutatan')) return 'SMAN 1 Pekutatan';
        if (sLower.includes('sman 2 negara')) return 'SMAN 2 Negara';
        if (sLower.includes('sman 1 negara')) return 'SMAN 1 Negara';
        if (sLower.includes('sman 3 negara')) return 'SMAN 3 Negara';
        if (sLower.includes('sman 1 mendoyo')) return 'SMAN 1 Mendoyo';
        if (sLower.includes('sman 2 mendoyo')) return 'SMAN 2 Mendoyo';
        if (sLower.includes('sman 1 melaya')) return 'SMAN 1 Melaya';
        
        if (sLower.includes('smkn 4 negara')) return 'SMKN 4 Negara';
        if (sLower.includes('smkn 5 negara')) return 'SMKN 5 Negara';
        if (sLower.includes('smkn 3 negara')) return 'SMKN 3 Negara';
        if (sLower.includes('smkn 2 negara')) return 'SMKN 2 Negara';
        
        if (sLower.includes('man 1 jembrana')) return 'MAN 1 Jembrana';
        if (sLower.includes('man 2 jembrana')) return 'MAN 2 Jembrana';
        if (sLower.includes('man 3 jembrana')) return 'MAN 3 Jembrana';
        
        return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    };

    const cleanPhone = (phone) => {
        if (!phone) return "";
        let p = phone.replace(/\D/g, '');
        if (!p) return phone;
        
        if (p.startsWith('62')) {
            p = '0' + p.slice(2);
        } else if (p.startsWith('8')) {
            p = '0' + p;
        }
        return p;
    };

    const cleanAddress = (address) => {
        if (!address) return "";
        let s = address.trim().replace(/\s+/g, ' ');
        let parts = s.split(',').map(part => {
            return part.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        });
        return parts.filter(p => p).join(', ');
    };

    const formatTimestamp = (rawStr) => {
        if (!rawStr) return "";
        const parts = rawStr.split(' ');
        if (parts.length < 2) return rawStr;
        
        const datePart = parts[0];
        const timePart = parts[1];
        
        const timeSubparts = timePart.split(':');
        const timeFormatted = timeSubparts.slice(0, 2).join(':');
        
        const dateSubparts = datePart.split('/');
        if (dateSubparts.length === 3) {
            let [month, day, year] = dateSubparts;
            let d = parseInt(day, 10);
            let m = parseInt(month, 10);
            let y = parseInt(year, 10);
            
            if (m > 12) {
                const temp = m;
                m = d;
                d = temp;
            }
            
            const months = [
                'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 
                'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
            ];
            const monthName = months[m - 1] || month;
            const dayStr = d < 10 ? '0' + d : d;
            
            return `${dayStr} ${monthName} ${y}, ${timeFormatted}`;
        }
        
        return `${datePart}, ${timeFormatted}`;
    };

    // --- PROCESS ADMISSIONS LOGIC (CADANGAN DUPLICATE DETECTOR) ---
    const getProcessedAdmissions = () => {
        const processed = {};
        const filledPositions = [];

        // 1. Identifikasi status cadangan berdasarkan urutan pemilihan keputusan admin di admissions
        const admissionsCadanganMap = {};
        Object.entries(admissions).forEach(([name, data]) => {
            const status = data.status;
            const jabatan = data.jabatan;
            let isCadangan = false;

            if ((status === 'diterima' || status === 'diterima-dirubah') && jabatan) {
                if (filledPositions.includes(jabatan)) {
                    isCadangan = true;
                } else {
                    filledPositions.push(jabatan);
                }
            }
            admissionsCadanganMap[cleanName(name)] = isCadangan;
        });

        // 2. Petakan data keputusan yang sudah dibersihkan namanya ke processedAdmissions pendaftar
        const cleanAdmissions = {};
        Object.entries(admissions).forEach(([name, data]) => {
            cleanAdmissions[cleanName(name)] = data;
        });

        applicants.forEach(app => {
            const cleanedAppName = cleanName(app.nama);
            const adm = cleanAdmissions[cleanedAppName];
            if (adm) {
                processed[app.nama] = {
                    status: adm.status,
                    jabatan: adm.jabatan,
                    isCadangan: admissionsCadanganMap[cleanedAppName] || false
                };
            } else {
                processed[app.nama] = {
                    status: 'belum',
                    jabatan: '',
                    isCadangan: false
                };
            }
        });
        return processed;
    };

    // --- FETCH & LOAD DATA ---
    const fetchData = async (isBackground = false) => {
        if (!isBackground) {
            showLoading(true);
        }
        refreshIcon.classList.add('spin');
        btnRefresh.disabled = true;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 detik timeout

        try {
            // Persiapkan request paralel (Data Pendaftar & Database Seleksi)
            const csvPromise = fetch(`${csvUrl}&t=${Date.now()}`, { signal: controller.signal })
                .then(async (res) => {
                    if (!res.ok) throw new Error('Gagal mengambil data pendaftar.');
                    const text = await res.text();
                    return parseCSV(text);
                });

            const dbPromise = fetch(`${appsScriptUrl}?t=${Date.now()}`, { signal: controller.signal })
                .then(async (res) => {
                    if (!res.ok) throw new Error('Gagal mengambil database keputusan seleksi.');
                    return res.json();
                });

            // Jalankan paralel
            const [csvResult, dbResult] = await Promise.allSettled([csvPromise, dbPromise]);
            clearTimeout(timeoutId);

            // 1. Validasi Data Pendaftar (Harus berhasil)
            if (csvResult.status === 'rejected') {
                throw new Error(csvResult.reason.message || 'Koneksi ke Google Sheets terputus.');
            }

            const parsed = csvResult.value;
            if (parsed.length <= 1) {
                throw new Error('Data Google Sheets kosong atau tidak memiliki entri pendaftaran.');
            }

            const headers = parsed[0];
            const rows = parsed.slice(1);

            applicants = rows.map((row, idx) => {
                while (row.length < headers.length) {
                    row.push('');
                }
                const [timestamp, email, name, school, address, phone, pos1, pos2, reason, commitment, hope, ready] = row;

                return {
                    id: idx + 1,
                    timestamp: (timestamp || '').trim(),
                    email: (email || '').trim(),
                    nama: cleanName(name),
                    sekolah: cleanSchool(school),
                    alamat: cleanAddress(address),
                    whatsapp: cleanPhone(phone),
                    pilihan1: (pos1 || '').trim(),
                    pilihan2: (pos2 || '').trim(),
                    alasan: (reason || '').trim(),
                    komitmen: parseInt((commitment || '').trim(), 10) || 0,
                    harapan: (hope || '').trim(),
                    siap: (ready || '').trim()
                };
            }).filter(app => app.nama !== '');

            // Simpan pendaftar ke cache lokal
            localStorage.setItem('rekrutmen_applicants', JSON.stringify(applicants));

            // 2. Validasi & Gabungkan Database Keputusan Seleksi
            if (dbResult.status === 'fulfilled' && dbResult.value) {
                admissions = dbResult.value;
                localStorage.setItem('rekrutmen_admissions', JSON.stringify(admissions));
            } else {
                console.warn('Menggunakan database lokal karena database pusat sedang offline:', dbResult.reason);
            }

            processedAdmissions = getProcessedAdmissions();
            localStorage.setItem('rekrutmen_last_sync', new Date().toISOString());

            updateLastSyncUI(new Date());
            showError(false);
            
            // Check if data actually changed to prevent expensive DOM reflows on mobile
            const currentApplicantsStr = JSON.stringify(applicants);
            const currentAdmissionsStr = JSON.stringify(admissions);
            const isDataChanged = currentApplicantsStr !== lastApplicantsStr || currentAdmissionsStr !== lastAdmissionsStr;

            if (isDataChanged || !isBackground) {
                lastApplicantsStr = currentApplicantsStr;
                lastAdmissionsStr = currentAdmissionsStr;

                // Build UI Filters & Render
                populateFilterOptions();
                renderUI();
                calculateStatistics();
                
                // Only render charts if currently active to save mobile CPU
                if (activeTab === 'statistik-tab') {
                    renderCharts();
                }
                
                updateStrukturOrg();
            }

        } catch (err) {
            clearTimeout(timeoutId);
            console.error(err);
            if (err.name === 'AbortError') {
                errorMessage.textContent = 'Koneksi ke Google Sheets lambat atau mengalami timeout. Ini terjadi karena Google sedang memproses ekspor data secara dinamis. Silakan coba lagi atau bagikan spreadsheet dengan benar.';
            } else {
                errorMessage.textContent = err.message || 'Koneksi gagal saat menyinkronkan data.';
            }
            showError(true);
        } finally {
            showLoading(false);
            refreshIcon.classList.remove('spin');
            btnRefresh.disabled = false;
        }
    };

    // --- LOAD CACHED DATA ON INIT ---
    const loadCachedData = () => {
        const cached = localStorage.getItem('rekrutmen_applicants');
        const cachedTime = localStorage.getItem('rekrutmen_last_sync');

        if (cached) {
            applicants = JSON.parse(cached);
            lastApplicantsStr = JSON.stringify(applicants);
            lastAdmissionsStr = JSON.stringify(admissions);
            processedAdmissions = getProcessedAdmissions();
            updateLastSyncUI(new Date(cachedTime));
            populateFilterOptions();
            renderUI();
            calculateStatistics();
            renderCharts();
            updateStrukturOrg();
            showLoading(false);
        } else {
            fetchData();
        }
    };

    const updateLastSyncUI = (date) => {
        const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        lastSyncTimeEl.textContent = `Terakhir sinkron: ${timeStr}`;
    };

    // --- INTERACTIVE FILTER & DYNAMIC POPULATION ---
    const populateFilterOptions = () => {
        // Simpan filter yang sedang aktif dipilih agar tidak hilang saat data di-update
        const selectedPosisi = filterPosisi.value;
        const selectedSekolah = filterSekolah.value;

        // Clear except first
        filterPosisi.innerHTML = '<option value="all">Semua Posisi Utama</option>';
        filterSekolah.innerHTML = '<option value="all">Semua Sekolah</option>';

        // Extract uniques
        const positions = [...new Set(applicants.map(a => a.pilihan1))].filter(p => p).sort();
        const schools = [...new Set(applicants.map(a => a.sekolah))].filter(s => s).sort();

        positions.forEach(pos => {
            const opt = document.createElement('option');
            opt.value = pos;
            opt.textContent = pos;
            filterPosisi.appendChild(opt);
        });

        schools.forEach(sch => {
            const opt = document.createElement('option');
            opt.value = sch;
            opt.textContent = sch;
            filterSekolah.appendChild(opt);
        });

        // Terapkan kembali pilihan filter jika masih tersedia pada daftar opsi baru
        if (positions.includes(selectedPosisi)) {
            filterPosisi.value = selectedPosisi;
        } else {
            filterPosisi.value = 'all';
        }

        if (schools.includes(selectedSekolah)) {
            filterSekolah.value = selectedSekolah;
        } else {
            filterSekolah.value = 'all';
        }
    };

    // --- STATISTICS CARD CALCULATIONS ---
    const calculateStatistics = () => {
        if (applicants.length === 0) return;

        // Total
        statTotalPendaftar.textContent = applicants.length;

        // Average commitment
        const totalCommit = applicants.reduce((sum, a) => sum + a.komitmen, 0);
        const avg = (totalCommit / applicants.length).toFixed(1);
        statAvgCommitment.textContent = `${avg}/10`;

        // High commitment count (scale >= 8)
        const highCommit = applicants.filter(a => a.komitmen >= 8).length;
        statHighCommitment.textContent = highCommit;

        // Top School
        const schools = applicants.map(a => a.sekolah);
        const countMap = {};
        let maxCount = 0;
        let topSchool = '-';

        schools.forEach(s => {
            if (!s) return;
            countMap[s] = (countMap[s] || 0) + 1;
            if (countMap[s] > maxCount) {
                maxCount = countMap[s];
                topSchool = s;
            }
        });
        statTopSchool.textContent = topSchool;
    };

    // --- CORE RENDERING ENGINE ---
    const renderUI = () => {
        const filtered = getFilteredData();

        if (filtered.length === 0) {
            emptyOverlay.classList.remove('hidden');
            gridViewContainer.classList.add('hidden');
            tableViewContainer.classList.add('hidden');
            return;
        }

        emptyOverlay.classList.add('hidden');

        if (activeView === 'grid') {
            renderGridView(filtered);
        } else {
            renderTableView(filtered);
        }
    };

    const getFilteredData = () => {
        const search = searchInput.value.toLowerCase().trim();
        const posisi = filterPosisi.value;
        const sekolah = filterSekolah.value;
        const urutan = sortSelect.value;

        let filtered = applicants.filter(app => {
            const matchSearch = app.nama.toLowerCase().includes(search) || app.sekolah.toLowerCase().includes(search);
            const matchPosisi = posisi === 'all' || app.pilihan1 === posisi;
            const matchSekolah = sekolah === 'all' || app.sekolah === sekolah;
            return matchSearch && matchPosisi && matchSekolah;
        });

        // Sorting
        if (urutan === 'komitmen-desc') {
            filtered.sort((a, b) => b.komitmen - a.komitmen);
        } else if (urutan === 'nama-asc') {
            filtered.sort((a, b) => a.nama.localeCompare(b.nama));
        } else {
            // Default terbaru (timestamp)
            filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        }

        return filtered;
    };

    const renderGridView = (data) => {
        gridViewContainer.classList.remove('hidden');
        tableViewContainer.classList.add('hidden');
        gridViewContainer.innerHTML = '';

        data.forEach(app => {
            const initials = app.nama.split(' ').map(p => p.charAt(0)).slice(0, 2).join('').toUpperCase();
            const commitClass = app.komitmen >= 8 ? 'commitment-high' : app.komitmen >= 5 ? 'commitment-medium' : 'commitment-low';
            
            const adm = processedAdmissions[app.nama] || { status: 'belum', jabatan: '', isCadangan: false };
            let statusText = '';
            if (adm.status === 'diterima') statusText = 'Diterima';
            else if (adm.status === 'diterima-dirubah') statusText = adm.jabatan;
            else if (adm.status === 'ditolak') statusText = 'Ditolak';

            if (adm.isCadangan && (adm.status === 'diterima' || adm.status === 'diterima-dirubah')) {
                statusText += ' (Cadangan)';
            }

            const cardHtml = `
                <div class="applicant-card">
                    <span class="card-status-pill ${adm.status}">${statusText}</span>
                    <div class="card-header">
                        <div class="applicant-avatar">${initials}</div>
                        <div class="applicant-title-info">
                            <h4>${app.nama}</h4>
                            <p><i class="fa-solid fa-graduation-cap"></i> ${app.sekolah}</p>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="position-badges-card">
                            <div class="card-badge-line">
                                <span class="label-num label-num-1">1</span>
                                <span class="position-text">${app.pilihan1}</span>
                            </div>
                            <div class="card-badge-line">
                                <span class="label-num label-num-2">2</span>
                                <span class="position-text">${app.pilihan2 || '-'}</span>
                            </div>
                        </div>
                        <div class="commitment-scale-block">
                            <div class="scale-header">
                                <span>Komitmen</span>
                                <span class="commitment-badge ${commitClass}">${app.komitmen}/10</span>
                            </div>
                            <div class="commitment-bar-bg">
                                <div class="commitment-bar-fill ${commitClass}" style="width: ${app.komitmen * 10}%"></div>
                            </div>
                        </div>
                    </div>
                    <div class="card-footer">
                        <span class="timestamp"><i class="fa-regular fa-clock" style="margin-right: 4px;"></i>${formatTimestamp(app.timestamp)}</span>
                        <button class="btn btn-detail" data-id="${app.id}">Detail Profil</button>
                    </div>
                </div>
            `;
            gridViewContainer.insertAdjacentHTML('beforeend', cardHtml);
        });

        // Add event listeners to buttons
        document.querySelectorAll('.btn-detail').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id, 10);
                openApplicantDetail(id);
            });
        });
    };

    const renderTableView = (data) => {
        gridViewContainer.classList.add('hidden');
        tableViewContainer.classList.remove('hidden');
        tableBody.innerHTML = '';

        data.forEach((app, idx) => {
            const commitClass = app.komitmen >= 8 ? 'commitment-high' : app.komitmen >= 5 ? 'commitment-medium' : 'commitment-low';
            
            const adm = processedAdmissions[app.nama] || { status: 'belum', jabatan: '', isCadangan: false };
            let statusText = 'Belum';
            if (adm.status === 'diterima') statusText = 'Diterima';
            else if (adm.status === 'diterima-dirubah') statusText = `Dirubah: ${adm.jabatan}`;
            else if (adm.status === 'ditolak') statusText = 'Ditolak';

            if (adm.isCadangan && (adm.status === 'diterima' || adm.status === 'diterima-dirubah')) {
                statusText += ' (Cadangan)';
            }

            const rowHtml = `
                <tr>
                    <td>${idx + 1}</td>
                    <td class="table-nama-cell">
                        <div class="table-nama-text">${app.nama}</div>
                        <div class="table-timestamp-sub"><i class="fa-regular fa-clock" style="margin-right: 4px;"></i>${formatTimestamp(app.timestamp)}</div>
                    </td>
                    <td>${app.sekolah}</td>
                    <td><span class="badge-position pilihan1">${app.pilihan1}</span></td>
                    <td><span class="badge-position">${app.pilihan2 || '-'}</span></td>
                    <td>
                        <a href="https://wa.me/62${app.whatsapp.slice(1)}" target="_blank" class="table-whatsapp-link">
                            <i class="fa-brands fa-whatsapp"></i> ${app.whatsapp}
                        </a>
                    </td>
                    <td>
                        <span class="commitment-badge ${commitClass}" style="display:inline-block; text-align:center; min-width:50px;">
                            ${app.komitmen}/10
                        </span>
                    </td>
                    <td>
                        <span class="table-status-badge ${adm.status}">${statusText}</span>
                    </td>
                    <td>
                        <button class="btn btn-detail" data-id="${app.id}" style="padding: 4px 10px; font-size: 0.75rem;">
                            Buka
                        </button>
                    </td>
                </tr>
            `;
            tableBody.insertAdjacentHTML('beforeend', rowHtml);
        });

        // Add event listeners to table buttons
        document.querySelectorAll('.applicants-table .btn-detail').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id, 10);
                openApplicantDetail(id);
            });
        });
    };

    // --- MODAL UTILITIES ---
    const openApplicantDetail = (id) => {
        const app = applicants.find(a => a.id === id);
        if (!app) return;

        const initials = app.nama.split(' ').map(p => p.charAt(0)).slice(0, 2).join('').toUpperCase();
        const commitClass = app.komitmen >= 8 ? 'commitment-high' : app.komitmen >= 5 ? 'commitment-medium' : 'commitment-low';

        modalAvatar.textContent = initials;
        modalNama.textContent = app.nama;
        modalSekolah.innerHTML = `<i class="fa-solid fa-graduation-cap"></i> ${app.sekolah}`;
        modalPhone.textContent = app.whatsapp;
        modalEmail.textContent = app.email;
        modalAlamat.textContent = app.alamat;
        modalPilihan1.textContent = app.pilihan1;
        modalPilihan2.textContent = app.pilihan2 || '-';
        
        modalKomitmenVal.textContent = `${app.komitmen}/10`;
        modalKomitmenVal.className = `commitment-badge ${commitClass}`;
        modalKomitmenBar.className = `commitment-bar-fill ${commitClass}`;
        modalKomitmenBar.style.width = `${app.komitmen * 10}%`;

        modalAlasan.textContent = app.alasan || 'Tidak dicantumkan.';
        modalHarapan.textContent = app.harapan || 'Tidak dicantumkan.';

        // Load selection decision
        const adm = processedAdmissions[app.nama] || { status: 'belum', jabatan: '', isCadangan: false };
        currentSelectedStatus = adm.status;
        
        // Reset active buttons in modal
        document.querySelectorAll('.btn-admit').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.status === currentSelectedStatus) {
                btn.classList.add('active');
            }
        });

        // Show/hide new role select
        if (currentSelectedStatus === 'diterima-dirubah') {
            newRoleContainer.classList.remove('hidden');
            newRoleDropdown.value = adm.jabatan || '';
        } else {
            newRoleContainer.classList.add('hidden');
            newRoleDropdown.value = '';
        }

        // WhatsApp direct integration
        const msg = `Halo ${app.nama}, terima kasih sudah mendaftar dalam Rekrutmen Pengurus SATIN 2026/2027. Kami tertarik dengan profil Anda pada posisi ${app.pilihan1}. Bisakah kita menjadwalkan wawancara singkat?`;
        modalWhatsappLink.href = `https://wa.me/62${app.whatsapp.slice(1)}?text=${encodeURIComponent(msg)}`;

        // Attach click listener for save button
        btnSaveDecision.onclick = () => {
            let assignedRole = '';
            if (currentSelectedStatus === 'diterima') {
                assignedRole = app.pilihan1;
            } else if (currentSelectedStatus === 'diterima-dirubah') {
                assignedRole = newRoleDropdown.value;
                if (!assignedRole) {
                    alert('Silakan pilih jabatan baru terlebih dahulu!');
                    return;
                }
            }

            admissions[app.nama] = {
                status: currentSelectedStatus,
                jabatan: assignedRole
            };

            // Save to local storage cache immediately
            localStorage.setItem('rekrutmen_admissions', JSON.stringify(admissions));
            processedAdmissions = getProcessedAdmissions();
            
            // Re-render UI immediately (0ms feedback latency)
            renderUI();
            updateStrukturOrg();
            detailModal.classList.remove('active');
            document.body.classList.remove('modal-open');
            
            // Show success confirmation
            const alertText = currentSelectedStatus === 'diterima' || currentSelectedStatus === 'diterima-dirubah' ? 
                `Berhasil menetapkan ${app.nama} sebagai ${assignedRole}!` : `Berhasil memperbarui status ${app.nama}!`;
            alert(alertText);

            // Send payload to Google Sheets database asynchronously in background
            const payload = {
                nama: app.nama,
                status: currentSelectedStatus,
                jabatan: assignedRole
            };

            fetch(appsScriptUrl, {
                method: 'POST',
                mode: 'no-cors', // Completely bypasses browser CORS preflight check
                headers: {
                    'Content-Type': 'text/plain'
                },
                body: JSON.stringify(payload)
            }).then(() => {
                console.log(`Database terpusat berhasil diperbarui untuk: ${app.nama}`);
            }).catch(err => {
                console.error('Gagal memperbarui database terpusat Google Sheets:', err);
            });
        };

        detailModal.classList.add('active');
        document.body.classList.add('modal-open');
    };

    // --- EVENT HANDLERS ---
    btnRefresh.addEventListener('click', fetchData);
    btnRetry.addEventListener('click', fetchData);

    searchInput.addEventListener('input', renderUI);
    filterPosisi.addEventListener('change', renderUI);
    filterSekolah.addEventListener('change', renderUI);
    sortSelect.addEventListener('change', renderUI);

    viewGridBtn.addEventListener('click', () => {
        activeView = 'grid';
        viewGridBtn.classList.add('active');
        viewTableBtn.classList.remove('active');
        renderUI();
    });

    viewTableBtn.addEventListener('click', () => {
        activeView = 'table';
        viewTableBtn.classList.add('active');
        viewGridBtn.classList.remove('active');
        renderUI();
    });

    // Close Modal
    modalClose.addEventListener('click', () => {
        detailModal.classList.remove('active');
        document.body.classList.remove('modal-open');
    });
    detailModal.addEventListener('click', (e) => {
        if (e.target === detailModal) {
            detailModal.classList.remove('active');
            document.body.classList.remove('modal-open');
        }
    });

    // --- LOADING & DISPLAY CONTROLS ---
    const showLoading = (show) => {
        if (show) {
            loadingOverlay.classList.remove('hidden');
        } else {
            loadingOverlay.classList.add('hidden');
        }
    };

    const showError = (show) => {
        if (show) {
            errorOverlay.classList.remove('hidden');
            gridViewContainer.classList.add('hidden');
            tableViewContainer.classList.add('hidden');
        } else {
            errorOverlay.classList.add('hidden');
        }
    };

    // --- STATISTICS CHARTS (CHART.JS) ---
    const renderCharts = () => {
        if (applicants.length === 0 || typeof Chart === 'undefined') return;

        // --- 1. SCHOOL CHART (Horizontal Bar Chart) ---
        const schoolCanvas = document.getElementById('schoolChart');
        if (schoolCanvas) {
            const schoolData = {};
            applicants.forEach(a => {
                if (a.sekolah) schoolData[a.sekolah] = (schoolData[a.sekolah] || 0) + 1;
            });

            // Sort and take top 10
            const sortedSchools = Object.entries(schoolData)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);

            const labels = sortedSchools.map(s => s[0]);
            const counts = sortedSchools.map(s => s[1]);

            if (schoolChartInstance) schoolChartInstance.destroy();

            schoolChartInstance = new Chart(schoolCanvas, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Jumlah Pendaftar',
                        data: counts,
                        backgroundColor: 'rgba(37, 99, 235, 0.65)',
                        borderColor: '#2563EB',
                        borderWidth: 1,
                        borderRadius: 6
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: '#0f172a',
                            titleColor: '#fff',
                            bodyColor: '#cbd5e1',
                            borderColor: 'rgba(255, 255, 255, 0.08)',
                            borderWidth: 1
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: 'rgba(255, 255, 255, 0.05)' },
                            ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', weight: '600' } }
                        },
                        y: {
                            grid: { display: false },
                            ticks: { color: '#f8fafc', font: { family: 'Plus Jakarta Sans', weight: '700' } }
                        }
                    }
                }
            });
        }

        // --- 2. POSITION PREFERENCE CHART (Doughnut Chart) ---
        const positionCanvas = document.getElementById('positionChart');
        if (positionCanvas) {
            const positionData = {};
            applicants.forEach(a => {
                if (a.pilihan1) positionData[a.pilihan1] = (positionData[a.pilihan1] || 0) + 1;
            });

            const sortedPos = Object.entries(positionData)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5); // Take top 5

            const labels = sortedPos.map(p => p[0]);
            const counts = sortedPos.map(p => p[1]);

            if (positionChartInstance) positionChartInstance.destroy();

            positionChartInstance = new Chart(positionCanvas, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: counts,
                        backgroundColor: [
                            'rgba(230, 0, 0, 0.7)',
                            'rgba(37, 99, 235, 0.7)',
                            'rgba(217, 119, 6, 0.7)',
                            'rgba(16, 185, 129, 0.7)',
                            'rgba(139, 92, 246, 0.7)'
                        ],
                        borderColor: 'rgba(15, 23, 42, 0.8)',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: '#f8fafc',
                                padding: 16,
                                font: { family: 'Plus Jakarta Sans', weight: '700', size: 11 }
                            }
                        },
                        tooltip: {
                            backgroundColor: '#0f172a',
                            titleColor: '#fff',
                            bodyColor: '#cbd5e1',
                            borderColor: 'rgba(255, 255, 255, 0.08)',
                            borderWidth: 1
                        }
                    }
                }
            });
        }
    };

    // --- STRUKTUR ORGANISASI (BPH, KOORWIL, ANGGOTA LIVE CHART) ---
    const updateStrukturOrg = () => {
        // Map slot HTML element IDs to PO jabatans/roles (supporting both string and array for backwards compatibility)
        const roleMappings = {
            'slot-wakil-ketua-umum': ['Wakil Ketua I', 'Wakil Ketua Umum'],
            'slot-wakil-ketua-ii': ['Wakil Ketua II'],
            'slot-sekretaris-i': ['Sekretaris I'],
            'slot-sekretaris-ii': ['Sekretaris II'],
            'slot-bendahara-i': ['Bendahara I'],
            'slot-bendahara-ii': ['Bendahara II'],
            'slot-koor-bidang-organisasi': ['Koor. Bidang Organisasi'],
            'slot-koor-bidang-pengabdian-masyarakat': ['Koor. Bidang Pengabdian Masyarakat'],
            'slot-koor-bidang-humas': ['Koor. Bidang Humas'],
            'slot-koor-bidang-penggalian-dana': ['Koor. Bidang Pengembangan Diri'],
            'slot-koor-bidang-penggalihan-dana': ['Koor. Bidang Penggalian Dana'],
            'slot-koor-wilayah-pekutatan': ['Koor. Wilayah Pekutatan'],
            'slot-koor-wilayah-jembrana': ['Koor. Wilayah Jembrana'],
            'slot-koor-wilayah-negara': ['Koor. Wilayah Negara'],
            'slot-koor-wilayah-melaya': ['Koor. Wilayah Melaya'],
            'slot-koor-wilayah-mendoyo': ['Koor. Wilayah Mendoyo']
        };
 
        // Scan admissions map for filled slots (UTAMA ONLY - NO CADANGAN)
        Object.entries(roleMappings).forEach(([slotId, roleName]) => {
            const el = document.getElementById(slotId);
            if (!el) return;
 
            // Normalize role name to array
            const roles = Array.isArray(roleName) ? roleName : [roleName];
 
            // Find applicant assigned to this role (must be Utama, i.e., !isCadangan)
            const assignedName = Object.keys(processedAdmissions).find(
                name => (processedAdmissions[name].status === 'diterima' || processedAdmissions[name].status === 'diterima-dirubah') &&
                        roles.includes(processedAdmissions[name].jabatan) &&
                        !processedAdmissions[name].isCadangan
            );
 
            const card = el.closest('.struktur-slot-card');
 
            if (assignedName) {
                el.textContent = assignedName;
                if (card) card.classList.add('filled');
            } else {
                el.textContent = 'Belum Terpilih';
                if (card) card.classList.remove('filled');
            }

            // Cari nama-nama cadangan untuk posisi ini (must be cadangan, i.e., isCadangan === true)
            const reserveNames = Object.keys(processedAdmissions).filter(
                name => (processedAdmissions[name].status === 'diterima' || processedAdmissions[name].status === 'diterima-dirubah') &&
                        roles.includes(processedAdmissions[name].jabatan) &&
                        processedAdmissions[name].isCadangan
            );

            // Buat atau bersihkan kontainer cadangan dinamis
            let cadanganEl = document.getElementById(`cadangan-${slotId}`);
            if (!cadanganEl) {
                cadanganEl = document.createElement('div');
                cadanganEl.id = `cadangan-${slotId}`;
                cadanganEl.className = 'slot-cadangan-container';
                el.parentNode.insertBefore(cadanganEl, el.nextSibling);
            }

            if (reserveNames.length > 0) {
                cadanganEl.innerHTML = reserveNames.map(name => `<span class="cadangan-pill"><i class="fa-solid fa-user-clock"></i> Cadangan: ${name}</span>`).join('');
                cadanganEl.classList.remove('hidden');
                
                // Tambahkan click listener untuk membuka profil pendaftar cadangan
                cadanganEl.querySelectorAll('.cadangan-pill').forEach((pill, idx) => {
                    pill.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const app = applicants.find(a => a.nama === reserveNames[idx]);
                        if (app) openApplicantDetail(app.id);
                    });
                });
            } else {
                cadanganEl.innerHTML = '';
                cadanganEl.classList.add('hidden');
            }
        });

        // Render DYNAMIC ANGGOTA (BIDANG & KOORWIL - MULTI PERSON)
        const anggotaMappings = {
            'slot-anggota-bid-organisasi': ['Anggota Bid. Organisasi'],
            'slot-anggota-bid-pengembangan-diri': ['Anggota Bid. Pengembangan Diri'],
            'slot-anggota-bid-humas': ['Anggota Bid. HUMAS', 'Anggota Bid. Humas'],
            'slot-anggota-bid-pengabdian-masyarakat': ['Anggota Bid. Pengabdian Masyarakat'],
            'slot-anggota-bid-kewirausahaan': ['Anggota Bid. Kewirausahaan', 'Anggota Bid. Penggalian Dana'],
            'slot-anggota-wilayah-pekutatan': ['Anggota Wilayah Pekutatan', 'Anggota Koorwil Pekutatan'],
            'slot-anggota-wilayah-jembrana': ['Anggota Wilayah Jembrana', 'Anggota Koorwil Jembrana'],
            'slot-anggota-wilayah-negara': ['Anggota Wilayah Negara', 'Anggota Koorwil Negara'],
            'slot-anggota-wilayah-melaya': ['Anggota Wilayah Melaya', 'Anggota Koorwil Melaya'],
            'slot-anggota-wilayah-mendoyo': ['Anggota Wilayah Mendoyo', 'Anggota Koorwil Mendoyo']
        };

        Object.entries(anggotaMappings).forEach(([slotId, roleNames]) => {
            const ul = document.getElementById(slotId);
            if (!ul) return;

            const roles = Array.isArray(roleNames) ? roleNames : [roleNames];
            
            // Find all accepted applicants for this role (Utama only, i.e., !isCadangan)
            const members = Object.keys(processedAdmissions).filter(
                name => (processedAdmissions[name].status === 'diterima' || processedAdmissions[name].status === 'diterima-dirubah') &&
                        roles.includes(processedAdmissions[name].jabatan) &&
                        !processedAdmissions[name].isCadangan
            );

            const card = ul.closest('.struktur-slot-card');

            if (members.length > 0) {
                ul.innerHTML = '';
                members.forEach(name => {
                    const li = document.createElement('li');
                    li.textContent = name;
                    // Add click handler to open details
                    li.addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevent card bubble click
                        const app = applicants.find(a => a.nama === name);
                        if (app) openApplicantDetail(app.id);
                    });
                    ul.appendChild(li);
                });
                if (card) card.classList.add('filled');
            } else {
                ul.innerHTML = '<li class="no-member">Belum Terpilih</li>';
                if (card) card.classList.remove('filled');
            }
        });
    };

    // --- EVENT HANDLERS ADDITIONS ---
    // Tabs switching logic
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabId = e.currentTarget.dataset.tab;
            
            // Set tab buttons active state
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            // Toggle tab content panels
            document.querySelectorAll('.dashboard-tab-content').forEach(panel => {
                panel.classList.add('hidden');
            });
            document.getElementById(tabId).classList.remove('hidden');
            
            activeTab = tabId;
            
            // Trigger background sync when switching tabs to guarantee absolute real-time sync
            if (loadingOverlay.classList.contains('hidden')) {
                fetchData(true);
            }
            
            // Special tab trigger renders
            if (activeTab === 'statistik-tab') {
                renderCharts();
            } else if (activeTab === 'struktur-tab') {
                updateStrukturOrg();
            }
        });
    });

    // BPH selector buttons inside modal
    document.querySelectorAll('.btn-admit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.btn-admit').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentSelectedStatus = e.target.dataset.status;
            
            if (currentSelectedStatus === 'diterima-dirubah') {
                newRoleContainer.classList.remove('hidden');
            } else {
                newRoleContainer.classList.add('hidden');
                newRoleDropdown.value = '';
            }
        });
    });

    // Delegasi penanganan klik untuk kartu pengurus terpilih di organogram
    document.querySelectorAll('.struktur-slot-card').forEach(card => {
        card.addEventListener('click', () => {
            const h4 = card.querySelector('h4');
            if (!h4) return;
            const name = h4.textContent.trim();
            if (name && name !== 'Belum Terpilih') {
                const app = applicants.find(a => a.nama === name);
                if (app) {
                    openApplicantDetail(app.id);
                }
            }
        });
    });

    // ==========================================================
    // AI FORMATUR ASSISTANT LOGIC (SECRET & PASSWORD PROTECTED)
    // ==========================================================

    // 1. Deteksi Klik Rahasia (Triple-Click pada Logo SATIN)
    const logoIcon = document.querySelector('.logo-icon');
    let logoClickCount = 0;
    let logoClickTimeout = null;

    if (logoIcon) {
        logoIcon.addEventListener('click', () => {
            logoClickCount++;
            clearTimeout(logoClickTimeout);
            
            if (logoClickCount === 3) {
                logoClickCount = 0;
                // Efek visual: kilatan merah sementara pada ikon logo
                logoIcon.style.textShadow = '0 0 15px var(--primary-light)';
                logoIcon.style.color = 'var(--primary-light)';
                setTimeout(() => {
                    logoIcon.style.textShadow = '';
                    logoIcon.style.color = '';
                }, 1000);
                
                openAiPasswordModal();
            } else {
                logoClickTimeout = setTimeout(() => {
                    logoClickCount = 0;
                }, 800);
            }
        });
    }

    // 2. Pintasan Tombol Keyboard Rahasia: Ctrl + Shift + A
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
            e.preventDefault();
            openAiPasswordModal();
        }
    });

    const openAiPasswordModal = () => {
        aiPasswordInput.value = '';
        aiPasswordError.classList.add('hidden');
        aiPasswordModal.classList.add('active');
        document.body.classList.add('modal-open');
        aiPasswordInput.focus();
    };

    // Penutupan Modal AI
    aiPasswordClose.addEventListener('click', () => {
        aiPasswordModal.classList.remove('active');
        document.body.classList.remove('modal-open');
    });
    aiPasswordModal.addEventListener('click', (e) => {
        if (e.target === aiPasswordModal) {
            aiPasswordModal.classList.remove('active');
            document.body.classList.remove('modal-open');
        }
    });

    aiDashboardClose.addEventListener('click', () => {
        aiDashboardModal.classList.remove('active');
        document.body.classList.remove('modal-open');
    });
    aiDashboardModal.addEventListener('click', (e) => {
        if (e.target === aiDashboardModal) {
            aiDashboardModal.classList.remove('active');
            document.body.classList.remove('modal-open');
        }
    });

    // 3. Verifikasi Kata Sandi Admin (Default: satinbph)
    const verifyAdminPassword = () => {
        const inputPassword = aiPasswordInput.value.trim().toLowerCase();
        if (inputPassword === 'satinbph') {
            aiPasswordModal.classList.remove('active');
            openAiDashboard();
        } else {
            aiPasswordError.classList.remove('hidden');
            aiPasswordInput.focus();
            aiPasswordInput.select();
        }
    };

    aiPasswordSubmit.addEventListener('click', verifyAdminPassword);
    aiPasswordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') verifyAdminPassword();
    });

    // 4. Membuka Dashboard Asisten AI
    const openAiDashboard = () => {
        const savedKey = localStorage.getItem('satin_gemini_api_key') || '';
        aiApiKeyInput.value = savedKey;
        
        aiTotalCandidates.textContent = `${applicants.length} Orang`;
        resetConsoleOutput();
        
        aiDashboardModal.classList.add('active');
        document.body.classList.add('modal-open');
    };

    const resetConsoleOutput = () => {
        aiConsoleOutput.innerHTML = `
            <div class="console-placeholder">
                <i class="fa-solid fa-wand-magic-sparkles animate-pulse" style="color: rgba(16, 185, 129, 0.4); font-size: 2.5rem; text-shadow: 0 0 10px rgba(16, 185, 129, 0.2);"></i>
                <p>Konsol Asisten AI siap digunakan. Masukkan API Key Anda di atas, lalu klik tombol <strong>"Jalankan Rekomendasi Formasi AI"</strong> untuk memulai pencocokan cerdas secara otomatis.</p>
            </div>
        `;
        btnCopyAiOutput.classList.add('hidden');
    };

    // Menyimpan API Key secara lokal & aman
    aiSaveApiKey.addEventListener('click', () => {
        const key = aiApiKeyInput.value.trim();
        if (!key) {
            alert('Silakan masukkan API Key yang valid!');
            return;
        }
        localStorage.setItem('satin_gemini_api_key', key);
        alert('Gemini API Key berhasil disimpan secara aman di browser lokal Anda!');
    });

    // 5. Eksekusi Analisis Rekomendasi AI (Google Gemini 1.5 Flash API)
    btnRunAi.addEventListener('click', async () => {
        const apiKey = localStorage.getItem('satin_gemini_api_key') || aiApiKeyInput.value.trim();
        if (!apiKey) {
            alert('Silakan masukkan dan simpan Gemini API Key Anda terlebih dahulu!');
            aiApiKeyInput.focus();
            return;
        }

        if (applicants.length === 0) {
            alert('Tidak ada data pendaftar yang tersedia untuk dianalisis!');
            return;
        }

        btnRunAi.disabled = true;
        btnRunAi.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menganalisis Calon...`;
        aiConsoleOutput.innerHTML = `
            <div class="ai-loading-console">
                <div class="spinner"></div>
                <p>AI sedang menganalisis data PO dan merancang formasi ideal pengurus...</p>
            </div>
        `;

        try {
            // Persiapkan data pendaftar yang padat & efisien untuk meminimalkan token & maksimalkan akurasi
            const compactApplicants = applicants.map(a => ({
                Nama: a.nama,
                Asal_Sekolah: a.sekolah,
                Komitmen: `${a.komitmen}/10`,
                Pilihan_1: a.pilihan1,
                Pilihan_2: a.pilihan2 || 'Tidak ada',
                Alasan: a.alasan,
                Harapan: a.harapan
            }));

            const poExcerpt = `
KRITERIA & TUPOKSI JABATAN PENGURUS SATIN (Satuan Inti PMR Wira Jembrana) 2026/2027:
1. Ketua Umum: I Komang Teguh Karunia Krisnha (Telah Diisi). Memimpin, mengarahkan tupoksi BPH, berkoordinasi dengan PMI & FORPIS.
2. Wakil Ketua I & II: Mewakili Ketua Umum, mendelegasikan tugas ke bidang apabila berhalangan. Cocok untuk calon dengan jiwa kepemimpinan tinggi dan komitmen kuat.
3. Sekretaris I: Surat-menyurat, koordinasi mobilisasi/penugasan anggota, mendata keaktifan dan absensi saat bertugas. Membutuhkan ketelitian tinggi.
4. Sekretaris II: Pelaporan kegiatan bidang, mencatat hasil rapat (notulensi).
5. Bendahara I: Koordinasi anggaran kegiatan dengan Markas PMI Jembrana, memastikan kesesuaian anggaran porsi panitia.
6. Bendahara II: Mencatat iuran anggota, mengeluarkan dana suka duka.
7. Bidang Organisasi: Memelihara keutuhan & unsur kesesuaian AD/ART/Pedoman Organisasi, memantau kegiatan suka duka.
8. Bidang Pengabdian Masyarakat: Penggerak utama bakti sosial, donor darah, aksi cinta lingkungan. Cocok untuk calon yang aktif berkegiatan sosial di lapangan.
9. Bidang Humas: Dokumentasi aktivitas di media sosial, caption, press release, naskah berita. Sangat cocok untuk calon yang punya ketertarikan di bidang media/konten kreator/publikasi.
10. Bidang Pengembangan Diri: Penggerak kegiatan DIKLAT, Latihan Bersama (Latber), Pelatihan Khusus. Cocok bagi calon yang pandai melatih, berpendidikan, dan berwawasan luas.
11. Bidang Penggalian Dana: Menggali ide penggalian dana, donatur/sponsor kegiatan. Cocok untuk calon yang inovatif, supel, dan pandai negosiasi.
12. Koordinator Wilayah (Pekutatan, Jembrana, Negara, Melaya, Mendoyo): Berkoordinasi dengan Ketua Umum, merancang dan mengetuai latihan bersama PMR sekolah di wilayahnya minimal 1x setahun, meneruskan informasi ke PMR sekolah di wilayahnya. Harus sesuai domisili/sekolah di wilayah bersangkutan.
`;

            const promptText = `
Anda adalah AI Asisten Formatur untuk SATIN (Satuan Inti PMR Wira PMI Kabupaten Jembrana) Periode 2026/2027.
Tugas Anda adalah menganalisis seluruh data calon pengurus yang mendaftar dan memberikan rekomendasi penempatan jabatan (BPH, Koordinator Bidang, dan Koordinator Wilayah) berdasarkan:
1. Pilihan 1 & Pilihan 2 calon pengurus.
2. Skala komitmen mereka (utamakan komitmen tinggi).
3. Alasan memilih posisi dan harapan/motivasi mereka.
4. Kriteria & tupoksi jabatan pengurus SATIN.

Berikut adalah kriteria & tupoksi jabatan pengurus SATIN:
${poExcerpt}

Berikut adalah data seluruh Calon Pengurus yang mendaftar:
${JSON.stringify(compactApplicants, null, 2)}

Petunjuk Analisis Khusus:
1. Ketua Umum adalah I Komang Teguh Karunia Krisnha (tidak perlu diganti).
2. Tentukan rekomendasi ideal untuk jabatan:
   - Wakil Ketua I & II (Cari calon yang komitmennya sangat tinggi dan menunjukkan visi kepemimpinan).
   - Sekretaris I & II (Cari yang teliti, rapi, dan teratur).
   - Bendahara I & II (Cari yang disiplin, jujur, dan bertanggung jawab).
   - Koordinator Bidang (Organisasi, Pengabdian Masyarakat, Humas, Pengembangan Diri, Penggalian Dana). Sesuaikan minat/alasan dengan tupoksi bidang tersebut!
   - Koordinator Wilayah (Pekutatan, Jembrana, Negara, Melaya, Mendoyo). Penting: Harus disesuaikan dengan domisili/sekolah calon agar efektif bertugas di wilayahnya!
3. Berikan alternatif nama cadangan (misal: Alternatif: Nama Calon) jika ada posisi yang memiliki persaingan ketat.
4. Output harus berformat Markdown terstruktur rapi. Berikan ulasan singkat (1-2 kalimat) alasan mengapa calon tersebut sangat cocok di posisi itu. Tebalkan nama calon pengurus agar mudah dibaca dewan formatur saat rapat.

Berikan analisis dalam Bahasa Indonesia yang sangat profesional, objektif, taktis, dan mudah dipahami.
`;

            const modelsToTry = [
                'gemini-2.5-flash',
                'gemini-2.5-pro',
                'gemini-2.0-flash',
                'gemini-2.0-flash-exp',
                'gemini-2.0-pro-exp',
                'gemini-1.5-flash',
                'gemini-1.5-flash-latest',
                'gemini-1.5-pro',
                'gemini-1.5-pro-latest',
                'gemini-1.0-pro'
            ];

            let lastError = null;
            let success = false;

            for (const modelName of modelsToTry) {
                try {
                    // Update HUD status secara realtime di konsol
                    aiConsoleOutput.innerHTML = `
                        <div class="ai-loading-console">
                            <div class="spinner"></div>
                            <p>AI sedang menganalisis formasi ideal menggunakan model <strong>${modelName}</strong>...</p>
                        </div>
                    `;

                    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            contents: [{
                                parts: [{
                                    text: promptText
                                }]
                            }],
                            safetySettings: [
                                {
                                    category: "HARM_CATEGORY_HARASSMENT",
                                    threshold: "BLOCK_NONE"
                                },
                                {
                                    category: "HARM_CATEGORY_HATE_SPEECH",
                                    threshold: "BLOCK_NONE"
                                },
                                {
                                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                                    threshold: "BLOCK_NONE"
                                },
                                {
                                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                                    threshold: "BLOCK_NONE"
                                }
                            ]
                        })
                    });

                    if (!response.ok) {
                        const errData = await response.json();
                        throw new Error(errData.error?.message || `HTTP error! status: ${response.status}`);
                    }

                    const resData = await response.json();
                    if (!resData.candidates || resData.candidates.length === 0 || !resData.candidates[0].content || !resData.candidates[0].content.parts || resData.candidates[0].content.parts.length === 0) {
                        if (resData.candidates && resData.candidates[0].finishReason === 'SAFETY') {
                            throw new Error('Analisis ditolak oleh sistem keamanan Google Gemini karena mendeteksi data pribadi atau teks sensitif.');
                        }
                        throw new Error('API Gemini tidak mengembalikan respon teks yang valid.');
                    }

                    const aiResponseText = resData.candidates[0].content.parts[0].text;
                    renderAiResponse(aiResponseText);
                    success = true;
                    break; // Keluar dari loop jika sukses!

                } catch (err) {
                    console.warn(`Model ${modelName} gagal dipanggil:`, err.message);
                    lastError = err;
                    // Jika error disebabkan sensor keamanan, hentikan loop (karena model lain akan diblokir juga)
                    if (err.message.includes('keamanan') || err.message.includes('SAFETY')) {
                        break;
                    }
                }
            }

            if (!success) {
                throw lastError || new Error('Gagal melakukan analisis dengan seluruh model Gemini yang didukung.');
            }

        } catch (err) {
            console.error('AI Analysis failed:', err);
            aiConsoleOutput.innerHTML = `
                <div class="error-state text-center mt-4">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size: 2.5rem; color: #EF4444;"></i>
                    <h5 class="mt-2 text-white">Analisis AI Gagal</h5>
                    <p style="font-size: 0.85rem; max-width: 450px; margin: 8px auto;">${err.message || 'Pastikan Gemini API Key Anda valid dan koneksi internet Anda lancar.'}</p>
                    <button class="btn btn-sync mt-3" id="btn-retry-ai"><i class="fa-solid fa-arrows-rotate"></i> Coba Lagi</button>
                </div>
            `;
            
            document.getElementById('btn-retry-ai').addEventListener('click', () => btnRunAi.click());
        } finally {
            btnRunAi.disabled = false;
            btnRunAi.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Jalankan Rekomendasi Formasi AI`;
        }
    });

    const renderAiResponse = (markdownText) => {
        let html = markdownText
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/^# (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h3>$1</h3>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^- (.*$)/gim, '<li>$1</li>')
            .replace(/^\* (.*$)/gim, '<li>$1</li>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');

        html = html.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');
        
        aiConsoleOutput.innerHTML = `<div class="ai-output-content text-left animate-slide-up"><p>${html}</p></div>`;
        btnCopyAiOutput.classList.remove('hidden');

        btnCopyAiOutput.onclick = () => {
            navigator.clipboard.writeText(markdownText).then(() => {
                const origText = btnCopyAiOutput.innerHTML;
                btnCopyAiOutput.innerHTML = `<i class="fa-solid fa-check text-emerald"></i> Tersalin!`;
                setTimeout(() => {
                    btnCopyAiOutput.innerHTML = origText;
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text:', err);
                alert('Gagal menyalin rekomendasi ke clipboard.');
            });
        };
    };

    // --- APP INITIALIZATION ---
    loadCachedData();

    // --- AUTO-UPDATE POLLING (Every 15 seconds for real-time synchronization) ---
    setInterval(() => {
        // Only trigger background sync if the loader is hidden and page is active
        if (loadingOverlay.classList.contains('hidden') && !document.hidden) {
            fetchData(true);
        }
    }, 15000);
});
