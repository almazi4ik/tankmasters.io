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
    bulletSpeed: 9,
    bulletRadius: 6,
    bulletCount: 1,
    speed: 4,
    penetration: 1,
    lastShot: 0,
    angle: 0,
    invincible: 0
};

// ========== УПРАВЛЕНИЕ (ДЖОЙСТИКИ) ==========
let moveDirection = { x: 0, y: 0 };
let shootDirection = { x: 1, y: 0 };
let isShooting = false;

// Левая джойстик (движение)
const moveJoystick = document.getElementById('joystickMove');
const moveThumb = document.getElementById('moveThumb');
let moveActive = false;
let moveCenter = { x: 0, y: 0 };

// Правая джойстик (стрельба)
const shootJoystick = document.getElementById('joystickShoot');
const shootThumb = document.getElementById('shootThumb');
let shootActive = false;
let shootCenter = { x: 0, y: 0 };

function initJoysticks() {
    // Левая джойстик
    moveJoystick.addEventListener('touchstart', (e) => {
        e.preventDefault();
        moveActive = true;
        const rect = moveJoystick.getBoundingClientRect();
        moveCenter.x = rect.left + rect.width/2;
        moveCenter.y = rect.top + rect.height/2;
        updateMoveThumb(e.touches[0]);
    });
    
    moveJoystick.addEventListener('touchmove', (e) => {
        e.preventDefault();
        updateMoveThumb(e.touches[0]);
    });
    
    moveJoystick.addEventListener('touchend', () => {
        moveActive = false;
        moveDirection = { x: 0, y: 0 };
        moveThumb.style.transform = `translate(0px, 0px)`;
    });
    
    // Правая джойстик
    shootJoystick.addEventListener('touchstart', (e) => {
        e.preventDefault();
        shootActive = true;
        isShooting = true;
        const rect = shootJoystick.getBoundingClientRect();
        shootCenter.x = rect.left + rect.width/2;
        shootCenter.y = rect.top + rect.height/2;
        updateShootThumb(e.touches[0]);
    });
    
    shootJoystick.addEventListener('touchmove', (e) => {
        e.preventDefault();
        updateShootThumb(e.touches[0]);
    });
    
    shootJoystick.addEventListener('touchend', () => {
        shootActive = false;
        isShooting = false;
        shootDirection = { x: 1, y: 0 };
        shootThumb.style.transform = `translate(0px, 0px)`;
    });
}

function updateMoveThumb(touch) {
    const rect = moveJoystick.getBoundingClientRect();
    const centerX = rect.left + rect.width/2;
    const centerY = rect.top + rect.height/2;
    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;
    const maxDist = rect.width/2 - 30;
    const dist = Math.hypot(dx, dy);
    if (dist > maxDist) {
        dx = dx / dist * maxDist;
        dy = dy / dist * maxDist;
    }
    moveThumb.style.transform = `translate(${dx}px, ${dy}px)`;
    moveDirection.x = dx / maxDist;
    moveDirection.y = dy / maxDist;
}

function updateShootThumb(touch) {
    const rect = shootJoystick.getBoundingClientRect();
    const centerX = rect.left + rect.width/2;
    const centerY = rect.top + rect.height/2;
    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;
    const maxDist = rect.width/2 - 30;
    const dist = Math.hypot(dx, dy);
    if (dist > maxDist) {
        dx = dx / dist * maxDist;
        dy = dy / dist * maxDist;
    }
    shootThumb.style.transform = `translate(${dx}px, ${dy}px)`;
    if (dist > 5) {
        shootDirection.x = dx / maxDist;
        shootDirection.y = dy / maxDist;
    }
}

// ========== ПОЛИГОНЫ ==========
let polygons = [];
const POLYGON_COUNT = 50;

const POLYGON_TYPES = {
    square: { name: 'Квадрат', hp: 10, maxHp: 10, xp: 10, radius: 12, color: '#4CAF50' },
    triangle: { name: 'Треугольник', hp: 30, maxHp: 30, xp: 25, radius: 15, color: '#FF69B4' },
    pentagon: { name: 'Пентагон', hp: 100, maxHp: 100, xp: 130, radius: 32, color: '#8B5CF6' }
};

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
        vy: (Math.random() - 0.5) * 0.5
    });
}

