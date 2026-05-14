const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let width, height;
let animationId;
let gameRunning = false;

// ========== НАСТРОЙКИ МИРА ==========
const WORLD_SIZE = 6000;
let camera = { x: 0, y: 0 };

// ========== ИГРОК ==========
let player = {
    id: 'local',
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
    
    // Характеристики
    damage: 12,
    reload: 0.8,      // секунд между выстрелами
    penetration: 1,    // сколько врагов пробивает
    speed: 4,
    
    // Состояния
    lastShot: 0,
    angle: 0,
    invincible: 0
};

// ========== ВРАГИ (боты) ==========
let enemies = [];
let bullets = [];
let particles = [];

// ========== ВСЕ ПУШКИ / КЛАССЫ ==========
const CLASSES = {
    basic: {
        name: 'Базовый',
        damage: 12,
        reload: 0.8,
        penetration: 1,
        bulletSpeed: 8,
        bulletRadius: 6,
        bulletColor: '#ffaa66',
        bulletCount: 1,
        bulletSpread: 0,
        special: null
    },
    sniper: {
        name: 'Снайпер',
        damage: 35,
        reload: 1.8,
        penetration: 3,
        bulletSpeed: 14,
        bulletRadius: 8,
        bulletColor: '#ff6644',
        bulletCount: 1,
        bulletSpread: 0,
        special: 'дальний выстрел'
    },
    machine: {
        name: 'Пулемёт',
        damage: 7,
        reload: 0.2,
        penetration: 1,
        bulletSpeed: 10,
        bulletRadius: 5,
        bulletColor: '#ffcc44',
        bulletCount: 1,
        bulletSpread: 0.1,
        special: 'высокая скорострельность'
    },
    destroyer: {
        name: 'Разрушитель',
        damage: 55,
        reload: 2.2,
        penetration: 5,
        bulletSpeed: 9,
        bulletRadius: 14,
        bulletColor: '#ff4444',
        bulletCount: 1,
        bulletSpread: 0,
        special: 'огромный урон'
    },
    gunner: {
        name: 'Ганнер',
        damage: 9,
        reload: 0.35,
        penetration: 2,
        bulletSpeed: 11,
        bulletRadius: 5,
        bulletColor: '#88ff88',
        bulletCount: 2,
        bulletSpread: 0.15,
        special: 'двойной выстрел'
    },
    flamethrower: {
        name: 'Огнемёт',
        damage: 4,
        reload: 0.05,
        penetration: 1,
        bulletSpeed: 6,
        bulletRadius: 7,
        bulletColor: '#ff8844',
        bulletCount: 1,
        bulletSpread: 0.2,
        special: 'огонь + задержка'
    },
    laser: {
        name: 'Лазер',
        damage: 22,
        reload: 0.9,
        penetration: 4,
        bulletSpeed: 22,
        bulletRadius: 4,
        bulletColor: '#44ffff',
        bulletCount: 1,
        bulletSpread: 0,
        special: 'мгновенная скорость'
    },
    rocket: {
        name: 'Ракетчик',
        damage: 40,
        reload: 1.5,
        penetration: 2,
        bulletSpeed: 7,
        bulletRadius: 12,
        bulletColor: '#ff8866',
        bulletCount: 1,
        bulletSpread: 0,
        special: 'взрыв (эффект)'
    },
    drone: {
        name: 'Дроновод',
        damage: 10,
        reload: 0.6,
        penetration: 1,
        bulletSpeed: 5,
        bulletRadius: 6,
        bulletColor: '#88aaff',
        bulletCount: 3,
        bulletSpread: 0.3,
        special: '3 дрона'
    },
    healer: {
        name: 'Лекарь',
        damage: 6,
        reload: 0.7,
        penetration: 1,
        bulletSpeed: 9,
        bulletRadius: 6,
        bulletColor: '#88ffaa',
        bulletCount: 1,
        bulletSpread: 0,
        special: 'лечит союзников'
    }
};

// ========== ОБНОВЛЕНИЕ СТАТОВ ПРИ СМЕНЕ КЛАССА ==========
function applyClassStats() {
    const c = CLASSES[player.class];
    if (!c) return;
    player.damage = c.damage;
    player.reload = c.reload;
    player.penetration = c.penetration;
    // Скорость пули и радиус для визуала
    player.bulletSpeed = c.bulletSpeed;
    player.bulletRadius = c.bulletRadius;
    player.bulletColor = c.bulletColor;
    player.bulletCount = c.bulletCount;
    player.bulletSpread = c.bulletSpread;
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
    
    // Создаём врагов
    for (let i = 0; i < 15; i++) {
        spawnEnemy();
    }
    
    updateUI();
}

