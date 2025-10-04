
const DEFAULT_PER_PAGE = 24;

// --- State ---
let state = {
  page: 1,
  q: '',
  orientation: '',
  color: '',
  perPage: DEFAULT_PER_PAGE,
  loading: false,
  totalPages: Infinity
};

// --- Elements ---
const gallery = document.getElementById('gallery');
const sentinel = document.getElementById('sentinel');
const queryEl = document.getElementById('query');
const orientationEl = document.getElementById('orientation');
const colorEl = document.getElementById('color');
const perPageEl = document.getElementById('perPage');
const searchBtn = document.getElementById('searchBtn');
const apiKeyEl = document.getElementById('apiKey');
const saveKeyBtn = document.getElementById('saveKey');
const clearKeyBtn = document.getElementById('clearKey');

const modal = document.getElementById('previewModal');
const previewImg = document.getElementById('previewImg');
const closeModalBtn = document.getElementById('closeModal');
const photoLink = document.getElementById('photoLink');
const downloadLink = document.getElementById('downloadLink');
const credit = document.getElementById('credit');

// Load saved key
apiKeyEl.value = localStorage.getItem('unsplash_key') || '';

saveKeyBtn.addEventListener('click', () => {
  localStorage.setItem('unsplash_key', apiKeyEl.value.trim());
  alert('API key saved locally.');
});
clearKeyBtn.addEventListener('click', () => {
  localStorage.removeItem('unsplash_key');
  apiKeyEl.value = '';
  alert('API key cleared.');
});

function getKey() {
  return "hMx_2vz5z9YVWWs1ND4O9jKvc75fziKN5fxkp8-MeCk"; // 🔑 replace with your Unsplash Access Key
}


function buildURL() {
  const key = getKey();
  if (!key) return null;

  const params = new URLSearchParams();
  params.set('query', state.q || 'nature');
  params.set('page', String(state.page));
  params.set('per_page', String(state.perPage));
  if (state.orientation) params.set('orientation', state.orientation);
  if (state.color) params.set('color', state.color);

  return `https://api.unsplash.com/search/photos?${params.toString()}&client_id=${encodeURIComponent(key)}`;
}

function cardTemplate(photo) {
  const src = photo.urls.small;
  const alt = photo.alt_description || 'Photo';
  const name = (photo.user && (photo.user.name || photo.user.username)) || 'Unknown';
  return `
    <article class="card" data-full="${photo.urls.regular}" data-link="${photo.links.html}" data-download="${photo.links.download}">
      <div class="ph">
        <img src="${src}" alt="${escapeHtml(alt)}" loading="lazy" />
      </div>
      <div class="meta">
        <span class="badge">${escapeHtml(name)}</span>
        <button class="icon-btn" title="Preview" aria-label="Preview">👁️</button>
      </div>
    </article>
  `;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>'"]/g, s => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[s]);
}

function clearGallery() {
  gallery.innerHTML = '';
}

function appendPhotos(photos) {
  const html = photos.map(cardTemplate).join('');
  const frag = document.createElement('div');
  frag.innerHTML = html;
  frag.querySelectorAll('.card').forEach(card => {
    card.querySelector('.icon-btn').addEventListener('click', () => openPreview(card));
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.icon-btn')) openPreview(card);
    });
  });
  gallery.append(...frag.children);
}

function openPreview(card) {
  const full = card.getAttribute('data-full');
  const link = card.getAttribute('data-link');
  const dl = card.getAttribute('data-download');
  const author = card.querySelector('.badge')?.textContent || '';
  previewImg.src = full;
  photoLink.href = link;
  downloadLink.href = dl;
  credit.textContent = `Photo by ${author} on Unsplash`;
  if (typeof modal.showModal === 'function') modal.showModal();
  else modal.setAttribute('open','');
}
closeModalBtn.addEventListener('click', () => modal.close());
modal.addEventListener('click', (e) => {
  const rect = e.target.getBoundingClientRect?.();
  // click outside to close
  if (e.target === modal) modal.close();
});

async function fetchPhotos() {
  if (state.loading) return;
  const url = buildURL();
  if (!url) return;

  state.loading = true;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.totalPages = data.total_pages || state.totalPages;
    appendPhotos(data.results || []);
  } catch (err) {
    console.error(err);
    alert('Failed to fetch images. Check your API key and network.');
  } finally {
    state.loading = false;
  }
}

// --- Search actions ---
function startSearch() {
  state.page = 1;
  state.q = queryEl.value.trim() || 'nature';
  state.orientation = orientationEl.value;
  state.color = colorEl.value;
  state.perPage = parseInt(perPageEl.value, 10) || DEFAULT_PER_PAGE;
  state.totalPages = Infinity;
  clearGallery();
  fetchPhotos();
}

searchBtn.addEventListener('click', startSearch);
queryEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') startSearch();
});
[orientationEl, colorEl, perPageEl].forEach(el => el.addEventListener('change', startSearch));

// --- Infinite scroll ---
const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !state.loading) {
      if (state.page < state.totalPages) {
        state.page += 1;
        fetchPhotos();
      }
    }
  });
}, { rootMargin: '600px 0px 600px 0px' });

io.observe(sentinel);

// Initial search on load
window.addEventListener('load', startSearch);




// --- Header hide/show on scroll ---
const scroller = document.querySelector('.app');
const headerEl = document.querySelector('header');

let lastY = 0;
let lockHeader = false; // don't hide while modal is open

scroller.addEventListener('scroll', () => {
  if (lockHeader) return;
  const y = scroller.scrollTop;
  const goingDown = y > lastY;
  const pastThreshold = y > 24;            // ignore tiny jiggles
  headerEl.classList.toggle('is-hidden', goingDown && pastThreshold);
  lastY = y <= 0 ? 0 : y;
}, { passive: true });