function spawnPolygons() {
    polygons = [];
    for (let i = 0; i < POLYGON_COUNT; i++) {
        let rand = Math.random();
        if (rand < 0.6) spawnPolygon('square');
        else if (rand < 0.85) spawnPolygon('triangle');
        else spawnPolygon('pentagon');
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
        x, y, radius: 16,
        hp: 40 + player.level * 3,
        maxHp: 40 + player.level * 3,
        damage: 10, speed: 1.3, lastShot: 0, color: '#cc5555'
    });
}

// ========== КЛАССЫ ТАНКОВ ==========
const CLASSES = {
    basic: { damage: 12, reload: 0.8, bulletSpeed: 9, bulletRadius: 6, bulletCount: 1, bulletColor: '#ffaa66' },
    twin: { damage: 10, reload: 0.5, bulletSpeed: 9, bulletRadius: 5, bulletCount: 2, bulletColor: '#ffaa66' },
    sniper: { damage: 35, reload: 1.5, bulletSpeed: 14, bulletRadius: 7, bulletCount: 1, bulletColor: '#ff8888' }
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
    
    const angle = Math.atan2(shootDirection.y, shootDirection.x);
    
    for (let i = 0; i < player.bulletCount; i++) {
        let spread = (i - (player.bulletCount-1)/2) * 0.1;
        let bulletAngle = angle + spread;
        bullets.push({
            x: player.x + Math.cos(angle) * (player.radius + 8),
            y: player.y + Math.sin(angle) * (player.radius + 8),
            vx: Math.cos(bulletAngle) * player.bulletSpeed,
            vy: Math.sin(bulletAngle) * player.bulletSpeed,
            radius: player.bulletRadius,
            damage: player.damage,
            color: player.bulletColor
        });
    }
}

// ========== ДВИЖЕНИЕ ==========
function handleInput() {
    // Движение от джойстика
    if (moveActive && (moveDirection.x !== 0 || moveDirection.y !== 0)) {
        player.x += moveDirection.x * player.speed;
        player.y += moveDirection.y * player.speed;
    }
    
    // Стрельба
    if (isShooting) shoot();
    
    // Угол поворота пушки (по правому джойстику)
    if (shootActive && (shootDirection.x !== 0 || shootDirection.y !== 0)) {
        player.angle = Math.atan2(shootDirection.y, shootDirection.x);
    } else if (moveActive && (moveDirection.x !== 0 || moveDirection.y !== 0)) {
        player.angle = Math.atan2(moveDirection.y, moveDirection.x);
    }
    
    // Границы мира
    player.x = Math.min(Math.max(player.x, player.radius), WORLD_SIZE - player.radius);
    player.y = Math.min(Math.max(player.y, player.radius), WORLD_SIZE - player.radius);
    if (player.invincible > 0) player.invincible--;
}

