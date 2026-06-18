/* ============================================================
   MOUSE INFO HUB — Application Logic & State Management
   ============================================================ */

// ── Default Mouse Data (esports & productivity icons) ────────
// ── State Management ────────────────────────────────────────
const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3000' : '';
let miceData = [];

// API Helper to fetch headers containing JWT token if logged in
function getAuthHeaders() {
    const token = sessionStorage.getItem('host_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

// Fetch database records dynamically from the server
async function fetchMice() {
    try {
        const response = await fetch(`${API_BASE}/api/mice`);
        if (!response.ok) throw new Error('HTTP error ' + response.status);
        miceData = await response.json();
        saveLocalCacheFallback();
    } catch (e) {
        console.error("Failed to load mouse database from server, using local fallback.", e);
        const cached = localStorage.getItem('mouse_hub_cache_fallback');
        if (cached) {
            miceData = JSON.parse(cached);
        }
    }
}

function saveLocalCacheFallback() {
    localStorage.setItem('mouse_hub_cache_fallback', JSON.stringify(miceData));
}

// ── DOM References ──────────────────────────────────────────
const navbar = document.getElementById('navbar');
const mobileToggle = document.getElementById('mobile-toggle');
const navLinks = document.querySelector('.nav-links');
const miceGrid = document.getElementById('mice-grid');
const filterBtns = document.querySelectorAll('.filter-btn');
const modalOverlay = document.getElementById('mouse-modal');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');
const compareA = document.getElementById('compare-a');
const compareB = document.getElementById('compare-b');
const compareTable = document.getElementById('compare-table');
const hostForm = document.getElementById('host-form');
const newsletterForm = document.getElementById('newsletter-form');
const toast = document.getElementById('toast');

// Admin panel DOM references
const adminAddForm = document.getElementById('admin-add-form');
const adminMiceList = document.getElementById('admin-mice-list');
const adminResetBtn = document.getElementById('admin-reset-btn');
const adminLockBtn = document.getElementById('admin-lock-btn');

// Secret triggers and Auth Modal references
const logoTrigger = document.getElementById('logo-trigger');
const navAdminLink = document.getElementById('nav-admin-link');
const hostAdminSection = document.getElementById('host-admin');
const authModal = document.getElementById('auth-modal');
const authModalClose = document.getElementById('auth-modal-close');
const secretAuthForm = document.getElementById('secret-auth-form');
const secretAuthPassword = document.getElementById('secret-auth-password');
const secretAuthEmail = document.getElementById('secret-auth-email');

// ── Utility: Stars ──────────────────────────────────────────
function renderStars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    let stars = '';
    for (let i = 0; i < full; i++) stars += '★';
    if (half) stars += '★';
    for (let i = stars.length; i < 5; i++) stars += '☆';
    return stars;
}

// ── Toast Notification ──────────────────────────────────────
function showToast(message) {
    toast.innerHTML = message;
    toast.style.display = 'block';
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// ── Render Mouse Cards ──────────────────────────────────────
function renderCards(filter = 'all') {
    const filtered = filter === 'all'
        ? miceData
        : miceData.filter(m => m.category === filter);

    if (filtered.length === 0) {
        miceGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 48px; color: var(--text-secondary);">
                <span style="font-size: 3rem; display: block; margin-bottom: 16px;">🔍</span>
                <p>No mice in this category yet. Add one in the Host Control Panel below!</p>
            </div>
        `;
        return;
    }

    miceGrid.innerHTML = filtered.map((mouse, i) => {
        const imageHtml = mouse.image 
            ? `<img src="${mouse.image}" class="mouse-card-img" alt="${mouse.brand} ${mouse.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
               <span class="mouse-card-emoji" style="display:none; font-size:4rem;">🖱️</span>`
            : `<span class="mouse-card-emoji" style="font-size:4rem;">${mouse.emoji || '🖱️'}</span>`;

        return `
            <div class="mouse-card" style="animation-delay: ${i * 0.08}s" data-id="${mouse.id}">
                <div class="card-image">
                    ${imageHtml}
                    <span class="card-badge badge-${mouse.category}">${mouse.category}</span>
                </div>
                <div class="card-body">
                    <div class="card-brand">${mouse.brand}</div>
                    <h3 class="card-name">${mouse.name}</h3>
                    <p class="card-tagline">${mouse.tagline}</p>
                    <div class="card-specs">
                        <div class="spec-item">
                            <span class="spec-label">Weight</span>
                            <span class="spec-value">${mouse.weight || 'N/A'}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Sensor</span>
                            <span class="spec-value">${mouse.sensor || 'N/A'}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">DPI</span>
                            <span class="spec-value">${mouse.dpi || 'N/A'}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Connection</span>
                            <span class="spec-value">${mouse.connection || 'N/A'}</span>
                        </div>
                    </div>
                    <div class="card-rating">
                        <span class="stars">${renderStars(mouse.rating)}</span>
                        <span class="rating-text">${mouse.rating} / 5.0</span>
                    </div>
                </div>
                <div class="card-footer">
                    <span class="card-price">${mouse.price || 'N/A'}</span>
                    <button class="btn-details" onclick="openModal(${mouse.id})">View Details</button>
                </div>
            </div>
        `;
    }).join('');
}

// ── Modal Details ───────────────────────────────────────────
function openModal(id) {
    const mouse = miceData.find(m => m.id === id);
    if (!mouse) return;

    const modalImageHtml = mouse.image 
        ? `<div class="modal-image-wrap">
             <img src="${mouse.image}" class="modal-mouse-img" alt="${mouse.brand} ${mouse.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
             <div class="modal-emoji" style="display:none; font-size:4rem;">🖱️</div>
           </div>`
        : `<div class="modal-emoji" style="font-size:4rem;">${mouse.emoji || '🖱️'}</div>`;

    modalBody.innerHTML = `
        <div class="modal-header">
            ${modalImageHtml}
            <div class="modal-info">
                <div class="modal-brand-tag">${mouse.brand}</div>
                <h2>${mouse.name}</h2>
                <p class="modal-tagline">${mouse.tagline}</p>
                <div class="card-rating" style="margin-top:8px;">
                    <span class="stars">${renderStars(mouse.rating)}</span>
                    <span class="rating-text">${mouse.rating} / 5.0</span>
                </div>
            </div>
        </div>

        <div class="modal-specs-grid">
            ${[
                ['Weight', mouse.weight || 'N/A'],
                ['Sensor', mouse.sensor || 'N/A'],
                ['Max DPI', mouse.dpi || 'N/A'],
                ['Connection', mouse.connection || 'N/A'],
                ['Battery', mouse.battery || 'N/A'],
                ['Shape', mouse.shape || 'N/A'],
                ['Switches', mouse.switches || 'N/A'],
                ['Polling Rate', mouse.pollingRate || 'N/A'],
                ['Feet', mouse.feet || 'N/A']
            ].map(([label, value]) => `
                <div class="modal-spec">
                    <div class="spec-label">${label}</div>
                    <div class="spec-value">${value}</div>
                </div>
            `).join('')}
        </div>

        <div class="modal-description">${mouse.description || 'No description available.'}</div>

        <div class="modal-pros-cons">
            <div class="pros-card">
                <h4>👍 Pros</h4>
                <ul>${(mouse.pros || []).map(p => `<li>${p}</li>`).join('')}</ul>
            </div>
            <div class="cons-card">
                <h4>👎 Cons</h4>
                <ul>${(mouse.cons || []).map(c => `<li>${c}</li>`).join('')}</ul>
            </div>
        </div>

        <div class="modal-verdict">
            <h4>🏆 Verdict</h4>
            <p>${mouse.verdict || 'No verdict available.'}</p>
        </div>
    `;

    modalOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modalOverlay.style.display = 'none';
    document.body.style.overflow = '';
}

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

// ── Filters ─────────────────────────────────────────────────
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderCards(btn.dataset.filter);
    });
});

// ── Compare Side-by-Side ────────────────────────────────────
function populateCompareSelects() {
    const options = miceData.map(m => `<option value="${m.id}">${m.brand} ${m.name}</option>`).join('');
    compareA.innerHTML = `<option value="">Select a mouse...</option>${options}`;
    compareB.innerHTML = `<option value="">Select a mouse...</option>${options}`;
}

function updateCompare() {
    const a = miceData.find(m => m.id === parseInt(compareA.value));
    const b = miceData.find(m => m.id === parseInt(compareB.value));

    if (!a || !b) {
        compareTable.style.display = 'none';
        return;
    }

    const specs = [
        ['Brand', a.brand, b.brand],
        ['Price', a.price || 'N/A', b.price || 'N/A'],
        ['Weight', a.weight || 'N/A', b.weight || 'N/A'],
        ['Sensor', a.sensor || 'N/A', b.sensor || 'N/A'],
        ['Max DPI', a.dpi || 'N/A', b.dpi || 'N/A'],
        ['Connection', a.connection || 'N/A', b.connection || 'N/A'],
        ['Battery', a.battery || 'N/A', b.battery || 'N/A'],
        ['Shape', a.shape || 'N/A', b.shape || 'N/A'],
        ['Switches', a.switches || 'N/A', b.switches || 'N/A'],
        ['Polling Rate', a.pollingRate || 'N/A', b.pollingRate || 'N/A'],
        ['Mouse Feet', a.feet || 'N/A', b.feet || 'N/A'],
        ['Rating', `${a.rating} / 5.0`, `${b.rating} / 5.0`],
    ];

    compareTable.innerHTML = `
        <div class="compare-row header">
            <div class="compare-cell">Specification</div>
            <div class="compare-cell highlight">${a.name}</div>
            <div class="compare-cell highlight">${b.name}</div>
        </div>
        ${specs.map(([label, va, vb]) => `
            <div class="compare-row">
                <div class="compare-cell">${label}</div>
                <div class="compare-cell">${va}</div>
                <div class="compare-cell">${vb}</div>
            </div>
        `).join('')}
    `;
    compareTable.style.display = 'block';
}

compareA.addEventListener('change', updateCompare);
compareB.addEventListener('change', updateCompare);

// ── Host Control Panel Dashboard Functions ──────────────────
function renderAdminMiceList() {
    adminMiceList.innerHTML = miceData.map(mouse => {
        const previewSrc = mouse.image || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%236b6b80' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='5' y='2' width='14' height='20' rx='7'/%3E%3Cpath d='M12 2v10M5 10h14'/%3E%3C/svg%3E";
        
        return `
            <div class="admin-mouse-item">
                <div class="admin-mouse-info">
                    <img src="${previewSrc}" class="admin-mouse-img-preview" alt="Preview" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236b6b80\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Crect x=\'5\' y=\'2\' width=\'14\' height=\'20\' rx=\'7\'/%3E%3Cpath d=\'M12 2v10M5 10h14\'/%3E%3C/svg%3E';">
                    <div class="admin-mouse-details">
                        <h4>${mouse.brand} ${mouse.name}</h4>
                        <span>Category: ${mouse.category} | ${mouse.price || 'N/A'}</span>
                    </div>
                </div>
                <button class="btn-delete-mouse" onclick="deleteMouse(${mouse.id})" title="Remove mouse from database">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>
                </button>
            </div>
        `;
    }).join('');
}

// Add a new mouse to database
adminAddForm.addEventListener('submit', (e) => {
    e.preventDefault();
    // Parse comma separated strings to arrays
    const prosVal = document.getElementById('admin-pros').value;
    const consVal = document.getElementById('admin-cons').value;
    
    const pros = prosVal.split(',').map(s => s.trim()).filter(s => s.length > 0);
    const cons = consVal.split(',').map(s => s.trim()).filter(s => s.length > 0);
    
    const newMouse = {
        name: document.getElementById('admin-name').value,
        brand: document.getElementById('admin-brand').value,
        category: document.getElementById('admin-category').value,
        image: document.getElementById('admin-image').value || null,
        emoji: "🖱️",
        price: document.getElementById('admin-price').value,
        weight: document.getElementById('admin-weight').value,
        sensor: document.getElementById('admin-sensor').value,
        dpi: document.getElementById('admin-dpi').value,
        connection: document.getElementById('admin-connection').value,
        battery: document.getElementById('admin-battery').value || "N/A",
        shape: document.getElementById('admin-shape').value || "N/A",
        switches: document.getElementById('admin-switches').value || "N/A",
        pollingRate: document.getElementById('admin-polling').value || "N/A",
        feet: document.getElementById('admin-feet').value || "N/A",
        rating: parseFloat(document.getElementById('admin-rating').value) || 4.5,
        tagline: document.getElementById('admin-tagline').value,
        description: document.getElementById('admin-description').value,
        pros: pros.length > 0 ? pros : ["Excellent specs"],
        cons: cons.length > 0 ? cons : ["None significant"],
        verdict: document.getElementById('admin-verdict').value
    };
    
    // Send POST to backend REST API
    fetch(`${API_BASE}/api/mice`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newMouse)
    })
    .then(res => {
        if (res.status === 401 || res.status === 403) {
            handleSessionExpired();
            throw new Error("Unauthorized");
        }
        if (!res.ok) throw new Error("API write failed");
        return res.json();
    })
    .then(data => {
        showToast(`🚀 ${newMouse.brand} ${newMouse.name} added to database!`);
        adminAddForm.reset();
        // Refresh local view and reload lists
        fetchMice().then(() => {
            renderCards();
            populateCompareSelects();
            renderAdminMiceList();
        });
    })
    .catch(err => {
        console.error(err);
        if (err.message !== "Unauthorized") {
            showToast("❌ Failed to add mouse. Check inputs.");
        }
    });
});

// Delete mouse from database using API
window.deleteMouse = function(id) {
    if (confirm("Are you sure you want to delete this mouse?")) {
        fetch(`${API_BASE}/api/mice/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        })
        .then(res => {
            if (res.status === 401 || res.status === 403) {
                handleSessionExpired();
                throw new Error("Unauthorized");
            }
            if (!res.ok) throw new Error("API delete failed");
            return res.json();
        })
        .then(() => {
            showToast(`🗑️ Mouse removed from database.`);
            fetchMice().then(() => {
                renderCards();
                populateCompareSelects();
                renderAdminMiceList();
            });
        })
        .catch(err => {
            console.error(err);
        });
    }
};

