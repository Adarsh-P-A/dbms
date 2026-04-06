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

function formatLocation(rawLocation) {
    if (!rawLocation) {
        return 'Unknown location';
    }

    return String(rawLocation)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (match) => match.toUpperCase());
}

function getTypeLabel(type) {
    if (type === 'lost') {
        return 'Lost';
    }

    if (type === 'found') {
        return 'Found';
    }

    return 'Item';
}

function createItemCard(item) {
    const card = document.createElement('article');
    card.className = 'item-card';

    const media = document.createElement('div');
    media.className = 'item-card-media';

    const image = document.createElement('img');
    image.className = 'item-card-image';
    image.src = normalizeImageUrl(item.image);
    image.alt = item.title || 'Item image';
    image.loading = 'lazy';
    image.referrerPolicy = 'no-referrer';

    const fallback = document.createElement('div');
    fallback.className = 'item-card-image-fallback';
    fallback.textContent = 'No image';

    const badge = document.createElement('span');
    badge.className = 'item-card-badge';
    if (item.type === 'lost') {
        badge.classList.add('item-card-badge-lost');
    } else if (item.type === 'found') {
        badge.classList.add('item-card-badge-found');
    }
    badge.textContent = getTypeLabel(item.type);

    image.addEventListener('error', () => {
        image.remove();
        media.prepend(fallback);
    });

    const title = document.createElement('h3');
    title.className = 'item-card-title';
    title.textContent = item.title || 'Untitled Item';

    const details = document.createElement('div');
    details.className = 'item-card-details';

    const dateRow = document.createElement('p');
    dateRow.className = 'item-card-meta';
    dateRow.textContent = `Date: ${formatDate(item.date)}`;

    const locationRow = document.createElement('p');
    locationRow.className = 'item-card-date';
    locationRow.textContent = `Location: ${formatLocation(item.location)}`;

    details.appendChild(dateRow);
    details.appendChild(locationRow);

    const ctaButton = document.createElement('button');
    ctaButton.type = 'button';
    ctaButton.className = 'btn-primary item-card-button';
    ctaButton.textContent = 'View Details';
    ctaButton.disabled = true;

    media.appendChild(image);
    media.appendChild(badge);

    card.appendChild(media);
    card.appendChild(title);
    card.appendChild(details);
    card.appendChild(ctaButton);

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
