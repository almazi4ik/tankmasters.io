const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let width, height;
let gameRunning = false;
let mouseX, mouseY;
let isShooting = false;

const WORLD_SIZE = 5000;
let camera = { x: 0, y: 0 };

let enemies = [];
let bullets = [];
let particles = [];

// ========== ЗАГРУЗКА СПРАЙТОВ ==========
const tankImages = {};

function loadTankImages() {
    const tanks = ['basic', 'sniper', 'twin'];
    for (let tank of tanks) {
        const img = new Image();
        img.src = `assets/tanks/${tank}.png`;
        tankImages[tank] = img;
    }
}
loadTankImages();

// ========== ТАНКИ ==========
const TANKS = {
    basic: {
        name: 'Basic',
        level: 1,
        damage: 12,
        reload: 0.7,
        penetration: 1,
        bulletSpeed: 9,
        bulletRadius: 6,
        bulletColor: '#ffaa66',
        cannons: [{ angle: 0, length: 18, width: 6 }],
        radius: 20
    },
    sniper: {
        name: 'Sniper',
        level: 15,
        damage: 32,
        reload: 1.5,
        penetration: 3,
        bulletSpeed: 14,
        bulletRadius: 8,
        bulletColor: '#ff8866',
        cannons: [{ angle: 0, length: 32, width: 5 }],
        radius: 20,
        special: '🔭 Дальний бой'
    },
    twin: {
        name: 'Twin',
        level: 15,
        damage: 9,
        reload: 0.4,
        penetration: 1,
        bulletSpeed: 10,
        bulletRadius: 5,
        bulletColor: '#ffcc66',
        cannons: [{ angle: -0.08, length: 18, width: 6 }, { angle: 0.08, length: 18, width: 6 }],
        radius: 20,
        special: '🔫🔫 Две пушки'
    }
};

// ========== ИГРОК ==========
let player = {
    name: 'Танкист',
    x: WORLD_SIZE / 2,
    y: WORLD_SIZE / 2,
    hp: 100,
    maxHp: 100,
    level: 1,
    exp: 0,
    tankId: 'basic',
    invincible: 0,
    lastShot: 0,
    angle: 0,
    speed: 4.5,
    // Бонусы от прокачки
    damageBonus: 0,
    reloadBonus: 0,
    penetrationBonus: 0,
    speedBonus: 0,
    hpBonus: 0,
    statPoints: 0
};

function getCurrentTank() {
    return TANKS[player.tankId];
}

function getCurrentDamage() {
    return getCurrentTank().damage + player.damageBonus * 2;
}

function getCurrentReload() {
    return Math.max(0.2, getCurrentTank().reload - player.reloadBonus * 0.05);
}

function getCurrentPenetration() {
    return getCurrentTank().penetration + player.penetrationBonus;
}

function getCurrentSpeed() {
    return 4.5 + player.speedBonus * 0.3;
}

// ========== СТРЕЛЬБА ==========
function shoot() {
    const now = Date.now() / 1000;
    const tank = getCurrentTank();
    const reload = getCurrentReload();
    if (now - player.lastShot < reload) return;
    player.lastShot = now;
    
    const damage = getCurrentDamage();
    const penetration = getCurrentPenetration();
    
    for (let cannon of tank.cannons) {
        const angle = player.angle + cannon.angle;
        bullets.push({
            x: player.x + Math.cos(player.angle) * (player.radius + 8) + Math.cos(angle) * cannon.length,
            y: player.y + Math.sin(player.angle) * (player.radius + 8) + Math.sin(angle) * cannon.length,
            vx: Math.cos(angle) * tank.bulletSpeed,
            vy: Math.sin(angle) * tank.bulletSpeed,
            radius: tank.bulletRadius,
            damage: damage,
            hitsLeft: penetration,
            color: tank.bulletColor
        });
    }
}

// ========== ОПЫТ И УРОВНИ ==========
function gainExp(amount) {
    player.exp += amount;
    let expNeeded = player.level * 30;
    
    while (player.exp >= expNeeded && player.level < 15) {
        player.level++;
        player.exp -= expNeeded;
        player.maxHp += 10;
        player.hp = player.maxHp;
        player.statPoints += 3;
        
        // Эффект уровня
        for (let i = 0; i < 20; i++) {
            addParticle(player.x, player.y, '#ffaa44');
        }
        
        updateUI();
        expNeeded = player.level * 30;
    }
    
    // Проверка достижения 15 уровня
    if (player.level === 15 && player.tankId === 'basic') {
        showEvolutionChoice();
    }
    
    updateUI();
}

