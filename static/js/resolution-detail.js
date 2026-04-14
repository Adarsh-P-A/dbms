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
    
    const statusMap = {
        'pending': 'Awaiting Review',
        'approved': 'Approved',
        'rejected': 'Rejected',
        'return_initiated': 'Return Initiated',
        'completed': 'Completed',
        'invalidated': 'Item Mismatch'
    };
    
    return statusMap[status] || String(status)
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
    return payload;
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

async function rejectResolution(resolutionId, token, reason = "This is not the correct item") {
    const payload = {
        rejection_reason: reason
    };

    const response = await fetch(`${API_BASE_URL}${RESOLUTIONS_ENDPOINT}/${resolutionId}/reject`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
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

function renderResolutionDetails(data, currentUser, token) {
    const contentDiv = document.getElementById('resolutionDetailContent');
    const resolution = data.resolution;
    const item = data.item;
    const viewer = data.viewer;
    const finderContact = data.finder_contact;
    const allowedActions = data.allowed_actions || [];
    
    // Update subtitle based on resolution type and status
    const subtitle = document.getElementById('resolutionSubtitle');
    if (resolution.type === 'owner_initiated') {
        subtitle.textContent = 'Someone has claimed your item. Please review and approve or reject.';
    } else if (resolution.type === 'finder_initiated') {
        if (resolution.status === 'return_initiated') {
            subtitle.textContent = 'A finder believes they have your lost item. Please confirm the return or mark as mismatched.';
        } else if (resolution.status === 'approved') {
            subtitle.textContent = 'Your return has been approved. Complete the exchange or mark as mismatched.';
        } else {
            subtitle.textContent = 'Return status: ' + getStatusLabel(resolution.status);
        }
    }
    
    // Set status
    const statusElement = document.getElementById('resolutionStatus');
    if (statusElement) {
        statusElement.textContent = getStatusLabel(resolution.status);
        statusElement.className = `status-badge status-${resolution.status || 'unknown'}`;
    }
    
    // Finder/Claimer details
    const finderDetails = document.getElementById('finderDetails');
    if (finderContact && finderContact.name) {
        finderDetails.innerHTML = `
            <p><strong>${finderContact.name}</strong></p>
            ${finderContact.email ? `<p class="small">Email: ${finderContact.email}</p>` : ''}
            ${finderContact.phone ? `<p class="small">Phone: ${finderContact.phone}</p>` : ''}
        `;
    } else if (resolution.type === 'finder_initiated') {
        finderDetails.textContent = 'The finder\'s contact details have been provided above. You can reach out to confirm the item details.';
    } else {
        finderDetails.textContent = 'Contact details will be displayed after you approve the claim.';
    }
    
    // Item details
    if (item) {
        const itemImage = document.getElementById('itemImageDetail');
        itemImage.src = normalizeImageUrl(item.image);
        itemImage.alt = item.title || 'Item image';
        
        document.getElementById('itemTitleDetail').textContent = item.title || 'Untitled Item';
        document.getElementById('itemLocationDetail').textContent = formatLocation(item.location);
        document.getElementById('itemDateDetail').textContent = formatDate(item.date);
    }
    
    // Resolution description
    document.getElementById('resolutionDescription').textContent = resolution.description || 'No description provided';
    document.getElementById('resolutionSubmittedDate').textContent = formatDate(resolution.created_at);
    
    // Show/hide buttons based on allowed actions
    const completeButton = document.getElementById('completeButton');
    const rejectButton = document.getElementById('rejectButton');
    const approveButton = document.getElementById('approveButton');
    const invalidateButton = document.getElementById('invalidateButton');
    
    // Hide all buttons first
    completeButton.style.display = 'none';
    rejectButton.style.display = 'none';
    approveButton.style.display = 'none';
    invalidateButton.style.display = 'none';
    
    // Show buttons based on allowed actions
    if (allowedActions.includes('approve')) {
        approveButton.style.display = 'inline-block';
        approveButton.onclick = () => handleApproveResolution(resolution.id, token);
    }
    
    if (allowedActions.includes('reject')) {
        rejectButton.style.display = 'inline-block';
        rejectButton.textContent = 'Reject / Item Doesn\'t Match';
        rejectButton.onclick = () => handleRejectResolution(resolution.id, token);
    }
    
    if (allowedActions.includes('complete')) {
        completeButton.style.display = 'inline-block';
        completeButton.textContent = 'Mark as Completed';
        completeButton.onclick = () => handleCompleteResolution(resolution.id, token);
    }
    
    if (allowedActions.includes('invalidate')) {
        invalidateButton.style.display = 'inline-block';
        invalidateButton.textContent = 'Item Mismatch';
        invalidateButton.onclick = () => handleInvalidateResolution(resolution.id, token);
    }
    
    contentDiv.hidden = false;
}

async function handleApproveResolution(resolutionId, token) {
    try {
        const button = document.getElementById('approveButton');
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = 'Approving...';
        
        await approveResolution(resolutionId, token);
        alert('Claim approved successfully! A notification has been sent to the claimer.');
        setTimeout(() => {
            location.reload();
        }, 500);
    } catch (error) {
        alert('Failed to approve resolution: ' + error.message);
        location.reload();
    }
}

async function handleRejectResolution(resolutionId, token) {
    try {
        const button = document.getElementById('rejectButton');
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = 'Rejecting...';
        
        await rejectResolution(resolutionId, token);
        alert('Claim rejected successfully! A notification has been sent to the claimer.');
        setTimeout(() => {
            location.reload();
        }, 500);
    } catch (error) {
        alert('Failed to reject resolution: ' + error.message);
        location.reload();
    }
}

async function handleCompleteResolution(resolutionId, token) {
    try {
        const button = document.getElementById('completeButton');
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = 'Completing...';
        
        await completeResolution(resolutionId, token);
        alert('Item marked as completed successfully! Thank you for using Retrievo.');
        setTimeout(() => {
            location.reload();
        }, 500);
    } catch (error) {
        alert('Failed to complete resolution: ' + error.message);
        location.reload();
    }
}

async function handleInvalidateResolution(resolutionId, token) {
    try {
        const button = document.getElementById('invalidateButton');
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = 'Marking...';
        
        await invalidateResolution(resolutionId, token);
        alert('Item marked as mismatched successfully! A notification has been sent to the finder.');
        setTimeout(() => {
            location.reload();
        }, 500);
    } catch (error) {
        alert('Failed to invalidate resolution: ' + error.message);
        location.reload();
    }
}

export async function initResolutionDetail() {
    const resolutionId = getQueryParam('id');
    
    if (!resolutionId) {
        setResolutionState('Resolution not found. Please select a notification.', true);
        return;
    }
    
    setResolutionState('Loading resolution details...');
    
    try {
        const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
        if (!token) {
            setResolutionState('Please log in to view resolution details.', true);
            return;
        }
        
        const data = await fetchResolutionDetails(resolutionId, token);
        
        if (!data) {
            setResolutionState('Resolution not found.', true);
            return;
        }
        
        const currentUser = await fetchCurrentUser();
        
        hideResolutionState();
        renderResolutionDetails(data, currentUser, token);
    } catch (error) {
        console.error('Error loading resolution details:', error);
        setResolutionState('Unable to load resolution details. Please try again.', true);
    }
}
