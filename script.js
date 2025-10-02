let scene, camera, renderer, player;
let enemies = [], projectiles = [];
const SPRITE_POOL = [
  "sprites/monster1.png",
  "sprites/monster2.png",
  "sprites/monster3.png",
  "sprites/monster4.png",
  "sprites/monster5.png",
  "sprites/monster6.png",
  "sprites/monster7.png",
  "sprites/monster8.png"
];
const MONSTER_STATS = {
    "sprites/monster1.png": { health: 10, gold: 5, speed: 0.05 },
    "sprites/monster2.png": { health: 20, gold: 8, speed: 0.06 },
    "sprites/monster3.png": { health: 35, gold: 15, speed: 0.07 },
    "sprites/monster4.png": { health: 50, gold: 25, speed: 0.08 },
    "sprites/monster5.png": { health: 80, gold: 40, speed: 0.09 },
    "sprites/monster6.png": { health: 120, gold: 60, speed: 0.1 },
    "sprites/monster7.png": { health: 200, gold: 100, speed: 0.12 },
    "sprites/monster8.png": { health: 400, gold: 250, speed: 0.14 }
};

// helper: sorteia um sprite existente
function pickRandomSprite() {
    return SPRITE_POOL[Math.floor(Math.random() * SPRITE_POOL.length)];
}
let kills = 0, gold = 0, wave = 1, enemyCount = 2;
let waveInProgress = false;  // controla se a onda está ativa
let nextWaveTimer = 0;       // tempo em ms para próxima onda
let gameActive = true, shopOpen = false, lastShot = 0;
let ownedWeapons = [0], currentWeapon = 0;
const keys = {};
const PLAYER_SPEED = 0.15, ENEMY_SPEED = 0.05, ARENA_SIZE = 50;

let ambientParticles, fishSchool;
// ===== VARIÁVEIS GLOBAIS =====
// ==== FÍSICA DO PLAYER ====
let vY = 0;                              // velocidade vertical
const GRAVITY = -0.012;                  // gravidade
const JUMP_FORCE = 0.24;                 // força do pulo
const GROUND_Y = 0;                      // “chão” do player (teu player já nasce em y=0)

// ==== TORRE ====
const TOWER_HEIGHT = 20;                 // 20m
const TOWER_POS = new THREE.Vector3(8, 0, -12); // ajusta se quiser
let towerTopY = TOWER_HEIGHT;

// ==== INTERAÇÃO ====
let nearLadder = false;                  // se está perto da “escada” da torre

const weapons = [
    { name: "Pistola de Arpão", cost: 0, damage: 10, fireRate: 500, speed: 0.5, color: 0x00ffff, size: 0.3, description: "Arma inicial básica" },
    { name: "Lança-Dardos Rápido", cost: 50, damage: 20, fireRate: 300, speed: 0.6, color: 0x00ff00, size: 0.25, description: "Dispara mais rápido" },
    { name: "Arpão Perfurante", cost: 100, damage: 30, fireRate: 600, speed: 0.7, color: 0xff00ff, size: 0.35, description: "Dano dobrado" },
    { name: "Rifle Aquático", cost: 200, damage: 40, fireRate: 250, speed: 0.8, color: 0xffff00, size: 0.3, description: "Rápido e poderoso" },
    { name: "Canhão Sônico", cost: 350, damage: 50, fireRate: 700, speed: 0.6, color: 0x00ffaa, size: 0.4, description: "Ondas sônicas" },
    { name: "Bolhas Ácidas", cost: 500, damage: 60, fireRate: 400, speed: 0.5, color: 0x88ff00, size: 0.35, description: "Projéteis corrosivos" },
    { name: "Tridente Elétrico", cost: 700, damage: 70, fireRate: 500, speed: 0.9, color: 0x0088ff, size: 0.3, description: "Descargas elétricas" },
    { name: "Metralhadora Sub.", cost: 1000, damage: 80, fireRate: 150, speed: 1.0, color: 0xff6600, size: 0.25, description: "Rajadas devastadoras" },
    { name: "Lançador de Cristais", cost: 1400, damage: 90, fireRate: 600, speed: 0.7, color: 0xff00ff, size: 0.4, description: "Cristais perfurantes" },
    { name: "Canhão de Plasma", cost: 1900, damage: 100, fireRate: 800, speed: 0.6, color: 0xff0088, size: 0.45, description: "Energia pura" },
    { name: "Rifle de Precisão", cost: 2500, damage: 7, fireRate: 1000, speed: 1.2, color: 0x00ddff, size: 0.3, description: "Longo alcance mortal" },
    { name: "Lança-Torpedos Leve", cost: 3200, damage: 8, fireRate: 900, speed: 0.8, color: 0xff3300, size: 0.5, description: "Torpedos explosivos" },
    { name: "Desintegrador Abissal", cost: 4000, damage: 9, fireRate: 700, speed: 0.9, color: 0x8800ff, size: 0.4, description: "Dissolve matéria" },
    { name: "Canhão de Gelo", cost: 5000, damage: 10, fireRate: 600, speed: 0.7, color: 0x00ffff, size: 0.45, description: "Congela inimigos" },
    { name: "Mísseis Teleguiados", cost: 6500, damage: 12, fireRate: 1200, speed: 0.6, color: 0xff9900, size: 0.5, description: "Seguem alvos" },
    { name: "Canhão de Antimatéria", cost: 8500, damage: 15, fireRate: 1500, speed: 1.0, color: 0xff0000, size: 0.6, description: "Poder supremo" },
    { name: "Lança-Raios Cósmico", cost: 11000, damage: 18, fireRate: 800, speed: 1.3, color: 0xffffff, size: 0.35, description: "Energia cósmica" },
    { name: "Aniquilador", cost: 15000, damage: 22, fireRate: 1000, speed: 1.1, color: 0x9900ff, size: 0.7, description: "A loucura encarnada" },
    { name: "Tridente de Poseidon", cost: 20000, damage: 28, fireRate: 700, speed: 1.4, color: 0x00aaff, size: 0.5, description: "Poder dos deuses" },
    { name: "LEVIATÃ", cost: 30000, damage: 4000, fireRate: 500, speed: 1.5, color: 0xff00ff, size: 0.8, description: "A arma definitiva" }
];

