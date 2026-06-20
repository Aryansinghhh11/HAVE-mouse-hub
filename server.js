const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'hav_secret_session_key_99_secure_vault';

// Generate in-memory admin password hash on startup
const ADMIN_PASSWORD_HASH = bcrypt.hashSync('bsdkmcbc1', 10);

app.use(cors());
app.use(express.json());

// Serve static frontend files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve brain artifacts (images) directly from artifacts directory
const brainDir = path.resolve(__dirname, '../../brain/67b2acf6-ca86-4ca1-8657-f69801a60386');
app.use('/brain/67b2acf6-ca86-4ca1-8657-f69801a60386', express.static(brainDir));

// Database path
const dbPath = path.join(__dirname, 'database.json');

// Helper functions for reading/writing local JSON database
function readMiceDb() {
    try {
        if (!fs.existsSync(dbPath)) {
            return [];
        }
        const data = fs.readFileSync(dbPath, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error("Error reading database file", e);
        return [];
    }
}

function writeMiceDb(data) {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error("Error writing database file", e);
        return false;
    }
}

const submissionsPath = path.join(__dirname, 'submissions.json');

function readSubmissionsDb() {
    try {
        if (!fs.existsSync(submissionsPath)) {
            return [];
        }
        const data = fs.readFileSync(submissionsPath, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error("Error reading submissions database file", e);
        return [];
    }
}

function writeSubmissionsDb(data) {
    try {
        fs.writeFileSync(submissionsPath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error("Error writing submissions database file", e);
        return false;
    }
}

// In-Memory Security Logs & Config Storage (persisted for live simulator context)
let securityConfig = {
    wafChallengeEnabled: true,
    antiScrapingEnabled: true,
    blockedCount: Math.floor(Math.random() * 200) + 450,
    apiQueriesCount: Math.floor(Math.random() * 2000) + 18500
};

let securityLogs = [
    `[${new Date().toTimeString().split(' ')[0]}] WAF Server Secure Audit Engine initialized.`
];

function addServerLog(message, type = 'system') {
    const timeStr = new Date().toTimeString().split(' ')[0];
    const logStr = `[${timeStr}] ${message}`;
    securityLogs.push({ log: logStr, type });
    if (securityLogs.length > 50) {
        securityLogs.shift();
    }
}

// ── AUTHENTICATION API ──────────────────────────────────────────

// Login endpoint
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    
    const isEmailValid = (email.toLowerCase().trim() === 'rajputaryan.0221@gmail.com');
    const isPasswordValid = bcrypt.compareSync(password, ADMIN_PASSWORD_HASH);
    
    if (isEmailValid && isPasswordValid) {
        const token = jwt.sign({ username: 'admin' }, JWT_SECRET, { expiresIn: '2h' });
        addServerLog("[ALLOWED] Successful Host Admin credentials authentication.", "allow");
        return res.json({ success: true, token });
    } else {
        addServerLog("[BLOCKED] Unauthorized dashboard credentials login attempt.", "block");
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
});

// Middleware for verifying JWT authorization
function authorizeHost(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        addServerLog("[BLOCKED] Blocked API access attempt: Missing token.", "block");
        return res.status(401).json({ success: false, message: 'Access denied. Token missing.' });
    }
    
    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        addServerLog("[BLOCKED] Blocked API access attempt: Invalid token.", "block");
        return res.status(403).json({ success: false, message: 'Invalid token.' });
    }
}

// ── MICE API ROUTES ─────────────────────────────────────────────

// Get all mice
app.get('/api/mice', (req, res) => {
    securityConfig.apiQueriesCount++;
    const mice = readMiceDb();
    res.json(mice);
});

// Add a mouse (Protected)
app.post('/api/mice', authorizeHost, (req, res) => {
    const mice = readMiceDb();
    const newMouseData = req.body;
    
    if (!newMouseData.name || !newMouseData.brand) {
        return res.status(400).json({ success: false, message: 'Mouse name and brand are required' });
    }
    
    // Server-side input length sanitization / check (Anti-Spam)
    if (newMouseData.description && newMouseData.description.length > 250) {
        return res.status(400).json({ success: false, message: 'Description exceeds 250 character limit.' });
    }
    if (newMouseData.verdict && newMouseData.verdict.length > 150) {
        return res.status(400).json({ success: false, message: 'Verdict exceeds 150 character limit.' });
    }
    
    const newId = mice.length > 0 ? Math.max(...mice.map(m => m.id)) + 1 : 1;
    const newMouse = {
        id: newId,
        ...newMouseData,
        // Override category if invalid
        category: newMouseData.category || 'gaming'
    };
    
    mice.push(newMouse);
    if (writeMiceDb(mice)) {
        addServerLog(`[SYSTEM] Host added new mouse database entry: ${newMouse.brand} ${newMouse.name}`, 'allow');
        res.json({ success: true, mouse: newMouse });
    } else {
        res.status(500).json({ success: false, message: 'Failed to write database file.' });
    }
});

