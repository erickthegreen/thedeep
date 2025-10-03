let scene, camera, renderer, player, listener;
let wavesPaused = false;
let enemies = [], projectiles = [];
let MONSTER_STATS = {};

const WEAPON_SOUNDS = {
    0: "sounds/harpoon.mp3", 1: "sounds/dart.mp3", 2: "sounds/piercing.mp3",
    3: "sounds/rifle.mp3", 4: "sounds/sonic.mp3", 5: "sounds/acid.mp3",
    6: "sounds/trident.mp3", 7: "sounds/smg.mp3",
};
const MONSTER_SOUNDS = {
    "sprites/monster1.png": "sounds/growl1.mp3", "sprites/monster2.png": "sounds/growl2.mp3",
    "sprites/monster3.png": "sounds/growl3.mp3", "sprites/monster4.png": "sounds/growl4.mp3",
    "sprites/monster5.png": "sounds/growl5.mp3", "sprites/monster6.png": "sounds/growl6.mp3",
    "sprites/monster7.png": "sounds/growl7.mp3", "sprites/monster8.png": "sounds/growl8.mp3",
    "boss": "sounds/boss_roar.mp3"
};

async function loadMonsterData() {
    const response = await fetch("monsters.json");
    const monsters = await response.json();
    MONSTER_STATS = {};
    monsters.forEach(m => { MONSTER_STATS[m.sprite] = m; });
}
const SPRITE_POOL = [
  "sprites/monster1.png", "sprites/monster2.png", "sprites/monster3.png", "sprites/monster4.png",
  "sprites/monster5.png", "sprites/monster6.png", "sprites/monster7.png", "sprites/monster8.png"
];
function pickRandomSprite() {
    return SPRITE_POOL[Math.floor(Math.random() * SPRITE_POOL.length)];
}
let kills = 0, gold = 0, wave = 1, enemyCount = 2;
let waveInProgress = false;
let nextWaveTimer = 0;
let gameActive = true, shopOpen = false, lastShot = 0;
let ownedWeapons = [0], currentWeapon = 0;
const keys = {};
const PLAYER_SPEED = 0.15, ENEMY_SPEED = 0.05, ARENA_SIZE = 50;

let ambientParticles, fishSchool;

// ===== VARIÁVEIS DE FÍSICA E INTERAÇÃO =====
let vY = 0;
const GRAVITY = -0.018;
const JUMP_FORCE = 0.25;
const GROUND_Y = 0;
const AIR_CONTROL = 0.5;

// ==== VARIÁVEIS GLOBAIS DO FAROL (usando 'let' para permitir modificação) ====
let TOWER_RADIUS = 6;
let TOWER_HEIGHT = 20;
let TOWER_POS = new THREE.Vector3(8, 0, -12);
const STAIR_CAPTURE = 3.5;
const PLAYER_EYE = 1.6;
let towerTopY = TOWER_HEIGHT;
let stairPointsWorld = [];
let beaconPivot = null;

