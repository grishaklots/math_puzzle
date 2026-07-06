// Math Puzzle Game - Hebrew, hexagonal tiling

const SVG_NS = "http://www.w3.org/2000/svg";
const VIEW_SIZE = 1000; // internal SVG coordinate system (square)
const HEX_COLS = 6;    // number of columns of hexes across the board

// -------- Difficulty levels --------
function genQuestion(level) {
    const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    let a, b;
    switch (level) {
        case 1: a = rand(1, 9);  b = rand(1, 9);  break;
        case 2: a = rand(1, 20); b = rand(1, 10); break;
        case 3: a = rand(1, 80); b = rand(1, 20); break;
        case 4:
        default:
            // both numbers > 20, and a+b <= 100  → a in [21..79], b in [21..100-a]
            a = rand(21, 79);
            b = rand(21, 100 - a);
            break;
    }
    return { a, b, answer: a + b, level };
}

// -------- Hex geometry (pointy-top) --------
function buildHexGrid() {
    // pointy-top hex: width = sqrt(3)*size, height = 2*size
    // horizontal spacing = width, vertical spacing = 1.5*size, odd rows offset by width/2
    const hexWidth = VIEW_SIZE / HEX_COLS;
    const size = hexWidth / Math.sqrt(3);
    const hexHeight = 2 * size;
    const rowHeight = 1.5 * size;

    // Compute rows so that hexes fully cover the board (we'll clip via SVG viewport)
    const rows = Math.ceil((VIEW_SIZE + hexHeight) / rowHeight) + 1;

    const hexes = [];
    const cx0 = VIEW_SIZE / 2;
    const cy0 = VIEW_SIZE / 2;
    const maxDist = VIEW_SIZE * 0.55; // beyond this = easiest (edges)

    for (let row = -1; row < rows; row++) {
        for (let col = -1; col < HEX_COLS + 1; col++) {
            const xOffset = (row % 2 !== 0) ? hexWidth / 2 : 0;
            const cx = col * hexWidth + hexWidth / 2 + xOffset;
            const cy = row * rowHeight + size;

            // Skip hexes whose center is far outside the board
            if (cx < -hexWidth || cx > VIEW_SIZE + hexWidth) continue;
            if (cy < -hexHeight || cy > VIEW_SIZE + hexHeight) continue;

            // Distance from board center → level
            const dx = cx - cx0;
            const dy = cy - cy0;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const r = Math.min(1, dist / maxDist);
            // r near 0 → level 4 (center), r near 1 → level 1 (edge)
            let level;
            if (r < 0.28)      level = 4;
            else if (r < 0.55) level = 3;
            else if (r < 0.80) level = 2;
            else               level = 1;

            hexes.push({ cx, cy, size, level });
        }
    }
    return { hexes, size };
}

function hexPoints(cx, cy, size) {
    // pointy-top: vertices at angles 30,90,150,210,270,330 (from x-axis)
    const pts = [];
    for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 180 * (60 * i - 90); // start at top
        pts.push([cx + size * Math.cos(angle), cy + size * Math.sin(angle)]);
    }
    return pts.map(p => p.map(v => v.toFixed(2)).join(",")).join(" ");
}

// -------- State --------
const state = {
    total: 0,
    remaining: 0,
    activeHex: null,       // SVG polygon element being answered
    activeQuestion: null,  // { a, b, answer, level }
    currentInput: "",
};

// -------- Rendering --------
const svg = document.getElementById("hexLayer");
const progressEl = document.getElementById("progress");
const imgEl = document.getElementById("puzzleImage");

function renderBoard() {
    svg.setAttribute("viewBox", `0 0 ${VIEW_SIZE} ${VIEW_SIZE}`);
    svg.innerHTML = "";
    const { hexes } = buildHexGrid();
    state.total = 0;
    for (const h of hexes) {
        const poly = document.createElementNS(SVG_NS, "polygon");
        poly.setAttribute("points", hexPoints(h.cx, h.cy, h.size));
        poly.setAttribute("class", `hex level-${h.level}`);
        poly.dataset.level = h.level;
        poly.addEventListener("click", () => onHexClick(poly));
        svg.appendChild(poly);
        state.total++;
    }
    state.remaining = state.total;
    updateProgress();
}

