const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const amountInput = document.getElementById("amount");
const windInput = document.getElementById("wind");
const lightningInput = document.getElementById("lightning");
const followInput = document.getElementById("follow");
const controls = document.getElementById("controls");

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const MAX_DROPS = reduceMotion ? 150 : 1000;

let width, height, groundY;

function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    groundY = height - Math.max(40, height * 0.08);   // where the drops land
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// three depth layers, far rain is short, slow and faint
const layers = [
    { z: 0.35, length: 10, speed: 9,  alpha: 0.25, lineWidth: 1 },
    { z: 0.65, length: 16, speed: 14, alpha: 0.45, lineWidth: 1 },
    { z: 1,    length: 26, speed: 21, alpha: 0.7,  lineWidth: 1.5 },
];

const drops = [];
const splashes = [];
const ripples = [];

let amount = parseFloat(amountInput.value);
let targetWind = parseFloat(windInput.value);
let wind = targetWind;           // eased, so a mouse flick doesn't snap every drop sideways
let mouseWind = null;

let flash = 0;                   // brightness of the current lightning, 0..1
let nextFlash = performance.now() + 2000;

function random(min, max) {
    return min + Math.random() * (max - min);
}

function createDrop(fromTop) {
    const layer = layers[Math.floor(Math.random() * layers.length)];
    return {
        layer,
        x: random(-width * 0.2, width * 1.2),
        y: fromTop ? random(-height * 0.2, -10) : random(-height, groundY),
        speed: layer.speed * random(0.85, 1.15),   // a bit of variation so it doesn't look like a grid
        length: layer.length * random(0.8, 1.2),
    };
}

function splash(x, y) {
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
        splashes.push({
            x, y,
            vx: random(-25, 25) + wind * 15,
            vy: random(-55, -25),
            life: random(0.15, 0.3),
        });
    }
    if (ripples.length < 60) {
        ripples.push({ x, y, age: 0, ttl: random(0.5, 0.9), size: random(6, 14) });
    }
}

function update(dt, now) {
    const goal = mouseWind !== null && followInput.checked ? mouseWind : targetWind;
    wind += (goal - wind) * Math.min(1, dt * 2.5);

    // keep the number of drops following the slider
    const wanted = Math.round(MAX_DROPS * amount);
    while (drops.length < wanted) drops.push(createDrop(drops.length > 50));
    if (drops.length > wanted) drops.length = wanted;

    const windPx = wind * 8;

    for (const d of drops) {
        d.x += windPx * d.layer.z * dt * 60;
        d.y += d.speed * dt * 60;

        if (d.y >= groundY) {
            // only the nearest layer splashes, far rain just disappears into the ground
            if (d.layer.z === 1 && Math.random() < 0.6) splash(d.x, groundY);
            Object.assign(d, createDrop(true));
        } else if (d.x < -width * 0.25 || d.x > width * 1.25) {
            d.x = windPx > 0 ? -width * 0.2 : width * 1.2;
        }
    }

    for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i];
        s.vy += 40 * dt;    // gravity
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life -= dt;
        if (s.life <= 0 || s.y > groundY + 2) splashes.splice(i, 1);
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
        ripples[i].age += dt;
        if (ripples[i].age > ripples[i].ttl) ripples.splice(i, 1);
    }

    if (lightningInput.checked && !reduceMotion && now >= nextFlash) {
        flash = random(0.5, 1);
        // sometimes a quick second flash, otherwise wait a while
        nextFlash = now + (Math.random() < 0.3 ? random(80, 200) : random(4000, 14000));
    }
    flash = Math.max(0, flash - dt * 4);
}

function draw() {
    ctx.clearRect(0, 0, width, height);

    // darken the photo a little so the rain reads on top of it
    ctx.fillStyle = `rgba(8, 12, 20, ${0.35 - flash * 0.3})`;
    ctx.fillRect(0, 0, width, height);

    // one path per layer so we only change the stroke style three times
    const slant = wind * 8;
    for (const layer of layers) {
        ctx.strokeStyle = `rgba(190, 212, 240, ${layer.alpha + flash * 0.3})`;
        ctx.lineWidth = layer.lineWidth;
        ctx.beginPath();
        for (const d of drops) {
            if (d.layer !== layer) continue;
            const dx = slant * layer.z * (d.length / layer.speed);
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(d.x - dx, d.y - d.length);
        }
        ctx.stroke();
    }

    ctx.fillStyle = "rgba(200, 220, 245, 0.85)";
    for (const s of splashes) ctx.fillRect(s.x, s.y, 1.5, 1.5);

    ctx.lineWidth = 1;
    for (const r of ripples) {
        const t = r.age / r.ttl;
        ctx.strokeStyle = `rgba(190, 212, 240, ${0.35 * (1 - t)})`;
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, r.size * (0.3 + t), r.size * (0.3 + t) * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    if (flash > 0.02) {
        ctx.fillStyle = `rgba(230, 240, 255, ${flash * 0.2})`;
        ctx.fillRect(0, 0, width, height);
    }
}

let last = performance.now();
function animate(now) {
    // cap dt so coming back to a background tab doesn't teleport everything
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt, now);
    draw();
    requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

// controls
amountInput.addEventListener("input", () => amount = parseFloat(amountInput.value));
windInput.addEventListener("input", () => {
    targetWind = parseFloat(windInput.value);
    mouseWind = null;
});

window.addEventListener("mousemove", (e) => {
    if (!followInput.checked) return;
    mouseWind = (e.clientX / width - 0.5) * 2;    // left edge -1, right edge 1
    windInput.value = mouseWind.toFixed(2);
});
window.addEventListener("mouseleave", () => mouseWind = null);

window.addEventListener("keydown", (e) => {
    if (e.key === "h" || e.key === "H") controls.classList.toggle("hidden");
});