const weapons = [
    { name: "Pistola de Arpão", cost: 0, damage: 25, fireRate: 400, speed: 0.6, color: 0x00ffff, size: 0.3, description: "Arma inicial básica" },
    { name: "Lança-Dardos Rápido", cost: 30, damage: 40, fireRate: 250, speed: 0.8, color: 0x00ff00, size: 0.25, description: "Dispara muito rápido" },
    { name: "Arpão Perfurante", cost: 80, damage: 70, fireRate: 500, speed: 0.9, color: 0xff00ff, size: 0.35, description: "Ignora parte da defesa inimiga" },
    { name: "Rifle Aquático", cost: 150, damage: 100, fireRate: 220, speed: 1.0, color: 0xffff00, size: 0.3, description: "Cadência absurda + dano sólido" },
    { name: "Canhão Sônico", cost: 300, damage: 160, fireRate: 600, speed: 0.9, color: 0x00ffaa, size: 0.4, description: "Ondas de choque letais" },
    { name: "Bolhas Ácidas", cost: 450, damage: 200, fireRate: 350, speed: 0.8, color: 0x88ff00, size: 0.35, description: "Dissolve monstros rápido" },
    { name: "Tridente Elétrico", cost: 600, damage: 260, fireRate: 400, speed: 1.2, color: 0x0088ff, size: 0.3, description: "Choques em área" },
    { name: "Metralhadora Sub.", cost: 900, damage: 300, fireRate: 120, speed: 1.3, color: 0xff6600, size: 0.25, description: "Rajadas insanas" },
    { name: "Lançador de Cristais", cost: 1200, damage: 400, fireRate: 500, speed: 1.0, color: 0xff00ff, size: 0.4, description: "Perfuração absurda" },
    { name: "Canhão de Plasma", cost: 1600, damage: 600, fireRate: 700, speed: 1.1, color: 0xff0088, size: 0.45, description: "Explosões devastadoras" },
    { name: "Rifle de Precisão", cost: 2000, damage: 800, fireRate: 900, speed: 1.6, color: 0x00ddff, size: 0.3, description: "Sniper nuclear" },
    { name: "Lança-Torpedos Leve", cost: 2800, damage: 1200, fireRate: 750, speed: 1.2, color: 0xff3300, size: 0.5, description: "Explosões brutais" },
    { name: "Desintegrador Abissal", cost: 3500, damage: 1500, fireRate: 600, speed: 1.3, color: 0x8800ff, size: 0.4, description: "Evapora inimigos" },
    { name: "Canhão de Gelo", cost: 4500, damage: 2000, fireRate: 550, speed: 1.1, color: 0x00ffff, size: 0.45, description: "Congela e destrói" },
    { name: "Mísseis Teleguiados", cost: 6000, damage: 2800, fireRate: 1100, speed: 1.0, color: 0xff9900, size: 0.5, description: "Busca inimigos automaticamente" },
    { name: "Canhão de Antimatéria", cost: 8000, damage: 4000, fireRate: 1300, speed: 1.4, color: 0xff0000, size: 0.6, description: "Apaga monstros da existência" },
    { name: "Lança-Raios Cósmico", cost: 10000, damage: 6000, fireRate: 700, speed: 1.6, color: 0xffffff, size: 0.35, description: "Laser cósmico OP" },
    { name: "Aniquilador", cost: 14000, damage: 8000, fireRate: 900, speed: 1.5, color: 0x9900ff, size: 0.7, description: "Fim dos tempos em uma arma" },
    { name: "Tridente de Poseidon", cost: 18000, damage: 12000, fireRate: 600, speed: 1.7, color: 0x00aaff, size: 0.5, description: "Poder oceânico absurdo" },
    { name: "LEVIATÃ", cost: 25000, damage: 20000, fireRate: 400, speed: 2.0, color: 0xff00ff, size: 0.8, description: "Literalmente God Mode" }
];

init();

async function init() {
    await loadMonsterData();
    MONSTER_STATS["sprites/boss.png"] = MONSTER_STATS["boss"] || { health: 10000, gold: 5000, speed: 0.05 };

    scene = new THREE.Scene();
    document.body.addEventListener('click', () => {
        if (renderer && renderer.getContext().audioContext) {
            const ctx = renderer.getContext().audioContext;
            if (ctx.state === "suspended") ctx.resume();
        }
    }, { once: true });
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
    camera.position.set(0, PLAYER_EYE, 0);

    listener = new THREE.AudioListener();
    camera.add(listener);

    const bgSound = new THREE.Audio(listener);
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load('sounds/ambient_deep.mp3', buffer => {
        bgSound.setBuffer(buffer);
        bgSound.setLoop(true);
        bgSound.setVolume(0.4);
        document.body.addEventListener('click', () => { if (!bgSound.isPlaying) bgSound.play(); }, { once: true });
    });

    animate();
    createEnvironment();
    createLighthouse();
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

        if (!wavesPaused && !waveInProgress && performance.now() > nextWaveTimer) {
            wave++;
            enemyCount += 2;
            spawnWave();
        }
    }

    if (beaconPivot) beaconPivot.rotation.y += 0.01;

    renderer.render(scene, camera);
}

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
}

