import { fetchCurrentUser } from './auth.js';
import { API_BASE_URL, ITEMS_ALL_ENDPOINT } from './config.js';

function getSegmentForUser(user) {
    if (!user || !user.hostel) {
        return 'public';
    }

    if (user.hostel === 'boys' || user.hostel === 'girls') {
        return user.hostel;
    }

    return 'public';
}

function formatDate(rawDate) {
    if (!rawDate) {
        return 'Date not available';
    }

    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) {
        return rawDate;
    }

    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function setItemsState(message, isError = false) {
    const stateElement = document.getElementById('itemsState');
    if (!stateElement) {
        return;
    }

    stateElement.textContent = message;
    stateElement.hidden = false;
    stateElement.classList.toggle('items-state-error', isError);
}

function hideItemsState() {
    const stateElement = document.getElementById('itemsState');
    if (!stateElement) {
        return;
    }

    stateElement.hidden = true;
}

function normalizeImageUrl(rawUrl) {
    if (typeof rawUrl !== 'string') {
        return '';
    }

    // Defensive cleanup for malformed backend URL strings like
    // "https://cdn.retrievo.dev"/uploads/image.webp
    return rawUrl.trim().replace(/["']/g, '');
}

function createItemCard(item) {
    const card = document.createElement('article');
    card.className = 'item-card';

    const image = document.createElement('img');
    image.className = 'item-card-image';
    image.src = normalizeImageUrl(item.image);
    image.alt = item.title || 'Item image';
    image.loading = 'lazy';
    image.referrerPolicy = 'no-referrer';

    const fallback = document.createElement('div');
    fallback.className = 'item-card-image-fallback';
    fallback.textContent = 'No image';

    image.addEventListener('error', () => {
        image.remove();
        card.prepend(fallback);
    });

    const title = document.createElement('h3');
    title.className = 'item-card-title';
    title.textContent = item.title || 'Untitled Item';

    const meta = document.createElement('p');
    meta.className = 'item-card-meta';
    meta.textContent = `${(item.type || 'item').toUpperCase()} | ${item.location || 'Unknown location'}`;

    const date = document.createElement('p');
    date.className = 'item-card-date';
    date.textContent = formatDate(item.date);

    card.appendChild(image);
    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(date);

    return card;
}

function renderItems(items) {
    const grid = document.getElementById('itemsGrid');
    if (!grid) {
        return;
    }

    grid.innerHTML = '';

    for (const item of items) {
        grid.appendChild(createItemCard(item));
    }
}

async function fetchItems(segment) {
    const params = new URLSearchParams({ segment });
    const response = await fetch(`${API_BASE_URL}${ITEMS_ALL_ENDPOINT}?${params.toString()}`, {
        method: 'GET'
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch items (${response.status})`);
    }

    const payload = await response.json();
    if (!payload || !Array.isArray(payload.items)) {
        return [];
    }

    return payload.items;
}

export async function initItemsFeed() {
    const grid = document.getElementById('itemsGrid');
    if (!grid) {
        return;
    }

    setItemsState('Loading recent items...');

    try {
        const user = await fetchCurrentUser();
        const segment = getSegmentForUser(user);
        const items = await fetchItems(segment);

        if (items.length === 0) {
            grid.innerHTML = '';
            setItemsState('No items available yet.');
            return;
        }

        hideItemsState();
        renderItems(items);
    } catch (error) {
        grid.innerHTML = '';
        setItemsState('Unable to load items right now. Please try again.', true);
    }
}
