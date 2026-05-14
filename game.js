const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let width, height;
let gameRunning = false;

// ========== МИР ==========
const WORLD_SIZE = 6000;
let camera = { x: 0, y: 0 };

// ========== ИГРОК ==========
let player = {
    name: 'Танкист',
    x: WORLD_SIZE / 2,
    y: WORLD_SIZE / 2,
    radius: 20,
    hp: 100,
    maxHp: 100,
    level: 1,
    exp: 0,
    statPoints: 0,
    class: 'basic',
    damage: 12,
    reload: 0.8,
    speed: 4,
    lastShot: 0,
    angle: 0,
    invincible: 0
};

// ========== ПОЛИГОНЫ (ФИГУРЫ) ==========
let polygons = [];
const POLYGON_COUNT = 50;

// Цвета и размеры: пентагон в 2.5 раза больше квадрата
const POLYGON_TYPES = {
    square: {
        name: 'Квадрат', hp: 10, maxHp: 10, xp: 10,
        radius: 12, color: '#4CAF50', bodyDamage: 8
    },
    triangle: {
        name: 'Треугольник', hp: 30, maxHp: 30, xp: 25,
        radius: 15, color: '#FF69B4', bodyDamage: 8
    },
    pentagon: {
        name: 'Пентагон', hp: 100, maxHp: 100, xp: 130,
        radius: 32, color: '#8B5CF6', bodyDamage: 12  // в 2.5 раза больше квадрата (12*2.5=30 ≈32)
    }
};

// Спрайты полигонов
const polygonSprites = {
    square: null,
    triangle: null,
    pentagon: null
};

function loadPolygonSprites() {
    polygonSprites.square = new Image();
    polygonSprites.square.src = 'assets/polygons/square.png';
    
    polygonSprites.triangle = new Image();
    polygonSprites.triangle.src = 'assets/polygons/triangle.png';
    
    polygonSprites.pentagon = new Image();
    polygonSprites.pentagon.src = 'assets/polygons/pentagon.png';
}

function spawnPolygon(type, x, y) {
    const data = POLYGON_TYPES[type];
    polygons.push({
        type: type,
        x: x || Math.random() * WORLD_SIZE,
        y: y || Math.random() * WORLD_SIZE,
        hp: data.hp,
        maxHp: data.maxHp,
        radius: data.radius,
        xp: data.xp,
        color: data.color,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        bodyDamage: data.bodyDamage
    });
}

function spawnPolygons() {
    polygons = [];
    for (let i = 0; i < POLYGON_COUNT; i++) {
        let rand = Math.random();
        if (rand < 0.6) spawnPolygon('square');      // 60% квадраты
        else if (rand < 0.85) spawnPolygon('triangle'); // 25% треугольники
        else spawnPolygon('pentagon');                 // 15% пентагоны
    }
}

// ========== ВРАГИ ==========
let enemies = [];
let bullets = [];
let particles = [];

function spawnEnemy() {
    let side = Math.floor(Math.random() * 4);
    let x, y;
    if (side === 0) { x = Math.random() * WORLD_SIZE; y = -50; }
    else if (side === 2) { x = Math.random() * WORLD_SIZE; y = WORLD_SIZE + 50; }
    else if (side === 1) { x = WORLD_SIZE + 50; y = Math.random() * WORLD_SIZE; }
    else { x = -50; y = Math.random() * WORLD_SIZE; }
    
    enemies.push({
        x: x, y: y,
        radius: 16,
        hp: 40 + player.level * 3,
        maxHp: 40 + player.level * 3,
        damage: 10,
        speed: 1.3,
        lastShot: 0,
        color: '#cc5555'
    });
}

// ========== КЛАССЫ ТАНКОВ ==========
const CLASSES = {
    basic: { damage: 12, reload: 0.8, bulletSpeed: 9, bulletRadius: 6, bulletCount: 1, bulletColor: '#ffaa66' },
    machine: { damage: 7, reload: 0.25, bulletSpeed: 10, bulletRadius: 5, bulletCount: 1, bulletColor: '#ffcc44' },
    destroyer: { damage: 45, reload: 2.0, bulletSpeed: 8, bulletRadius: 14, bulletCount: 1, bulletColor: '#ff6644' },
    sniper: { damage: 30, reload: 1.5, bulletSpeed: 14, bulletRadius: 7, bulletCount: 1, bulletColor: '#ff8888' }
};