function createLighthouse() {
    const LIGHTHOUSE_X = 8;
    const LIGHTHOUSE_Z = -12;
    const LIGHTHOUSE_HEIGHT = 20;
    const LIGHTHOUSE_RADIUS_BASE = 6;
    const LIGHTHOUSE_RADIUS_TOP = 4;
    const CUPOLA_HEIGHT = 4;

    const rockBaseGeometry = new THREE.CylinderGeometry(LIGHTHOUSE_RADIUS_BASE + 2, LIGHTHOUSE_RADIUS_BASE + 3, LIGHTHOUSE_HEIGHT / 3, 16);
    const rockBaseMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8, metalness: 0.1 });
    const rockBase = new THREE.Mesh(rockBaseGeometry, rockBaseMaterial);
    rockBase.position.set(LIGHTHOUSE_X, LIGHTHOUSE_HEIGHT / 6 + GROUND_Y - 1, LIGHTHOUSE_Z);
    scene.add(rockBase);

    const stripHeight = LIGHTHOUSE_HEIGHT / 5;
    for (let i = 0; i < 5; i++) {
        const material = (i % 2 === 0)
            ? new THREE.MeshStandardMaterial({ color: 0xaa0000, roughness: 0.6, metalness: 0.1 })
            : new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.1 });

        const stripGeo = new THREE.CylinderGeometry(
            THREE.MathUtils.lerp(LIGHTHOUSE_RADIUS_BASE, LIGHTHOUSE_RADIUS_TOP, (i + 0.1) / 5),
            THREE.MathUtils.lerp(LIGHTHOUSE_RADIUS_BASE, LIGHTHOUSE_RADIUS_TOP, (i + 0.9) / 5),
            stripHeight, 32, 1, true
        );
        const stripMesh = new THREE.Mesh(stripGeo, material);
        stripMesh.position.set(LIGHTHOUSE_X, GROUND_Y + 1.5 + stripHeight / 2 + i * stripHeight, LIGHTHOUSE_Z);
        scene.add(stripMesh);
    }
    towerTopY = GROUND_Y + 1.5 + LIGHTHOUSE_HEIGHT;

    const cupolaGeo = new THREE.CylinderGeometry(LIGHTHOUSE_RADIUS_TOP * 0.9, LIGHTHOUSE_RADIUS_TOP * 0.9, CUPOLA_HEIGHT, 16);
    const cupolaMaterial = new THREE.MeshStandardMaterial({ color: 0x445566, transparent: true, opacity: 0.8, roughness: 0.2, metalness: 0.5 });
    const cupola = new THREE.Mesh(cupolaGeo, cupolaMaterial);
    cupola.position.set(LIGHTHOUSE_X, towerTopY + CUPOLA_HEIGHT / 2, LIGHTHOUSE_Z);
    scene.add(cupola);

    const roofGeo = new THREE.ConeGeometry(LIGHTHOUSE_RADIUS_TOP * 1.1, 2, 16);
    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.8 });
    const roof = new THREE.Mesh(roofGeo, roofMaterial);
    roof.position.set(LIGHTHOUSE_X, towerTopY + CUPOLA_HEIGHT + 1, LIGHTHOUSE_Z);
    scene.add(roof);
    
    const spotLight = new THREE.SpotLight(0xffffaa, 3, 100, Math.PI / 8, 0.5, 2);
    beaconPivot = new THREE.Group();
    spotLight.target = new THREE.Object3D();
    beaconPivot.add(spotLight);
    beaconPivot.add(spotLight.target);
    beaconPivot.position.set(LIGHTHOUSE_X, towerTopY + CUPOLA_HEIGHT / 2, LIGHTHOUSE_Z);
    spotLight.target.position.set(LIGHTHOUSE_X, towerTopY, LIGHTHOUSE_Z-10); // Target moves with pivot
    scene.add(beaconPivot);

    const rampMaterial = new THREE.MeshStandardMaterial({ color: 0x445566, side: THREE.DoubleSide });
    const rampGroup = new THREE.Group();
    const turns = 3.5;
    const steps = 150;
    const innerRadius = LIGHTHOUSE_RADIUS_TOP * 0.8;
    const rampWidth = 2;
    stairPointsWorld = [];

    for (let i = 0; i < steps; i++) {
        const angle = (i / steps) * (Math.PI * 2 * turns);
        const y = GROUND_Y + (i / steps) * LIGHTHOUSE_HEIGHT * 0.9 + 1.5;
        const x = LIGHTHOUSE_X + Math.cos(angle) * innerRadius;
        const z = LIGHTHOUSE_Z + Math.sin(angle) * innerRadius;
        stairPointsWorld.push(new THREE.Vector3(x, y, z));
        const rampSegment = new THREE.BoxGeometry(rampWidth, 0.2, 1.5);
        const mesh = new THREE.Mesh(rampSegment, rampMaterial);
        mesh.position.set(x, y, z);
        mesh.lookAt(LIGHTHOUSE_X, y, LIGHTHOUSE_Z);
        rampGroup.add(mesh);
    }
    scene.add(rampGroup);

    TOWER_POS.set(LIGHTHOUSE_X, GROUND_Y, LIGHTHOUSE_Z);
    TOWER_HEIGHT = LIGHTHOUSE_HEIGHT + CUPOLA_HEIGHT + 2;
    TOWER_RADIUS = LIGHTHOUSE_RADIUS_BASE;
}