// ===== INICIALIZAÇÃO E LOOP PRINCIPAL =====
init();

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#gameCanvas'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000d1a);
    scene.fog = new THREE.FogExp2(0x001a33, 0.02);

    scene.add(new THREE.AmbientLight(0x1a4d6d, 0.3));
    const p1 = new THREE.PointLight(0x00a8cc, 0.8, 100);
    p1.position.set(0, 20, 0);
    scene.add(p1);

    player = new THREE.Group();
    player.add(camera);
    scene.add(player);
    camera.position.set(0, 0.5, 0);
    // === SISTEMA DE ÁUDIO GLOBAL ===
    const listener = new THREE.AudioListener();
    camera.add(listener);

    bgSound = new THREE.Audio(listener);
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load('sounds/ambient_deep.mp3', buffer => {
        bgSound.setBuffer(buffer);
        bgSound.setLoop(true);
        bgSound.setVolume(0.4);
    });

    animate();
    createEnvironment();
    createPlayerView();
    createAmbientLife();
    setupEventListeners();
    
    restartGame();
    
}


function animate() {
    requestAnimationFrame(animate);

    if (gameActive && !shopOpen) {
        updatePlayer();
        updateEnemies();
        updateProjectiles();
        updateAmbientLife();

        // checa se pode iniciar nova onda
        if (!waveInProgress && performance.now() > nextWaveTimer) {
            wave++;
            enemyCount += 2; // aumenta dificuldade
            spawnWave();
        }
    }

    renderer.render(scene, camera);
}