function applyClassStats() {
    const c = CLASSES[player.class];
    if (!c) return;
    player.damage = c.damage;
    player.reload = c.reload;
    player.bulletSpeed = c.bulletSpeed;
    player.bulletRadius = c.bulletRadius;
    player.bulletCount = c.bulletCount;
    player.bulletColor = c.bulletColor;
}

// ========== СТРЕЛЬБА ==========
function shoot() {
    const now = Date.now() / 1000;
    if (now - player.lastShot < player.reload) return;
    player.lastShot = now;
    
    for (let i = 0; i < player.bulletCount; i++) {
        let angle = player.angle + (i - (player.bulletCount-1)/2) * 0.1;
        bullets.push({
            x: player.x + Math.cos(player.angle) * (player.radius + 8),
            y: player.y + Math.sin(player.angle) * (player.radius + 8),
            vx: Math.cos(angle) * player.bulletSpeed,
            vy: Math.sin(angle) * player.bulletSpeed,
            radius: player.bulletRadius,
            damage: player.damage,
            color: player.bulletColor
        });
    }
}

// ========== УПРАВЛЕНИЕ ==========
let mouseX = player.x, mouseY = player.y;
let isShooting = false;

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    let canvasX = (e.clientX - rect.left) * (width / rect.width);
    let canvasY = (e.clientY - rect.top) * (height / rect.height);
    mouseX = camera.x + canvasX;
    mouseY = camera.y + canvasY;
    mouseX = Math.min(Math.max(mouseX, 0), WORLD_SIZE);
    mouseY = Math.min(Math.max(mouseY, 0), WORLD_SIZE);
});

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0 || e.button === 2) {
        isShooting = true;
        e.preventDefault();
    }
});
canvas.addEventListener('mouseup', () => { isShooting = false; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

function handleInput() {
    player.angle = Math.atan2(mouseY - player.y, mouseX - player.x);
    if (isShooting) shoot();
    
    let dx = mouseX - player.x;
    let dy = mouseY - player.y;
    let dist = Math.hypot(dx, dy);
    if (dist > 35) {
        let move = Math.min(player.speed, dist - 30);
        let ang = Math.atan2(dy, dx);
        player.x += Math.cos(ang) * move;
        player.y += Math.sin(ang) * move;
    }
    
    player.x = Math.min(Math.max(player.x, player.radius), WORLD_SIZE - player.radius);
    player.y = Math.min(Math.max(player.y, player.radius), WORLD_SIZE - player.radius);
    if (player.invincible > 0) player.invincible--;
}

// ========== СТОЛКНОВЕНИЯ ПУЛЬ С ПОЛИГОНАМИ ==========
function updateBullets() {
    for (let i = 0; i < bullets.length; i++) {
        let b = bullets[i];
        b.x += b.vx;
        b.y += b.vy;
        
        if (b.x < -100 || b.x > WORLD_SIZE + 100 || b.y < -100 || b.y > WORLD_SIZE + 100) {
            bullets.splice(i, 1);
            i--;
            continue;
        }
        
        let hit = false;
        // Попадание в полигоны
        for (let j = 0; j < polygons.length; j++) {
            let p = polygons[j];
            let dist = Math.hypot(b.x - p.x, b.y - p.y);
            if (dist < b.radius + p.radius) {
                p.hp -= b.damage;
                hit = true;
                addParticle(p.x, p.y, '#ffaa66');
                
                if (p.hp <= 0) {
                    // Награда за уничтожение полигона
                    gainExp(p.xp);
                    polygons.splice(j, 1);
                    // Возрождаем полигон
                    let rand = Math.random();
                    if (rand < 0.6) spawnPolygon('square');
                    else if (rand < 0.85) spawnPolygon('triangle');
                    else spawnPolygon('pentagon');
                    j--;
                }
                break;
            }
        }
        
        // Попадание во врагов
        for (let j = 0; j < enemies.length; j++) {
            let e = enemies[j];
            let dist = Math.hypot(b.x - e.x, b.y - e.y);
            if (dist < b.radius + e.radius) {
                e.hp -= b.damage;
                hit = true;
                addParticle(e.x, e.y, '#ff8888');
                if (e.hp <= 0) {
                    gainExp(30);
                    enemies.splice(j, 1);
                    spawnEnemy();
                    j--;
                }
                break;
            }
        }
        
        if (hit) {
            bullets.splice(i, 1);
            i--;
        }
    }
}

// ========== ВРАГИ АТАКУЮТ ==========
function updateEnemies() {
    for (let e of enemies) {
        let dx = player.x - e.x;
        let dy = player.y - e.y;
        let dist = Math.hypot(dx, dy);
        if (dist > 5) {
            let ang = Math.atan2(dy, dx);
            e.x += Math.cos(ang) * e.speed;
            e.y += Math.sin(ang) * e.speed;
        }
        
        // Стрельба врагов
        const now = Date.now() / 1000;
        if (dist < 400 && now - e.lastShot > 1.2) {
            e.lastShot = now;
            let angle = Math.atan2(player.y - e.y, player.x - e.x);
            bullets.push({
                x: e.x + Math.cos(angle) * e.radius,
                y: e.y + Math.sin(angle) * e.radius,
                vx: Math.cos(angle) * 6,
                vy: Math.sin(angle) * 6,
                radius: 5,
                damage: 8,
                color: '#ff8866'
            });
        }
        
        let d = Math.hypot(player.x - e.x, player.y - e.y);
        if (d < player.radius + e.radius && player.invincible <= 0) {
            player.hp -= e.damage;
            player.invincible = 20;
            updateUI();
            addParticle(player.x, player.y, '#ff4444');
            if (player.hp <= 0) {
                alert(`💀 ${player.name} уничтожен! Перезапуск...`);
                initGame();
            }
        }
    }
}

// ========== ОПЫТ И УРОВНИ ==========
function gainExp(amount) {
    player.exp += amount;
    let expNeeded = player.level * 50;
    if (player.exp >= expNeeded) {
        player.level++;
        player.exp -= expNeeded;
        player.statPoints += 3;
        player.maxHp += 15;
        player.hp = player.maxHp;
        updateUI();
        for (let i = 0; i < 20; i++) {
            addParticle(player.x + (Math.random() - 0.5) * 50, player.y + (Math.random() - 0.5) * 50, '#ffaa44');
        }
    }
}

// ========== ПРОКАЧКА ==========
function upgradeStat(stat) {
    if (player.statPoints <= 0) return;
    switch(stat) {
        case 'damage': player.damage += 2; break;
        case 'reload': player.reload = Math.max(0.15, player.reload - 0.08); break;
        case 'speed': player.speed = Math.min(9, player.speed + 0.3); break;
        case 'maxHp': player.maxHp += 10; player.hp += 10; break;
    }
    player.statPoints--;
    updateUI();
}

function changeClass(className) {
    if (!CLASSES[className]) return;
    player.class = className;
    applyClassStats();
    updateUI();
    addParticle(player.x, player.y, '#88ffaa');
}

function updateUI() {
    document.getElementById('playerName').innerText = player.name;
    document.getElementById('level').innerText = player.level;
    document.getElementById('hp').innerText = Math.floor(player.hp);
    document.getElementById('damageStat').innerText = player.damage;
    document.getElementById('reloadStat').innerText = player.reload.toFixed(2);
    document.getElementById('statPoints').innerHTML = ` (🔧 ${player.statPoints} очков)`;
}

// ========== ЭФФЕКТЫ ==========
function addParticle(x, y, color) {
    for (let i = 0; i < 5; i++) {
        particles.push({
            x: x + (Math.random() - 0.5) * 10,
            y: y + (Math.random() - 0.5) * 10,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3 - 1,
            life: 0.7,
            color: color
        });
    }
}

function updateParticles() {
    for (let i = 0; i < particles.length; i++) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

// ========== КАМЕРА ==========
function updateCamera() {
    camera.x = player.x - width / 2;
    camera.y = player.y - height / 2;
    camera.x = Math.min(Math.max(camera.x, 0), WORLD_SIZE - width);
    camera.y = Math.min(Math.max(camera.y, 0), WORLD_SIZE - height);
}

// ========== ОТРИСОВКА ==========
function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#1a2a2a';
    ctx.fillRect(0, 0, width, height);
    
    // Полигоны (с использованием спрайтов)
    for (let p of polygons) {
        let screenX = p.x - camera.x;
        let screenY = p.y - camera.y;
        const img = polygonSprites[p.type];
        
        if (img && img.complete && img.naturalWidth > 0) {
            const size = p.radius * 2;
            ctx.drawImage(img, screenX - p.radius, screenY - p.radius, size, size);
        } else {
            // Запасной вариант (цветные фигуры)
            ctx.fillStyle = p.color;
            if (p.type === 'square') {
                ctx.fillRect(screenX - p.radius, screenY - p.radius, p.radius*2, p.radius*2);
            } else if (p.type === 'triangle') {
                ctx.beginPath();
                ctx.moveTo(screenX, screenY - p.radius);
                ctx.lineTo(screenX - p.radius, screenY + p.radius);
                ctx.lineTo(screenX + p.radius, screenY + p.radius);
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.arc(screenX, screenY, p.radius, 0, Math.PI*2);
                ctx.fill();
            }
        }
        
        // Полоска HP
        let percent = p.hp / p.maxHp;
        ctx.fillStyle = '#aa4444';
        ctx.fillRect(screenX - p.radius - 2, screenY - p.radius - 8, p.radius*2 + 4, 4);
        ctx.fillStyle = '#44aa44';
        ctx.fillRect(screenX - p.radius - 2, screenY - p.radius - 8, (p.radius*2 + 4) * percent, 4);
    }
    
    // Враги
    for (let e of enemies) {
        let screenX = e.x - camera.x;
        let screenY = e.y - camera.y;
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(screenX, screenY, e.radius, 0, Math.PI*2);
        ctx.fill();
        let percent = e.hp / e.maxHp;
        ctx.fillStyle = '#aa4444';
        ctx.fillRect(screenX - 15, screenY - 20, 30, 5);
        ctx.fillStyle = '#44aa44';
        ctx.fillRect(screenX - 15, screenY - 20, 30 * percent, 5);
    }
    
    // Пули
    for (let b of bullets) {
        let screenX = b.x - camera.x;
        let screenY = b.y - camera.y;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(screenX, screenY, b.radius - 2, 0, Math.PI*2);
        ctx.fill();
    }
    
    // Игрок
    let screenX = player.x - camera.x;
    let screenY = player.y - camera.y;
    ctx.fillStyle = '#44aa88';
    ctx.beginPath();
    ctx.arc(screenX, screenY, player.radius, 0, Math.PI*2);
    ctx.fill();
    
    // Пушка
    let barrelX = player.x + Math.cos(player.angle) * player.radius;
    let barrelY = player.y + Math.sin(player.angle) * player.radius;
    ctx.beginPath();
    ctx.moveTo(screenX, screenY);
    ctx.lineTo(barrelX - camera.x, barrelY - camera.y);
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#ccaa66';
    ctx.stroke();
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(player.name, screenX - 25, screenY - 18);
    ctx.fillStyle = '#ffaa66';
    ctx.fillText(`Lv.${player.level}`, screenX - 15, screenY - 28);
    
    let hpPercent = player.hp / player.maxHp;
    ctx.fillStyle = '#8a3a3a';
    ctx.fillRect(screenX - 25, screenY - 35, 50, 6);
    ctx.fillStyle = '#ffaa44';
    ctx.fillRect(screenX - 25, screenY - 35, 50 * hpPercent, 6);
    
    // Частицы
    for (let p of particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x - camera.x, p.y - camera.y, 3, 0, Math.PI*2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
function initGame() {
    player.x = WORLD_SIZE / 2;
    player.y = WORLD_SIZE / 2;
    player.hp = player.maxHp;
    player.level = 1;
    player.exp = 0;
    player.statPoints = 0;
    player.class = 'basic';
    applyClassStats();
    
    enemies = [];
    bullets = [];
    particles = [];
    spawnPolygons();
    for (let i = 0; i < 8; i++) spawnEnemy();
    updateUI();
}

// ========== ЦИКЛ ==========
function update() {
    handleInput();
    updateBullets();
    updateEnemies();
    updateParticles();
    updateCamera();
    draw();
}

function gameLoop() {
    if (!gameRunning) return;
    update();
    requestAnimationFrame(gameLoop);
}

// ========== РАЗМЕР ЭКРАНА ==========
function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}
window.addEventListener('resize', resize);

// ========== ЗАПУСК ==========
document.getElementById('playBtn').addEventListener('click', () => {
    let nick = document.getElementById('nickInput').value.trim();
    if (nick) player.name = nick;
    document.getElementById('menu').style.display = 'none';
    document.getElementById('gameUI').style.display = 'block';
    document.getElementById('upgradePanel').style.display = 'flex';
    document.getElementById('classPanel').style.display = 'flex';
    
    resize();
    loadPolygonSprites();
    initGame();
    gameRunning = true;
    gameLoop();
});

document.querySelectorAll('.upgrade-btn').forEach(btn => {
    btn.addEventListener('click', () => upgradeStat(btn.dataset.stat));
});

document.querySelectorAll('.class-btn').forEach(btn => {
    btn.addEventListener('click', () => changeClass(btn.dataset.class));
});
