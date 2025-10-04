const textureLoader = new THREE.TextureLoader();
const textureCache = {};
const enemyRaycaster = new THREE.Raycaster();
const enemyDownVector = new THREE.Vector3(0, -1, 0);

let lastLightningTime = 0;
let sea, lightningLight, tornadoes = [], island, rain, clouds = [], currentBolt = null;
let scene, camera, renderer, player, listener;
let wavesPaused = false;
let enemies = [], projectiles = [];
let MONSTER_STATS = {};

// ===== VARIÁVEIS DE FÍSICA E JOGO =====
let vY = 0;
const GRAVITY = -0.025;
const JUMP_FORCE = 0.7;
const AIR_CONTROL = 1.5;
const PLAYER_EYE = 1.6;

// ===== VARIÁVEIS DO FAROL =====
// ===== PARÂMETROS GLOBAIS DO FAROL =====
const LIGHTHOUSE_HEIGHT = 50;
const LIGHTHOUSE_RADIUS_BASE = 10;
const LIGHTHOUSE_RADIUS_TOP = 10;

// ===== VARIÁVEIS DO FAROL (usarão os parâmetros acima) =====
let TOWER_RADIUS = LIGHTHOUSE_RADIUS_BASE;
let TOWER_HEIGHT = LIGHTHOUSE_HEIGHT;
let TOWER_POS = new THREE.Vector3(0, 0, 0);
let towerTopY = TOWER_HEIGHT;
let stairSteps = [];
let lighthousePlatform = null;
let lighthouseFloor = null; // <-- GARANTA QUE ESTA LINHA EXISTA
let stairWaypoints = [];
// A posição da porta agora é calculada com o raio correto
const DOOR_POSITION = new THREE.Vector3(0, 2, -LIGHTHOUSE_RADIUS_BASE);
const DOOR_WIDTH = Math.PI / 8;

let beaconPivot = null;

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
const PLAYER_SPEED = 0.3, ARENA_SIZE = 250;


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
    
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    scene.add(new THREE.AmbientLight(0x1a4d6d, 1.5));

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

    createEnvironment();
    createLighthouse();
    createPlayerView();
    setupEventListeners();
    restartGame();
    
    animate();
}