// ===== FUNÇÕES DE CRIAÇÃO (SETUP) =====
function createEnvironment() {
    const floorGeometry = new THREE.PlaneGeometry(ARENA_SIZE * 2, ARENA_SIZE * 2, 20, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x0d1b2a, roughness: 0.95, metalness: 0.1 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -5;
    scene.add(floor);
    for (let i = 0; i < 50; i++) {
        const rockGeo = new THREE.SphereGeometry(Math.random() * 2 + 1, 8, 8);
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x2a4455, roughness: 0.9 });
        const rock = new THREE.Mesh(rockGeo, rockMat);
        rock.position.set((Math.random() - 0.5) * ARENA_SIZE * 1.8, -5 + Math.random(), (Math.random() - 0.5) * ARENA_SIZE * 1.8);
        scene.add(rock);
        
    }
        // luzes que piscam
    for (let i = 0; i < 5; i++) {
        const flicker = new THREE.PointLight(0xff2200, 0.8, 30);
        flicker.position.set((Math.random()-0.5)*ARENA_SIZE, Math.random()*5, (Math.random()-0.5)*ARENA_SIZE);
        scene.add(flicker);

        // anima flicker
        setInterval(() => {
            flicker.intensity = 0.5 + Math.random() * 1.5;
        }, 200 + Math.random()*800);
    }

    const kelpMaterial = new THREE.MeshStandardMaterial({ color: 0x1f4d2f, roughness: 0.8 });
    for (let i = 0; i < 30; i++) {
        const kelpHeight = Math.random() * 8 + 4;
        const kelpGeo = new THREE.CylinderGeometry(0.1, 0.2, kelpHeight, 5);
        const kelp = new THREE.Mesh(kelpGeo, kelpMaterial);
        kelp.position.set((Math.random() - 0.5) * ARENA_SIZE * 1.8, -5 + kelpHeight / 2, (Math.random() - 0.5) * ARENA_SIZE * 1.8);
        scene.add(kelp);
    }
}
// ===== TORRE 20m + plataforma =====
// ===== FAROL JOGÁVEL =====
(function createLighthouse() {
    // corpo principal do farol
    const towerRadius = 4; // mais largo
    const tGeo = new THREE.CylinderGeometry(towerRadius, towerRadius * 1.2, TOWER_HEIGHT, 32, 1, false);
    const tMat = new THREE.MeshStandardMaterial({
        color: 0x0b1f2a,
        roughness: 0.9,
        metalness: 0.05,
        side: THREE.DoubleSide
    });
    const tower = new THREE.Mesh(tGeo, tMat);
    tower.position.set(TOWER_POS.x, TOWER_HEIGHT / 2, TOWER_POS.z);
    scene.add(tower);

    // escada em espiral interna
    const points = [];
    const steps = 100;
    for (let i = 0; i < steps; i++) {
        const angle = i * 0.3; // controla giro
        const x = Math.cos(angle) * (towerRadius - 1.2);
        const z = Math.sin(angle) * (towerRadius - 1.2);
        const y = (i / steps) * TOWER_HEIGHT;
        points.push(new THREE.Vector3(x, y, z));
    }
    const spiralPath = new THREE.CatmullRomCurve3(points);
    const stairGeo = new THREE.TubeGeometry(spiralPath, 200, 0.3, 8, false);
    const stairMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.4 });
    const stairs = new THREE.Mesh(stairGeo, stairMat);
    stairs.position.copy(TOWER_POS);
    scene.add(stairs);

    // plataforma no topo
    const topGeo = new THREE.CylinderGeometry(towerRadius + 1, towerRadius + 1, 0.5, 32);
    const topMat = new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.8 });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.set(TOWER_POS.x, TOWER_HEIGHT + 0.25, TOWER_POS.z);
    scene.add(top);
})();



function createPlayerView() {
    const gunGroup = new THREE.Group();
    const pistolMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.9, roughness: 0.2 });
    gunGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.15, 0.3), pistolMat));
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 8), pistolMat);
    barrel.position.set(0, 0.05, 0.25);
    barrel.rotation.x = Math.PI / 2;
    gunGroup.add(barrel);
    const muzzleMat = new THREE.MeshStandardMaterial({ emissiveIntensity: 0.7, metalness: 0.9 });
    const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.05, 8), muzzleMat);
    muzzle.position.set(0, 0.05, 0.42);
    muzzle.rotation.x = Math.PI / 2;
    gunGroup.add(muzzle);
    gunGroup.position.set(0.3, -0.25, -0.5);
    gunGroup.rotation.y = -Math.PI / 12;
    camera.add(gunGroup);
    player.userData.gun = gunGroup;
}

