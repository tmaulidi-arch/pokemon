const PAGE_SIZE = 20;
const API = "https://pokeapi.co/api/v2/pokemon";

const TYPE_COLORS = {
  normal: "#a8a77a", fire: "#ee8130", water: "#6390f0", electric: "#f7d02c",
  grass: "#7ac74c", ice: "#96d9d6", fighting: "#c22e28", poison: "#a33ea1",
  ground: "#e2bf65", flying: "#a98ff3", psychic: "#f95587", bug: "#a6b91a",
  rock: "#b6a136", ghost: "#735797", dragon: "#6f35fc", dark: "#705746",
  steel: "#b7b7ce", fairy: "#d685ad"
};

const grid = document.getElementById("grid");
const statusEl = document.getElementById("status");
const searchInput = document.getElementById("search");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const pageLabel = document.getElementById("page-label");

let offset = 0;
let total = 0;
let currentPokemon = []; // details already loaded for the current page

function setStatus(text, { loading = false, error = false } = {}) {
  statusEl.className = "status" + (error ? " error" : "");
  statusEl.textContent = "";
  if (loading) {
    const spinner = document.createElement("span");
    spinner.className = "spinner";
    statusEl.appendChild(spinner);
  }
  statusEl.appendChild(document.createTextNode(text));
}

async function loadPage() {
  grid.innerHTML = "";
  searchInput.value = "";
  prevBtn.disabled = nextBtn.disabled = true;
  setStatus("Catching Pokémon...", { loading: true });

  try {
    // 1 request for the list, then 1 request per Pokémon (in parallel)
    const listRes = await fetch(`${API}?limit=${PAGE_SIZE}&offset=${offset}`);
    if (!listRes.ok) throw new Error(`List request failed (${listRes.status})`);
    const list = await listRes.json();
    total = list.count;

    currentPokemon = await Promise.all(
      list.results.map(async (p) => {
        const res = await fetch(p.url);
        if (!res.ok) throw new Error(`Failed to load ${p.name}`);
        return res.json();
      })
    );

    setStatus("");
    render(currentPokemon);
  } catch (err) {
    console.error(err);
    setStatus("Could not load Pokémon. Check your connection and try again.", { error: true });
  } finally {
    const page = Math.floor(offset / PAGE_SIZE) + 1;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    pageLabel.textContent = `Page ${page} / ${pages}`;
    prevBtn.disabled = offset === 0;
    nextBtn.disabled = offset + PAGE_SIZE >= total;
  }
}

function render(pokemon) {
  grid.innerHTML = "";
  if (pokemon.length === 0) {
    setStatus("No Pokémon match your search.");
    return;
  }
  setStatus("");
  const frag = document.createDocumentFragment();
  pokemon.forEach((p, i) => frag.appendChild(createCard(p, i)));
  grid.appendChild(frag);
}

function createCard(p, index) {
  const types = p.types.map((t) => t.type.name);
  const abilities = p.abilities.map((a) => a.ability.name.replace(/-/g, " "));
  const art = p.sprites.other?.["official-artwork"]?.front_default || p.sprites.front_default;

  const card = document.createElement("article");
  card.className = "card";
  card.style.setProperty("--type-color", TYPE_COLORS[types[0]] || "#777");
  card.style.animationDelay = `${index * 30}ms`;

  const id = document.createElement("span");
  id.className = "id";
  id.textContent = `#${String(p.id).padStart(3, "0")}`;

  const img = document.createElement("img");
  img.src = art;
  img.alt = p.name;
  img.loading = "lazy";

  const name = document.createElement("h2");
  name.textContent = p.name;

  const typeWrap = document.createElement("div");
  typeWrap.className = "types";
  types.forEach((t) => {
    const badge = document.createElement("span");
    badge.className = "type";
    badge.textContent = t;
    typeWrap.appendChild(badge);
  });

  const meta = document.createElement("p");
  meta.className = "meta";
  meta.textContent = `${p.height / 10} m · ${p.weight / 10} kg`;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Say hi";

  const says = document.createElement("p");
  says.className = "says";
  says.hidden = true;

  btn.addEventListener("click", () => {
    const list = abilities.length > 1
      ? abilities.slice(0, -1).join(", ") + " and " + abilities[abilities.length - 1]
      : abilities[0];
    says.textContent = `I am ${p.name} and I have ${list}.`;
    says.hidden = false;
  });

  card.append(id, img, name, typeWrap, meta, btn, says);
  return card;
}

// Search: filters data already loaded (no API calls)
searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim().toLowerCase();
  render(currentPokemon.filter((p) => p.name.includes(q)));
});

prevBtn.addEventListener("click", () => {
  offset = Math.max(0, offset - PAGE_SIZE);
  loadPage();
  window.scrollTo({ top: 0, behavior: "smooth" });
});
nextBtn.addEventListener("click", () => {
  offset += PAGE_SIZE;
  loadPage();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

loadPage();
