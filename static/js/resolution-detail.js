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

function hasContactDetails(contact) {
    if (!contact || typeof contact !== 'object') {
        return false;
    }

    return Boolean(contact.name || contact.email || contact.phone);
}

function getContactHeaderText(isOwnerInitiated, isFinderInitiated, viewerRole) {
    if (isOwnerInitiated) {
        if (viewerRole === 'finder') {
            return 'Claimer\'s Contact Details';
        }

        if (viewerRole === 'owner') {
            return 'Finder\'s Contact Details';
        }
    }

    if (isFinderInitiated) {
        if (viewerRole === 'owner') {
            return 'Finder\'s Contact Details';
        }

        if (viewerRole === 'finder') {
            return 'Owner\'s Contact Details';
        }
    }

    return 'Contact Details';
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
    const finderContact = data?.finder_contact ?? null;
    const allowedActions = data.allowed_actions || [];
    
    // Determine context-appropriate subtitle based on resolution type, status, and viewer role
    const subtitle = document.getElementById('resolutionSubtitle');
    const isOwnerInitiated = resolution.type === 'owner_initiated';
    const isFinderInitiated = resolution.type === 'finder_initiated';
    const viewerRole = viewer.role;
    
    if (isOwnerInitiated) {
        // Found item: viewer is either "finder" (who reported) or "owner" (who claims)
        if (viewerRole === 'finder') {
            subtitle.textContent = 'Someone has claimed your found item. Please review and approve or reject their claim.';
        } else if (viewerRole === 'owner') {
            if (resolution.status === 'pending') {
                subtitle.textContent = 'Your claim is pending. Waiting for the finder to review and approve.';
            } else if (resolution.status === 'approved') {
                subtitle.textContent = 'Your claim has been approved! Please coordinate with the finder to collect your item.';
            } else if (resolution.status === 'rejected') {
                subtitle.textContent = 'Unfortunately, your claim was rejected by the finder.';
            } else {
                subtitle.textContent = getStatusLabel(resolution.status);
            }
        }
    } else if (isFinderInitiated) {
        // Lost item: viewer is either "owner" (who reported lost) or "finder" (who found)
        if (viewerRole === 'owner') {
            if (resolution.status === 'return_initiated') {
                subtitle.textContent = 'A finder has reported finding your lost item. Please verify it\'s the correct item and approve the return.';
            } else if (resolution.status === 'approved') {
                subtitle.textContent = 'You\'ve approved the return. Please confirm the collection and mark as completed, or mark as item mismatch if it\'s not the correct item.';
            } else if (resolution.status === 'completed') {
                subtitle.textContent = 'Great! Your item has been successfully returned.';
            } else if (resolution.status === 'invalidated') {
                subtitle.textContent = 'You\'ve marked this as an item mismatch. No action needed.';
            } else {
                subtitle.textContent = getStatusLabel(resolution.status);
            }
        } else if (viewerRole === 'finder') {
            if (resolution.status === 'return_initiated') {
                subtitle.textContent = 'You\'ve reported finding this item. Waiting for the owner to review and confirm.';
            } else if (resolution.status === 'approved') {
                subtitle.textContent = 'The owner has approved your report. Coordinate to hand over the item.';
            } else if (resolution.status === 'completed') {
                subtitle.textContent = 'The item return has been completed. Thank you for your help!';
            } else if (resolution.status === 'invalidated') {
                subtitle.textContent = 'The owner marked this as an item mismatch.';
            } else {
                subtitle.textContent = getStatusLabel(resolution.status);
            }
        }
    }
    
    // Set status
    const statusElement = document.getElementById('resolutionStatus');
    if (statusElement) {
        statusElement.textContent = getStatusLabel(resolution.status);
        statusElement.className = `status-badge status-${resolution.status || 'unknown'}`;
    }
    
    const contactCard = document.querySelector('#finderDetails')?.closest('.card');
    const finderDetails = document.getElementById('finderDetails');
    finderDetails.innerHTML = '';

    if (hasContactDetails(finderContact)) {
        if (contactCard) {
            contactCard.hidden = false;
        }

        const contactHeaderText = getContactHeaderText(isOwnerInitiated, isFinderInitiated, viewerRole);
        const contactHeader = contactCard?.querySelector('h3');
        if (contactHeader) {
            contactHeader.textContent = contactHeaderText;
        }

        if (finderContact.name) {
            const nameElement = document.createElement('p');
            const strongElement = document.createElement('strong');
            strongElement.textContent = finderContact.name;
            nameElement.appendChild(strongElement);
            finderDetails.appendChild(nameElement);
        }

        if (finderContact.email) {
            const emailElement = document.createElement('p');
            emailElement.className = 'small';
            emailElement.textContent = `Email: ${finderContact.email}`;
            finderDetails.appendChild(emailElement);
        }

        if (finderContact.phone) {
            const phoneElement = document.createElement('p');
            phoneElement.className = 'small';
            phoneElement.textContent = `Phone: ${finderContact.phone}`;
            finderDetails.appendChild(phoneElement);
        }
    } else {
        if (contactCard) {
            contactCard.hidden = true;
        }
    }
    
    // Item details
    if (item) {
        const itemImage = document.getElementById('itemImageDetail');
        itemImage.src = normalizeImageUrl(item.image);
        itemImage.alt = item.title || 'Item image';
        
        document.getElementById('itemTitleDetail').textContent = item.title || 'Untitled Item';
        document.getElementById('itemCategory').textContent = item.category || 'No category specified';
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
        // Button text based on resolution type
        if (isFinderInitiated) {
            approveButton.textContent = 'Approve Return';
        } else {
            approveButton.textContent = 'Approve Claim';
        }
        approveButton.onclick = () => handleApproveResolution(resolution.id, token, isFinderInitiated);
    }
    
    if (allowedActions.includes('reject')) {
        rejectButton.style.display = 'inline-block';
        // Button text based on resolution type
        if (isFinderInitiated) {
            rejectButton.textContent = 'Reject / Item Doesn\'t Match';
        } else {
            rejectButton.textContent = 'Reject Claim';
        }
        rejectButton.onclick = () => handleRejectResolution(resolution.id, token, isFinderInitiated);
    }
    
    if (allowedActions.includes('complete')) {
        completeButton.style.display = 'inline-block';
        completeButton.textContent = 'Mark as Completed';
        completeButton.onclick = () => handleCompleteResolution(resolution.id, token, isFinderInitiated);
    }
    
    if (allowedActions.includes('invalidate')) {
        invalidateButton.style.display = 'inline-block';
        // Button text based on resolution type
        if (isFinderInitiated) {
            invalidateButton.textContent = 'Item Mismatch';
        } else {
            invalidateButton.textContent = 'Item Doesn\'t Match';
        }
        invalidateButton.onclick = () => handleInvalidateResolution(resolution.id, token, isFinderInitiated);
    }
    
    contentDiv.hidden = false;
}