function createEnemy() {
    const enemy = new THREE.Group();
    enemy.userData.health = Math.ceil(wave * 1.5);
    
    // MELHORIA: Criaturas agora brilham
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2d1b2e, 
        roughness: 0.8,
        emissive: 0x2d1b2e, // Mesma cor da pele, para brilhar com a própria cor
        emissiveIntensity: 0.4 // Força do brilho (sutil)
    
    });
    const growl = new THREE.PositionalAudio(camera.children[0]); 
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load('sounds/growl.mp3', buffer => {
        growl.setBuffer(buffer);
        growl.setLoop(true);
        growl.setVolume(0.3);
        // não toca aqui ainda
    });
    enemy.userData.sound = growl;
    enemy.add(growl);

    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.5 });
    const headGeometry = new THREE.SphereGeometry(0.7, 16, 12);
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    head.position.y = 1.2;
    enemy.add(head);
    const eyeGeometry = new THREE.SphereGeometry(0.15, 12, 8);
    const eyePositions = [ [ -0.3, 1.4, 0.5 ], [ 0.35, 1.3, 0.45 ], [ 0, 1.6, 0.55 ] ];
    eyePositions.forEach(pos => {
        const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        eye.position.set(pos[0], pos[1], pos[2]);
        head.add(eye);
    });
    enemy.position.y = 1.8;
    return enemy;
    
}
function createEnemySprite(spritePath) {
    const tex = new THREE.TextureLoader().load(spritePath);
    const material = new THREE.SpriteMaterial({
        map: tex,
        transparent: true
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(6, 6, 1);

    // pega stats do monstro ou default
    const stats = MONSTER_STATS[spritePath] || { health: 20, gold: 10, speed: ENEMY_SPEED };

    sprite.userData.health = stats.health;
    sprite.userData.gold = stats.gold;
    sprite.userData.speed = stats.speed;

    return sprite;
}





function createAmbientLife() {
    const particleCount = 2000;
    const particlePositions = [];
    for (let i = 0; i < particleCount; i++) { particlePositions.push((Math.random() - 0.5) * ARENA_SIZE * 2, Math.random() * 40 - 5, (Math.random() - 0.5) * ARENA_SIZE * 2); }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(particlePositions, 3));
    const particleMaterial = new THREE.PointsMaterial({ color: 0x6ba3d0, size: 0.1, transparent: true, opacity: 0.4 });
    ambientParticles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(ambientParticles);
    fishSchool = new THREE.Group();
    const fishGeo = new THREE.ConeGeometry(0.1, 0.5, 4);
    const fishMat = new THREE.MeshStandardMaterial({ color: 0x4fc3f7, emissive: 0x4fc3f7, emissiveIntensity: 0.2 });
    for (let i = 0; i < 30; i++) {
        const fish = new THREE.Mesh(fishGeo, fishMat);
        fish.position.set((Math.random() - 0.5) * ARENA_SIZE, Math.random() * 10, (Math.random() - 0.5) * ARENA_SIZE);
        fish.rotation.z = Math.PI / 2;
        fish.userData.speed = Math.random() * 0.02 + 0.01;
        fishSchool.add(fish);
    }
    scene.add(fishSchool);
}

function addHitboxHelper(enemyObject) {
    const hitboxSize = 2.2; // MELHORIA: Hitbox aumentado
    const hitboxGeo = new THREE.SphereGeometry(hitboxSize, 16, 12);
    const hitboxMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.3 });
    const hitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
    enemyObject.add(hitbox);
}

// ===== FUNÇÕES DE ATUALIZAÇÃO (UPDATE) =====
function updateAmbientLife() {
    if (!ambientParticles || !fishSchool) return;
    ambientParticles.position.y -= 0.01;
    if (ambientParticles.position.y < -20) { ambientParticles.position.y = 20; }
    fishSchool.children.forEach(fish => {
        fish.position.x += fish.userData.speed;
        fish.rotation.y = Math.sin(fish.position.x * 0.5) * 0.3;
        if (fish.position.x > ARENA_SIZE) { fish.position.x = -ARENA_SIZE; }
        scene.fog.density = 0.018 + Math.sin(Date.now() * 0.001) * 0.005;
    });
}

function updatePlayer() {
    if (shopOpen) return;

    // ===== movimento horizontal (já existia) =====
    const direction = new THREE.Vector3();
    if (keys['KeyW']) direction.z -= 1;
    if (keys['KeyS']) direction.z += 1;
    if (keys['KeyA']) direction.x -= 1;
    if (keys['KeyD']) direction.x += 1;
    if (direction.length() > 0) {
        direction.normalize();
        direction.applyQuaternion(player.quaternion);
        player.position.add(direction.multiplyScalar(PLAYER_SPEED));
    }

    // ===== gravidade / pulo =====
    vY += GRAVITY;
    player.position.y += vY;

    // chão (GROUND_Y)
    if (player.position.y < GROUND_Y) {
        player.position.y = GROUND_Y;
        vY = 0;
    }

    // piso do topo da torre (impede atravessar a plataforma de cima)
    // se estiver caindo e passar do topo, “colide” com a plataforma
    const onTopX = Math.abs(player.position.x - TOWER_POS.x) < 3.6;
    const onTopZ = Math.abs(player.position.z - TOWER_POS.z) < 3.6;
    if (onTopX && onTopZ && vY < 0 && player.position.y <= towerTopY + 1.6 && player.position.y >= towerTopY + 1.0) {
        player.position.y = towerTopY + 1.6;
        vY = 0;
    }

    // ===== checagem de proximidade da “escada” para habilitar F =====
    const ladderPos = scene.userData.towerLadderPos;
    nearLadder = ladderPos ? player.position.distanceTo(ladderPos) < 2.2 : false;

    // dica no HUD (reutiliza texto de instruções)
    const hint = document.getElementById('instructions-general'); // existe no teu HTML:contentReference[oaicite:5]{index=5}
    if (hint) {
        if (nearLadder) hint.textContent = "W/A/S/D = Mover | Mouse = Olhar | Clique = Atirar | E = Loja | F = Subir a Torre";
        else            hint.textContent = "W/A/S/D = Mover | Mouse = Olhar | Clique = Atirar | E = Loja";
    }
}

