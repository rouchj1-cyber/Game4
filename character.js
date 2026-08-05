(() => {
  const GC = window.GameCharacters;
  let save = GC.loadSave();
  let characters = GC.getRoster(save);
  let selectedId = save.selectedId;
  let gold = save.gold;

  const cardRow = document.getElementById("card-row");
  const goldEl = document.getElementById("gold");
  const gemsEl = document.getElementById("gems");
  const crystalsEl = document.getElementById("crystals");
  const toast = document.getElementById("toast");
  const playBtn = document.getElementById("play-btn");
  let toastTimer = null;

  function formatNumber(n) {
    return n.toLocaleString("en-US");
  }

  function persist() {
    save = {
      ...save,
      selectedId,
      gold,
      characters: characters.map((c) => ({
        id: c.id,
        owned: c.owned,
        level: c.level,
        exp: c.exp,
      })),
    };
    GC.saveSave(save);
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add("hidden"), 1600);
  }

  function syncCurrencyHud() {
    goldEl.textContent = formatNumber(gold);
    gemsEl.textContent = formatNumber(save.gems);
    crystalsEl.textContent = formatNumber(save.crystals);
  }

  function renderCards() {
    cardRow.innerHTML = characters
      .map((c) => {
        const isSelected = c.id === selectedId;
        const stateClass = !c.owned ? "locked" : isSelected ? "selected" : "owned";

        let actionHtml;
        if (!c.owned) {
          actionHtml = `
            <button class="action-btn buy" type="button" data-action="buy" data-id="${c.id}">
              <span class="coin" aria-hidden="true"></span>
              ${formatNumber(c.price)}
            </button>`;
        } else if (isSelected) {
          actionHtml = `
            <button class="action-btn selected" type="button" disabled>
              <span class="check">✓</span> 선택됨
            </button>`;
        } else {
          actionHtml = `
            <button class="action-btn select" type="button" data-action="select" data-id="${c.id}">
              선택하기
            </button>`;
        }

        return `
          <article class="char-card ${stateClass}" data-id="${c.id}">
            <div class="char-frame">
              <button class="info-btn" type="button" data-action="info" data-id="${c.id}" aria-label="${c.name} 정보">i</button>
              <div class="char-name">${c.name}</div>
              <div class="portrait">
                <div class="avatar ${c.avatar}" aria-hidden="true">
                  <div class="hair"></div>
                  <div class="head"></div>
                  <div class="eyes"><span></span><span></span></div>
                  <div class="blush"><span></span><span></span></div>
                  <div class="body"></div>
                </div>
              </div>
              <div class="level-row">
                <div class="level-meta">
                  <span class="level-label">레벨 ${c.level}</span>
                  <div class="level-bar" aria-hidden="true">
                    <div class="level-fill" style="width:${c.exp}%"></div>
                  </div>
                </div>
                <button class="level-plus" type="button" data-action="levelup" data-id="${c.id}" aria-label="레벨업">+</button>
              </div>
              <div class="skill">
                <div class="skill-icon">${c.skillIcon}</div>
                <div class="skill-label">${c.skillLabel}</div>
              </div>
              <div class="weapon-tag">${c.weapon?.name || ""}</div>
            </div>
            ${actionHtml}
          </article>`;
      })
      .join("");
  }

  function selectCharacter(id) {
    const character = characters.find((c) => c.id === id);
    if (!character || !character.owned) return;
    selectedId = id;
    persist();
    renderCards();
    showToast(`${character.name} 선택 완료!`);
  }

  function buyCharacter(id) {
    const character = characters.find((c) => c.id === id);
    if (!character || character.owned) return;

    if (gold < character.price) {
      showToast("골드가 부족합니다.");
      return;
    }

    gold -= character.price;
    character.owned = true;
    selectedId = id;
    persist();
    syncCurrencyHud();
    renderCards();
    showToast(`${character.name} 구매 완료!`);
  }

  function levelUp(id) {
    const character = characters.find((c) => c.id === id);
    if (!character) return;
    if (!character.owned) {
      showToast("먼저 캐릭터를 구매하세요.");
      return;
    }

    const cost = 500 + character.level * 200;
    if (gold < cost) {
      showToast("골드가 부족합니다.");
      return;
    }

    gold -= cost;
    character.level += 1;
    character.exp = Math.min(95, character.exp + 12);
    persist();
    syncCurrencyHud();
    renderCards();
    showToast(`${character.name} 레벨 ${character.level}!`);
  }

  function showInfo(id) {
    const character = characters.find((c) => c.id === id);
    if (!character) return;
    showToast(`${character.name} · ${character.weapon?.name || ""} · ${character.skillDesc}`);
  }

  function goToGame() {
    const selected = characters.find((c) => c.id === selectedId);
    if (!selected || !selected.owned) {
      showToast("캐릭터를 먼저 선택하세요.");
      return;
    }
    persist();
    window.location.href = "index.html";
  }

  cardRow.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;

    const { action, id } = btn.dataset;
    if (action === "select") selectCharacter(id);
    if (action === "buy") buyCharacter(id);
    if (action === "levelup") levelUp(id);
    if (action === "info") showInfo(id);
  });

  document.querySelector(".close-btn").addEventListener("click", () => {
    goToGame();
  });

  playBtn.addEventListener("click", goToGame);

  document.querySelectorAll(".bottom-nav .nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      document.querySelectorAll(".bottom-nav .nav-item").forEach((el) => el.classList.remove("active"));
      item.classList.add("active");
      showToast(`${item.textContent} 메뉴`);
    });
  });

  if (!characters.some((c) => c.id === selectedId && c.owned)) {
    selectedId = characters.find((c) => c.owned)?.id || "stephanie";
    persist();
  }

  syncCurrencyHud();
  renderCards();
})();
