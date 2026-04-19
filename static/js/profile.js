import { fetchCurrentUser } from './auth.js';
import { API_BASE_URL, ACCESS_TOKEN_STORAGE_KEY } from './config.js';

// Utility function to get the initial from a name for avatar fallback
function getInitial(name) {
    if (!name) {
        return '?';
    }

    return name.trim().charAt(0).toUpperCase() || '?';
}

// Generates a list of avatar URL candidates based on the provided image URL, including common variations for Google profile images.
function buildAvatarCandidates(imageUrl) {
    if (!imageUrl || typeof imageUrl !== 'string') {
        return [];
    }

    const trimmed = imageUrl.trim();
    if (!trimmed) {
        return [];
    }

    const candidates = [trimmed];

    // Google profile URLs often carry a size suffix like "=s96-c".
    const googleSizedUrlMatch = trimmed.match(/^(https:\/\/[^\s]+)=s\d+-c$/i);
    if (googleSizedUrlMatch) {
        const base = googleSizedUrlMatch[1];
        candidates.unshift(`${base}=s256-c`);
        candidates.push(`${base}=s96-c`);
        candidates.push(base);
    }

    return [...new Set(candidates)];
}

// Renders the user's profile avatar with a fallback to initials if the image fails to load or is not available.
function renderProfileAvatar(profileAvatar, user) {
    if (!profileAvatar) {
        return;
    }

    const fallbackInitial = getInitial(user.name || '');
    const fallback = () => {
        profileAvatar.innerHTML = '';
        profileAvatar.textContent = fallbackInitial;
    };

    const avatarCandidates = buildAvatarCandidates(user.image);
    if (avatarCandidates.length === 0) {
        fallback();
        return;
    }

    const avatarImage = document.createElement('img');
    avatarImage.alt = `${user.name || 'User'} avatar`;
    avatarImage.style.width = '100%';
    avatarImage.style.height = '100%';
    avatarImage.style.objectFit = 'cover';
    avatarImage.style.borderRadius = '50%';
    avatarImage.referrerPolicy = 'no-referrer';
    avatarImage.decoding = 'async';

    let currentIndex = 0;

    avatarImage.onload = () => {
        profileAvatar.innerHTML = '';
        profileAvatar.appendChild(avatarImage);
    };

    avatarImage.onerror = () => {
        currentIndex += 1;
        if (currentIndex >= avatarCandidates.length) {
            fallback();
            return;
        }

        avatarImage.src = avatarCandidates[currentIndex];
    };

    avatarImage.src = avatarCandidates[currentIndex];
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

function formatLocation(rawLocation) {
    if (!rawLocation) {
        return 'Unknown location';
    }

    return String(rawLocation)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (match) => match.toUpperCase());
}

function normalizeImageUrl(rawUrl) {
    if (typeof rawUrl !== 'string') {
        return '';
    }

    return rawUrl.trim().replace(/["']/g, '');
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
    
    // Add click handler to navigate to item detail page
    ctaButton.addEventListener('click', () => {
        if (item.id) {
            window.location.href = `item-detail.html?id=${item.id}`;
        }
    });

    media.appendChild(image);
    media.appendChild(badge);

    card.appendChild(media);
    card.appendChild(title);
    card.appendChild(details);
    card.appendChild(ctaButton);

    return card;
}

function setUserItemsState(message, isError = false) {
    const stateElement = document.getElementById('userItemsState');
    if (!stateElement) {
        return;
    }

    stateElement.textContent = message;
    stateElement.hidden = false;
    stateElement.classList.toggle('items-state-error', isError);
}

function hideUserItemsState() {
    const stateElement = document.getElementById('userItemsState');
    if (!stateElement) {
        return;
    }

    stateElement.hidden = true;
}

async function fetchUserItems(token) {
    try {
        const response = await fetch(`${API_BASE_URL}/profile/items`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch user items (${response.status})`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching user items:', error);
        throw error;
    }
}

function renderUserItems(itemsData) {
    const grid = document.getElementById('userItemsGrid');
    if (!grid) {
        return;
    }

    grid.innerHTML = '';

    const allItems = [...(itemsData.lost_items || []), ...(itemsData.found_items || [])];

    if (allItems.length === 0) {
        setUserItemsState("You haven't reported any items");
        return;
    }

    hideUserItemsState();
    for (const item of allItems) {
        grid.appendChild(createItemCard(item));
    }
}

async function loadUserItems(token) {
    try {
        setUserItemsState('Loading your items...');
        const itemsData = await fetchUserItems(token);
        renderUserItems(itemsData);
    } catch (error) {
        setUserItemsState('Unable to load your items. Please try again.', true);
        console.error('Error loading user items:', error);
    }
}

export async function initProfile() {
    const profileName = document.getElementById('profileName');
    const profileDepartment = document.getElementById('profileDepartment');
    const profileEmail = document.getElementById('profileEmail');
    const profileAvatar = document.getElementById('profileAvatar');
    const profilePhone = document.getElementById('profilePhone');
    const profileHostel = document.getElementById('profileHostel');
    const profileInstagram = document.getElementById('profileInstagram');
    const profileRole = document.getElementById('profileRole');
    const profilePublicId = document.getElementById('profilePublicId');

    if (!profileName && !profileDepartment && !profileEmail && !profileAvatar) {
        return;
    }

    const user = await fetchCurrentUser();
    if (!user) {
        if (profileName) {
            profileName.textContent = 'Please log in';
        }

        if (profileDepartment) {
            profileDepartment.textContent = 'No active session';
        }

        if (profileEmail) {
            profileEmail.textContent = '-';
        }

        if (profilePhone) {
            profilePhone.textContent = '-';
        }

        if (profileHostel) {
            profileHostel.textContent = '-';
        }

        if (profileInstagram) {
            profileInstagram.textContent = '-';
        }

        if (profileRole) {
            profileRole.textContent = '-';
        }

        if (profilePublicId) {
            profilePublicId.textContent = '-';
        }

        return;
    }

    if (profileName) {
        profileName.textContent = user.name || 'Google User';
    }

    if (profileDepartment) {
        profileDepartment.textContent = `Role: ${user.role || 'user'}`;
    }

    if (profileEmail) {
        profileEmail.textContent = user.email || 'Not set';
    }

    if (profilePhone) {
        profilePhone.textContent = user.phone || 'Not set';
    }

    if (profileHostel) {
        profileHostel.textContent = user.hostel || 'Not set';
    }

    if (profileInstagram) {
        profileInstagram.textContent = user.instagramId || 'Not set';
    }

    if (profileRole) {
        profileRole.textContent = user.role || 'user';
    }

    if (profilePublicId) {
        profilePublicId.textContent = user.publicId || '-';
    }

    renderProfileAvatar(profileAvatar, user);

    // Load user's items
    const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
    if (token) {
        loadUserItems(token);
    }
}