function updateEnemies() {
    const now = performance.now();

    if (enemies.length === 0 && waveInProgress) {
        waveInProgress = false;
        nextWaveTimer = performance.now() + 5000;
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];

        if (enemy.userData.animate) {
            enemy.userData.animate(now);
        }

        const dir = new THREE.Vector3().subVectors(player.position, enemy.position).normalize();
        enemy.position.add(dir.multiplyScalar(ENEMY_SPEED * (1 + wave * 0.05)));

        if (enemy.position.distanceTo(player.position) < 1.5) {
            gameOver();
            break;
        }
    }
}

function updateProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.position.add(p.velocity);
        if (p.position.distanceTo(player.position) > 100) {
            scene.remove(p);
            projectiles.splice(i, 1);
            continue;
        }
        for (let j = enemies.length - 1; j >= 0; j--) {
            const e = enemies[j];
            if (p.position.distanceTo(e.position) < 2.2) { // MELHORIA: Hitbox aumentado
                e.userData.health -= p.userData.damage;
                scene.remove(p);
                projectiles.splice(i, 1);
                if (e.userData.health <= 0) {
                    scene.remove(e);
                    enemies.splice(j, 1);
                    kills++;
                    gold += e.userData.gold; // ouro baseado no monstro
                    document.getElementById('kills').textContent = kills;
                    document.getElementById('gold').textContent = gold;
                }
                break; 
            }
        }
    }
}

async function spawnWave() {
    if (waveInProgress) return;

    waveInProgress = true;
    console.log("Iniciando Onda " + wave);

    for (let i = 0; i < enemyCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = ARENA_SIZE * 0.9;

        // só sprites agora
        let enemy = createEnemySprite(pickRandomSprite());

        enemy.position.set(
            player.position.x + Math.cos(angle) * dist,
            0,
            player.position.z + Math.sin(angle) * dist
        );
        enemy.position.add(dir.multiplyScalar(enemy.userData.speed));

        scene.add(enemy);
        enemies.push(enemy);
    }
}




function shoot() {
    const weapon = weapons[currentWeapon];
    const now = Date.now();
    if (!gameActive || shopOpen || now - lastShot < weapon.fireRate) return;
    lastShot = now;
    const pMat = new THREE.MeshBasicMaterial({ color: weapon.color });
    const pGeo = new THREE.SphereGeometry(weapon.size, 8, 8);
    const p = new THREE.Mesh(pGeo, pMat);
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    p.position.copy(player.position).add(new THREE.Vector3(0, 0.5, 0)).add(dir.clone().multiplyScalar(1.5));
    p.velocity = dir.multiplyScalar(weapon.speed);
    p.userData.damage = weapon.damage;
    scene.add(p);
    projectiles.push(p);
}

function gameOver() {
    if (!gameActive) return;
    gameActive = false;
    document.exitPointerLock();
    document.getElementById('finalKills').textContent = kills;
    document.getElementById('finalWave').textContent = wave;
    document.getElementById('gameOver').style.display = 'block';
}

function restartGame() {
    enemies.forEach(e => scene.remove(e));
    projectiles.forEach(p => scene.remove(p));
    enemies = []; projectiles = [];
    kills = 0; gold = 0; wave = 1; enemyCount = 2;
    currentWeapon = 0; ownedWeapons = [0];
    gameActive = true; shopOpen = false;
    player.position.set(0, 0, 5);
    player.rotation.set(0, 0, 0); camera.rotation.set(0, 0, 0);
    document.getElementById('kills').textContent = 0;
    document.getElementById('gold').textContent = 0;
    document.getElementById('wave').textContent = 1;
    document.getElementById('weaponName').textContent = weapons[0].name;
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('shop').style.display = 'none';
    updateGunAppearance();
    spawnWave();
}