// Reset database to seed default entries via API
adminResetBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to reset the database? This will restore default entries and wipe custom changes.")) {
        showToast("<span class='rotate-spin'>🖱️</span> Resetting database...");
        fetch(`${API_BASE}/api/mice/reset`, {
            method: 'POST',
            headers: getAuthHeaders()
        })
        .then(res => {
            if (res.status === 401 || res.status === 403) {
                handleSessionExpired();
                throw new Error("Unauthorized");
            }
            if (!res.ok) throw new Error("API reset failed");
            return res.json();
        })
        .then(() => {
            showToast("🔄 Database restored to default entries!");
            fetchMice().then(() => {
                renderCards();
                populateCompareSelects();
                renderAdminMiceList();
            });
        })
        .catch(err => {
            console.error(err);
        });
    }
});

function handleSessionExpired() {
    sessionStorage.removeItem('host_logged_in');
    sessionStorage.removeItem('host_token');
    checkAdminAuth();
    showToast("⚠️ Session expired or invalid. Locked dashboard.");
    document.getElementById('home').scrollIntoView({ behavior: 'smooth' });
}


// ── FAQ Accordion ───────────────────────────────────────────
document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
        const item = btn.parentElement;
        const wasActive = item.classList.contains('active');
        document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
        if (!wasActive) item.classList.add('active');
    });
});