function handleTowerAndStairs() {
    if (!stairPointsWorld || stairPointsWorld.length === 0) return false;

    const dx = player.position.x - TOWER_POS.x;
    const dz = player.position.z - TOWER_POS.z;
    const radialDist = Math.hypot(dx, dz);
    let onStairs = false;
    const wallRadius = TOWER_RADIUS - 0.2;

    if (radialDist < wallRadius) {
        let nearestPoint = null;
        let bestDistSq = Infinity;
        for (const p of stairPointsWorld) {
            const dSq = player.position.distanceToSquared(p);
            if (dSq < bestDistSq) {
                bestDistSq = dSq;
                nearestPoint = p;
            }
        }
        if (nearestPoint && bestDistSq < STAIR_CAPTURE * STAIR_CAPTURE) {
            const targetY = nearestPoint.y + PLAYER_EYE;
            if (player.position.y < targetY + 0.5) {
                player.position.y = targetY;
                vY = 0;
                onStairs = true;
            }
        }
    } else if (radialDist < TOWER_RADIUS) {
        const overlap = TOWER_RADIUS - radialDist;
        player.position.x += (dx / radialDist) * overlap;
        player.position.z += (dz / radialDist) * overlap;
    }
    return onStairs;
}

function updatePlayer() {
    if (shopOpen) return;

    const direction = new THREE.Vector3();
    let isMoving = false;
    if (keys['KeyW']) { direction.z -= 1; isMoving = true; }
    if (keys['KeyS']) { direction.z += 1; isMoving = true; }
    if (keys['KeyA']) { direction.x -= 1; isMoving = true; }
    if (keys['KeyD']) { direction.x += 1; isMoving = true; }

    let onPlatform = false;
    let onGround = false;

    let onStairs = handleTowerAndStairs();

    const dx = player.position.x - TOWER_POS.x;
    const dz = player.position.z - TOWER_POS.z;
    const radialDist = Math.hypot(dx, dz);

    if (radialDist < TOWER_RADIUS && player.position.y >= towerTopY) {
        player.position.y = towerTopY + PLAYER_EYE;
        vY = 0;
        onPlatform = true;
        onStairs = false;
    }

    let onAnySurface = onPlatform || onStairs;

    if (!onAnySurface) {
        vY += GRAVITY;
        player.position.y += vY;

        if (player.position.y < GROUND_Y + PLAYER_EYE) {
            player.position.y = GROUND_Y + PLAYER_EYE;
            vY = 0;
            onGround = true;
        }
    }

    if (isMoving) {
        direction.normalize();
        direction.applyQuaternion(player.quaternion);
        const airborne = !onAnySurface && !onGround;
        const factor = airborne ? AIR_CONTROL : 1;
        player.position.add(direction.multiplyScalar(PLAYER_SPEED * factor));
    }
}

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