// ========== ОКНО ВЫБОРА КЛАССА ==========
function showEvolutionChoice() {
    const panel = document.getElementById('evolutionPanel');
    const container = document.getElementById('evolutionButtons');
    container.innerHTML = '';
    
    const choices = ['sniper', 'twin'];
    
    for (let choice of choices) {
        const tank = TANKS[choice];
        const btn = document.createElement('button');
        btn.className = 'evolution-btn';
        btn.innerHTML = `
            <div class="evo-icon">${choice === 'sniper' ? '🎯' : '🔫🔫'}</div>
            <div class="evo-name">${tank.name}</div>
            <div class="evo-desc">${tank.special}</div>
            <div class="evo-stats">⚡ урон ${tank.damage} | 🔄 ${tank.reload}с</div>
        `;
        btn.onclick = () => {
            player.tankId = choice;
            panel.style.display = 'none';
            for (let i = 0; i < 30; i++) {
                addParticle(player.x, player.y, '#ffdd88');
            }
            updateUI();
        };
        container.appendChild(btn);
    }
    
    panel.style.display = 'flex';
}

// ========== ПРОКАЧКА ==========
function upgradeStat(stat) {
    if (player.statPoints <= 0) return;
    
    switch(stat) {
        case 'damage':
            player.damageBonus++;
            player.statPoints--;
            break;
        case 'reload':
            if (player.reloadBonus < 7) {
                player.reloadBonus++;
                player.statPoints--;
            }
            break;
        case 'penetration':
            player.penetrationBonus++;
            player.statPoints--;
            break;
        case 'speed':
            if (player.speedBonus < 5) {
                player.speedBonus++;
                player.statPoints--;
            }
            break;
        case 'hp':
            player.hpBonus++;
            player.maxHp = 100 + player.hpBonus * 15;
            player.hp = player.maxHp;
            player.statPoints--;
            break;
    }
    updateUI();
}

// ========== UI ==========
function updateUI() {
    const tank = getCurrentTank();
    document.getElementById('playerName').innerText = player.name;
    document.getElementById('level').innerText = player.level;
    document.getElementById('tankName').innerText = tank.name;
    document.getElementById('hpValue').innerText = Math.floor(player.hp);
    document.getElementById('maxHpValue').innerText = player.maxHp;
    document.getElementById('statPointsSpan').innerText = player.statPoints;
    
    const hpPercent = (player.hp / player.maxHp) * 100;
    document.getElementById('hpBarFill').style.width = hpPercent + '%';
    
    const expNeeded = player.level * 30;
    const expPercent = (player.exp / expNeeded) * 100;
    document.getElementById('expBarFill').style.width = expPercent + '%';
    document.getElementById('nextLevel').innerText = player.level + 1;
}

// ========== ДВИЖЕНИЕ ==========
function movePlayer() {
    let dx = mouseX - player.x;
    let dy = mouseY - player.y;
    let dist = Math.hypot(dx, dy);
    const speed = getCurrentSpeed();
    
    if (dist > 25) {
        let move = Math.min(speed, dist - 20);
        let ang = Math.atan2(dy, dx);
        player.x += Math.cos(ang) * move;
        player.y += Math.sin(ang) * move;
    }
    
    player.x = Math.min(Math.max(player.x, 20), WORLD_SIZE - 20);
    player.y = Math.min(Math.max(player.y, 20), WORLD_SIZE - 20);
    player.angle = Math.atan2(mouseY - player.y, mouseX - player.x);
    
    if (player.invincible > 0) player.invincible--;
}

// ========== ВРАГИ ==========
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
        color: '#cc5544'
    });
}

function updateEnemies() {
    for (let i = 0; i < enemies.length; i++) {
        let e = enemies[i];
        let dx = player.x - e.x;
        let dy = player.y - e.y;
        let dist = Math.hypot(dx, dy);
        if (dist > 5) {
            let ang = Math.atan2(dy, dx);
            e.x += Math.cos(ang) * e.speed;
            e.y += Math.sin(ang) * e.speed;
        }
        
        // Столкновение с игроком
        let d = Math.hypot(player.x - e.x, player.y - e.y);
        if (d < 20 + e.radius && player.invincible <= 0) {
            player.hp -= e.damage;
            player.invincible = 20;
            updateUI();
            addParticle(player.x, player.y, '#ff4444');
            if (player.hp <= 0) {
                alert('💀 Вы погибли! Игра перезапущена.');
                initGame();
                return;
            }
        }
        
        if (e.hp <= 0) {
            gainExp(15);
            enemies.splice(i, 1);
            spawnEnemy();
            i--;
        }
    }
}

// ========== ПУЛИ ==========
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
        for (let j = 0; j < enemies.length; j++) {
            let e = enemies[j];
            let dist = Math.hypot(b.x - e.x, b.y - e.y);
            if (dist < b.radius + e.radius) {
                e.hp -= b.damage;
                hit = true;
                b.hitsLeft--;
                addParticle(e.x, e.y, '#ffaa66');
                if (b.hitsLeft <= 0) break;
            }
        }
        
        if (hit && b.hitsLeft <= 0) {
            bullets.splice(i, 1);
            i--;
        }
    }
}

// ========== ЭФФЕКТЫ ==========
function addParticle(x, y, color) {
    for (let i = 0; i < 4; i++) {
        particles.push({
            x: x + (Math.random() - 0.5) * 12,
            y: y + (Math.random() - 0.5) * 12,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            life: 0.6,
            color: color
        });
    }
}