// ========== СТОЛКНОВЕНИЯ ==========
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
            if (Math.hypot(b.x - p.x, b.y - p.y) < b.radius + p.radius) {
                p.hp -= b.damage * player.penetration;
                hit = true;
                addParticle(p.x, p.y, '#ffaa66');
                if (p.hp <= 0) {
                    gainExp(p.xp);
                    polygons.splice(j, 1);
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
            if (Math.hypot(b.x - e.x, b.y - e.y) < b.radius + e.radius) {
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
        
        const now = Date.now() / 1000;
        if (dist < 400 && now - e.lastShot > 1.2) {
            e.lastShot = now;
            let angle = Math.atan2(player.y - e.y, player.x - e.x);
            bullets.push({
                x: e.x + Math.cos(angle) * e.radius,
                y: e.y + Math.sin(angle) * e.radius,
                vx: Math.cos(angle) * 6,
                vy: Math.sin(angle) * 6,
                radius: 5, damage: 8, color: '#ff8866'
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
        case 'penetration': player.penetration += 0.5; break;
        case 'maxHp': player.maxHp += 10; player.hp += 10; break;
    }
    player.statPoints--;
    updateUI();
}

function updateUI() {
    document.getElementById('levelValue').innerHTML = player.level;
    document.getElementById('hpValue').innerHTML = Math.floor(player.hp);
    document.getElementById('damageStat').innerHTML = player.damage;
    document.getElementById('reloadStat').innerHTML = player.reload.toFixed(2);
    document.getElementById('skillPointsDisplay').innerHTML = `🔧 Очки: ${player.statPoints}`;
    
    // Таблица лидеров (простая версия)
    const leaderboardDiv = document.getElementById('leaderboardList');
    leaderboardDiv.innerHTML = `1. ${player.name} — ${player.exp} XP`;
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
            color
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

// ========== МИНИ-КАРТА ==========
const minimapCanvas = document.getElementById('minimapCanvas');
const minimapCtx = minimapCanvas.getContext('2d');
const MINIMAP_SIZE = 120;

function drawMinimap() {
    minimapCtx.fillStyle = 'rgba(0,0,0,0.7)';
    minimapCtx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
    
    // Масштабирование
    const scale = MINIMAP_SIZE / WORLD_SIZE;
    
    // Полигоны на мини-карте
    for (let p of polygons) {
        minimapCtx.fillStyle = p.color;
        minimapCtx.fillRect(p.x * scale - 2, p.y * scale - 2, 4, 4);
    }
    
    // Враги
    for (let e of enemies) {
        minimapCtx.fillStyle = '#ff6666';
        minimapCtx.fillRect(e.x * scale - 2, e.y * scale - 2, 4, 4);
    }
    
    // Игрок
    minimapCtx.fillStyle = '#00B2E1';
    minimapCtx.beginPath();
    minimapCtx.arc(player.x * scale, player.y * scale, 4, 0, Math.PI*2);
    minimapCtx.fill();
    
    // Обводка
    minimapCtx.strokeStyle = '#ffaa44';
    minimapCtx.lineWidth = 2;
    minimapCtx.strokeRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
}

// ========== ОТРИСОВКА ==========
function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#1a2a2a';
    ctx.fillRect(0, 0, width, height);
    
    // Полигоны
    for (let p of polygons) {
        let screenX = p.x - camera.x;
        let screenY = p.y - camera.y;
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
    ctx.fillStyle = '#00B2E1';
    ctx.beginPath();
    ctx.arc(screenX, screenY, player.radius, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = '#0088AA';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Пушка
    let barrelX = player.x + Math.cos(player.angle) * player.radius;
    let barrelY = player.y + Math.sin(player.angle) * player.radius;
    ctx.beginPath();
    ctx.moveTo(screenX, screenY);
    ctx.lineTo(barrelX - camera.x, barrelY - camera.y);
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#888888';
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
    
    // Мини-карта
    drawMinimap();
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
    minimapCanvas.width = MINIMAP_SIZE;
    minimapCanvas.height = MINIMAP_SIZE;
}
window.addEventListener('resize', resize);

// ========== ЗАПУСК ==========
document.getElementById('playBtn').addEventListener('click', () => {
    let nick = document.getElementById('nickInput').value.trim();
    if (nick) player.name = nick;
    document.getElementById('menu').style.display = 'none';
    document.getElementById('joystickMove').style.display = 'block';
    document.getElementById('joystickShoot').style.display = 'block';
    document.getElementById('upgradePanel').style.display = 'flex';
    document.getElementById('skillPointsDisplay').style.display = 'block';
    document.getElementById('statsPanel').style.display = 'block';
    document.getElementById('leaderboard').style.display = 'block';
    document.getElementById('minimap').style.display = 'block';
    
    resize();
    initJoysticks();
    initGame();
    gameRunning = true;
    gameLoop();
});

document.querySelectorAll('.upgrade-btn').forEach(btn => {
    btn.addEventListener('click', () => upgradeStat(btn.dataset.stat));
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        upgradeStat(btn.dataset.stat);
    });
});