function createEnemySprite(spritePath) {
    const key = (spritePath === "boss") ? "sprites/boss.png" : spritePath;
    const tex = new THREE.TextureLoader().load(key);
    const material = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(6, 6, 1);
    const stats = MONSTER_STATS[key] || { health: 20, gold: 10, speed: ENEMY_SPEED };
    sprite.userData.health = stats.health;
    sprite.userData.gold = stats.gold;
    sprite.userData.speed = stats.speed;
    const growl = new THREE.PositionalAudio(listener);
    const audioLoader = new THREE.AudioLoader();
    const soundPath = MONSTER_SOUNDS[spritePath] || "sounds/growl.mp3";
    audioLoader.load(soundPath, buffer => {
        growl.setBuffer(buffer);
        growl.setLoop(true);
        growl.setVolume(0.6);
    });
    sprite.add(growl);
    sprite.userData.sound = growl;
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

function updateEnemies() {
    if (wavesPaused) return;
    if (enemies.length === 0 && waveInProgress) {
        waveInProgress = false;
        nextWaveTimer = performance.now() + 5000;
    }
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const dir = new THREE.Vector3().subVectors(player.position, enemy.position).normalize();
        let baseSpeed = enemy.userData.speed || ENEMY_SPEED;
        let scaledSpeed = baseSpeed * (1 + wave * 0.05);
        enemy.position.add(dir.multiplyScalar(scaledSpeed));

        if (enemy.userData.sound && enemy.userData.sound.buffer) {
            const dist = enemy.position.distanceTo(player.position);
            if (dist < 20 && !enemy.userData.sound.isPlaying) enemy.userData.sound.play();
            else if (dist >= 25 && enemy.userData.sound.isPlaying) enemy.userData.sound.stop();
        }

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
        if (p.position.distanceTo(player.position) > 150) {
            scene.remove(p);
            projectiles.splice(i, 1);
            continue;
        }
        for (let j = enemies.length - 1; j >= 0; j--) {
            const e = enemies[j];
            if (p.position.distanceTo(e.position) < 2.5) {
                e.userData.health -= p.userData.damage;
                scene.remove(p);
                projectiles.splice(i, 1);
                if (e.userData.health <= 0) {
                    if (e.userData.sound && e.userData.sound.isPlaying) e.userData.sound.stop();
                    scene.remove(e);
                    enemies.splice(j, 1);
                    kills++;
                    gold += e.userData.gold;
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
    document.getElementById('wave').textContent = wave;
    console.log("Iniciando Onda " + wave);

    if (wave % 5 === 0) {
        const boss = createEnemySprite("boss");
        boss.scale.set(15, 15, 1);
        const bossStats = MONSTER_STATS["sprites/boss.png"] || { health: 10000, gold: 5000, speed: 0.05 };
        boss.userData.health = bossStats.health;
        boss.userData.gold = bossStats.gold;
        boss.userData.speed = bossStats.speed;
        const angle = Math.random() * Math.PI * 2;
        const dist = ARENA_SIZE * 0.8;
        boss.position.set(player.position.x + Math.cos(angle) * dist, 1.8, player.position.z + Math.sin(angle) * dist);
        scene.add(boss);
        enemies.push(boss);
        return;
    }

    for (let i = 0; i < enemyCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = ARENA_SIZE * 0.9;
        let enemy = createEnemySprite(pickRandomSprite());
        enemy.position.set(player.position.x + Math.cos(angle) * dist, 1.8, player.position.z + Math.sin(angle) * dist);
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
    p.position.copy(player.position).add(dir.clone().multiplyScalar(1.5));
    p.velocity = dir.multiplyScalar(weapon.speed);
    p.userData.damage = weapon.damage;
    scene.add(p);
    projectiles.push(p);

    if (!player.userData.weaponSounds) player.userData.weaponSounds = {};
    const soundPath = WEAPON_SOUNDS[currentWeapon];
    if (!player.userData.weaponSounds[currentWeapon]) {
        const sound = new THREE.Audio(listener);
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load(soundPath, buffer => {
            sound.setBuffer(buffer);
            sound.setVolume(0.5);
        });
        player.userData.weaponSounds[currentWeapon] = sound;
    }
    const weaponSound = player.userData.weaponSounds[currentWeapon];
    if (weaponSound.isPlaying) weaponSound.stop();
    weaponSound.play();
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
    enemies.forEach(e => {
        if (e.userData.sound && e.userData.sound.isPlaying) e.userData.sound.stop();
        scene.remove(e);
    });
    projectiles.forEach(p => scene.remove(p));
    enemies = []; projectiles = [];
    kills = 0; gold = 0; wave = 1; enemyCount = 2;
    currentWeapon = 0; ownedWeapons = [0];
    gameActive = true; shopOpen = false;
    wavesPaused = false;
    player.position.set(0, GROUND_Y + PLAYER_EYE, 5);
    player.rotation.set(0, 0, 0); camera.rotation.set(0, 0, 0);
    document.getElementById('kills').textContent = 0;
    document.getElementById('gold').textContent = 0;
    document.getElementById('wave').textContent = 1;
    document.getElementById('weaponName').textContent = weapons[0].name;
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('shop').style.display = 'none';
    document.getElementById("pauseMessage").style.display = "none";
    updateGunAppearance();
    spawnWave();
}

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
        else if (!canBuy) card.classList.add('locked');

        card.innerHTML = `
            <div class="weapon-name">${weapon.name}</div>
            <div class="weapon-stats">⚔️ Dano: ${weapon.damage}</div>
            <div class="weapon-stats">⚡ Cadência: ${(1000/weapon.fireRate).toFixed(1)}/s</div>
            <div class="weapon-stats">🚀 Vel. Projétil: ${weapon.speed.toFixed(1)}x</div>
            <div class="weapon-desc">${weapon.description}</div>
            <div class="weapon-cost">${isOwned ? '✓ ADQUIRIDA' : weapon.cost + ' 💰'}</div>
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

function setupEventListeners() {
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    document.addEventListener('mousemove', (event) => {
        if (document.pointerLockElement === document.body) {
            player.rotation.y -= event.movementX * 0.002;
            camera.rotation.x -= event.movementY * 0.002;
            camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
        }
    });

    document.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if (e.code === 'KeyP') {
            wavesPaused = !wavesPaused;
            document.getElementById("pauseMessage").style.display = wavesPaused ? "block" : "none";
        }
        if (e.code === 'KeyE') toggleShop();
        if (e.code === 'Space') {
            const onAnySurface = player.position.y <= GROUND_Y + PLAYER_EYE + 0.1 ||
                (Math.hypot(player.position.x - TOWER_POS.x, player.position.z - TOWER_POS.z) < TOWER_RADIUS);
            if(onAnySurface) {
                 vY = JUMP_FORCE;
            }
        }
    });
    document.addEventListener('keyup', (e) => { keys[e.code] = false; });

    document.body.addEventListener('click', () => {
        if (gameActive && !shopOpen) {
            document.body.requestPointerLock();
            shoot();
        }
    });

    document.getElementById('closeShop').onclick = toggleShop;
    document.getElementById('restartButton').onclick = restartGame;

    document.addEventListener("wheel", (e) => {
        if (shopOpen) return;
        const ownedIndex = ownedWeapons.indexOf(currentWeapon);
        if (e.deltaY < 0) {
            const nextIndex = (ownedIndex + 1) % ownedWeapons.length;
            equipWeapon(ownedWeapons[nextIndex]);
        } else {
            const prevIndex = (ownedIndex - 1 + ownedWeapons.length) % ownedWeapons.length;
            equipWeapon(ownedWeapons[prevIndex]);
        }
    });
}