import { fetchCurrentUser } from './auth.js';
import { ACCESS_TOKEN_STORAGE_KEY, API_BASE_URL } from './config.js';

const RESOLUTIONS_ENDPOINT = '/resolutions';

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

function getStatusLabel(status) {
    if (!status) return 'Unknown';
    
    return String(status)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (match) => match.toUpperCase());
}

function setResolutionState(message, isError = false) {
    const stateElement = document.getElementById('resolutionDetailState');
    if (!stateElement) {
        return;
    }

    stateElement.textContent = message;
    stateElement.hidden = false;
    stateElement.classList.toggle('resolution-detail-state-error', isError);
}

function hideResolutionState() {
    const stateElement = document.getElementById('resolutionDetailState');
    if (!stateElement) {
        return;
    }

    stateElement.hidden = true;
}

async function fetchResolutionDetails(resolutionId, token) {
    const response = await fetch(`${API_BASE_URL}${RESOLUTIONS_ENDPOINT}/${resolutionId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch resolution details (${response.status})`);
    }

    const payload = await response.json();
    return payload.resolution || payload;
}

async function approveResolution(resolutionId, token) {
    const response = await fetch(`${API_BASE_URL}${RESOLUTIONS_ENDPOINT}/${resolutionId}/approve`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to approve resolution (${response.status})`);
    }

    return await response.json();
}

async function rejectResolution(resolutionId, token) {
    const response = await fetch(`${API_BASE_URL}${RESOLUTIONS_ENDPOINT}/${resolutionId}/reject`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to reject resolution (${response.status})`);
    }

    return await response.json();
}

async function completeResolution(resolutionId, token) {
    const response = await fetch(`${API_BASE_URL}${RESOLUTIONS_ENDPOINT}/${resolutionId}/complete`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to complete resolution (${response.status})`);
    }

    return await response.json();
}

async function invalidateResolution(resolutionId, token) {
    const response = await fetch(`${API_BASE_URL}${RESOLUTIONS_ENDPOINT}/${resolutionId}/invalidate`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to invalidate resolution (${response.status})`);
    }

    return await response.json();
}