function updateProgress() {
    const done = state.total - state.remaining;
    progressEl.textContent = `${done} / ${state.total}`;
}

// -------- Image loading --------
async function listImageFiles() {
    // 1) Primary source: window.IMAGE_MANIFEST from Images/manifest.js
    //    This works both under file:// (no server) and http://
    if (Array.isArray(window.IMAGE_MANIFEST) && window.IMAGE_MANIFEST.length > 0) {
        return window.IMAGE_MANIFEST.slice();
    }

    // 2) Fallback (only when served via HTTP): parse directory listing
    try {
        const res = await fetch("Images/", { cache: "no-store" });
        if (res.ok) {
            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, "text/html");
            const files = [];
            doc.querySelectorAll("a").forEach(a => {
                const href = a.getAttribute("href") || "";
                const name = decodeURIComponent(href.split("/").pop() || "");
                if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name)) files.push(name);
            });
            if (files.length > 0) return files;
        }
    } catch (e) { /* ignore */ }

    return [];
}

async function loadRandomImage() {
    const files = await listImageFiles();

    // 90/10: real image vs emoji placeholder (only if there are actual images)
    const useReal = files.length > 0 && Math.random() < 0.9;
    if (useReal) {
        const pick = files[Math.floor(Math.random() * files.length)];
        imgEl.src = "Images/" + encodeURIComponent(pick);
    } else {
        imgEl.src = generatePlaceholder();
    }
}

function generatePlaceholder() {
    // A cheerful auto-generated SVG placeholder with a random emoji
    const colors = [
        ["#ff9a8b", "#ff6a88", "#ff99ac"],
        ["#84fab0", "#8fd3f4", "#a1c4fd"],
        ["#fddb92", "#d1fdff", "#c2e9fb"],
        ["#f6d365", "#fda085", "#fbc2eb"],
        ["#a1ffce", "#faffd1", "#a1c4fd"],
        ["#fbc2eb", "#a6c1ee", "#84fab0"],
        ["#ffecd2", "#fcb69f", "#ff9a9e"],
    ];
    const emojis = [
        "🌈","🐶","🐱","🚀","⭐","🎈","🍎","🦁","🐸","🌻","🐢","🦋",
        "🐼","🐨","🐵","🦄","🐙","🐳","🐝","🦖","🐞","🍕","🍩","🍦",
        "⚽","🏀","🎸","🎨","🎮","🚗","✈️","🚂","🎁","🌵","🍀","🌟",
        "🐧","🐰","🐻","🦉","🦩","🌸","🍉","🍓","🥑","🎂","🎠","🏰"
    ];
    const set = colors[Math.floor(Math.random() * colors.length)];
    const em  = emojis[Math.floor(Math.random() * emojis.length)];
    const svg = `
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'>
      <defs>
        <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stop-color='${set[0]}'/>
          <stop offset='50%' stop-color='${set[1]}'/>
          <stop offset='100%' stop-color='${set[2]}'/>
        </linearGradient>
      </defs>
      <rect width='600' height='600' fill='url(#g)'/>
      <text x='300' y='340' font-size='320' text-anchor='middle' font-family='Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, Arial'>${em}</text>
    </svg>`;
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

// -------- Modal + numpad --------
const modal        = document.getElementById("modal");
const questionEl   = document.getElementById("question");
const answerEl     = document.getElementById("answer-display");
const feedbackEl   = document.getElementById("feedback");
const closeBtn     = document.getElementById("closeBtn");
const winEl        = document.getElementById("win");

function onHexClick(polyEl) {
    if (polyEl.classList.contains("removing")) return;
    state.activeHex = polyEl;
    const level = parseInt(polyEl.dataset.level, 10);
    state.activeQuestion = genQuestion(level);
    state.currentInput = "";
    questionEl.textContent = `${state.activeQuestion.a} + ${state.activeQuestion.b} =`;
    answerEl.textContent = "?";
    answerEl.className = "";
    feedbackEl.textContent = "";
    feedbackEl.className = "";
    modal.classList.remove("hidden");
}

function closeModal() {
    modal.classList.add("hidden");
    state.activeHex = null;
    state.activeQuestion = null;
    state.currentInput = "";
}

function handleKey(key) {
    if (!state.activeQuestion) return;
    if (key === "back") {
        state.currentInput = state.currentInput.slice(0, -1);
    } else if (key === "ok") {
        submitAnswer();
        return;
    } else {
        if (state.currentInput.length >= 3) return; // max 3 digits (up to 100)
        // avoid leading zero unless it's the only digit
        if (state.currentInput === "0") state.currentInput = "";
        state.currentInput += key;
    }
    answerEl.textContent = state.currentInput === "" ? "?" : state.currentInput;
    answerEl.className = "";
    feedbackEl.textContent = "";
    feedbackEl.className = "";
}

function submitAnswer() {
    if (state.currentInput === "") return;
    const guess = parseInt(state.currentInput, 10);
    if (guess === state.activeQuestion.answer) {
        // correct!
        answerEl.className = "correct";
        feedbackEl.className = "ok";
        feedbackEl.textContent = "כל הכבוד! ✨";
        const poly = state.activeHex;
        setTimeout(() => {
            poly.classList.add("removing");
            state.remaining--;
            updateProgress();
            closeModal();
            setTimeout(() => {
                if (poly.parentNode) poly.parentNode.removeChild(poly);
                if (state.remaining <= 0) showWin();
            }, 450);
        }, 450);
    } else {
        // wrong - shake & flash red
        answerEl.className = "wrong";
        feedbackEl.className = "";
        feedbackEl.textContent = "לא נכון, נסה שוב 🙂";
        // clear input after brief pause so kid sees what they typed
        setTimeout(() => {
            state.currentInput = "";
            answerEl.textContent = "?";
            answerEl.className = "";
        }, 900);
    }
}

function showWin() {
    winEl.classList.remove("hidden");
}

// -------- Wire up --------
document.querySelectorAll(".np").forEach(btn => {
    btn.addEventListener("click", () => handleKey(btn.dataset.key));
});
closeBtn.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
});