function createEnvironment() {
    scene.fog = new THREE.Fog(0x050a10, 50, 200);

    const skyboxLoader = new THREE.CubeTextureLoader();
    const skyboxTexture = skyboxLoader.load([
        'https://i.imgur.com/M8S1GqW.jpg', 'https://i.imgur.com/zQ3zJ4H.jpg',
        'https://i.imgur.com/c5UeTef.jpg', 'https://i.imgur.com/N33yH5f.jpg',
        'https://i.imgur.com/M8S1GqW.jpg', 'https://i.imgur.com/zQ3zJ4H.jpg'
    ]);
    scene.background = skyboxTexture;

    // --- NUVENS (CÉU COBERTO DE TEMPESTADE) ---
    const cloudMaterial = new THREE.MeshStandardMaterial({
        color: 0x111122,
        transparent: true,
        opacity: 0.6,
        fog: false
    });
    for (let i = 0; i < 70; i++) {
        const cloudGroup = new THREE.Group();
        const mainCloud = new THREE.Mesh(new THREE.SphereGeometry(Math.random() * 100 + 50, 16, 12), cloudMaterial);
        mainCloud.scale.y = 0.3 + Math.random() * 0.2;
        cloudGroup.add(mainCloud);
        for (let j = 0; j < 4; j++) {
            const puff = new THREE.Mesh(new THREE.SphereGeometry(Math.random() * 20 + 10, 8, 8), cloudMaterial);
            puff.position.set((Math.random() - 0.5) * 80, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 80);
            puff.scale.y = 0.5;
            cloudGroup.add(puff);
        }
        cloudGroup.position.set((Math.random() - 0.5) * 1000, 110 + Math.random() * 25, (Math.random() - 0.5) * 1000);
        scene.add(cloudGroup);
        clouds.push(cloudGroup);
    }

    // --- ILHA CENTRAL ---
    const islandGeometry = new THREE.PlaneGeometry(250, 150, 200, 100);
    const islandMaterial = new THREE.MeshLambertMaterial({ color: 0x5a4d3b });
    const vertices = islandGeometry.attributes.position.array;
    for (let i = 0; i <= vertices.length; i += 3) {
        const x = vertices[i];
        const y = vertices[i + 1];
        const dist = Math.sqrt(x * x + y * y);
        const z = 25 * Math.exp(-dist * dist * 0.0002);
        vertices[i + 2] = Math.max(0, z);
    }
    islandGeometry.computeVertexNormals();
    island = new THREE.Mesh(islandGeometry, islandMaterial);
    island.rotation.x = -Math.PI / 2;
    island.position.y = -4;
    island.receiveShadow = true;
    scene.add(island);

    // --- OCEANO E EFEITOS ---
    const seaGeometry = new THREE.PlaneGeometry(ARENA_SIZE * 2, ARENA_SIZE * 2, 200, 200);
    const waterNormalMap = new THREE.TextureLoader().load('data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAcFBQYFBAcGBgYIBwcICxILCwoKCxYPEA0SGhYbGhkWGRgcICgiHB4mHhgZIzAkJiorLS4tGyA2PDg4OkM4RUBDAQcHBwYIChwGChHmGRUqIigoR0RHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0f/wAARCAAQABADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAP/xAAfEAACAQMFAQAAAAAAAAAAAAABAgMABBEhMQUSE0H/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AtUaAlE3VxxI71dY2eHyyc8Kysp78EVBcHkXyEbZ4AJj5e+KSbA45MQD2wBmqA//9k=');
    waterNormalMap.wrapS = THREE.RepeatWrapping;
    waterNormalMap.wrapT = THREE.RepeatWrapping;
    const seaMaterial = new THREE.MeshStandardMaterial({
        color: 0x001a33, roughness: 0.2, metalness: 0.8, transparent: true, opacity: 0.9,
        normalMap: waterNormalMap, normalScale: new THREE.Vector2(2, 2)
    });
    sea = new THREE.Mesh(seaGeometry, seaMaterial);
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = -2;
    sea.receiveShadow = true;
    scene.add(sea);
    const rainCount = 10000;
    const rainGeo = new THREE.BufferGeometry();
    const rainVertices = [];
    for (let i = 0; i < rainCount; i++) {
        rainVertices.push( Math.random() * 400 - 200, Math.random() * 100, Math.random() * 400 - 200 );
    }
    rainGeo.setAttribute('position', new THREE.Float32BufferAttribute(rainVertices, 3));
    const rainMaterial = new THREE.PointsMaterial({ color: 0xaaaaaa, size: 0.2, transparent: true, opacity: 0.7 });
    rain = new THREE.Points(rainGeo, rainMaterial);
    scene.add(rain);
    lightningLight = new THREE.PointLight(0xccffff, 0, ARENA_SIZE * 2);
    lightningLight.position.set(0, 150, 0);
    scene.add(lightningLight);
    for (let i = 0; i < 3; i++) {
        const tornadoHeight = 150;
        const tornadoGeo = new THREE.ConeGeometry(20, tornadoHeight, 32, 64, true);
        const tornadoMat = new THREE.MeshStandardMaterial({ color: 0x111111, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
        const tornado = new THREE.Mesh(tornadoGeo, tornadoMat);
        const angle = Math.random() * Math.PI * 2;
        const dist = ARENA_SIZE * 0.8;
        tornado.rotation.x = Math.PI;
        tornado.position.set(Math.cos(angle) * dist, sea.position.y + tornadoHeight/2 - 5, Math.sin(angle) * dist);
        tornado.castShadow = true;
        scene.add(tornado);
        tornadoes.push(tornado);
    }
}

function createLightningBolt() {
    // Se já existir um raio na cena, removemos antes de criar o próximo
    if (currentBolt) {
        scene.remove(currentBolt);
    }

    const boltMaterial = new THREE.MeshBasicMaterial({ color: 0xccffff });
    const boltGroup = new THREE.Group();

    // Ponto de início do raio, bem alto no céu
    let startPoint = new THREE.Vector3(
        (Math.random() - 0.5) * 300,
        120, // Altura inicial
        (Math.random() - 0.5) * 300
    );

    let endPoint = new THREE.Vector3();
    let direction = new THREE.Vector3();
    
    // O raio será composto por vários segmentos
    for (let i = 0; i < 8; i++) {
        // Define uma direção aleatória para o próximo segmento, sempre para baixo
        direction.set(
            (Math.random() - 0.5) * 25,
            -15 - Math.random() * 10, // Segmento com 15-25 unidades para baixo
            (Math.random() - 0.5) * 25
        );
        endPoint.copy(startPoint).add(direction);

        const distance = startPoint.distanceTo(endPoint);
        // Cria o segmento do raio como um cilindro fino
        const cylinder = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.3, distance, 8),
            boltMaterial
        );

        // Posiciona o cilindro no meio do caminho entre o ponto inicial e final
        cylinder.position.copy(startPoint).lerp(endPoint, 0.5);
        // Orienta o cilindro para conectar os dois pontos
        cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());

        boltGroup.add(cylinder);
        startPoint.copy(endPoint); // O novo ponto de partida é o final do anterior
    }

    scene.add(boltGroup);
    currentBolt = boltGroup; // Armazena a referência do raio atual

    // O raio desaparece rapidamente para criar o efeito de flash
    setTimeout(() => {
        if (currentBolt === boltGroup) { // Garante que não estamos removendo um raio mais novo
            scene.remove(boltGroup);
            currentBolt = null;
        }
    }, 150 + Math.random() * 150); // Duração de 150 a 300 milissegundos
}