// Delete a mouse (Protected)
app.delete('/api/mice/:id', authorizeHost, (req, res) => {
    const mice = readMiceDb();
    const targetId = parseInt(req.params.id);
    const index = mice.findIndex(m => m.id === targetId);
    
    if (index === -1) {
        return res.status(404).json({ success: false, message: 'Mouse not found.' });
    }
    
    const mouseName = `${mice[index].brand} ${mice[index].name}`;
    mice.splice(index, 1);
    
    if (writeMiceDb(mice)) {
        addServerLog(`[SYSTEM] Host removed mouse database entry: ${mouseName}`, 'allow');
        res.json({ success: true, message: 'Mouse deleted successfully.' });
    } else {
        res.status(500).json({ success: false, message: 'Failed to update database file.' });
    }
});

// Reset database to default (Protected)
app.post('/api/mice/reset', authorizeHost, (req, res) => {
    // Default mice schema to restore
    const defaultMice = readDefaultMiceSeed();
    if (writeMiceDb(defaultMice)) {
        addServerLog("[SYSTEM] Host restored default database state.", "allow");
        res.json({ success: true, mice: defaultMice });
    } else {
        res.status(500).json({ success: false, message: 'Failed to reset database.' });
    }
});

// ── SUBMISSIONS (COLLABORATE MESSAGES) API ROUTES ─────────────────

// Post a collaborate message (Public)
app.post('/api/submissions', (req, res) => {
    const submissions = readSubmissionsDb();
    const { name, email, mouseName, brand, message } = req.body;
    
    if (!name || !email || !mouseName || !brand || !message) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    
    // Server-side input length sanitization / check (Anti-Spam)
    if (message.length > 300) {
        return res.status(400).json({ success: false, message: 'Message exceeds 300 character limit.' });
    }
    
    const newId = submissions.length > 0 ? Math.max(...submissions.map(s => s.id)) + 1 : 1;
    const newSubmission = {
        id: newId,
        name,
        email,
        mouseName,
        brand,
        message,
        timestamp: new Date().toISOString()
    };
    
    submissions.push(newSubmission);
    if (writeSubmissionsDb(submissions)) {
        addServerLog(`[SYSTEM] New collaborate inquiry received from: ${name} (${email})`, 'allow');
        res.json({ success: true, submission: newSubmission });
    } else {
        res.status(500).json({ success: false, message: 'Failed to save submission.' });
    }
});

// Get all collaborate messages (Protected)
app.get('/api/submissions', authorizeHost, (req, res) => {
    const submissions = readSubmissionsDb();
    res.json(submissions);
});

// Delete a collaborate message (Protected)
app.delete('/api/submissions/:id', authorizeHost, (req, res) => {
    const submissions = readSubmissionsDb();
    const targetId = parseInt(req.params.id);
    const index = submissions.findIndex(s => s.id === targetId);
    
    if (index === -1) {
        return res.status(404).json({ success: false, message: 'Message not found.' });
    }
    
    const senderInfo = `${submissions[index].name} (${submissions[index].email})`;
    submissions.splice(index, 1);
    
    if (writeSubmissionsDb(submissions)) {
        addServerLog(`[SYSTEM] Host removed collaborate message from: ${senderInfo}`, 'allow');
        res.json({ success: true, message: 'Message deleted successfully.' });
    } else {
        res.status(500).json({ success: false, message: 'Failed to update database file.' });
    }
});


// ── SECURITY SHIELD CONFIG & LOGS API ───────────────────────────

// Fetch stats and configurations
app.get('/api/security/status', (req, res) => {
    res.json(securityConfig);
});

// Update configurations (Protected)
app.post('/api/security/config', authorizeHost, (req, res) => {
    const { wafChallengeEnabled, antiScrapingEnabled, blockedCount } = req.body;
    
    if (wafChallengeEnabled !== undefined) {
        securityConfig.wafChallengeEnabled = !!wafChallengeEnabled;
        addServerLog(`[SYSTEM] Config update: Human Challenge check set to ${securityConfig.wafChallengeEnabled}`);
    }
    if (antiScrapingEnabled !== undefined) {
        securityConfig.antiScrapingEnabled = !!antiScrapingEnabled;
        addServerLog(`[SYSTEM] Config update: Anti-Scraping protection set to ${securityConfig.antiScrapingEnabled}`);
    }
    if (blockedCount !== undefined) {
        securityConfig.blockedCount = blockedCount;
    }
    
    res.json({ success: true, config: securityConfig });
});