document.getElementById("newGameBtn").addEventListener("click", startNewGame);
document.getElementById("winNewGameBtn").addEventListener("click", () => {
    winEl.classList.add("hidden");
    startNewGame();
});

async function startNewGame() {
    await loadRandomImage();
    renderBoard();
}

// -------- Cheat code --------
// Type "reveal" (or press Ctrl+Shift+R) to uncover the whole image with a snappy ripple.
const CHEAT_WORD = "reveal";
let cheatBuffer = "";
let cheatTimer = null;

window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "r")) {
        e.preventDefault();
        cheatReveal();
        return;
    }
    if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
        cheatBuffer = (cheatBuffer + e.key.toLowerCase()).slice(-CHEAT_WORD.length);
        clearTimeout(cheatTimer);
        cheatTimer = setTimeout(() => (cheatBuffer = ""), 1500);
        if (cheatBuffer === CHEAT_WORD) {
            cheatBuffer = "";
            cheatReveal();
        }
    }
});

function cheatReveal() {
    const polys = Array.from(svg.querySelectorAll(".hex"))
        .filter(p => !p.classList.contains("removing") && !p.classList.contains("cheat-out"));
    if (polys.length === 0) return;

    // Ripple from board center outward
    const cx = VIEW_SIZE / 2;
    const cy = VIEW_SIZE / 2;
    const items = polys.map(p => {
        const bb = p.getBBox();
        const px = bb.x + bb.width / 2;
        const py = bb.y + bb.height / 2;
        const d = Math.hypot(px - cx, py - cy);
        return { p, d };
    });
    const maxD = Math.max(...items.map(i => i.d)) || 1;

    // Close any open modal first
    if (!modal.classList.contains("hidden")) closeModal();

    const totalMs = 900; // ripple duration
    items.forEach(({ p, d }) => {
        const delay = (d / maxD) * totalMs;
        setTimeout(() => {
            p.classList.add("cheat-out");
            setTimeout(() => p.parentNode && p.parentNode.removeChild(p), 750);
        }, delay);
    });

    state.remaining = 0;
    updateProgress();
    setTimeout(showWin, totalMs + 800);
}

startNewGame();
