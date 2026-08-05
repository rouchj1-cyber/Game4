(() => {
  const THREE = window.THREE;
  if (!THREE) {
    alert("Three.js를 불러오지 못했습니다. 네트워크 연결을 확인해 주세요.");
    return;
  }

  const viewport = document.getElementById("viewport");
  const canvas = document.getElementById("game");
  const hpEl = document.getElementById("hp");
  const scoreEl = document.getElementById("score");
  const waveEl = document.getElementById("wave");
  const killsEl = document.getElementById("kills");
  const ammoEl = document.getElementById("ammo");
  const magSizeEl = document.getElementById("mag-size");
  const grenadesEl = document.getElementById("grenades");
  const weaponNameEl = document.getElementById("weapon-name");
  const reloadHint = document.getElementById("reload-hint");
  const aimHint = document.getElementById("aim-hint");
  const overlay = document.getElementById("overlay");
  const gameover = document.getElementById("gameover");
  const finalScore = document.getElementById("final-score");
  const finalWave = document.getElementById("final-wave");
  const startBtn = document.getElementById("start-btn");
  const retryBtn = document.getElementById("retry-btn");
  const charNameEl = document.getElementById("char-name");
  const charSkillEl = document.getElementById("char-skill");
  const charWeaponEl = document.getElementById("char-weapon");
  const overlayCharEl = document.getElementById("overlay-char");
  const overlaySkillEl = document.getElementById("overlay-skill");
  const overlayWeaponEl = document.getElementById("overlay-weapon");
  const crosshair = document.getElementById("crosshair");
  const scope = document.getElementById("scope");
  const hitmarker = document.getElementById("hitmarker");
  const damageFlash = document.getElementById("damage-flash");
  const criticalBanner = document.getElementById("critical-banner");

  const WORLD = 80;
  const PLAYER_HEIGHT = 1.7;
  const HIP_FOV = 75;
  const GRAVITY = 18;

  let character = window.GameCharacters.getSelected();
  let combat = window.GameCharacters.getCombatStats(character);

  const keys = new Set();
  const mouse = { looking: false, ads: false, left: false };

  let running = false;
  let lastTime = performance.now();
  let yaw = 0;
  let pitch = 0;
  let bob = 0;
  let recoil = 0;
  let muzzleFlash = 0;
  let hitmarkerTimer = 0;
  let damageFlashTimer = 0;
  let grenadeCooldown = 0;
  let isCritical = false;

  const state = {
    score: 0,
    kills: 0,
    wave: 1,
    ammo: combat.magSize,
    grenades: combat.grenades,
    reloading: false,
    reloadTimer: 0,
    fireTimer: 0,
    spawnTimer: 0,
    zombiesToSpawn: 0,
    waveClearTimer: 0,
    invuln: 0,
    zombies: [],
    grenadeList: [],
  };

  const player = {
    x: 0,
    z: 0,
    hp: combat.maxHp,
    maxHp: combat.maxHp,
    speed: combat.speed / 55,
  };

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b120e);
  scene.fog = new THREE.FogExp2(0x0b120e, 0.035);

  const camera = new THREE.PerspectiveCamera(HIP_FOV, 16 / 9, 0.05, 200);
  camera.position.set(0, PLAYER_HEIGHT, 0);
  scene.add(camera);

  const hemi = new THREE.HemisphereLight(0x6a8a70, 0x1a1208, 0.55);
  scene.add(hemi);

  const moon = new THREE.DirectionalLight(0xc8d8ff, 0.55);
  moon.position.set(20, 40, 10);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  moon.shadow.camera.near = 1;
  moon.shadow.camera.far = 100;
  moon.shadow.camera.left = -40;
  moon.shadow.camera.right = 40;
  moon.shadow.camera.top = 40;
  moon.shadow.camera.bottom = -40;
  scene.add(moon);

  const fill = new THREE.PointLight(0xffaa66, 0.35, 30);
  fill.position.set(0, 3, 0);
  scene.add(fill);

  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x243028,
    roughness: 0.95,
    metalness: 0.05,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD * 2, WORLD * 2, 40, 40), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new THREE.GridHelper(WORLD * 2, 40, 0x3a5a40, 0x1e3024);
  grid.position.y = 0.01;
  scene.add(grid);

  const propMat = new THREE.MeshStandardMaterial({ color: 0x3a3228, roughness: 0.9 });
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x5a4630, roughness: 0.85 });
  for (let i = 0; i < 28; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 8 + Math.random() * 30;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const h = 1 + Math.random() * 2.2;
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1.2 + Math.random(), h, 1.2 + Math.random()),
      i % 2 ? crateMat : propMat
    );
    box.position.set(x, h / 2, z);
    box.rotation.y = Math.random() * Math.PI;
    box.castShadow = true;
    box.receiveShadow = true;
    scene.add(box);

    if (Math.random() > 0.55) {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.22, 2.4, 6),
        new THREE.MeshStandardMaterial({ color: 0x3a2a18 })
      );
      trunk.position.set(x + 1.5, 1.2, z + 1.2);
      trunk.castShadow = true;
      scene.add(trunk);
      const leaves = new THREE.Mesh(
        new THREE.ConeGeometry(1.1, 2.2, 7),
        new THREE.MeshStandardMaterial({ color: 0x2a4a28 })
      );
      leaves.position.set(x + 1.5, 2.8, z + 1.2);
      leaves.castShadow = true;
      scene.add(leaves);
    }
  }

  const postMat = new THREE.MeshStandardMaterial({ color: 0x6a2a22 });
  for (let i = 0; i < 16; i++) {
    const t = (i / 16) * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.5, 0.35), postMat);
    post.position.set(Math.cos(t) * (WORLD * 0.55), 1.25, Math.sin(t) * (WORLD * 0.55));
    scene.add(post);
  }

  const weapon = new THREE.Group();
  camera.add(weapon);

  function hex(c) {
    return new THREE.Color(c);
  }

  function clearGroup(group) {
    while (group.children.length) group.remove(group.children[0]);
  }

  function addMuzzle(group, x, y, z) {
    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffee88, transparent: true, opacity: 0 })
    );
    flash.name = "muzzle";
    flash.position.set(x, y, z);
    group.add(flash);
  }

  function buildM16(colors) {
    const gun = hex(colors.gun);
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.12, 0.52),
      new THREE.MeshStandardMaterial({ color: gun, roughness: 0.5, metalness: 0.4 })
    );
    body.position.set(0, 0, -0.24);
    weapon.add(body);

    const carry = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.08, 0.28),
      new THREE.MeshStandardMaterial({ color: 0x2a2a28, metalness: 0.5, roughness: 0.45 })
    );
    carry.position.set(0, 0.1, -0.28);
    weapon.add(carry);

    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.026, 0.42, 10),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.75, roughness: 0.35 })
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.62);
    weapon.add(barrel);

    const stock = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.1, 0.26),
      new THREE.MeshStandardMaterial({ color: hex(colors.bodyDark), roughness: 0.8 })
    );
    stock.position.set(0, -0.01, 0.12);
    weapon.add(stock);

    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.14, 0.08),
      new THREE.MeshStandardMaterial({ color: hex(colors.body), roughness: 0.75 })
    );
    grip.position.set(0, -0.11, -0.02);
    grip.rotation.x = 0.35;
    weapon.add(grip);

    const mag = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.18, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    mag.position.set(0, -0.14, -0.2);
    weapon.add(mag);

    const scopeTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.26, 14),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.6, roughness: 0.4 })
    );
    scopeTube.rotation.x = Math.PI / 2;
    scopeTube.position.set(0, 0.14, -0.26);
    weapon.add(scopeTube);

    const scopeLens = new THREE.Mesh(
      new THREE.CircleGeometry(0.034, 16),
      new THREE.MeshStandardMaterial({
        color: 0x88ccee,
        emissive: 0x224466,
        emissiveIntensity: 0.4,
      })
    );
    scopeLens.position.set(0, 0.14, -0.4);
    weapon.add(scopeLens);

    addMuzzle(weapon, 0, 0.02, -0.86);
  }

  function buildM249(colors) {
    const gun = hex(colors.gun);
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.16, 0.62),
      new THREE.MeshStandardMaterial({ color: gun, roughness: 0.55, metalness: 0.45 })
    );
    body.position.set(0, 0, -0.28);
    weapon.add(body);

    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.034, 0.55, 10),
      new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.3 })
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.03, -0.72);
    weapon.add(barrel);

    const heat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6, roughness: 0.5 })
    );
    heat.rotation.x = Math.PI / 2;
    heat.position.set(0, 0.03, -0.5);
    weapon.add(heat);

    const stock = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.12, 0.3),
      new THREE.MeshStandardMaterial({ color: hex(colors.bodyDark), roughness: 0.8 })
    );
    stock.position.set(0, 0, 0.16);
    weapon.add(stock);

    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.16, 0.1),
      new THREE.MeshStandardMaterial({ color: hex(colors.body), roughness: 0.75 })
    );
    grip.position.set(0, -0.13, -0.05);
    grip.rotation.x = 0.3;
    weapon.add(grip);

    // Ammo box
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.12, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x5a6a3a, roughness: 0.7 })
    );
    box.position.set(0.12, -0.08, -0.18);
    weapon.add(box);

    const bipodL = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    bipodL.position.set(-0.06, -0.14, -0.55);
    bipodL.rotation.z = 0.4;
    weapon.add(bipodL);
    const bipodR = bipodL.clone();
    bipodR.position.x = 0.06;
    bipodR.rotation.z = -0.4;
    weapon.add(bipodR);

    const sight = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.06, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
    );
    sight.position.set(0, 0.12, -0.2);
    weapon.add(sight);

    addMuzzle(weapon, 0, 0.03, -1.02);
  }

  function buildM60(colors) {
    const gun = hex(colors.gun);
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.18, 0.7),
      new THREE.MeshStandardMaterial({ color: gun, roughness: 0.6, metalness: 0.5 })
    );
    body.position.set(0, 0.02, -0.3);
    weapon.add(body);

    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.038, 0.62, 10),
      new THREE.MeshStandardMaterial({ color: 0x1c1c1c, metalness: 0.85, roughness: 0.28 })
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.04, -0.78);
    weapon.add(barrel);

    const cover = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.05, 0.28),
      new THREE.MeshStandardMaterial({ color: 0x3a3a36, metalness: 0.5, roughness: 0.5 })
    );
    cover.position.set(0, 0.14, -0.22);
    weapon.add(cover);

    const stock = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.14, 0.32),
      new THREE.MeshStandardMaterial({ color: hex(colors.bodyDark), roughness: 0.85 })
    );
    stock.position.set(0, 0.01, 0.2);
    weapon.add(stock);

    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.18, 0.1),
      new THREE.MeshStandardMaterial({ color: hex(colors.body), roughness: 0.75 })
    );
    grip.position.set(0, -0.14, 0);
    grip.rotation.x = 0.28;
    weapon.add(grip);

    const belt = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.08, 0.14),
      new THREE.MeshStandardMaterial({ color: hex(colors.accent), roughness: 0.6 })
    );
    belt.position.set(0.14, 0.02, -0.12);
    weapon.add(belt);

    const bipod = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.02, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x444444 })
    );
    bipod.position.set(0, -0.08, -0.6);
    weapon.add(bipod);

    const rearSight = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.07, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    rearSight.position.set(0, 0.16, -0.05);
    weapon.add(rearSight);

    addMuzzle(weapon, 0, 0.04, -1.12);
  }

  function buildWeapon(style, colors) {
    clearGroup(weapon);
    if (style === "saw") buildM249(colors);
    else if (style === "heavy") buildM60(colors);
    else buildM16(colors);
  }

  const hipWeaponPos = new THREE.Vector3(0.28, -0.28, -0.45);
  const adsWeaponPos = new THREE.Vector3(0.0, -0.14, -0.28);
  const weaponPos = hipWeaponPos.clone();
  weapon.position.copy(hipWeaponPos);

  const raycaster = new THREE.Raycaster();
  const shootDir = new THREE.Vector3();
  const tmpVec = new THREE.Vector3();
  const throwVel = new THREE.Vector3();

  function resize() {
    const w = viewport.clientWidth;
    const h = viewport.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  window.addEventListener("resize", resize);
  resize();

  function refreshCharacter() {
    character = window.GameCharacters.getSelected();
    combat = window.GameCharacters.getCombatStats(character);
    charNameEl.textContent = character.name;
    charSkillEl.textContent = character.skillLabel;
    charWeaponEl.textContent = combat.weaponName;
    overlayCharEl.textContent = `${character.name} Lv.${character.level}`;
    overlaySkillEl.textContent = character.skillLabel;
    overlayWeaponEl.textContent = combat.weaponName;
    weaponNameEl.textContent = combat.weaponName;
    magSizeEl.textContent = combat.magSize;
    buildWeapon(combat.weaponStyle, character.colors);
  }

  function updateHud() {
    hpEl.textContent = Math.max(0, Math.ceil(player.hp));
    scoreEl.textContent = state.score;
    waveEl.textContent = state.wave;
    killsEl.textContent = state.kills;
    ammoEl.textContent = state.ammo;
    magSizeEl.textContent = combat.magSize;
    grenadesEl.textContent = state.grenades;
    weaponNameEl.textContent = combat.weaponName;
    reloadHint.classList.toggle("hidden", !state.reloading);
  }

  function setAds(on) {
    mouse.ads = on;
    const showScope = on && combat.weaponStyle === "rifle";
    scope.classList.toggle("hidden", !showScope);
    scope.classList.toggle("active", showScope);
    crosshair.classList.toggle("ads-hidden", showScope);
    aimHint.textContent = on ? `${combat.weaponName} 조준 중` : "우클릭으로 조준";
    aimHint.classList.toggle("ads", on);
  }

  function setCritical(on) {
    if (isCritical === on) return;
    isCritical = on;
    criticalBanner.classList.toggle("hidden", !on || state.grenades <= 0);
  }

  function resetGame() {
    refreshCharacter();
    clearZombies();
    clearGrenades();
    Object.assign(state, {
      score: 0,
      kills: 0,
      wave: 1,
      ammo: combat.magSize,
      grenades: combat.grenades,
      reloading: false,
      reloadTimer: 0,
      fireTimer: 0,
      spawnTimer: 0.5,
      zombiesToSpawn: Math.max(3, Math.round(5 * combat.spawnMult)),
      waveClearTimer: 0,
      invuln: 0,
    });
    player.x = 0;
    player.z = 0;
    player.hp = combat.maxHp;
    player.maxHp = combat.maxHp;
    player.speed = combat.speed / 55;
    yaw = 0;
    pitch = 0;
    bob = 0;
    recoil = 0;
    grenadeCooldown = 0;
    mouse.left = false;
    setAds(false);
    setCritical(false);
    camera.fov = HIP_FOV;
    camera.updateProjectionMatrix();
    updateHud();
  }

  function clearZombies() {
    for (const z of state.zombies) scene.remove(z.mesh);
    state.zombies.length = 0;
  }

  function clearGrenades() {
    for (const g of state.grenadeList) scene.remove(g.mesh);
    state.grenadeList.length = 0;
  }

  function createZombieMesh(tier) {
    const group = new THREE.Group();
    const bodyColor = [0x5a7a42, 0x6b8f3a, 0x4a6235, 0x7ea84e][tier] || 0x5a7a42;
    const scale = [1, 1.15, 1.35, 0.85][tier] || 1;

    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.28, 0.55, 4, 8),
      new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.9 })
    );
    torso.position.y = 1.05;
    torso.castShadow = true;
    group.add(torso);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0x8aaa60, roughness: 0.85 })
    );
    head.position.y = 1.7;
    head.castShadow = true;
    head.name = "head";
    group.add(head);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3030 });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
    const eyeR = eyeL.clone();
    eyeL.position.set(-0.08, 1.74, 0.18);
    eyeR.position.set(0.08, 1.74, 0.18);
    group.add(eyeL, eyeR);

    const armGeo = new THREE.CapsuleGeometry(0.08, 0.45, 3, 6);
    const armMat = new THREE.MeshStandardMaterial({ color: bodyColor });
    const armL = new THREE.Mesh(armGeo, armMat);
    const armR = new THREE.Mesh(armGeo, armMat);
    armL.position.set(-0.4, 1.15, 0.1);
    armR.position.set(0.4, 1.15, 0.1);
    armL.rotation.x = -0.8;
    armR.rotation.x = -0.9;
    group.add(armL, armR);

    const legGeo = new THREE.CapsuleGeometry(0.1, 0.5, 3, 6);
    const legL = new THREE.Mesh(legGeo, armMat);
    const legR = new THREE.Mesh(legGeo, armMat);
    legL.position.set(-0.14, 0.4, 0);
    legR.position.set(0.14, 0.4, 0);
    group.add(legL, legR);

    group.scale.setScalar(scale);
    group.userData.arms = [armL, armR];
    group.userData.legs = [legL, legR];
    return group;
  }

  function spawnZombie() {
    const edge = Math.floor(Math.random() * 4);
    const margin = WORLD * 0.48;
    let x, z;
    if (edge === 0) {
      x = (Math.random() - 0.5) * WORLD;
      z = -margin;
    } else if (edge === 1) {
      x = margin;
      z = (Math.random() - 0.5) * WORLD;
    } else if (edge === 2) {
      x = (Math.random() - 0.5) * WORLD;
      z = margin;
    } else {
      x = -margin;
      z = (Math.random() - 0.5) * WORLD;
    }

    const tier = Math.min(3, Math.floor((state.wave - 1) / 2));
    const useFast = Math.random() < 0.25 && state.wave >= 4;
    const hpBase = [40, 70, 120, 30][useFast ? 3 : tier];
    const speedBase = [1.4, 1.7, 1.15, 2.4][useFast ? 3 : tier];
    const score = [100, 160, 240, 140][useFast ? 3 : tier];
    const mesh = createZombieMesh(useFast ? 3 : tier);
    mesh.position.set(x, 0, z);
    scene.add(mesh);

    state.zombies.push({
      mesh,
      hp: hpBase + state.wave * 8,
      maxHp: hpBase + state.wave * 8,
      speed: speedBase + state.wave * 0.08,
      score,
      hitFlash: 0,
      walk: Math.random() * Math.PI * 2,
    });
  }

  function startWave(wave) {
    state.wave = wave;
    state.zombiesToSpawn = Math.max(3, Math.round((4 + wave * 3) * combat.spawnMult));
    state.spawnTimer = 0.7;
    state.waveClearTimer = 0;
    if (wave % 3 === 0) {
      state.grenades += 1;
      updateHud();
    }
  }

  function tryReload() {
    if (state.reloading || state.ammo === combat.magSize) return;
    state.reloading = true;
    state.reloadTimer = combat.reloadMs;
    updateHud();
  }

  function showHitmarker() {
    hitmarker.classList.remove("hidden");
    hitmarker.classList.add("show");
    hitmarkerTimer = 0.18;
  }

  function damagePlayer(amount) {
    if (state.invuln > 0) return;
    player.hp -= amount * combat.damageTakenMult;
    state.invuln = 0.7;
    damageFlashTimer = 0.25;
    damageFlash.classList.add("on");
    updateHud();
    if (player.hp <= 0) {
      player.hp = 0;
      endGame();
    }
  }

  function endGame() {
    running = false;
    mouse.left = false;
    setAds(false);
    setCritical(false);
    document.exitPointerLock?.();
    finalScore.textContent = state.score;
    finalWave.textContent = state.wave;
    gameover.classList.remove("hidden");
    viewport.classList.add("menu-open");
  }

  function countNearbyZombies(radius) {
    let n = 0;
    for (const z of state.zombies) {
      const dx = player.x - z.mesh.position.x;
      const dz = player.z - z.mesh.position.z;
      if (Math.hypot(dx, dz) <= radius) n += 1;
    }
    return n;
  }

  function evaluateCritical() {
    const lowHp = player.hp / player.maxHp <= 0.35;
    const surrounded = countNearbyZombies(9) >= 4;
    setCritical(lowHp || surrounded);
  }

  function getShootOriginAndDir(spread) {
    camera.getWorldDirection(shootDir);
    if (spread > 0) {
      shootDir.x += (Math.random() - 0.5) * spread;
      shootDir.y += (Math.random() - 0.5) * spread;
      shootDir.z += (Math.random() - 0.5) * spread;
      shootDir.normalize();
    }
    return { origin: camera.getWorldPosition(tmpVec.set(0, 0, 0)), dir: shootDir };
  }

  function killZombie(zombie, mult = 1) {
    state.score += Math.round(zombie.score * combat.scoreMult * mult);
    state.kills += 1;
    scene.remove(zombie.mesh);
    const idx = state.zombies.indexOf(zombie);
    if (idx >= 0) state.zombies.splice(idx, 1);
    updateHud();
  }

  function shoot() {
    if (!running || !mouse.looking || state.reloading || state.fireTimer > 0 || state.ammo <= 0) {
      if (state.ammo <= 0 && !state.reloading) tryReload();
      return;
    }

    state.ammo -= 1;
    state.fireTimer = combat.fireCooldown;
    recoil = mouse.ads ? combat.recoilAds : combat.recoilHip;
    muzzleFlash = 0.05;
    pitch = Math.max(-1.2, pitch - recoil * 0.9);

    const spread = mouse.ads ? combat.adsSpread : combat.hipSpread;
    const { origin, dir } = getShootOriginAndDir(spread);
    raycaster.set(origin.clone(), dir.clone());
    raycaster.far = 90;

    const meshes = state.zombies.map((z) => z.mesh);
    const hits = raycaster.intersectObjects(meshes, true);

    if (hits.length) {
      let root = hits[0].object;
      while (root.parent && !state.zombies.some((z) => z.mesh === root)) root = root.parent;
      const zombie = state.zombies.find((z) => z.mesh === root);
      if (zombie) {
        const isHead = hits[0].object.name === "head";
        const dmg = combat.damage * (isHead ? 2.2 : 1) * (mouse.ads ? 1.2 : 0.88);
        zombie.hp -= dmg;
        zombie.hitFlash = 0.12;
        showHitmarker();

        const spark = new THREE.Mesh(
          new THREE.SphereGeometry(0.05, 6, 6),
          new THREE.MeshBasicMaterial({ color: isHead ? 0xffee88 : 0xff6666 })
        );
        spark.position.copy(hits[0].point);
        scene.add(spark);
        setTimeout(() => scene.remove(spark), 80);

        if (zombie.hp <= 0) killZombie(zombie, isHead ? 1.5 : 1);
      }
    }

    updateHud();
  }

  function createExplosion(pos, radius, damage, critical) {
    const blast = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 12, 12),
      new THREE.MeshBasicMaterial({ color: critical ? 0xff6622 : 0xffaa44, transparent: true, opacity: 0.9 })
    );
    blast.position.copy(pos);
    blast.position.y = Math.max(0.3, pos.y);
    scene.add(blast);

    const light = new THREE.PointLight(critical ? 0xff4400 : 0xffaa33, 3, radius * 3);
    light.position.copy(blast.position);
    scene.add(light);

    let t = 0;
    const expand = () => {
      t += 0.05;
      const s = 1 + t * radius * 1.8;
      blast.scale.setScalar(s);
      blast.material.opacity = Math.max(0, 0.85 - t);
      light.intensity = Math.max(0, 3 - t * 4);
      if (t < 0.9) requestAnimationFrame(expand);
      else {
        scene.remove(blast);
        scene.remove(light);
      }
    };
    expand();

    for (let i = state.zombies.length - 1; i >= 0; i--) {
      const z = state.zombies[i];
      const dx = z.mesh.position.x - pos.x;
      const dz = z.mesh.position.z - pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist <= radius) {
        const falloff = 1 - dist / radius;
        z.hp -= damage * (0.45 + falloff * 0.55);
        z.hitFlash = 0.2;
        if (z.hp <= 0) killZombie(z, critical ? 1.3 : 1);
      }
    }
  }

  function throwGrenade() {
    if (!running || !mouse.looking || state.grenades <= 0 || grenadeCooldown > 0) return;

    state.grenades -= 1;
    grenadeCooldown = 0.85;
    const critical = isCritical;

    camera.getWorldDirection(throwVel);
    const speed = critical ? 14 : 11;
    const vel = throwVel.clone().multiplyScalar(speed);
    vel.y += critical ? 4.5 : 3.2;

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 10, 10),
      new THREE.MeshStandardMaterial({
        color: critical ? 0x8a2020 : 0x3a5a30,
        roughness: 0.55,
        metalness: 0.35,
      })
    );
    const pin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.08, 6),
      new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8 })
    );
    pin.position.y = 0.1;
    mesh.add(pin);

    const origin = camera.getWorldPosition(new THREE.Vector3());
    origin.add(throwVel.clone().multiplyScalar(0.8));
    origin.y -= 0.15;
    mesh.position.copy(origin);
    scene.add(mesh);

    state.grenadeList.push({
      mesh,
      vx: vel.x,
      vy: vel.y,
      vz: vel.z,
      life: critical ? 1.15 : 1.45,
      critical,
      bounced: false,
    });

    updateHud();
    if (state.grenades <= 0) criticalBanner.classList.add("hidden");
  }

  function updateGrenades(dt) {
    for (let i = state.grenadeList.length - 1; i >= 0; i--) {
      const g = state.grenadeList[i];
      g.vy -= GRAVITY * dt;
      g.mesh.position.x += g.vx * dt;
      g.mesh.position.y += g.vy * dt;
      g.mesh.position.z += g.vz * dt;
      g.mesh.rotation.x += dt * 8;
      g.mesh.rotation.z += dt * 6;
      g.life -= dt;

      if (g.mesh.position.y <= 0.12) {
        g.mesh.position.y = 0.12;
        if (!g.bounced) {
          g.bounced = true;
          g.vy *= -0.35;
          g.vx *= 0.55;
          g.vz *= 0.55;
        } else {
          g.vy = 0;
          g.vx *= 0.85;
          g.vz *= 0.85;
        }
      }

      if (g.life <= 0) {
        const radius = g.critical ? 7.5 : 5.2;
        const damage = g.critical ? 160 : 95;
        createExplosion(g.mesh.position.clone(), radius, damage, g.critical);
        scene.remove(g.mesh);
        state.grenadeList.splice(i, 1);
      }
    }
  }

  function updateWeapon(dt, moving) {
    const targetPos = mouse.ads ? adsWeaponPos : hipWeaponPos;
    weaponPos.lerp(targetPos, 1 - Math.pow(0.001, dt));
    const bobAmt = mouse.ads ? 0.002 : 0.012;
    const bobX = Math.sin(bob) * bobAmt * (moving ? 1 : 0.2);
    const bobY = Math.cos(bob * 2) * bobAmt * (moving ? 1 : 0.2);
    const heavyDrop = combat.weaponStyle === "heavy" ? 0.03 : combat.weaponStyle === "saw" ? 0.015 : 0;
    weapon.position.set(weaponPos.x + bobX, weaponPos.y + bobY - recoil - heavyDrop, weaponPos.z);
    weapon.rotation.set(-recoil * 2, mouse.ads ? 0 : -0.08, mouse.ads ? 0 : 0.04);
    recoil = Math.max(0, recoil - dt * 0.14);

    const flash = weapon.getObjectByName("muzzle");
    if (flash) {
      flash.material.opacity = muzzleFlash > 0 ? 1 : 0;
      if (muzzleFlash > 0) muzzleFlash -= dt;
    }

    const targetFov = mouse.ads ? combat.adsFov : HIP_FOV;
    camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 12);
    camera.updateProjectionMatrix();
  }

  function update(dt) {
    if (hitmarkerTimer > 0) {
      hitmarkerTimer -= dt;
      if (hitmarkerTimer <= 0) {
        hitmarker.classList.remove("show");
        hitmarker.classList.add("hidden");
      }
    }
    if (damageFlashTimer > 0) {
      damageFlashTimer -= dt;
      if (damageFlashTimer <= 0) damageFlash.classList.remove("on");
    }
    if (state.invuln > 0) state.invuln -= dt;
    if (state.fireTimer > 0) state.fireTimer -= dt * 1000;
    if (grenadeCooldown > 0) grenadeCooldown -= dt;

    if (state.reloading) {
      state.reloadTimer -= dt * 1000;
      if (state.reloadTimer <= 0) {
        state.reloading = false;
        state.ammo = combat.magSize;
        updateHud();
      }
    }

    if (mouse.left && combat.auto) shoot();

    let mx = 0;
    let mz = 0;
    if (keys.has("w") || keys.has("arrowup")) mz -= 1;
    if (keys.has("s") || keys.has("arrowdown")) mz += 1;
    if (keys.has("a") || keys.has("arrowleft")) mx -= 1;
    if (keys.has("d") || keys.has("arrowright")) mx += 1;

    const moving = mx !== 0 || mz !== 0;
    if (moving) {
      const len = Math.hypot(mx, mz);
      mx /= len;
      mz /= len;
      const heavySlow = combat.weaponStyle === "heavy" ? 0.88 : 1;
      const speed = player.speed * (mouse.ads ? 0.55 : 1) * heavySlow;
      const sin = Math.sin(yaw);
      const cos = Math.cos(yaw);
      player.x += (mx * cos + mz * sin) * speed * dt * 60 * 0.016 * 3.2;
      player.z += (-mx * sin + mz * cos) * speed * dt * 60 * 0.016 * 3.2;
      bob += dt * 10;
    } else {
      bob += dt * 2;
    }

    const limit = WORLD * 0.5 - 1;
    player.x = Math.max(-limit, Math.min(limit, player.x));
    player.z = Math.max(-limit, Math.min(limit, player.z));

    camera.position.set(player.x, PLAYER_HEIGHT + Math.sin(bob * 2) * (moving ? 0.03 : 0.01), player.z);
    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;

    fill.position.set(player.x, 3, player.z);

    updateWeapon(dt, moving);
    updateGrenades(dt);
    evaluateCritical();

    if (state.zombiesToSpawn > 0) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        spawnZombie();
        state.zombiesToSpawn -= 1;
        state.spawnTimer = Math.max(0.35, (0.9 - state.wave * 0.05) / Math.max(0.5, 2 - combat.spawnMult));
      }
    } else if (state.zombies.length === 0) {
      state.waveClearTimer += dt;
      if (state.waveClearTimer > 1.6) {
        startWave(state.wave + 1);
        state.score += Math.round(state.wave * 50 * combat.scoreMult);
        updateHud();
      }
    }

    for (const z of state.zombies) {
      const dx = player.x - z.mesh.position.x;
      const dz = player.z - z.mesh.position.z;
      const dist = Math.hypot(dx, dz) || 1;
      const nx = dx / dist;
      const nz = dz / dist;
      z.mesh.position.x += nx * z.speed * dt;
      z.mesh.position.z += nz * z.speed * dt;
      z.mesh.rotation.y = Math.atan2(nx, nz);
      z.walk += dt * 6;

      (z.mesh.userData.arms || []).forEach((a, i) => {
        a.rotation.x = -0.8 + Math.sin(z.walk + i) * 0.25;
      });
      (z.mesh.userData.legs || []).forEach((l, i) => {
        l.rotation.x = Math.sin(z.walk + i * Math.PI) * 0.45;
      });

      if (z.hitFlash > 0) {
        z.hitFlash -= dt;
        z.mesh.traverse((o) => {
          if (o.isMesh && o.material && o.material.emissive) {
            o.material.emissive.setHex(z.hitFlash > 0 ? 0x553311 : 0x000000);
          }
        });
      }

      if (dist < 1.15) damagePlayer(10 + state.wave * 1.5);
    }
  }

  function loop(ts) {
    const dt = Math.min(0.05, (ts - lastTime) / 1000 || 0.016);
    lastTime = ts;
    if (running) update(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  function lockPointer() {
    canvas.requestPointerLock();
  }

  function begin() {
    resetGame();
    overlay.classList.add("hidden");
    gameover.classList.add("hidden");
    viewport.classList.remove("menu-open");
    running = true;
    lastTime = performance.now();
    lockPointer();
  }

  document.addEventListener("pointerlockchange", () => {
    mouse.looking = document.pointerLockElement === canvas;
    if (!mouse.looking) {
      setAds(false);
      mouse.left = false;
    }
  });

  canvas.addEventListener("click", () => {
    if (running && !mouse.looking) lockPointer();
  });

  window.addEventListener("mousemove", (e) => {
    if (!mouse.looking || !running) return;
    const sens = mouse.ads ? 0.0011 : 0.0022;
    yaw -= e.movementX * sens;
    pitch -= e.movementY * sens;
    pitch = Math.max(-1.25, Math.min(1.25, pitch));
  });

  window.addEventListener("mousedown", (e) => {
    if (!running) return;
    if (e.button === 2) {
      e.preventDefault();
      if (mouse.looking) setAds(true);
    }
    if (e.button === 0 && mouse.looking) {
      mouse.left = true;
      shoot();
    }
  });

  window.addEventListener("mouseup", (e) => {
    if (e.button === 2) setAds(false);
    if (e.button === 0) mouse.left = false;
  });

  window.addEventListener("contextmenu", (e) => e.preventDefault());

  window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    keys.add(key);
    if (!running) return;
    if (key === "r") {
      e.preventDefault();
      tryReload();
    }
    if (key === "g") {
      e.preventDefault();
      throwGrenade();
    }
  });

  window.addEventListener("keyup", (e) => {
    keys.delete(e.key.toLowerCase());
  });

  startBtn.addEventListener("click", begin);
  retryBtn.addEventListener("click", begin);

  viewport.classList.add("menu-open");
  refreshCharacter();
  resetGame();
  requestAnimationFrame(loop);
})();