// Get scrolling audit logs
app.get('/api/security/logs', (req, res) => {
    res.json(securityLogs);
});

// Add audit logs
app.post('/api/security/logs', (req, res) => {
    const { log, type } = req.body;
    if (log) {
        addServerLog(log, type || 'system');
        res.json({ success: true });
    } else {
        res.status(400).json({ success: false });
    }
});

// Fallback HTML page server routing (Single Page App helper)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server listener
app.listen(PORT, () => {
    console.log(`HAVE Secure Database running at http://localhost:${PORT}`);
});

// Helper for default seeding values
function readDefaultMiceSeed() {
    return [
      {
        id: 1,
        name: "G Pro X Superlight 2",
        brand: "Logitech",
        category: "gaming",
        image: "images/gpro_superlight_1781768785901.png",
        emoji: "🖱️",
        tagline: "The gold standard for competitive FPS gaming — ultra-light and flawless sensor.",
        price: "₹14,999",
        rating: 4.8,
        weight: "60g",
        sensor: "HERO 2",
        dpi: "32,000",
        connection: "Wireless",
        battery: "95 hrs",
        shape: "Ambidextrous",
        switches: "Lightforce Hybrid",
        pollingRate: "4,000 Hz",
        feet: "PTFE",
        description: "The Logitech G Pro X Superlight 2 is the successor to one of the most acclaimed esports mice ever made. Weighing just 60 grams with the HERO 2 sensor delivering flawless tracking, it's the weapon of choice for countless professional players across CS2, Valorant, and Apex Legends. The Lightforce hybrid switches offer both the speed of optical and the satisfying feel of mechanical clicks.",
        pros: ["Incredibly lightweight at just 60g", "Best-in-class HERO 2 sensor", "Exceptional 95-hour battery life", "Premium PTFE feet for smooth glide", "4,000 Hz polling rate option"],
        cons: ["Premium price point at $159", "Ambidextrous shape may not suit palm grip", "No RGB lighting", "Minimal side buttons", "Not ideal for large hands"],
        verdict: "If you're a competitive gamer who values precision and low weight above all else, the G Pro X Superlight 2 is the undisputed champion. It's the mouse that pros trust when tournaments are on the line."
      },
      {
        id: 2,
        name: "DeathAdder V3 Pro",
        brand: "Razer",
        category: "gaming",
        image: "images/deathadder_v3_1781768797413.png",
        emoji: "🐍",
        tagline: "Legendary ergonomic shape refined for esports with cutting-edge technology.",
        price: "₹8,999",
        rating: 4.7,
        weight: "63g",
        sensor: "Focus Pro 30K",
        dpi: "30,000",
        connection: "Wireless",
        battery: "90 hrs",
        shape: "Ergonomic (Right)",
        switches: "Gen-3 Optical",
        pollingRate: "4,000 Hz",
        feet: "PTFE",
        description: "The Razer DeathAdder V3 Pro takes the iconic ergonomic shape that millions of gamers love and strips it down to just 63 grams. With the Focus Pro 30K sensor and Gen-3 optical switches, it delivers instantaneous actuation and zero double-clicking issues. The shape is specifically sculpted for palm and claw grips, making long gaming sessions fatigue-free.",
        pros: ["Iconic comfortable ergonomic shape", "Light for an ergonomic mouse at 63g", "Optical switches eliminate double-click issues", "Excellent Focus Pro 30K sensor", "90-hour wireless battery"],
        cons: ["Right-hand only design", "No Bluetooth — 2.4GHz only", "Rubber grips can wear over time", "Limited to 5 programmable buttons", "Shape may feel narrow for wide grips"],
        verdict: "The DeathAdder V3 Pro is the ultimate ergonomic gaming mouse. If you use a palm or claw grip and want maximum comfort without sacrificing performance, this is your best bet at a competitive price."
      },
      {
        id: 3,
        name: "MX Master 3S",
        brand: "Logitech",
        category: "productivity",
        image: "images/mx_master_3s_1781768813599.png",
        emoji: "⚡",
        tagline: "The king of productivity mice — unmatched workflow features and ergonomics.",
        price: "₹9,499",
        rating: 4.9,
        weight: "141g",
        sensor: "Darkfield 8K",
        dpi: "8,000",
        connection: "Wireless",
        battery: "70 days",
        shape: "Ergonomic (Right)",
        switches: "Quiet Clicks",
        pollingRate: "125 Hz",
        feet: "Standard",
        description: "The Logitech MX Master 3S is the undisputed king of productivity mice. Its MagSpeed electromagnetic scroll wheel can switch between ratchet and free-spin modes automatically. With USB-C charging, multi-device support (up to 3 via Bluetooth + USB receiver), and the ability to work on virtually any surface including glass, it's the ultimate tool for creative professionals and power users.",
        pros: ["MagSpeed scroll wheel is revolutionary", "Works on any surface, even glass", "Multi-device support (3 devices)", "Quiet click switches for office use", "70-day battery with USB-C charging"],
        cons: ["Heavy at 141g — not for gaming", "Expensive for a productivity mouse", "Right-hand only", "Low 125 Hz polling rate", "Thumb button placement takes time to learn"],
        verdict: "If productivity is your priority, the MX Master 3S is simply the best mouse money can buy. The workflow features, build quality, and comfort are unmatched by any competitor."
      },
      {
        id: 4,
        name: "Viper V3 Pro",
        brand: "Razer",
        category: "lightweight",
        image: "images/viper_v3_pro_1781768825023.png",
        emoji: "🔥",
        tagline: "Razer's lightest and fastest mouse ever — built for speed demons.",
        price: "₹14,999",
        rating: 4.8,
        weight: "54g",
        sensor: "Focus Pro 30K",
        dpi: "35,000",
        connection: "Wireless",
        battery: "95 hrs",
        shape: "Ambidextrous",
        switches: "Gen-3 Optical",
        pollingRate: "8,000 Hz",
        feet: "PTFE",
        description: "The Razer Viper V3 Pro pushes the boundaries of what's possible in a wireless gaming mouse. At just 54 grams, it's featherlight without resorting to honeycomb designs. The 8,000 Hz polling rate delivers input response eight times faster than standard mice, and the Focus Pro 30K sensor tracks flawlessly on any surface. It's the mouse that redefines speed.",
        pros: ["Incredibly light at 54g — no holes", "Industry-leading 8,000 Hz polling rate", "Excellent low-profile shape for claw/fingertip", "Solid construction despite low weight", "Best-in-class click latency"],
        cons: ["Very expensive at $159", "Low profile may not suit palm grip", "Only 2 side buttons", "No Bluetooth connectivity", "Clicks can feel too light for some"],
        verdict: "The Viper V3 Pro is the fastest mouse on the planet. If you're a competitive player who wants every possible advantage in reaction time and speed, this is the mouse that delivers."
      },
      {
        id: 5,
        name: "Pulsar X2V2",
        brand: "Pulsar",
        category: "lightweight",
        image: "images/pulsar_x2v2_1781768845488.png",
        emoji: "💫",
        tagline: "The community favorite — perfectly balanced shape at an insane weight.",
        price: "₹8,499",
        rating: 4.6,
        weight: "52g",
        sensor: "PAW3395",
        dpi: "26,000",
        connection: "Wireless",
        battery: "100 hrs",
        shape: "Symmetrical",
        switches: "Kailh GM 8.0",
        pollingRate: "1,000 Hz",
        feet: "Glass Skates",
        description: "The Pulsar X2V2 has taken the gaming community by storm with its meticulously refined symmetrical shape and ridiculously low weight of just 52 grams. The PAW3395 sensor is a proven performer, and the Kailh GM 8.0 switches deliver satisfying, crisp clicks. The included glass mouse feet offer unparalleled glide consistency, and the 100-hour battery means you'll barely remember to charge it.",
        pros: ["Ultra-light at 52g with solid build", "Universally praised symmetrical shape", "Glass skates for premium glide", "100-hour battery life", "Great value at $99"],
        cons: ["Only 1,000 Hz polling rate", "PAW3395 is good but not top-tier", "Limited software customization", "No Bluetooth option", "Coating can feel slippery without grip tape"],
        verdict: "The Pulsar X2V2 offers the best value in the ultra-lightweight category. Its refined shape, glass feet, and incredible battery life make it a top recommendation for anyone looking to go light without going broke."
      },
      {
        id: 6,
        name: "EC2-CW",
        brand: "Zowie",
        category: "gaming",
        image: "images/zowie_ec2_1781768856859.png",
        emoji: "🎯",
        tagline: "Pure no-nonsense esports ergonomics — plug, play, and dominate.",
        price: "₹8,999",
        rating: 4.5,
        weight: "77g",
        sensor: "PAW3950",
        dpi: "3,200",
        connection: "Wireless",
        battery: "70 hrs",
        shape: "Ergonomic (Right)",
        switches: "Mechanical",
        pollingRate: "1,000 Hz",
        feet: "Large PTFE",
        description: "The Zowie EC2-CW carries forward the legendary EC shape that has defined esports ergonomics for over a decade. There's no flashy RGB, no complex software — just a perfectly sculpted shape and reliable performance. The EC2 is the medium-sized variant ideal for claw and palm grip users. Professional CS2 players still swear by this shape because it simply works.",
        pros: ["Legendary ergonomic shape loved by pros", "No software needed — plug and play", "Large PTFE feet for smooth tracking", "Excellent build quality and durability", "Adjustable DPI and LOD on-mouse"],
        cons: ["Heavier than modern competitors at 77g", "Max 3,200 DPI is limited", "No RGB or aesthetic flair", "Only 1,000 Hz polling rate", "Premium price for conservative specs"],
        verdict: "The EC2-CW is for purists who believe the best mouse is one you forget you're holding. If you want a proven esports shape without distractions, this is the mouse that thousands of pros have chosen time and again."
      },
      {
        id: 7,
        name: "Xlite V3",
        brand: "Pulsar",
        category: "lightweight",
        image: "images/pulsar_xlite_v3_1781768869751.png",
        emoji: "🪶",
        tagline: "The ergonomic featherweight — comfort meets ultralight performance.",
        price: "₹9,999",
        rating: 4.7,
        weight: "49g",
        sensor: "PAW3395",
        dpi: "26,000",
        connection: "Wireless",
        battery: "100 hrs",
        shape: "Ergonomic (Right)",
        switches: "Kailh GM 8.0",
        pollingRate: "1,000 Hz",
        feet: "Glass Skates",
        description: "The Pulsar Xlite V3 achieves what was once thought impossible — an ergonomic mouse under 50 grams. At 49g, it's lighter than most ambidextrous gaming mice while offering the comfort of a full ergonomic shape. The glass mouse feet provide an ultra-consistent glide, and the 100-hour battery life ensures it's always ready for action. It's the perfect mouse for palm grip gamers who want ultralight performance.",
        pros: ["Unbelievably light at 49g for an ergo shape", "Glass skates for premium feel", "100-hour battery is outstanding", "Comfortable ergonomic design", "Solid build — no creaking or flex"],
        cons: ["Right-hand only", "1,000 Hz polling rate is standard", "Small hands may find it too large", "No Bluetooth connectivity", "Software is basic compared to competitors"],
        verdict: "The Xlite V3 is a marvel of engineering. If you want an ergonomic shape but refuse to compromise on weight, this is the only mouse that truly delivers both at just 49 grams."
      },
      {
        id: 8,
        name: "Orochi V2",
        brand: "Razer",
        category: "productivity",
        image: "images/razer_orochi_v2_1781768880206.png",
        emoji: "🔋",
        tagline: "The ultimate travel companion — tiny, versatile, and lasts forever.",
        price: "₹4,299",
        rating: 4.4,
        weight: "60g",
        sensor: "5G Advanced",
        dpi: "18,000",
        connection: "Dual Wireless",
        battery: "950 hrs (AA)",
        shape: "Symmetrical (Compact)",
        switches: "Gen-2 Mechanical",
        pollingRate: "1,000 Hz",
        feet: "PTFE",
        description: "The Razer Orochi V2 is the perfect mouse for people on the go. Its compact design fits easily into any laptop bag, and it supports both Bluetooth and 2.4GHz wireless. The real showstopper is battery life — up to 950 hours on a single AA battery. Despite its small size, it packs a capable sensor and comfortable shape that works for both casual gaming and productivity.",
        pros: ["Incredible 950-hour battery life", "Dual wireless (Bluetooth + 2.4GHz)", "Very affordable at $49", "Compact and travel-friendly", "Uses standard AA or AAA batteries"],
        cons: ["Too small for large hands or palm grip", "Sensor is older generation", "No USB-C charging — battery only", "Build quality feels budget", "Click feel is not as refined"],
        verdict: "The Orochi V2 is the best travel mouse you can buy. Its dual wireless, insane battery life, and budget price make it a no-brainer for anyone who needs a reliable mouse on the go."
      }
    ];
}