function createLighthouse() {
    TOWER_POS.set(0, 0, 0); 
    const CUPOLA_HEIGHT = 12;
    const baseHeightOnIsland = 20;

    const rockBaseGeometry = new THREE.CylinderGeometry(LIGHTHOUSE_RADIUS_BASE + 2, LIGHTHOUSE_RADIUS_BASE + 4, 8, 16);
    const rockBaseMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
    const rockBase = new THREE.Mesh(rockBaseGeometry, rockBaseMaterial);
    rockBase.position.set(TOWER_POS.x, baseHeightOnIsland - 2, TOWER_POS.z);
    rockBase.receiveShadow = true;
    rockBase.castShadow = true;
    scene.add(rockBase);

    // --- ARCO DA PORTA (VISÍVEL) ---
    const doorFrameMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    const frameSideGeo = new THREE.BoxGeometry(0.5, 6.5, 0.5);
    const leftFrame = new THREE.Mesh(frameSideGeo, doorFrameMaterial);
    leftFrame.position.set(DOOR_POSITION.x - 1.75, DOOR_POSITION.y + baseHeightOnIsland, DOOR_POSITION.z);
    scene.add(leftFrame);
    const rightFrame = new THREE.Mesh(frameSideGeo, doorFrameMaterial);
    rightFrame.position.set(DOOR_POSITION.x + 1.75, DOOR_POSITION.y + baseHeightOnIsland, DOOR_POSITION.z);
    scene.add(rightFrame);
    const topFrameGeo = new THREE.BoxGeometry(4.0, 0.5, 0.5);
    const topFrame = new THREE.Mesh(topFrameGeo, doorFrameMaterial);
    topFrame.position.set(DOOR_POSITION.x, DOOR_POSITION.y + baseHeightOnIsland + 3, DOOR_POSITION.z);
    scene.add(topFrame);

    // --- PISO INTERNO DO FAROL ---
    const floorGeo = new THREE.CylinderGeometry(LIGHTHOUSE_RADIUS_BASE - 0.5, LIGHTHOUSE_RADIUS_BASE - 0.5, 0.5, 32);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x3a2d1b });
    lighthouseFloor = new THREE.Mesh(floorGeo, floorMat);
    lighthouseFloor.position.set(TOWER_POS.x, baseHeightOnIsland, TOWER_POS.z);
    lighthouseFloor.receiveShadow = true;
    scene.add(lighthouseFloor);

    // --- PAREDES DO FAROL (COM BASE OCA) ---
    const stripHeight = LIGHTHOUSE_HEIGHT / 6;
    for (let i = 0; i < 6; i++) {
        const material = (i % 2 === 0)
            ? new THREE.MeshStandardMaterial({ color: 0xaa0000, roughness: 0.6 })
            : new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
        
        let stripGeo;
        // ****** MUDANÇA IMPORTANTE AQUI ******
        // Se for a primeira faixa (a de baixo), cria um TUBO OCO
        if (i === 0) {
            const wallThickness = 1; // Espessura da parede
            stripGeo = new THREE.CylinderGeometry(
                LIGHTHOUSE_RADIUS_BASE,          // Raio externo de baixo
                LIGHTHOUSE_RADIUS_TOP,           // Raio externo de cima
                stripHeight, 32, 1, true);       // O 'true' abre o cilindro
        } 
        // Para as outras faixas, continua criando um cilindro sólido
        else {
             stripGeo = new THREE.CylinderGeometry(
                THREE.MathUtils.lerp(LIGHTHOUSE_RADIUS_BASE, LIGHTHOUSE_RADIUS_TOP, i / 6),
                THREE.MathUtils.lerp(LIGHTHOUSE_RADIUS_BASE, LIGHTHOUSE_RADIUS_TOP, (i + 1) / 6),
                stripHeight, 32
            );
        }

        const stripMesh = new THREE.Mesh(stripGeo, material);
        stripMesh.position.set(TOWER_POS.x, baseHeightOnIsland + stripHeight / 2 + i * stripHeight, TOWER_POS.z);
        stripMesh.castShadow = true;
        scene.add(stripMesh);
    }
    towerTopY = baseHeightOnIsland + LIGHTHOUSE_HEIGHT;
    
    const platformGeo = new THREE.CylinderGeometry(LIGHTHOUSE_RADIUS_TOP - 0.5, LIGHTHOUSE_RADIUS_TOP - 0.5, 0.5, 32);
    const platformMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
    lighthousePlatform = new THREE.Mesh(platformGeo, platformMat);
    lighthousePlatform.position.set(TOWER_POS.x, towerTopY, TOWER_POS.z);
    lighthousePlatform.receiveShadow = true;
    scene.add(lighthousePlatform);

    const cupolaGeo = new THREE.CylinderGeometry(LIGHTHOUSE_RADIUS_TOP, LIGHTHOUSE_RADIUS_TOP, CUPOLA_HEIGHT, 16);
    const cupolaMaterial = new THREE.MeshStandardMaterial({ color: 0x445566, transparent: true, opacity: 0.8, roughness: 0.2 });
    const cupola = new THREE.Mesh(cupolaGeo, cupolaMaterial);
    cupola.position.set(TOWER_POS.x, towerTopY + CUPOLA_HEIGHT / 2, TOWER_POS.z);
    scene.add(cupola);
    const roofGeo = new THREE.ConeGeometry(LIGHTHOUSE_RADIUS_TOP + 1, 4, 16);
    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5 });
    const roof = new THREE.Mesh(roofGeo, roofMaterial);
    roof.position.set(TOWER_POS.x, towerTopY + CUPOLA_HEIGHT + 2, TOWER_POS.z);
    roof.castShadow = true;
    scene.add(roof);

    const spotLight = new THREE.SpotLight(0xffffdd, 50, 350, Math.PI / 8, 0.4, 1.5);
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    beaconPivot = new THREE.Group();
    spotLight.target = new THREE.Object3D();
    beaconPivot.add(spotLight);
    beaconPivot.add(spotLight.target);
    beaconPivot.position.set(TOWER_POS.x, towerTopY + CUPOLA_HEIGHT / 2, TOWER_POS.z);
    spotLight.target.position.set(50, -30, 0);
    scene.add(beaconPivot);
    
    stairSteps = [];
    stairWaypoints = [];
    const stepMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
    const stepsGroup = new THREE.Group();
    const totalSteps = 100;
    const stairHeight = LIGHTHOUSE_HEIGHT - 2;
    const innerRadius = LIGHTHOUSE_RADIUS_BASE * 0.8;
    stairWaypoints.push(DOOR_POSITION.clone().add(new THREE.Vector3(0, baseHeightOnIsland, 4)));

    for (let i = 0; i < totalSteps; i++) {
        const stepHeight = 0.2;
        const stepDepth = 2.0;
        const stepWidth = 4.0;
        const angle = (i / totalSteps) * Math.PI * 10;
        const y = baseHeightOnIsland + 2 + (i / totalSteps) * stairHeight;
        const stepGeo = new THREE.BoxGeometry(stepWidth, stepHeight, stepDepth);
        const step = new THREE.Mesh(stepGeo, stepMaterial);
        const x = TOWER_POS.x + Math.cos(angle) * (innerRadius - stepDepth/2);
        const z = TOWER_POS.z + Math.sin(angle) * (innerRadius - stepDepth/2);
        step.position.set(x, y, z);
        step.rotation.y = -angle;
        step.castShadow = true;
        stepsGroup.add(step);
        stairSteps.push(step);
        if (i % 5 === 0) stairWaypoints.push(step.position.clone());
    }
    stairWaypoints.push(new THREE.Vector3(TOWER_POS.x, towerTopY, TOWER_POS.z));
    scene.add(stepsGroup);

    TOWER_HEIGHT = baseHeightOnIsland + LIGHTHOUSE_HEIGHT + CUPOLA_HEIGHT + 4;
    TOWER_RADIUS = LIGHTHOUSE_RADIUS_BASE;
}