function renderResolutionDetails(resolution, currentUser, token) {
    const contentDiv = document.getElementById('resolutionDetailContent');
    
    // Update subtitle based on resolution type
    const subtitle = document.getElementById('resolutionSubtitle');
    if (resolution.type === 'return') {
        subtitle.textContent = 'A finder believes they have your item.';
    } else if (resolution.type === 'claim') {
        subtitle.textContent = 'You reported finding an item, waiting for owner confirmation.';
    }
    
    // Set status
    const statusElement = document.getElementById('resolutionStatus');
    if (statusElement) {
        statusElement.textContent = getStatusLabel(resolution.status);
        statusElement.className = `status-badge status-${resolution.status || 'unknown'}`;
    }
    
    // Finder/Claimer details
    const finderDetails = document.getElementById('finderDetails');
    if (resolution.finder && resolution.finder.name) {
        finderDetails.innerHTML = `
            <p><strong>${resolution.finder.name}</strong></p>
            <p class="small">Roll No: ${resolution.finder.roll_number || 'N/A'}</p>
            <p class="small">${resolution.finder.email || 'N/A'}</p>
            <p class="small">${resolution.finder.phone || 'N/A'}</p>
        `;
    } else {
        finderDetails.textContent = 'Finder details not available';
    }
    
    // Item details
    if (resolution.item) {
        const itemImage = document.getElementById('itemImageDetail');
        itemImage.src = normalizeImageUrl(resolution.item.image);
        itemImage.alt = resolution.item.title || 'Item image';
        
        document.getElementById('itemTitleDetail').textContent = resolution.item.title || 'Untitled Item';
        document.getElementById('itemLocationDetail').textContent = formatLocation(resolution.item.location);
        document.getElementById('itemDateDetail').textContent = formatDate(resolution.item.date);
    }
    
    // Resolution description
    document.getElementById('resolutionDescription').textContent = resolution.description || 'No description provided';
    document.getElementById('resolutionSubmittedDate').textContent = formatDate(resolution.created_at);
    
    // Show/hide buttons based on status and user role
    const completeButton = document.getElementById('completeButton');
    const rejectButton = document.getElementById('rejectButton');
    const approveButton = document.getElementById('approveButton');
    const invalidateButton = document.getElementById('invalidateButton');
    
    // Determine user role (owner or finder)
    const isOwner = currentUser && resolution.item && resolution.item.owner_id === currentUser.publicId;
    const isFinder = currentUser && resolution.finder_id === currentUser.publicId;
    
    // Show appropriate buttons based on resolution status and user role
    if (resolution.status === 'pending') {
        if (isFinder && resolution.type === 'return') {
            // Finder waiting for owner response
            approveButton.style.display = 'none';
            rejectButton.style.display = 'none';
            completeButton.style.display = 'none';
            invalidateButton.style.display = 'none';
        } else if (isOwner && resolution.type === 'return') {
            // Owner can approve or reject
            approveButton.style.display = 'inline-block';
            rejectButton.style.display = 'inline-block';
            completeButton.style.display = 'none';
            invalidateButton.style.display = 'none';
        } else if (isOwner && resolution.type === 'claim') {
            // Owner can claim or reject
            approveButton.style.display = 'inline-block';
            rejectButton.style.display = 'inline-block';
            completeButton.style.display = 'none';
            invalidateButton.style.display = 'none';
        }
    } else if (resolution.status === 'approved') {
        if (isOwner) {
            completeButton.style.display = 'inline-block';
            invalidateButton.style.display = 'inline-block';
            approveButton.style.display = 'none';
            rejectButton.style.display = 'none';
        } else {
            completeButton.style.display = 'none';
            invalidateButton.style.display = 'none';
            approveButton.style.display = 'none';
            rejectButton.style.display = 'none';
        }
    } else {
        // Completed, rejected, or invalidated
        completeButton.style.display = 'none';
        rejectButton.style.display = 'none';
        approveButton.style.display = 'none';
        invalidateButton.style.display = 'none';
    }
    
    // Add event listeners to buttons
    if (approveButton.style.display !== 'none') {
        approveButton.onclick = () => handleApproveResolution(resolution.id, token);
    }
    if (rejectButton.style.display !== 'none') {
        rejectButton.onclick = () => handleRejectResolution(resolution.id, token);
    }
    if (completeButton.style.display !== 'none') {
        completeButton.onclick = () => handleCompleteResolution(resolution.id, token);
    }
    if (invalidateButton.style.display !== 'none') {
        invalidateButton.onclick = () => handleInvalidateResolution(resolution.id, token);
    }
    
    contentDiv.hidden = false;
}

async function handleApproveResolution(resolutionId, token) {
    try {
        await approveResolution(resolutionId, token);
        alert('Resolution approved successfully!');
        location.reload();
    } catch (error) {
        alert('Failed to approve resolution: ' + error.message);
    }
}

async function handleRejectResolution(resolutionId, token) {
    try {
        await rejectResolution(resolutionId, token);
        alert('Resolution rejected successfully!');
        location.reload();
    } catch (error) {
        alert('Failed to reject resolution: ' + error.message);
    }
}

async function handleCompleteResolution(resolutionId, token) {
    try {
        await completeResolution(resolutionId, token);
        alert('Resolution completed successfully!');
        location.reload();
    } catch (error) {
        alert('Failed to complete resolution: ' + error.message);
    }
}

async function handleInvalidateResolution(resolutionId, token) {
    try {
        await invalidateResolution(resolutionId, token);
        alert('Resolution invalidated successfully!');
        location.reload();
    } catch (error) {
        alert('Failed to invalidate resolution: ' + error.message);
    }
}

export async function initResolutionDetail() {
    const resolutionId = getQueryParam('id');
    
    if (!resolutionId) {
        // Only show error if user is on resolution page without ID
        const stateElement = document.getElementById('resolutionDetailState');
        if (stateElement) {
            setResolutionState('Resolution not found. Please select a notification.', true);
        }
        return;
    }
    
    const stateElement = document.getElementById('resolutionDetailState');
    if (stateElement) {
        setResolutionState('Loading resolution details...');
    }
    
    try {
        const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
        if (!token) {
            setResolutionState('Please log in to view resolution details.', true);
            return;
        }
        
        const resolution = await fetchResolutionDetails(resolutionId, token);
        
        if (!resolution) {
            setResolutionState('Resolution not found.', true);
            return;
        }
        
        const currentUser = await fetchCurrentUser();
        
        hideResolutionState();
        renderResolutionDetails(resolution, currentUser, token);
    } catch (error) {
        console.error('Error loading resolution details:', error);
        setResolutionState('Unable to load resolution details. Please try again.', true);
    }
}