// ===== LOJA E ARMAS =====
function toggleShop() {
    if (!gameActive) return;
    shopOpen = !shopOpen;
    document.getElementById('shop').style.display = shopOpen ? 'block' : 'none';
    if (shopOpen) {
        document.exitPointerLock();
        updateShopDisplay();
    } else {
        document.body.requestPointerLock();
    }
}

function updateShopDisplay() {
    const grid = document.getElementById('weaponGrid');
    document.getElementById('shopGoldAmount').textContent = gold;
    grid.innerHTML = '';
    weapons.forEach((weapon, index) => {
        const card = document.createElement('div');
        card.className = 'weapon-card';
        const isOwned = ownedWeapons.includes(index);
        const canBuy = gold >= weapon.cost;
        const isEquipped = index === currentWeapon;
        if (isEquipped) card.classList.add('equipped');
        else if (isOwned) card.classList.add('owned');
        else if (canBuy) card.classList.add('owned');
        else card.classList.add('locked');
        card.innerHTML = `
            <div class="weapon-name">${weapon.name}</div>
            <div class="weapon-stats">⚔️ Dano: ${weapon.damage}</div>
            <div class="weapon-stats">⚡ Cadência: ${(1000/weapon.fireRate).toFixed(1)}/s</div>
            <div class="weapon-stats">🚀 Vel. Projétil: ${weapon.speed.toFixed(1)}x</div>
            <div class="weapon-desc">${weapon.description}</div>
            <div class="weapon-cost">${isOwned ? '✓ NA COLEÇÃO' : weapon.cost + ' 💰'}</div>
            ${isEquipped ? '<div style="color: #ffff00; margin-top: 8px;">EQUIPADA</div>' : ''}
        `;
        if (isOwned && !isEquipped) {
            card.onclick = () => equipWeapon(index);
        } else if (!isOwned && canBuy) {
            card.onclick = () => buyWeapon(index);
        }
        grid.appendChild(card);
    });
}

function buyWeapon(index) {
    const weapon = weapons[index];
    if (gold >= weapon.cost && !ownedWeapons.includes(index)) {
        gold -= weapon.cost;
        ownedWeapons.push(index);
        document.getElementById('gold').textContent = gold;
        equipWeapon(index);
    }
}

function equipWeapon(index) {
    if (ownedWeapons.includes(index)) {
        currentWeapon = index;
        document.getElementById('weaponName').textContent = weapons[index].name;
        updateGunAppearance();
        updateShopDisplay();
    }
}

function updateGunAppearance() {
    const gun = player.userData.gun;
    if (gun && gun.children[2]) {
        gun.children[2].material.color.setHex(weapons[currentWeapon].color);
        gun.children[2].material.emissive.setHex(weapons[currentWeapon].color);
    }
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    document.addEventListener('mousemove', (event) => {
        if (gameActive && document.pointerLockElement === document.body) {
            player.rotation.y -= event.movementX * 0.002;
            camera.rotation.x -= event.movementY * 0.002;
            camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
        }
    });
    document.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if (e.code === 'KeyE') toggleShop();
    });
    document.addEventListener('keyup', (e) => { keys[e.code] = false; });
    document.body.addEventListener('click', () => {
        if (bgSound && !bgSound.isPlaying) {
            bgSound.play();  // 🔊 só começa quando o jogador clica
        }
        if (gameActive && !shopOpen) {
            document.body.requestPointerLock();
            shoot();
        }
        enemies.forEach(e => {
        if (e.userData.sound && !e.userData.sound.isPlaying) {
            e.userData.sound.play();
        }
    });
    });
    document.getElementById('closeShop').onclick = toggleShop;
    document.getElementById('restartButton').onclick = restartGame;
    document.addEventListener('keydown', (e) => {
    keys[e.code] = true;

    // abrir loja (já existia)
    if (e.code === 'KeyE') toggleShop();

    // PULO
    if (e.code === 'Space' && Math.abs(player.position.y - GROUND_Y) < 0.001) {
        vY = JUMP_FORCE;
    }

    // SUBIR TORRE (se estiver perto do totem/“escada”)
    if (e.code === 'KeyF' && nearLadder) {
        player.position.set(TOWER_POS.x + 2.2, towerTopY + 1.6, TOWER_POS.z); // pousa no topo
        vY = 0;
    }
});
document.addEventListener('keyup', (e) => { keys[e.code] = false; });
}