const raycaster = new THREE.Raycaster();
const downVector = new THREE.Vector3(0, -1, 0);

function updatePlayer() {
    if (shopOpen) return;
    if (player.position.y < -1.5) { gameOver(); return; }

    const direction = new THREE.Vector3();
    const velocity = new THREE.Vector3();
    let isMoving = false;
    if (keys['KeyW']) { direction.z -= 1; isMoving = true; }
    if (keys['KeyS']) { direction.z += 1; isMoving = true; }
    if (keys['KeyA']) { direction.x -= 1; isMoving = true; }
    if (keys['KeyD']) { direction.x += 1; isMoving = true; }
    
    if (isMoving) {
        direction.normalize();
        direction.applyQuaternion(player.quaternion);
        velocity.copy(direction).multiplyScalar(PLAYER_SPEED);
    }
    
    let onSurface = false;
    const dx = player.position.x - TOWER_POS.x;
    const dz = player.position.z - TOWER_POS.z;
    const radialDist = Math.hypot(dx, dz);

    // Se o jogador está dentro do alcance do farol
    if (radialDist < TOWER_RADIUS + 0.5) {
        const rayOrigin = new THREE.Vector3(player.position.x, player.position.y + 0.1, player.position.z);
        raycaster.set(rayOrigin, downVector);
        
        // A checagem de colisão agora inclui o PISO, a ESCADA e a PLATAFORMA
        const intersects = raycaster.intersectObjects([lighthouseFloor, ...stairSteps, lighthousePlatform].filter(Boolean));
        
        if (intersects.length > 0) {
            const groundHeight = intersects[0].point.y;
            if (player.position.y < groundHeight + PLAYER_EYE + 0.5) {
                player.position.y = groundHeight + PLAYER_EYE;
                vY = 0;
                onSurface = true;
            }
        }
    } 
    // Se o jogador está na ilha
    else if (island) {
        const rayOrigin = new THREE.Vector3(player.position.x, player.position.y + 1, player.position.z);
        raycaster.set(rayOrigin, downVector);
        const intersects = raycaster.intersectObject(island);
        if (intersects.length > 0) {
            const groundHeight = intersects[0].point.y;
            if (player.position.y < groundHeight + PLAYER_EYE + 0.5) {
                player.position.y = groundHeight + PLAYER_EYE;
                vY = 0;
                onSurface = true;
            }
        }
    }
    
    // Lógica de Pulo e Gravidade
    if (onSurface && keys['Space']) vY = JUMP_FORCE;
    if (!onSurface) vY += GRAVITY;

    player.position.y += vY;
    const factor = onSurface ? 1 : AIR_CONTROL;
    player.position.x += velocity.x * factor;
    player.position.z += velocity.z * factor;
    
    // Lógica de Colisão com a parede/porta
    const finalDx = player.position.x - TOWER_POS.x;
    const finalDz = player.position.z - TOWER_POS.z;
    const finalRadialDist = Math.hypot(finalDx, finalDz);
    const playerAngle = Math.atan2(finalDz, finalDx);
    const doorAngle = Math.atan2(DOOR_POSITION.z, DOOR_POSITION.x);
    let inDoorway = Math.abs(playerAngle - doorAngle) < DOOR_WIDTH && finalRadialDist > TOWER_RADIUS - 1;

    if (finalRadialDist < TOWER_RADIUS && !inDoorway) {
        const overlap = TOWER_RADIUS - finalRadialDist;
        player.position.x += (finalDx / finalRadialDist) * overlap;
        player.position.z += (finalDz / finalRadialDist) * overlap;
    }
}