function spawnEnemy() {
    let side = Math.floor(Math.random() * 4);
    let x, y;
    if (side === 0) { x = Math.random() * WORLD_SIZE; y = -50; }
    else if (side === 2) { x = Math.random() * WORLD_SIZE; y = WORLD_SIZE + 50; }
    else if (side === 1) { x = WORLD_SIZE + 50; y = Math.random() * WORLD_SIZE; }
    else { x = -50; y = Math.random() * WORLD_SIZE; }
    
    let types = ['basictank', 'snipertank', 'machinegun', 'fasttank'];
    enemies.push({
        x: x, y: y,
        radius: 18,
        hp: 40 + player.level * 5,
        maxHp: 40 + player.level * 5,
        damage: 10,
        speed: 1.5,
        type: types[Math.floor(Math.random() * types.length)],
        angle: Math.random() * Math.PI * 2,
        lastShot: 0
    });
}

// ========== СТРЕЛЬБА ==========
function shoot() {
    const now = Date.now() / 1000;
    if (now - player.lastShot < player.reload) return;
    player.lastShot = now;
    
    const bulletSpeed = player.bulletSpeed || 9;
    const bulletRadius = player.bulletRadius || 6;
    
    for (let i = 0; i < (player.bulletCount || 1); i++) {
        let spread = (player.bulletSpread || 0) * (i - (player.bulletCount-1)/2);
        let angle = player.angle + spread;
        
        bullets.push({
            x: player.x + Math.cos(player.angle) * (player.radius + 8),
            y: player.y + Math.sin(player.angle) * (player.radius + 8),
            vx: Math.cos(angle) * bulletSpeed,
            vy: Math.sin(angle) * bulletSpeed,
            radius: bulletRadius,
            damage: player.damage,
            penetration: player.penetration,
            hitsLeft: player.penetration,
            color: player.bulletColor || '#ffaa66'
        });
    }
}

// ========== ДВИЖЕНИЕ ==========
let mouseX = player.x, mouseY = player.y;
let isShooting = false;

function handleInput() {
    // Обновляем угол игрока к мыши
    player.angle = Math.atan2(mouseY - player.y, mouseX - player.x);
    
    // Стрельба
    if (isShooting) shoot();
    
    // Движение к мыши (но не вплотную — держим дистанцию)
    let dx = mouseX - player.x;
    let dy = mouseY - player.y;
    let dist = Math.hypot(dx, dy);
    if (dist > 30) {
        let move = Math.min(player.speed, dist - 25);
        let ang = Math.atan2(dy, dx);
        player.x += Math.cos(ang) * move;
        player.y += Math.sin(ang) * move;
    }
    
    // Границы мира
    player.x = Math.min(Math.max(player.x, player.radius), WORLD_SIZE - player.radius);
    player.y = Math.min(Math.max(player.y, player.radius), WORLD_SIZE - player.radius);
    
    if (player.invincible > 0) player.invincible--;
}

// ========== ОБНОВЛЕНИЕ ПУЛЬ ==========
function updateBullets() {
    for (let i = 0; i < bullets.length; i++) {
        let b = bullets[i];
        b.x += b.vx;
        b.y += b.vy;
        
        // Проверка границ
        if (b.x < -100 || b.x > WORLD_SIZE + 100 || b.y < -100 || b.y > WORLD_SIZE + 100) {
            bullets.splice(i, 1);
            i--;
            continue;
        }
        
        let hit = false;
        // Попадание во врагов
        for (let j = 0; j < enemies.length; j++) {
            let e = enemies[j];
            let dist = Math.hypot(b.x - e.x, b.y - e.y);
            if (dist < b.radius + e.radius) {
                e.hp -= b.damage;
                hit = true;
                b.hitsLeft--;
                
                // Эффект попадания
                addParticle(e.x, e.y, '#ffaa66');
                
                if (e.hp <= 0) {
                    gainExp(20);
                    enemies.splice(j, 1);
                    spawnEnemy();
                    j--;
                }
                
                if (b.hitsLeft <= 0) break;
            }
        }
        
        if (hit && b.hitsLeft <= 0) {
            bullets.splice(i, 1);
            i--;
        }
    }
}

// ========== ДВИЖЕНИЕ ВРАГОВ ==========
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
            let bulletAngle = Math.atan2(player.y - e.y, player.x - e.x);
            bullets.push({
                x: e.x + Math.cos(bulletAngle) * e.radius,
                y: e.y + Math.sin(bulletAngle) * e.radius,
                vx: Math.cos(bulletAngle) * 6,
                vy: Math.sin(bulletAngle) * 6,
                radius: 5,
                damage: 8,
                penetration: 1,
                hitsLeft: 1,
                color: '#ff8866',
                isEnemy: true
            });
        }
        
        // Урон игроку
        let d = Math.hypot(player.x - e.x, player.y - e.y);
        if (d < player.radius + e.radius && player.invincible <= 0) {
            player.hp -= e.damage;
            player.invincible = 25;
            updateUI();
            addParticle(player.x, player.y, '#ff4444');
            
            if (player.hp <= 0) {
                alert(`💀 ${player.name} уничтожен! Перезапуск...`);
                initGame();
            }
        }
    }
}