// ── Hero Stats Counter ──────────────────────────────────────
function animateCounters() {
    document.querySelectorAll('.stat-number[data-target]').forEach(el => {
        const target = parseInt(el.dataset.target);
        const duration = 2000;
        const step = target / (duration / 16);
        let current = 0;
        const timer = setInterval(() => {
            current += step;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            el.textContent = Math.floor(current);
        }, 16);
    });
}

// ── Intersection Observer for Animations ────────────────────
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, { threshold: 0.1 });

// ── Collaborate Form Handlers ───────────────────────────────
hostForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('host-name').value;
    const email = document.getElementById('host-email').value;
    const mouseName = document.getElementById('host-mouse').value;
    const brand = document.getElementById('host-brand').value;
    const message = document.getElementById('host-message').value;
    
    showToast("<span class='rotate-spin'>🖱️</span> Sending submission...");
    
    fetch('https://formsubmit.co/ajax/rajputaryan.0221@gmail.com', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            name: name,
            email: email,
            mouseName: mouseName,
            brand: brand,
            message: message
        })
    })
    .then(response => {
        if (!response.ok) throw new Error("Failed to send");
        return response.json();
    })
    .then(data => {
        showToast('🚀 Collaborate submission sent! Check your Gmail inbox.');
        hostForm.reset();
        if (hostMsgCounter) hostMsgCounter.textContent = '0 / 300';
    })
    .catch(error => {
        console.error(error);
        showToast('❌ Failed to send submission. Please try again.');
    });
});

newsletterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    showToast('📬 Subscribed! You\'ll receive our latest updates.');
    newsletterForm.reset();
});

// ── Admin Authentication Modal Handlers ──────────────────────
function checkAdminAuth() {
    const isLoggedIn = sessionStorage.getItem('host_logged_in') === 'true';
    if (isLoggedIn) {
        navAdminLink.style.display = 'list-item';
        hostAdminSection.style.display = 'block';
    } else {
        navAdminLink.style.display = 'none';
        hostAdminSection.style.display = 'none';
    }
}

function openAuthModal() {
    authModal.style.display = 'flex';
    setTimeout(() => {
        if (secretAuthEmail) secretAuthEmail.focus();
    }, 50);
}

function closeAuthModal() {
    authModal.style.display = 'none';
    if (secretAuthEmail) secretAuthEmail.value = '';
    if (secretAuthPassword) secretAuthPassword.value = '';
}

authModalClose.addEventListener('click', closeAuthModal);
authModal.addEventListener('click', (e) => {
    if (e.target === authModal) closeAuthModal();
});

logoTrigger.addEventListener('dblclick', (e) => {
    e.preventDefault();
    openAuthModal();
});

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        openAuthModal();
    }
});

secretAuthForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = secretAuthEmail.value.trim();
    const password = secretAuthPassword.value;
    
    fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
    .then(res => {
        if (res.status === 401 || res.status === 403) throw new Error("INCORRECT_CREDENTIALS");
        if (!res.ok) throw new Error("SERVER_ERROR");
        return res.json();
    })
    .then(data => {
        sessionStorage.setItem('host_logged_in', 'true');
        sessionStorage.setItem('host_token', data.token);
        
        checkAdminAuth();
        closeAuthModal();
        showToast('🔓 Host Dashboard unlocked securely!');
        
        fetchSecurityStatus();
        fetchSecurityLogs();
        
        setTimeout(() => {
            hostAdminSection.scrollIntoView({ behavior: 'smooth' });
        }, 300);
    })
    .catch(err => {
        console.error(err);
        if (err.message === "INCORRECT_CREDENTIALS") {
            showToast('❌ Incorrect credentials. Access denied.');
        } else {
            showToast('❌ Connection error: Backend server offline or inaccessible.');
        }
        secretAuthPassword.value = '';
    });
});

adminLockBtn.addEventListener('click', () => {
    sessionStorage.removeItem('host_logged_in');
    sessionStorage.removeItem('host_token');
    checkAdminAuth();
    showToast('🔒 Dashboard locked. Host Dashboard has been hidden.');
    document.getElementById('home').scrollIntoView({ behavior: 'smooth' });
});

// ── WAF & API Shield Core Logic ─────────────────────────────
const wafChallengeScreen = document.getElementById('waf-challenge-screen');
const clientIpPlaceholder = document.getElementById('client-ip-placeholder');
const toggleWafChallenge = document.getElementById('toggle-waf-challenge');
const toggleAntiScraping = document.getElementById('toggle-anti-scraping');
const apiKeyInput = document.getElementById('api-key-input');
const btnGenerateApi = document.getElementById('btn-generate-api');
const securityLogs = document.getElementById('security-logs');
const statBlocked = document.getElementById('sec-stat-blocked');
const statApi = document.getElementById('sec-stat-api');

