import './style.css';

/* ---------- API URLs ---------- */
type Page = "films" | "people" | "planets";

const API_BASE    = "https://swapi.tech/api";
const FILMS_URL   = `${API_BASE}/films`;
const PEOPLE_URL  = `${API_BASE}/people?page=1&limit=100`;
const PLANETS_URL = `${API_BASE}/planets?page=1&limit=100`;

const ENDPOINT: Record<Page, string> = {
  films:   FILMS_URL,
  people:  PEOPLE_URL,
  planets: PLANETS_URL,
};

/* ---------- DOM ссылки ---------- */
const listEl = document.getElementById("list") as HTMLUListElement | null;
const searchEl = document.getElementById("search") as HTMLInputElement | null;
const navButtons = document.querySelectorAll<HTMLButtonElement>("nav button");

if (!listEl || !searchEl) {
  throw new Error("Elements #list or #search not found in DOM");
}

/* ---------- Состояние ---------- */
let currentPage: Page = "films";

type Item = { title: string; subtitle?: string; uid?: string }; // uid нужен для people/planets
let data: Item[] = [];

/* ---------- Загрузка списка ---------- */
async function loadData(page: Page) {
  listEl!.innerHTML = `<li class="loading">Loading…</li>`;

  try {
    const url = ENDPOINT[page];
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    data =
      page === "films"
        ? json.result.map((f: any) => ({
            title: f.properties.title,
            subtitle: `${f.properties.release_date} · ${f.properties.director}`,
          }))
        : json.results.map((r: any) => ({
            title: r.name,
            uid: r.uid, // понадобится для запроса деталей
          }));

    renderList();
  } catch (e: any) {
    listEl!.innerHTML = `<li class="error">Loading error: ${e?.message ?? "Unknown"}</li>`;
  }
}

/* ---------- Рендер списка + фильтр ---------- */
function renderList() {
  const q = (searchEl!.value || "").toLowerCase();
  const filtered = data.filter((item) => item.title.toLowerCase().includes(q));

  if (!filtered.length) {
    listEl!.innerHTML = `<li class="empty">Nothing found</li>`;
    return;
  }

  // data-* кладём type и uid, чтобы по клику знать, что грузить
  listEl!.innerHTML = filtered
    .map(
      (item) => `
      <li class="card"
          data-type="${currentPage}"
          data-uid="${item.uid ?? ''}">
        <h3 class="card-title">${item.title}</h3>
        ${item.subtitle ? `<p class="card-sub">${item.subtitle}</p>` : ``}
      </li>
    `
    )
    .join("");
}

/* ---------- Детали по клику на карточку (delegation) ---------- */
listEl!.addEventListener("click", async (ev) => {
  const card = (ev.target as HTMLElement).closest("li.card") as HTMLLIElement | null;
  if (!card) return;

  const type = card.dataset.type as Page | undefined;
  const uid  = card.dataset.uid;

  // Для фильмов (или если uid пустой) — деталей не грузим
  if (!type || type === "films" || !uid) return;

  // Если уже подгружали раньше — не дёргаем сеть повторно
  if (card.dataset.loaded === "1") return;

  // Показать локальный статус в карточке
  let sub = card.querySelector(".card-sub") as HTMLParagraphElement | null;
  if (!sub) {
    sub = document.createElement("p");
    sub.className = "card-sub";
    card.appendChild(sub);
  }
  sub.textContent = "Loading details…";

  try {
    const detailUrl = `${API_BASE}/${type}/${uid}`;
    const res = await fetch(detailUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const p = json.result?.properties ?? {};

    // Короткая сводка — подправь поля, если хочешь другой набор
    sub.textContent =
      type === "people"
        ? formatPerson(p)
        : formatPlanet(p);

    card.dataset.loaded = "1"; // помечаем как загруженную
  } catch (e: any) {
    sub.textContent = `Failed to load details: ${e?.message ?? "Unknown"}`;
  }
});

/* ---------- Форматтеры деталей ---------- */
function formatPerson(p: any): string {
  // height (cm) · gender · birth_year
  const height = p.height ? `${p.height} cm` : "";
  const gender = p.gender || "";
  const birth  = p.birth_year || "";
  return [height, gender, birth].filter(Boolean).join(" · ") || "No details";
}

function formatPlanet(p: any): string {
  // climate · terrain · population
  const climate    = p.climate || "";
  const terrain    = p.terrain || "";
  const population = p.population && p.population !== "unknown" ? `pop ${p.population}` : "";
  return [climate, terrain, population].filter(Boolean).join(" · ") || "No details";
}

/* ---------- Подсветка активной вкладки ---------- */
function setActiveTab() {
  document.querySelectorAll<HTMLButtonElement>(".tab").forEach((btn) => {
    const isActive = btn.getAttribute("data-page") === currentPage;
    btn.classList.toggle("is-active", isActive);
  });
}

/* ---------- Навигация ---------- */
navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const page = btn.getAttribute("data-page") as Page;
    if (!page || page === currentPage) return;
    currentPage = page;
    setActiveTab();
    loadData(currentPage);
  });
});

/* ---------- Живой поиск ---------- */
searchEl!.addEventListener("input", renderList);

/* ---------- Инициализация ---------- */
setActiveTab();
loadData(currentPage);
