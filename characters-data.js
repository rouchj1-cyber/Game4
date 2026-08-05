window.GameCharacters = (() => {
  const STORAGE_KEY = "zombie_survival_save";

  const WEAPONS = {
    m16: {
      id: "m16",
      name: "M16",
      magSize: 30,
      damage: 24,
      fireCooldown: 95,
      reloadMs: 1800,
      hipSpread: 0.028,
      adsSpread: 0.0012,
      adsFov: 30,
      recoilAds: 0.01,
      recoilHip: 0.022,
      auto: true,
      style: "rifle",
    },
    m249: {
      id: "m249",
      name: "M249",
      magSize: 100,
      damage: 18,
      fireCooldown: 68,
      reloadMs: 3400,
      hipSpread: 0.048,
      adsSpread: 0.0035,
      adsFov: 38,
      recoilAds: 0.014,
      recoilHip: 0.032,
      auto: true,
      style: "saw",
    },
    m60: {
      id: "m60",
      name: "M60",
      magSize: 75,
      damage: 32,
      fireCooldown: 88,
      reloadMs: 3600,
      hipSpread: 0.055,
      adsSpread: 0.0045,
      adsFov: 40,
      recoilAds: 0.02,
      recoilHip: 0.04,
      auto: true,
      style: "heavy",
    },
  };

  const BASE = [
    {
      id: "stephanie",
      name: "스테파니",
      avatar: "stephanie",
      weaponId: "m16",
      level: 12,
      exp: 72,
      skillIcon: "❤",
      skillLabel: "생명력",
      skillDesc: "최대 체력이 크게 증가합니다. 기본 무장: M16",
      owned: true,
      price: 0,
      grenades: 3,
      colors: {
        skin: "#f5c8a8",
        hair: "#e85a8a",
        body: "#e84848",
        bodyDark: "#a02020",
        accent: "#ffb0c8",
        gun: "#4a4a48",
      },
      stats: {
        maxHp: 140,
        speed: 205,
        scoreMult: 1,
        spawnMult: 1,
        damageTakenMult: 0.9,
      },
    },
    {
      id: "arthur",
      name: "아서",
      avatar: "arthur",
      weaponId: "m249",
      level: 2,
      exp: 35,
      skillIcon: "🪙",
      skillLabel: "통행료 할인",
      skillDesc: "처치 점수와 이동 속도가 증가합니다. 기본 무장: M249",
      owned: true,
      price: 0,
      grenades: 3,
      colors: {
        skin: "#f0c090",
        hair: "#8a5a30",
        body: "#a87848",
        bodyDark: "#6a4020",
        accent: "#d0a060",
        gun: "#3a3a36",
      },
      stats: {
        maxHp: 100,
        speed: 255,
        scoreMult: 1.4,
        spawnMult: 1,
        damageTakenMult: 1,
      },
    },
    {
      id: "vivian",
      name: "비비안",
      avatar: "vivian",
      weaponId: "m60",
      level: 1,
      exp: 10,
      skillIcon: "💎",
      skillLabel: "소환료 할인",
      skillDesc: "좀비 스폰이 줄고 재장전이 빨라집니다. 기본 무장: M60",
      owned: false,
      price: 30000,
      grenades: 4,
      colors: {
        skin: "#f0c8a0",
        hair: "#3a6ab0",
        body: "#4a80c8",
        bodyDark: "#2a58a0",
        accent: "#f0c840",
        gun: "#2e3230",
      },
      stats: {
        maxHp: 95,
        speed: 230,
        scoreMult: 1.1,
        spawnMult: 0.72,
        damageTakenMult: 1,
      },
    },
  ];

  function defaultSave() {
    return {
      selectedId: "stephanie",
      gold: 240939,
      gems: 115,
      crystals: 1043,
      characters: BASE.map((c) => ({
        id: c.id,
        owned: c.owned,
        level: c.level,
        exp: c.exp,
      })),
    };
  }

  function loadSave() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultSave();
      const parsed = JSON.parse(raw);
      const base = defaultSave();
      return {
        ...base,
        ...parsed,
        characters: base.characters.map((c) => {
          const saved = (parsed.characters || []).find((s) => s.id === c.id);
          return saved ? { ...c, ...saved } : c;
        }),
      };
    } catch {
      return defaultSave();
    }
  }

  function saveSave(save) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  }

  function getRoster(save = loadSave()) {
    return BASE.map((base) => {
      const saved = save.characters.find((c) => c.id === base.id) || {};
      const weapon = WEAPONS[base.weaponId];
      return {
        ...base,
        owned: saved.owned ?? base.owned,
        level: saved.level ?? base.level,
        exp: saved.exp ?? base.exp,
        weapon,
      };
    });
  }

  function getSelected(save = loadSave()) {
    const roster = getRoster(save);
    return roster.find((c) => c.id === save.selectedId && c.owned) || roster.find((c) => c.owned) || roster[0];
  }

  function getCombatStats(character) {
    const levelBonus = Math.max(0, character.level - 1);
    const s = character.stats;
    const w = character.weapon || WEAPONS[character.weaponId];
    const reloadCut = character.id === "vivian" ? 0.85 : 1;

    return {
      maxHp: Math.round(s.maxHp + levelBonus * 4),
      speed: Math.round(s.speed + levelBonus * 1.5),
      scoreMult: s.scoreMult + levelBonus * 0.01,
      spawnMult: s.spawnMult,
      damageTakenMult: s.damageTakenMult,
      grenades: character.grenades,
      weaponName: w.name,
      weaponStyle: w.style,
      damage: Math.round(w.damage + levelBonus * 0.7),
      magSize: w.magSize,
      reloadMs: Math.max(900, Math.round((w.reloadMs - levelBonus * 20) * reloadCut)),
      fireCooldown: Math.max(55, w.fireCooldown - Math.floor(levelBonus * 0.4)),
      hipSpread: w.hipSpread,
      adsSpread: w.adsSpread,
      adsFov: w.adsFov,
      recoilAds: w.recoilAds,
      recoilHip: w.recoilHip,
      auto: w.auto,
    };
  }

  return {
    STORAGE_KEY,
    WEAPONS,
    BASE,
    loadSave,
    saveSave,
    getRoster,
    getSelected,
    getCombatStats,
    defaultSave,
  };
})();