// ========== ПОЛУЧЕНИЕ ОПЫТА ==========
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
        
        // Эффект уровня
        for (let i = 0; i < 30; i++) {
            addParticle(player.x + (Math.random() - 0.5) * 50, player.y + (Math.random() - 0.5) * 50, '#ffaa44');
        }
    }
}

// ========== ПРОКАЧКА ХАРАКТЕРИСТИК ==========
function upgradeStat(stat) {
    if (player.statPoints <= 0) return;
    
    switch(stat) {
        case 'damage':
            player.damage += 2;
            player.statPoints--;
            break;
        case 'reload':
            player.reload = Math.max(0.15, player.reload - 0.08);
            player.statPoints--;
            break;
        case 'penetration':
            player.penetration++;
            player.statPoints--;
            break;
        case 'speed':
            player.speed = Math.min(9, player.speed + 0.3);
            player.statPoints--;
            break;
        case 'maxHp':
            player.maxHp += 10;
            player.hp += 10;
            player.statPoints--;
            break;
    }
    updateUI();
}

// ========== СМЕНА КЛАССА ==========
function changeClass(className) {
    if (!CLASSES[className]) return;
    player.class = className;
    applyClassStats();
    updateUI();
    
    // Визуальный эффект
    addParticle(player.x, player.y, '#88ffaa');
}

// ========== UI ==========
function updateUI() {
    document.getElementById('playerName').innerText = player.name;
    document.getElementById('level').innerText = player.level;
    document.getElementById('hp').innerText = Math.floor(player.hp);
    document.getElementById('damageStat').innerText = player.damage;
    document.getElementById('reloadStat').innerText = player.reload.toFixed(2);
    document.getElementById('penStat').innerText = player.penetration;
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
    
    // Сетка/фон
    ctx.fillStyle = '#1a2a2a';
    ctx.fillRect(0, 0, width, height);
    
    // Враги
    for (let e of enemies) {
        let screenX = e.x - camera.x;
        let screenY = e.y - camera.y;
        if (screenX + e.radius < 0 || screenX - e.radius > width ||
            screenY + e.radius < 0 || screenY - e.radius > height) continue;
        
        ctx.fillStyle = '#aa5544';
        ctx.beginPath();
        ctx.arc(screenX, screenY, e.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#cc8866';
        ctx.beginPath();
        ctx.ellipse(screenX - 5, screenY - 4, 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(screenX + 5, screenY - 4, 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // HP bar
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
        ctx.arc(screenX, screenY, b.radius - 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(screenX - 2, screenY - 2, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Игрок
    let screenX = player.x - camera.x;
    let screenY = player.y - camera.y;
    
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#44aa88';
    ctx.beginPath();
    ctx.arc(screenX, screenY, player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#88ccaa';
    ctx.beginPath();
    ctx.ellipse(screenX - 6, screenY - 5, 5, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(screenX + 6, screenY - 5, 5, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Пушка
    let barrelX = player.x + Math.cos(player.angle) * player.radius;
    let barrelY = player.y + Math.sin(player.angle) * player.radius;
    let barrellScreenX = barrelX - camera.x;
    let barrellScreenY = barrelY - camera.y;
    ctx.beginPath();
    ctx.moveTo(screenX, screenY);
    ctx.lineTo(barrellScreenX, barrellScreenY);
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#ccaa66';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(barrellScreenX, barrellScreenY, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#eecc88';
    ctx.fill();
    
    // Имя и уровень
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(player.name, screenX - 25, screenY - 18);
    ctx.fillStyle = '#ffaa66';
    ctx.font = '10px monospace';
    ctx.fillText(`Lv.${player.level}`, screenX - 15, screenY - 28);
    
    // HP игрока
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
        ctx.arc(p.x - camera.x, p.y - camera.y, 3, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
}

// ========== ОСНОВНОЙ ЦИКЛ ==========
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

// ========== РАЗМЕРЫ ЭКРАНА ==========
function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}
window.addEventListener('resize', resize);

// ========== МЫШЬ И СТРЕЛЬБА ==========
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

// ========== ЗАПУСК ИГРЫ ==========
document.getElementById('playBtn').addEventListener('click', () => {
    let nick = document.getElementById('nickInput').value.trim();
    if (nick) player.name = nick;
    document.getElementById('menu').style.display = 'none';
    document.getElementById('gameUI').style.display = 'block';
    document.getElementById('upgradePanel').style.display = 'flex';
    document.getElementById('classPanel').style.display = 'flex';
    
    resize();
    initGame();
    gameRunning = true;
    gameLoop();
});

// Кнопки улучшений
document.querySelectorAll('.upgrade-btn').forEach(btn => {
    btn.addEventListener('click', () => upgradeStat(btn.dataset.stat));
});

// Кнопки классов
document.querySelectorAll('.class-btn').forEach(btn => {
    btn.addEventListener('click', () => changeClass(btn.dataset.class));
});
