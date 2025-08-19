import './style.css';

/**
 * Ссылки на элементы. Если чего-то нет в DOM — бросаем ошибку, чтобы
 * сразу заметить проблему при разработке.
 */
const listEl = document.getElementById("list") as HTMLUListElement | null;
const searchEl = document.getElementById("search") as HTMLInputElement | null;
const navButtons = document.querySelectorAll<HTMLButtonElement>("nav button");

if (!listEl || !searchEl) {
    throw new Error("Elements #list or #search not found in DOM");
}

/** Текущая вкладка и данные для рендера */
let currentPage: "films" | "people" | "planets" = "films";
let data: { title: string; subtitle?: string }[] = [];

/**
 * Загрузка данных с swapi.tech.
 * Для films поля отличаются, поэтому ветка с properties.
 */
async function loadData(page: typeof currentPage) {
  listEl!.innerHTML = `<li class="loading">Loading…</li>`;
  try {
    let url = `https://swapi.tech/api/${page}`;
    if (page !== "films") url += "?page=1&limit=100";

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    if (page === "films") {
      data = json.result.map((f: any) => ({
        title: f.properties.title,
        subtitle: `${f.properties.release_date} · ${f.properties.director}`,
      }));
    } else {
      data = json.results.map((r: any) => ({ title: r.name }));
    }

    renderList();
  } catch (e: any) {
    listEl!.innerHTML = `<li class="error">Loading error: ${e?.message ?? "Unknown"}</li>`;
  }
}

/** Рендер карточек + фильтрация по инпуту */
function renderList() {
  const q = (searchEl!.value || "").toLowerCase();
  const filtered = data.filter((item) => item.title.toLowerCase().includes(q));

  if (!filtered.length) {
  listEl!.innerHTML = `<li class="empty">Nothing found</li>`;
    return;
  }

  listEl!.innerHTML = filtered.map((item) => `
    <li class="card">
      <h3 class="card-title">${item.title}</h3>
      ${item.subtitle ? `<p class="card-sub">${item.subtitle}</p>` : ``}
    </li>
  `).join("");
}

/** Подсветка активной вкладки (класс .is-active) */
function setActiveTab() {
  document.querySelectorAll<HTMLButtonElement>(".tab").forEach((btn) => {
    const isActive = btn.getAttribute("data-page") === currentPage;
    btn.classList.toggle("is-active", isActive);
  });
}

/** Навигация между вкладками */
navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const page = btn.getAttribute("data-page") as typeof currentPage;
    if (!page || page === currentPage) return;
    currentPage = page;
    setActiveTab();
    loadData(currentPage);
  });
});

/** Живой поиск */
searchEl.addEventListener("input", renderList);

/** Первичная инициализация */
setActiveTab();
loadData(currentPage);