function updateParticles() {
    for (let i = 0; i < particles.length; i++) {
        particles[i].x += particles[i].vx;
        particles[i].y += particles[i].vy;
        particles[i].life -= 0.02;
        if (particles[i].life <= 0) particles.splice(i, 1);
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
    
    // Фон
    ctx.fillStyle = '#1a2a2f';
    ctx.fillRect(0, 0, width, height);
    
    // Сетка
    ctx.strokeStyle = '#2a3a3f';
    ctx.lineWidth = 1;
    for (let i = 0; i < WORLD_SIZE; i += 200) {
        ctx.beginPath();
        ctx.moveTo(i - camera.x, 0);
        ctx.lineTo(i - camera.x, height);
        ctx.moveTo(0, i - camera.y);
        ctx.lineTo(width, i - camera.y);
        ctx.stroke();
    }
    
    // Враги
    for (let e of enemies) {
        let sx = e.x - camera.x;
        let sy = e.y - camera.y;
        if (sx + e.radius < 0 || sx - e.radius > width || sy + e.radius < 0 || sy - e.radius > height) continue;
        
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(sx, sy, e.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#aa4433';
        ctx.beginPath();
        ctx.ellipse(sx - 5, sy - 4, 4, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(sx + 5, sy - 4, 4, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        let percent = e.hp / e.maxHp;
        ctx.fillStyle = '#aa4444';
        ctx.fillRect(sx - 15, sy - 18, 30, 4);
        ctx.fillStyle = '#44aa44';
        ctx.fillRect(sx - 15, sy - 18, 30 * percent, 4);
    }
    
    // Пули
    for (let b of bullets) {
        let sx = b.x - camera.x;
        let sy = b.y - camera.y;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(sx, sy, b.radius - 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(sx - 2, sy - 2, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // ========== ИГРОК СО СПРАЙТОМ ==========
    let sx = player.x - camera.x;
    let sy = player.y - camera.y;
    const tank = getCurrentTank();
    player.radius = tank.radius;
    
    const img = tankImages[player.tankId];
    
    if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(player.angle);
        ctx.drawImage(img, -player.radius, -player.radius, player.radius * 2, player.radius * 2);
        ctx.restore();
    } else {
        // fallback если спрайт не загрузился
        ctx.fillStyle = '#44aa88';
        ctx.beginPath();
        ctx.arc(sx, sy, player.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#66ccaa';
        ctx.beginPath();
        ctx.ellipse(sx - 6, sy - 5, 5, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(sx + 6, sy - 5, 5, 6, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // HP бар
    let hpPercent = player.hp / player.maxHp;
    ctx.fillStyle = '#aa4444';
    ctx.fillRect(sx - 28, sy - 30, 56, 5);
    ctx.fillStyle = '#ffaa44';
    ctx.fillRect(sx - 28, sy - 30, 56 * hpPercent, 5);
    
    // Имя и уровень
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(player.name, sx - 25, sy - 20);
    ctx.fillStyle = '#ffaa66';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`Lv.${player.level}`, sx - 12, sy - 28);
    
    // Частицы
    for (let p of particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x - camera.x, p.y - camera.y, 3, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

// ========== ОСНОВНОЙ ЦИКЛ ==========
function update() {
    if (!gameRunning) return;
    movePlayer();
    if (isShooting) shoot();
    updateBullets();
    updateEnemies();
    updateParticles();
    updateCamera();
    draw();
    requestAnimationFrame(update);
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
function initGame() {
    player.x = WORLD_SIZE / 2;
    player.y = WORLD_SIZE / 2;
    player.hp = 100;
    player.maxHp = 100;
    player.level = 1;
    player.exp = 0;
    player.tankId = 'basic';
    player.invincible = 0;
    player.damageBonus = 0;
    player.reloadBonus = 0;
    player.penetrationBonus = 0;
    player.speedBonus = 0;
    player.hpBonus = 0;
    player.statPoints = 0;
    
    enemies = [];
    bullets = [];
    particles = [];
    
    for (let i = 0; i < 8; i++) {
        spawnEnemy();
    }
    
    updateUI();
}

// ========== РАЗМЕРЫ ==========
function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}

// ========== МЫШЬ ==========
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

// ========== КНОПКИ ==========
document.getElementById('playBtn').addEventListener('click', () => {
    let nick = document.getElementById('nickInput').value.trim();
    if (nick) player.name = nick;
    document.getElementById('menu').style.display = 'none';
    document.getElementById('gameUI').style.display = 'block';
    document.getElementById('upgradePanel').style.display = 'flex';
    document.getElementById('evolutionPanel').style.display = 'none';
    
    resize();
    initGame();
    gameRunning = true;
    update();
});

document.querySelectorAll('.upgrade-btn').forEach(btn => {
    btn.addEventListener('click', () => upgradeStat(btn.dataset.stat));
});

window.addEventListener('resize', resize);
resize();