let blockedCount = 0;
let apiQueriesCount = 0;

const mockIps = ["103.88.22.14", "49.36.81.201", "122.164.22.95", "106.201.88.13", "182.72.105.18"];
const currentIp = mockIps[Math.floor(Math.random() * mockIps.length)];
if (clientIpPlaceholder) clientIpPlaceholder.textContent = currentIp;

function updateSecurityUI() {
    if (statBlocked) statBlocked.textContent = blockedCount.toLocaleString();
    if (statApi) statApi.textContent = apiQueriesCount.toLocaleString();
}

async function fetchSecurityStatus() {
    try {
        const res = await fetch(`${API_BASE}/api/security/status`);
        const data = await res.json();
        blockedCount = data.blockedCount;
        apiQueriesCount = data.apiQueriesCount;
        if (toggleWafChallenge) toggleWafChallenge.checked = data.wafChallengeEnabled;
        if (toggleAntiScraping) toggleAntiScraping.checked = data.antiScrapingEnabled;
        if (apiKeyInput) apiKeyInput.value = data.apiKey;
        updateSecurityUI();
    } catch (e) {
        console.error("Failed to load security status", e);
    }
}

async function fetchSecurityLogs() {
    if (!securityLogs) return;
    try {
        const res = await fetch(`${API_BASE}/api/security/logs`);
        const logs = await res.json();
        securityLogs.innerHTML = '';
        logs.forEach(entry => {
            const logElement = document.createElement('div');
            const type = typeof entry === 'string' ? 'system' : (entry.type || 'system');
            const content = typeof entry === 'string' ? entry : entry.log;
            logElement.className = `log-entry ${type}`;
            logElement.textContent = content;
            securityLogs.appendChild(logElement);
        });
        securityLogs.scrollTop = securityLogs.scrollHeight;
    } catch (e) {
        console.error("Failed to load security logs", e);
    }
}

