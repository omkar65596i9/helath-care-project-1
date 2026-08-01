document.addEventListener('DOMContentLoaded', function() {

    const API_BASE_URL = 'http://localhost:5000/api';

    // Global State Variable
    let appointments = [];
    let doctors = [];
    let notifications = [];

    // DOM References
    const appointmentsTableBody = document.getElementById('appointmentsTableBody');
    const doctorsTableBody = document.getElementById('doctorsTableBody');
    const notificationsList = document.getElementById('notificationsList');
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const addDoctorBtn = document.getElementById('addDoctorBtn');
    const markAllReadBtn = document.getElementById('markAllReadBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const sidebarItems = document.querySelectorAll('.sidebar-menu li');

    const statsGrid = document.getElementById('statsGrid');
    const chartsGrid = document.getElementById('chartsGrid');

    // ========== API CALLS ========== //

    async function loadInitialData() {
        await fetchAppointments();
        await fetchDoctors();
        await fetchNotifications();
    }

    async function fetchAppointments() {
        try {
            const res = await fetch(`${API_BASE_URL}/appointments`);
            appointments = await res.json();
            renderAppointments();
            updateStats();
            updateCharts();
        } catch (err) {
            console.error('Error fetching appointments:', err);
        }
    }

    async function fetchDoctors() {
        try {
            const res = await fetch(`${API_BASE_URL}/doctors`);
            doctors = await res.json();
            renderDoctors();
            updateStats();
        } catch (err) {
            console.error('Error fetching doctors:', err);
        }
    }

    async function fetchNotifications() {
        try {
            const res = await fetch(`${API_BASE_URL}/notifications`);
            notifications = await res.json();
            renderNotifications();
            updateStats();
        } catch (err) {
            console.error('Error fetching notifications:', err);
        }
    }

    // ========== RENDER FUNCTIONS ========== //

    function updateStats() {
        if (document.getElementById('totalAppStat')) {
            document.getElementById('totalAppStat').innerText = appointments.length;
            document.getElementById('confirmedAppStat').innerText = appointments.filter(a => (a.status || '').toLowerCase() === 'confirmed').length;
            document.getElementById('pendingAppStat').innerText = appointments.filter(a => (a.status || '').toLowerCase() !== 'confirmed' && (a.status || '').toLowerCase() !== 'cancelled').length;
            document.getElementById('totalDocStat').innerText = doctors.length;
        }

        if (document.getElementById('appBadge')) document.getElementById('appBadge').innerText = appointments.length;
        if (document.getElementById('docBadge')) document.getElementById('docBadge').innerText = doctors.length;
        if (document.getElementById('notifBadge')) document.getElementById('notifBadge').innerText = notifications.filter(n => !n.read).length;
    }

    function renderAppointments() {
        if (!appointmentsTableBody) return;

        const search = searchInput ? searchInput.value.toLowerCase() : '';
        const status = statusFilter ? statusFilter.value.toLowerCase() : 'all';

        let filtered = appointments.filter(app => {
            const nameMatch = (app.fullName || '').toLowerCase().includes(search);
            const docMatch = (app.doctor || '').toLowerCase().includes(search);
            const appStatus = (app.status || 'upcoming').toLowerCase();
            const statusMatch = (status === 'all') || (appStatus === status);
            return (nameMatch || docMatch) && statusMatch;
        });

        if (filtered.length === 0) {
            appointmentsTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#757575;">No Appointments Found</td></tr>`;
            return;
        }

        appointmentsTableBody.innerHTML = filtered.map((app, idx) => {
            const stLower = (app.status || 'upcoming').toLowerCase();
            const locationHosp = `${app.hospital || ''} ${app.location ? '(' + app.location + ')' : ''}` || 'General Hospital';

            return `
                <tr>
                    <td>${idx + 1}</td>
                    <td><b>${app.fullName}</b></td>
                    <td>${app.doctor}</td>
                    <td>${locationHosp}</td>
                    <td>${app.date} <small>(${app.time})</small></td>
                    <td><span class="status-badge ${stLower}">${app.status}</span></td>
                    <td>
                        ${stLower !== 'confirmed' ? `<button class="action-btn" onclick="updateAppStatus('${app._id}', 'confirmed')">Confirm</button>` : ''}
                        ${stLower !== 'cancelled' ? `<button class="action-btn cancel-btn" onclick="updateAppStatus('${app._id}', 'cancelled')">Cancel</button>` : ''}
                        <button class="action-btn delete-btn" onclick="deleteAppointment('${app._id}')"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function renderDoctors() {
        if (!doctorsTableBody) return;
        doctorsTableBody.innerHTML = doctors.map((doc, idx) => `
            <tr>
                <td>${idx + 1}</td>
                <td><b>${doc.name}</b></td>
                <td>${doc.specialty}</td>
                <td>⭐ ${doc.rating}</td>
                <td><span class="status-badge ${doc.status === 'Available' ? 'confirmed' : 'pending'}">${doc.status}</span></td>
                <td>
                    <button class="action-btn delete-btn" onclick="deleteDoctor('${doc._id}')"><i class="fas fa-trash"></i> Remove</button>
                </td>
            </tr>
        `).join('');
    }

    function renderNotifications() {
        if (!notificationsList) return;
        if (notifications.length === 0) {
            notificationsList.innerHTML = `<p style="text-align:center; padding:1rem; color:#888;">No notifications</p>`;
            return;
        }
        notificationsList.innerHTML = notifications.map(n => `
            <div class="notification-item">
                <i class="fas fa-${n.read ? 'envelope-open' : 'bell'}"></i>
                <div class="notif-text">${n.text}</div>
                <div class="notif-time">${n.time}</div>
                ${!n.read ? `<span class="notif-read"><i class="fas fa-circle" style="color: #42a5f5; font-size: 0.5rem;"></i> New</span>` : ''}
            </div>
        `).join('');
    }

    // ========== GLOBAL ACTIONS (HANDLED BY API) ========== //

    window.updateAppStatus = async function(id, newStatus) {
        try {
            await fetch(`${API_BASE_URL}/appointments/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            await loadInitialData();
        } catch (err) {
            console.error('Update status error:', err);
        }
    };

    window.deleteAppointment = async function(id) {
        if (confirm('Delete this record permanently from Database?')) {
            try {
                await fetch(`${API_BASE_URL}/appointments/${id}`, { method: 'DELETE' });
                await loadInitialData();
            } catch (err) {
                console.error('Delete appointment error:', err);
            }
        }
    };

    window.deleteDoctor = async function(id) {
        if (confirm('Remove doctor permanently?')) {
            try {
                await fetch(`${API_BASE_URL}/doctors/${id}`, { method: 'DELETE' });
                await loadInitialData();
            } catch (err) {
                console.error('Delete doctor error:', err);
            }
        }
    };

    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', async function() {
            if (confirm('Clear all appointments from Database?')) {
                try {
                    await fetch(`${API_BASE_URL}/appointments`, { method: 'DELETE' });
                    await loadInitialData();
                } catch (err) {
                    console.error('Clear all error:', err);
                }
            }
        });
    }

    if (addDoctorBtn) {
        addDoctorBtn.addEventListener('click', async function() {
            const name = prompt('Enter Doctor Full Name:');
            if (!name) return;
            const specialty = prompt('Enter Specialty:');
            if (!specialty) return;

            try {
                await fetch(`${API_BASE_URL}/doctors`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: name.startsWith('Dr.') ? name : 'Dr. ' + name,
                        specialty: specialty,
                        rating: 4.8,
                        status: 'Available'
                    })
                });
                await loadInitialData();
            } catch (err) {
                console.error('Add doctor error:', err);
            }
        });
    }

    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', async function() {
            try {
                await fetch(`${API_BASE_URL}/notifications/read`, { method: 'PUT' });
                await fetchNotifications();
            } catch (err) {
                console.error('Mark read error:', err);
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            alert('Logging out...');
            window.location.href = 'login.html';
        });
    }

    if (searchInput) searchInput.addEventListener('keyup', renderAppointments);
    if (statusFilter) statusFilter.addEventListener('change', renderAppointments);

    // ========== CHARTS ========== //
    let statusChart;

    function initCharts() {
        const statusElem = document.getElementById('statusChart');
        if (statusElem && typeof Chart !== 'undefined') {
            const statusCtx = statusElem.getContext('2d');
            statusChart = new Chart(statusCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Confirmed', 'Pending/Upcoming', 'Cancelled'],
                    datasets: [{
                        data: [0, 0, 0],
                        backgroundColor: ['#38a169', '#ed8936', '#e53e3e']
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
    }

    function updateCharts() {
        if (statusChart) {
            const confirmed = appointments.filter(a => (a.status || '').toLowerCase() === 'confirmed').length;
            const cancelled = appointments.filter(a => (a.status || '').toLowerCase() === 'cancelled').length;
            const pending = appointments.length - (confirmed + cancelled);

            statusChart.data.datasets[0].data = [confirmed, pending, cancelled];
            statusChart.update();
        }
    }

    // ========== NAVIGATION ========== //
    function navigateTo(section) {
        document.querySelectorAll('.table-section').forEach(el => el.style.display = 'none');

        if (section === 'dashboard') {
            if (statsGrid) statsGrid.style.display = 'grid';
            if (chartsGrid) chartsGrid.style.display = 'grid';
            if (document.getElementById('appointments')) document.getElementById('appointments').style.display = 'block';
        } else {
            if (statsGrid) statsGrid.style.display = 'none';
            if (chartsGrid) chartsGrid.style.display = 'none';

            const targetSec = document.getElementById(section);
            if (targetSec) targetSec.style.display = 'block';
        }

        sidebarItems.forEach(item => item.classList.remove('active'));
        const activeItem = Array.from(sidebarItems).find(item => item.getAttribute('data-section') === section);
        if (activeItem) activeItem.classList.add('active');
    }

    sidebarItems.forEach(item => {
        item.addEventListener('click', function() {
            const sec = this.getAttribute('data-section');
            if (sec) navigateTo(sec);
        });
    });

    initCharts();
    loadInitialData();
});