function animate() {
    requestAnimationFrame(animate);
    const time = performance.now() * 0.0005;

    if (sea) {
        const seaVertices = sea.geometry.attributes.position.array;
        for (let i = 0; i < seaVertices.length; i += 3) {
            const x = seaVertices[i];
            const y = seaVertices[i + 1];
            const wave1 = Math.sin(x * 0.05 + time) * 3.5;
            const wave2 = Math.sin(y * 0.03 + time * 0.8) * 3.5;
            seaVertices[i + 2] = wave1 + wave2;
        }
        sea.geometry.attributes.position.needsUpdate = true;
        sea.geometry.computeVertexNormals();
        if (sea.material.normalMap) {
            sea.material.normalMap.offset.x += 0.0005;
            sea.material.normalMap.offset.y += 0.0002;
        }
    }
    
    const now = performance.now();
    // Checa se já se passaram 30 segundos (30000 milissegundos) desde o último raio
    if (now - lastLightningTime > 30000) {
        lightningLight.intensity = Math.random() * 8 + 4; // Aumentei um pouco o clarão
        createLightningBolt();
        setTimeout(() => { lightningLight.intensity = 0; }, 100 + Math.random() * 150);
        
        lastLightningTime = now; // Atualiza o tempo do último raio
    }
    
    tornadoes.forEach(tornado => { tornado.rotation.y += 0.05; });

    if (rain) {
        const rainVertices = rain.geometry.attributes.position.array;
        for (let i = 1; i < rainVertices.length; i += 3) {
            rainVertices[i] -= 0.5;
            if (rainVertices[i] < -5) rainVertices[i] = 100;
        }
        rain.geometry.attributes.position.needsUpdate = true;
    }

    if (gameActive && !shopOpen) {
        updatePlayer();
        updateEnemies();
        updateProjectiles();
        if (!waveInProgress && nextWaveTimer > 0 && performance.now() > nextWaveTimer) {
            wave++;
            enemyCount += 3;
            spawnWave();
            nextWaveTimer = 0;
        }
    }

    if (beaconPivot) beaconPivot.rotation.y += 0.02;
    renderer.render(scene, camera);
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
    let tex;
    if (textureCache[key]) {
        tex = textureCache[key];
    } else {
        tex = textureLoader.load(key);
        textureCache[key] = tex;
    }
    const material = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(6, 6, 1);
    const stats = MONSTER_STATS[key] || { health: 20, gold: 10, speed: ENEMY_SPEED };
    sprite.userData = { ...stats }; // Copia todas as stats
    
    // NOVA IA: Define o estado inicial
    sprite.userData.aiState = 'SEEKING_PLAYER_OUTSIDE';
    sprite.userData.waypointIndex = 0;

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

function updateEnemies() {
    if (wavesPaused) return;
    if (enemies.length === 0 && waveInProgress) {
        waveInProgress = false;
        nextWaveTimer = performance.now() + 0;
    }

    const playerInsideTower = Math.hypot(player.position.x - TOWER_POS.x, player.position.z - TOWER_POS.z) < TOWER_RADIUS;

    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        let targetPosition = player.position;

        // --- LÓGICA DE ESTADOS DA IA ---
        if (playerInsideTower) {
            if (enemy.userData.aiState === 'SEEKING_PLAYER_OUTSIDE') {
                enemy.userData.aiState = 'SEEKING_DOORWAY';
                enemy.userData.waypointIndex = 0;
            }
            if (enemy.userData.aiState === 'SEEKING_DOORWAY') {
                targetPosition = stairWaypoints[0]; // Alvo é a porta
                if (enemy.position.distanceTo(targetPosition) < 2) {
                    enemy.userData.aiState = 'CLIMBING_STAIRS';
                }
            }
            if (enemy.userData.aiState === 'CLIMBING_STAIRS') {
                targetPosition = stairWaypoints[enemy.userData.waypointIndex];
                if (enemy.position.distanceTo(targetPosition) < 2) {
                    enemy.userData.waypointIndex++;
                    if (enemy.userData.waypointIndex >= stairWaypoints.length) {
                        enemy.userData.aiState = 'SEEKING_PLAYER_INSIDE';
                    }
                }
            }
        } else {
            enemy.userData.aiState = 'SEEKING_PLAYER_OUTSIDE';
        }

        const dir = new THREE.Vector3().subVectors(targetPosition, enemy.position);
        if (enemy.userData.aiState !== 'CLIMBING_STAIRS') dir.y = 0;
        dir.normalize();

        let baseSpeed = enemy.userData.speed || ENEMY_SPEED;
        let scaledSpeed = baseSpeed * (1 + wave * 0.05);
        enemy.position.add(dir.multiplyScalar(scaledSpeed));

        // --- COLISÃO DO MONSTRO COM O FAROL ---
        const enemyDx = enemy.position.x - TOWER_POS.x;
        const enemyDz = enemy.position.z - TOWER_POS.z;
        const enemyRadialDist = Math.hypot(enemyDx, enemyDz);
        if (enemyRadialDist < TOWER_RADIUS && enemy.userData.aiState === 'SEEKING_PLAYER_OUTSIDE') {
            const overlap = TOWER_RADIUS - enemyRadialDist;
            enemy.position.x += (enemyDx / enemyRadialDist) * overlap;
            enemy.position.z += (enemyDz / enemyRadialDist) * overlap;
        }

        // Raycasting para manter no chão (se não estiver subindo escada)
        if (enemy.userData.aiState !== 'CLIMBING_STAIRS') {
            const enemyRayOrigin = new THREE.Vector3(enemy.position.x, 50, enemy.position.z);
            enemyRaycaster.set(enemyRayOrigin, enemyDownVector);
            const intersects = enemyRaycaster.intersectObject(island);
            if (intersects.length > 0) {
                enemy.position.y = intersects[0].point.y + 3;
            }
        }

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
    if (soundPath && !player.userData.weaponSounds[currentWeapon]) {
        const sound = new THREE.Audio(listener);
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load(soundPath, buffer => {
            sound.setBuffer(buffer);
            sound.setVolume(0.5);
        });
        player.userData.weaponSounds[currentWeapon] = sound;
    }
    const weaponSound = player.userData.weaponSounds[currentWeapon];
    if (weaponSound) {
        if (weaponSound.isPlaying) weaponSound.stop();
        weaponSound.play();
    }
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
    enemies = [];
    projectiles = [];
    kills = 0;
    gold = 0;
    wave = 1;
    enemyCount = 2;
    currentWeapon = 0;
    ownedWeapons = [0];
    gameActive = true;
    shopOpen = false;
    wavesPaused = false;
    player.position.set(30, 40, 30);
    player.rotation.set(0, 0, 0);
    camera.rotation.set(0, 0, 0);
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