async function pushSecurityLog(message, type = 'system') {
    try {
        await fetch(`${API_BASE}/api/security/logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ log: message, type })
        });
        fetchSecurityLogs();
    } catch (e) {
        console.error("Failed to push security log", e);
    }
}

async function updateSecurityConfig(payload) {
    try {
        const res = await fetch(`${API_BASE}/api/security/config`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        if (res.status === 401 || res.status === 403) {
            handleSessionExpired();
            return;
        }
        await fetchSecurityStatus();
    } catch (e) {
        console.error("Failed to update config", e);
    }
}

function runWafChallenge() {
    const challengeEnabled = toggleWafChallenge ? toggleWafChallenge.checked : true;
    if (!challengeEnabled) {
        if (wafChallengeScreen) wafChallengeScreen.style.display = 'none';
        return;
    }
    if (wafChallengeScreen) {
        wafChallengeScreen.style.display = 'flex';
        wafChallengeScreen.classList.remove('verified');
    }
    const progressFill = document.querySelector('.waf-progress-fill');
    const statusText = document.querySelector('.waf-status');
    let width = 0;
    const interval = setInterval(() => {
        width += Math.floor(Math.random() * 8) + 4;
        if (width >= 100) {
            width = 100;
            clearInterval(interval);
            if (statusText) statusText.textContent = "Connection secure! Access granted.";
            if (progressFill) progressFill.style.width = '100%';
            setTimeout(() => {
                if (wafChallengeScreen) wafChallengeScreen.classList.add('verified');
                pushSecurityLog(`[SYSTEM] Client verification check passed for IP: ${currentIp}`, 'allow');
            }, 300);
        } else {
            if (progressFill) progressFill.style.width = `${width}%`;
            if (statusText) {
                if (width < 30) statusText.textContent = "Analyzing browser runtime environment...";
                else if (width < 60) statusText.textContent = "Evaluating cryptographic handshake challenge...";
                else if (width < 85) statusText.textContent = "Checking network routing and IP threat intelligence database...";
                else statusText.textContent = "Decrypting secure session keys...";
            }
        }
    }, 90);
}

function startLiveSecuritySimulator() {
    fetchSecurityStatus();
    fetchSecurityLogs();
    setInterval(() => {
        fetchSecurityStatus();
        fetchSecurityLogs();
    }, 4000);
}

function initAntiScraping() {
    document.addEventListener('contextmenu', (e) => {
        const active = toggleAntiScraping ? toggleAntiScraping.checked : true;
        if (active) {
            e.preventDefault();
            showToast('⚠️ Anti-Scraping Shield Active. Right-click disabled.');
            pushSecurityLog(`[PREVENTED] Scraping attempt: Right-click context menu requested by ${currentIp}`, 'block');
        }
    });
    document.addEventListener('keydown', (e) => {
        const active = toggleAntiScraping ? toggleAntiScraping.checked : true;
        if (!active) return;
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j')) || (e.ctrlKey && (e.key === 'U' || e.key === 'u'))) {
            e.preventDefault();
            showToast('⚠️ Developer inspection locked by WAF Shield.');
            pushSecurityLog(`[PREVENTED] Scraping attempt: DevTools shortcut pressed by ${currentIp}`, 'block');
        }
    });
}

if (toggleWafChallenge) {
    toggleWafChallenge.addEventListener('change', () => {
        updateSecurityConfig({ wafChallengeEnabled: toggleWafChallenge.checked });
        showToast(`🔄 Challenge set to ${toggleWafChallenge.checked ? 'Enabled' : 'Disabled'}`);
    });
}

if (toggleAntiScraping) {
    toggleAntiScraping.addEventListener('change', () => {
        updateSecurityConfig({ antiScrapingEnabled: toggleAntiScraping.checked });
        showToast(`🔄 Anti-Scraping set to ${toggleAntiScraping.checked ? 'Active' : 'Inactive'}`);
    });
}

if (btnGenerateApi) {
    btnGenerateApi.addEventListener('click', () => {
        const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let secret = '';
        for (let i = 0; i < 14; i++) {
            secret += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        const newKey = `hav_sk_live_${secret}`;
        updateSecurityConfig({ apiKey: newKey });
        showToast("🔑 Generated new API Secret Key!");
    });
}

// Dynamic Character Limit Counters (Anti-Spam)
const hostMessageInput = document.getElementById('host-message');
const hostMsgCounter = document.getElementById('host-msg-counter');
const adminDescInput = document.getElementById('admin-description');
const adminDescCounter = document.getElementById('admin-desc-counter');
const adminVerdictInput = document.getElementById('admin-verdict');
const adminVerdictCounter = document.getElementById('admin-verdict-counter');

function setupCharCounter(input, counter, max) {
    if (!input || !counter) return;
    input.addEventListener('input', () => {
        const len = input.value.length;
        counter.textContent = `${len} / ${max}`;
        counter.classList.toggle('warning', len >= (max * 0.8) && len < max);
        counter.classList.toggle('limit', len >= max);
    });
}

function initCharCounters() {
    setupCharCounter(hostMessageInput, hostMsgCounter, 300);
    setupCharCounter(adminDescInput, adminDescCounter, 250);
    setupCharCounter(adminVerdictInput, adminVerdictCounter, 150);
    const chatCharCounter = document.getElementById('chat-char-counter');
    if (chatCharCounter && chatUserInput) {
        setupCharCounter(chatUserInput, chatCharCounter, 80);
    }
}

hostForm.addEventListener('reset', () => {
    if (hostMsgCounter) hostMsgCounter.textContent = '0 / 300';
});

adminAddForm.addEventListener('reset', () => {
    if (adminDescCounter) adminDescCounter.textContent = '0 / 250';
    if (adminVerdictCounter) adminVerdictCounter.textContent = '0 / 150';
});

// ── Floating AI Chat Widget Logic ───────────────────────────
const chatToggleBtn = document.getElementById('chat-toggle-btn');
const chatWindow = document.getElementById('chat-window');
const chatMessages = document.getElementById('chat-messages');
const chatInputForm = document.getElementById('chat-input-form');
const chatUserInput = document.getElementById('chat-user-input');
const chatIconOpen = document.getElementById('chat-icon-open');
const chatIconClose = document.getElementById('chat-icon-close');
const chatBadge = document.getElementById('chat-badge');

if (chatToggleBtn && chatWindow) {
    chatToggleBtn.addEventListener('click', () => {
        const isHidden = chatWindow.style.display === 'none';
        chatWindow.style.display = isHidden ? 'flex' : 'none';
        chatIconOpen.style.display = isHidden ? 'none' : 'block';
        chatIconClose.style.display = isHidden ? 'block' : 'none';
        if (isHidden && chatBadge) {
            chatBadge.style.display = 'none';
        }
        if (isHidden) {
            setTimeout(() => chatUserInput.focus(), 150);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    });
}

window.sendSuggestion = function(text) {
    if (chatUserInput) {
        chatUserInput.value = text;
        handleUserMessage(text);
    }
};

if (chatInputForm) {
    chatInputForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = chatUserInput.value.trim();
        if (!text) return;
        handleUserMessage(text);
    });
}

let chatMessageTimestamps = [];

function checkChatRateLimit() {
    const now = Date.now();
    chatMessageTimestamps = chatMessageTimestamps.filter(ts => now - ts < 10000);
    if (chatMessageTimestamps.length >= 4) {
        return false;
    }
    chatMessageTimestamps.push(now);
    return true;
}

function handleUserMessage(text) {
    const chatCharCounter = document.getElementById('chat-char-counter');
    const chatSendBtn = document.getElementById('chat-send-btn');
    if (!checkChatRateLimit()) {
        appendChatBubble("⚠️ <strong>Rate Limit Exceeded!</strong> Please do not spam the AI assistant. Wait a few seconds before sending another query.", 'bot-msg');
        if (chatUserInput) {
            chatUserInput.disabled = true;
            chatUserInput.placeholder = "Spam protection active. Wait...";
        }
        if (chatSendBtn) {
            chatSendBtn.disabled = true;
        }
        setTimeout(() => {
            if (chatUserInput) {
                chatUserInput.disabled = false;
                chatUserInput.placeholder = "Ask me about specs...";
                chatUserInput.focus();
            }
            if (chatSendBtn) {
                chatSendBtn.disabled = false;
            }
        }, 4000);
        return;
    }
    appendChatBubble(text, 'user-msg');
    if (chatUserInput) {
        chatUserInput.value = '';
    }
    if (chatCharCounter) {
        chatCharCounter.textContent = '0 / 80';
        chatCharCounter.classList.remove('warning');
        chatCharCounter.classList.remove('limit');
    }
    const typingId = showTypingIndicator();
    setTimeout(() => {
        removeTypingIndicator(typingId);
        const reply = generateAiReply(text);
        appendChatBubble(reply, 'bot-msg');
    }, Math.floor(Math.random() * 600) + 700);
}

function appendChatBubble(text, className) {
    if (!chatMessages) return;
    const bubble = document.createElement('div');
    bubble.className = `chat-msg ${className}`;
    bubble.innerHTML = text.replace(/\n/g, '<br>');
    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTypingIndicator() {
    if (!chatMessages) return null;
    const bubble = document.createElement('div');
    bubble.className = 'chat-msg bot-msg typing-bubble';
    bubble.id = `typing-${Date.now()}`;
    bubble.innerHTML = `
        <div class="typing-indicator">
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
        </div>
    `;
    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return bubble.id;
}

function removeTypingIndicator(id) {
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.remove();
}

function generateAiReply(text) {
    const q = text.toLowerCase();
    if (q === 'hi' || q === 'hello' || q === 'hey' || q.includes('who are you') || q.includes('help')) {
        return "Hello! I am the HAVE AI Assistant. I can recommend gaming or productivity mice, compare models, display weight/dpi specs, or give you a hint to unlock the secret Host dashboard! What are you looking for today?";
    }
    if (q.includes('secret') || q.includes('admin') || q.includes('dashboard') || q.includes('unlock') || q.includes('login') || q.includes('password') || q.includes('invisible')) {
        return "🤫 Shh... Here is a host secret! Double-click the 🖱️ logo in the top navbar, or press `Ctrl + Shift + H` on your keyboard. It will prompt for the master password: **`bsdkmcbc1`**. This reveals the hidden Host Dashboard!";
    }
    if (q.includes('lightest') || q.includes('lowest weight') || q.includes('light weight')) {
        const sorted = [...miceData].sort((a,b) => {
            const wa = parseInt(a.weight) || 999;
            const wb = parseInt(b.weight) || 999;
            return wa - wb;
        });
        const best = sorted[0];
        return `🪶 The lightest mouse in our collection is the **${best.brand} ${best.name}** at just **${best.weight}**! Close behind is the Pulsar X2V2 at 52g.`;
    }
    if (q.includes('battery') || q.includes('longest battery') || q.includes('charge')) {
        return "🔋 For productivity, the **Razer Orochi V2** leads with up to **950 hours** on a single AA battery. The **Logitech MX Master 3S** lasts **70 days** with rechargeable USB-C. For gaming, the **Logitech G Pro X Superlight 2** and **Razer Viper V3 Pro** lead with **95 hours** of wireless battery life.";
    }
    if (q.includes('dpi') || q.includes('highest dpi') || q.includes('precision') || q.includes('sensor')) {
        return "🎯 The mouse with the highest tracking resolution is the **Razer Viper V3 Pro** with a whopping **35,000 DPI** Focus Pro 30K sensor! The Logitech Superlight 2 runs close behind at 32,000 DPI.";
    }
    if (q.includes('recommend') || q.includes('suggest') || q.includes('which mouse') || q.includes('buy')) {
        if (q.includes('gaming') || q.includes('fps') || q.includes('esport') || q.includes('competitive') || q.includes('aim')) {
            return "🎮 For competitive gaming (Valorant, CS2), I highly recommend the **Logitech G Pro X Superlight 2** or the **Razer Viper V3 Pro**. Both are ultra-light (under 60g) and support up to 4000Hz/8000Hz polling rates.";
        }
        if (q.includes('work') || q.includes('office') || q.includes('productivity') || q.includes('creative') || q.includes('scroll')) {
            return "💼 For office work and design, the **Logitech MX Master 3S** is the absolute king. Its electromagnetic scroll wheel and multi-device connection are unmatched.";
        }
        if (q.includes('budget') || q.includes('cheap') || q.includes('affordable')) {
            return "💰 The **Razer Orochi V2** ($49) and **Razer DeathAdder V3 Pro** ($89) offer the absolute best performance-to-price ratios in our collection.";
        }
        return "I can give you a better recommendation if you tell me what you need it for! Are you looking for a **gaming** mouse, a **productivity** mouse, or a **budget** option?";
    }
    if (q.includes('compare') || q.includes('vs')) {
        const found = [];
        miceData.forEach(m => {
            const nameParts = m.name.toLowerCase().split(' ');
            const brand = m.brand.toLowerCase();
            if (q.includes(brand) || nameParts.some(p => p.length > 2 && q.includes(p))) {
                found.push(m);
            }
        });
        if (found.length >= 2) {
            const a = found[0];
            const b = found[1];
            return `⚖️ **Comparison: ${a.brand} ${a.name} vs ${b.brand} ${b.name}**\n\n` +
                   `• **Weight:** ${a.name} (${a.weight}) vs ${b.name} (${b.weight})\n` +
                   `• **Sensor:** ${a.sensor} (${a.dpi} DPI) vs ${b.sensor} (${b.dpi} DPI)\n` +
                   `• **Connection:** ${a.connection} vs ${b.connection}\n` +
                   `• **Price:** ${a.price} vs ${b.price}\n\n` +
                   `For a full spec list, check out our **Quick Compare** section in the main page!`;
        }
    }
    let matchedMouse = null;
    for (const m of miceData) {
        const nameLower = m.name.toLowerCase();
        if (q.includes(nameLower) || (q.includes(m.brand.toLowerCase()) && q.includes(nameLower.split(' ')[0]))) {
            matchedMouse = m;
            break;
        }
    }
    if (matchedMouse) {
        return `🔍 **${matchedMouse.brand} ${matchedMouse.name} Specifications:**\n\n` +
               `• **Price:** ${matchedMouse.price}\n` +
               `• **Weight:** ${matchedMouse.weight}\n` +
               `• **Sensor:** ${matchedMouse.sensor} (${matchedMouse.dpi} DPI)\n` +
               `• **Connection:** ${matchedMouse.connection} (${matchedMouse.battery})\n` +
               `• **Switches:** ${matchedMouse.switches}\n` +
               `• **Shape:** ${matchedMouse.shape}\n\n` +
               `*Verdict:* ${matchedMouse.tagline}`;
    }
    return "I couldn't quite find details on that. Try asking about a specific mouse (e.g. 'tell me about Superlight 2' or 'compare Viper and Superlight'), ask for recommendations ('best budget mouse'), or ask for WAF logs status!";
}

// ── COOL GRAPHICS — Cursor Trail, 3D Card Tilt, Scroll Reveal ──
function initCursorTrail() {
    const trail = [];
    const count = 18;
    for (let i = 0; i < count; i++) {
        const dot = document.createElement('div');
        dot.className = 'cursor-glow';
        const size = Math.max(2, 8 - i * 0.35);
        dot.style.width = size + 'px';
        dot.style.height = size + 'px';
        dot.style.opacity = Math.max(0.05, (1 - i / count) * 0.55);
        document.body.appendChild(dot);
        trail.push({ el: dot, x: 0, y: 0 });
    }
    let mx = 0, my = 0;
    let idle = true;
    document.addEventListener('mousemove', (e) => {
        mx = e.clientX;
        my = e.clientY;
        if (idle) {
            idle = false;
            trail.forEach((d, i) => { d.x = mx; d.y = my; });
        }
    });
    document.addEventListener('mouseleave', () => { idle = true; trail.forEach(d => { d.el.style.opacity = '0'; }); });
    function tick() {
        trail[0].x += (mx - trail[0].x) * 0.25;
        trail[0].y += (my - trail[0].y) * 0.25;
        trail[0].el.style.transform = 'translate(' + trail[0].x + 'px,' + trail[0].y + 'px)';
        trail[0].el.style.opacity = idle ? '0' : Math.max(0.05, (1 - 0 / count) * 0.55);
        for (let i = 1; i < count; i++) {
            trail[i].x += (trail[i - 1].x - trail[i].x) * 0.3;
            trail[i].y += (trail[i - 1].y - trail[i].y) * 0.3;
            trail[i].el.style.transform = 'translate(' + trail[i].x + 'px,' + trail[i].y + 'px)';
            trail[i].el.style.opacity = idle ? '0' : Math.max(0.05, (1 - i / count) * 0.55);
        }
        requestAnimationFrame(tick);
    }
    tick();
}

function initCardTilt() {
    document.querySelectorAll('.mouse-card').forEach(card => {
        const shadow = document.createElement('div');
        shadow.className = 'card-tilt-shadow';
        card.appendChild(shadow);
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            const tiltX = (y - 0.5) * -16;
            const tiltY = (x - 0.5) * 16;
            const lift = -8;
            card.style.transform = 'perspective(1200px) rotateX(' + tiltX + 'deg) rotateY(' + tiltY + 'deg) translateY(' + lift + 'px)';
            shadow.style.opacity = '1';
            shadow.style.background =
                'radial-gradient(circle at ' + (x * 100) + '% ' + (y * 100) + '%, rgba(124, 92, 252, 0.12) 0%, transparent 70%)';
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform =
                'perspective(1200px) rotateX(0deg) rotateY(0deg) translateY(0px)';
            shadow.style.opacity = '0';
        });
    });
}

// ── Scroll Reveal ───────────────────────────────────────────
function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.08 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ── Init ────────────────────────────────────────────────────
async function initApp() {
    await fetchMice();
    renderCards();
    populateCompareSelects();
    renderAdminMiceList();
    checkAdminAuth();
    runWafChallenge();
    initAntiScraping();
    startLiveSecuritySimulator();
    initCharCounters();
    animateCounters();

    // Initialize cool graphics
    initCursorTrail();
    initCardTilt();
    initScrollReveal();
}

initApp();