async function handleApproveResolution(resolutionId, token, isFinderInitiated) {
    try {
        const button = document.getElementById('approveButton');
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = 'Approving...';
        
        await approveResolution(resolutionId, token);
        
        const message = isFinderInitiated 
            ? 'Return approved successfully! A notification has been sent to the finder.' 
            : 'Claim approved successfully! A notification has been sent to the claimer.';
        alert(message);
        
        setTimeout(() => {
            location.reload();
        }, 500);
    } catch (error) {
        alert('Failed to approve resolution: ' + error.message);
        location.reload();
    }
}

async function handleRejectResolution(resolutionId, token, isFinderInitiated) {
    try {
        const button = document.getElementById('rejectButton');
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = 'Rejecting...';
        
        await rejectResolution(resolutionId, token);
        
        const message = isFinderInitiated 
            ? 'Return rejected successfully! A notification has been sent to the finder.' 
            : 'Claim rejected successfully! A notification has been sent to the claimer.';
        alert(message);
        
        setTimeout(() => {
            location.reload();
        }, 500);
    } catch (error) {
        alert('Failed to reject resolution: ' + error.message);
        location.reload();
    }
}

async function handleCompleteResolution(resolutionId, token, isFinderInitiated) {
    try {
        const button = document.getElementById('completeButton');
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = 'Completing...';
        
        await completeResolution(resolutionId, token);
        
        const message = isFinderInitiated 
            ? 'Item retrieval completed successfully! Thank you for using Retrievo.' 
            : 'Item transfer completed successfully! Thank you for using Retrievo.';
        alert(message);
        
        setTimeout(() => {
            location.reload();
        }, 500);
    } catch (error) {
        alert('Failed to complete resolution: ' + error.message);
        location.reload();
    }
}

async function handleInvalidateResolution(resolutionId, token, isFinderInitiated) {
    try {
        const button = document.getElementById('invalidateButton');
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = 'Marking...';
        
        await invalidateResolution(resolutionId, token);
        
        const message = isFinderInitiated 
            ? 'Item marked as incorrect/mismatch. The finder has been notified that this was not the correct item.' 
            : 'Item marked as mismatched. The claimer has been notified.';
        alert(message);
        
        setTimeout(() => {
            location.reload();
        }, 500);
    } catch (error) {
        alert('Failed to mark item as mismatched: ' + error.message);
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
