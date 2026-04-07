import { fetchCurrentUser } from './auth.js';
import { ACCESS_TOKEN_STORAGE_KEY, API_BASE_URL } from './config.js';

const ITEMS_ENDPOINT = '/items';

function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
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

function setDetailState(message, isError = false) {
    const stateElement = document.getElementById('itemDetailState');
    if (!stateElement) {
        return;
    }

    stateElement.textContent = message;
    stateElement.hidden = false;
    stateElement.classList.toggle('item-detail-state-error', isError);
}

function hideDetailState() {
    const stateElement = document.getElementById('itemDetailState');
    if (!stateElement) {
        return;
    }

    stateElement.hidden = true;
}

async function fetchItemDetails(itemId) {
    const response = await fetch(`${API_BASE_URL}${ITEMS_ENDPOINT}/${itemId}`, {
        method: 'GET'
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch item details (${response.status})`);
    }

    const payload = await response.json();
    return payload.item || payload;
}

function renderItemDetails(item, currentUser) {
    const contentDiv = document.getElementById('itemDetailContent');
    
    // Set image
    const image = document.getElementById('itemImage');
    image.src = normalizeImageUrl(item.image);
    image.alt = item.title || 'Item image';
    
    // Set badge
    const badge = document.getElementById('itemBadge');
    badge.textContent = getTypeLabel(item.type);
    badge.className = 'item-detail-badge';
    if (item.type === 'lost') {
        badge.classList.add('item-detail-badge-lost');
    } else if (item.type === 'found') {
        badge.classList.add('item-detail-badge-found');
    }
    
    // Set title
    document.getElementById('itemTitle').textContent = item.title || 'Untitled Item';
    
    // Set description
    document.getElementById('itemDescription').textContent = item.description || 'No description provided';
    
    // Set details
    document.getElementById('itemType').textContent = getTypeLabel(item.type);
    document.getElementById('itemCategory').textContent = item.category || 'Uncategorized';
    document.getElementById('itemLocation').textContent = formatLocation(item.location);
    document.getElementById('itemDate').textContent = formatDate(item.date);
    
    // Set owner info
    const ownerInfo = document.getElementById('itemOwnerInfo');
    if (item.owner && item.owner.name) {
        ownerInfo.textContent = `${item.owner.name}`;
    } else if (item.owner_id) {
        ownerInfo.textContent = 'Posted by another user';
    } else {
        ownerInfo.textContent = 'Posted by anonymous user';
    }
    
    // Show/hide action buttons based on user and item type
    const claimButton = document.getElementById('claimButton');
    const reportButton = document.getElementById('reportButton');
    
    // Show claim button for found items or return for lost items
    if (item.type === 'found' || item.type === 'lost') {
        claimButton.style.display = 'inline-block';
        if (item.type === 'found') {
            claimButton.textContent = 'Claim - I Found It';
        } else {
            claimButton.textContent = 'Report - I Have It';
        }
    }
    
    // Show report button for everyone
    reportButton.style.display = 'inline-block';
    
    // Add event listeners
    claimButton.onclick = () => handleClaimItem(item);
    reportButton.onclick = () => handleReportItem(item);
    
    contentDiv.hidden = false;
}

function handleClaimItem(item) {
    alert(`You claimed item: ${item.title}`);
    // TODO: Navigate to resolution creation page or show resolution modal
}

function handleReportItem(item) {
    // Navigate to report page with item ID pre-filled
    window.location.href = `report.html?itemId=${item.id}`;
}

export async function initItemDetail() {
    const itemId = getQueryParam('id');
    
    if (!itemId) {
        setDetailState('Item not found. Please select an item from the browse page.', true);
        return;
    }
    
    setDetailState('Loading item details...');
    
    try {
        const item = await fetchItemDetails(itemId);
        
        if (!item) {
            setDetailState('Item not found.', true);
            return;
        }
        
        // Optionally fetch current user for contextual actions
        const currentUser = await fetchCurrentUser();
        
        hideDetailState();
        renderItemDetails(item, currentUser);
    } catch (error) {
        console.error('Error loading item details:', error);
        setDetailState('Unable to load item details. Please try again.', true);
    }
}
