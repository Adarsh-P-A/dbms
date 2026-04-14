import { fetchCurrentUser } from './auth.js';
import { ACCESS_TOKEN_STORAGE_KEY, API_BASE_URL } from './config.js';

const ITEMS_ENDPOINT = '/items';
const RESOLUTIONS_ENDPOINT = '/resolutions';
const REPORT_REASONS = ['spam', 'inappropriate', 'harassment', 'fake', 'duplicate', 'other'];

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

function showMessageModal() {
    const modal = document.getElementById('messageModal');
    if (modal) {
        modal.removeAttribute('hidden');
    }
}

function hideMessageModal() {
    const modal = document.getElementById('messageModal');
    if (modal) {
        modal.setAttribute('hidden', '');
        // Clear the input
        const textarea = document.getElementById('messageInput');
        if (textarea) {
            textarea.value = '';
        }
    }
}

async function fetchItemDetails(itemId) {
    const response = await fetch(`${API_BASE_URL}${ITEMS_ENDPOINT}/${itemId}`, {
        method: 'GET'
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch item details (${response.status})`);
    }

    const payload = await response.json();
    // Return the full payload which includes item, reporter, and claim_status
    return payload;
}

async function createResolution(itemId, message, token) {
    const payload = {
        item_id: itemId,
        description: message
    };

    const response = await fetch(`${API_BASE_URL}${RESOLUTIONS_ENDPOINT}/create`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`Failed to create resolution (${response.status})`);
    }

    return await response.json();
}

async function getApiErrorMessage(response, fallback) {
    try {
        const { detail } = await response.json();
        if (typeof detail === 'string') return detail;
        return detail?.[0]?.msg || detail?.[0] || fallback;
    } catch {
        return fallback;
    }
}

async function reportItem(itemId, reason, token) {
    const response = await fetch(`${API_BASE_URL}${ITEMS_ENDPOINT}/${itemId}/report`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
    });

    if (!response.ok) {
        const errorMessage = await getApiErrorMessage(
            response,
            `Failed to report item (${response.status})`
        );
        throw new Error(errorMessage);
    }

    return await response.json();
}

async function deleteItem(itemId, token) {
    const response = await fetch(`${API_BASE_URL}${ITEMS_ENDPOINT}/${itemId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const errorMessage = await getApiErrorMessage(
            response,
            `Failed to delete item (${response.status})`
        );
        throw new Error(errorMessage);
    }

    return await response.json();
}

function populateReportReasons() {
    const select = document.getElementById('reportReason');
    if (!select) return;
    
    REPORT_REASONS.forEach(reason => {
        const option = document.createElement('option');
        option.value = reason;
        option.textContent = reason.charAt(0).toUpperCase() + reason.slice(1);
        select.appendChild(option);
    });
}

async function promptReportReason() {
    return new Promise((resolve) => {
        const modal = document.getElementById('reportModal');
        const select = document.getElementById('reportReason');
        const submitBtn = document.getElementById('reportSubmitBtn');
        const cancelBtn = document.getElementById('reportCancelBtn');
        const closeBtn = modal.querySelector('.modal-close-btn');
        
        const resolveAndClean = (value) => {
            modal.setAttribute('hidden', '');
            resolve(value);
        };
        
        submitBtn.onclick = () => resolveAndClean(select.value);
        cancelBtn.onclick = () => resolveAndClean(null);
        closeBtn.onclick = () => resolveAndClean(null);
        modal.onclick = (e) => e.target === modal && resolveAndClean(null);
        
        modal.removeAttribute('hidden');
        select.value = '';
        select.focus();
    });
}

function renderItemDetails(itemData, claimStatus, currentUser) {
    const contentDiv = document.getElementById('itemDetailContent');
    
    // Handle both full response object and plain item object for backwards compatibility
    const item = itemData.item || itemData;
    const reporter = itemData.reporter || null;
    
    // Set image
    const image = document.getElementById('itemImage');
    image.src = normalizeImageUrl(item.image);
    image.alt = item.title || 'Item Image';
    
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
    document.getElementById('itemVisibility').textContent = item.visibility || 'Unknown';
    document.getElementById('itemType').textContent = getTypeLabel(item.type);
    document.getElementById('itemCategory').textContent = item.category || 'Uncategorized';
    document.getElementById('itemLocation').textContent = formatLocation(item.location);
    document.getElementById('itemDate').textContent = formatDate(item.date);
    
    // Set owner/reporter info
    const ownerInfo = document.getElementById('itemOwnerInfo');
    if (reporter && reporter.name) {
        if (currentUser && currentUser.publicId && reporter.public_id && currentUser.publicId === reporter.public_id) {
            ownerInfo.textContent = `${reporter.name} (You)`;
        } else {
            ownerInfo.textContent = `${reporter.name}`;
        }
    } else {
        ownerInfo.textContent = 'Posted by another user';
    }

    // Show/hide action buttons based on user and item type
    const claimButton = document.getElementById('claimButton');
    const reportButton = document.getElementById('reportButton');
    const deleteButton = document.getElementById('deleteButton');

    // Check if current user is the item creator (reporter)
    // Only hide claim button if user is logged in AND is the item creator
    let isItemCreator = false;
    if (currentUser && currentUser.publicId && reporter && reporter.public_id) {
        isItemCreator = currentUser.publicId === reporter.public_id;
    }
    
    // Show actions only when item has no active claim state.
    // Invariant: claimStatus === 'none' means no claim exists; any other value means a claim/resolution exists.
    const hasActiveResolution = claimStatus !== 'none';
    const canShowActions = !isItemCreator && !hasActiveResolution;

    if (canShowActions) {
        claimButton.style.display = 'inline-block';
        claimButton.textContent = item.type === 'found' ? 'This is Mine' : 'I Found It';

        // Add event listeners
        claimButton.onclick = () => {
            handleClaimItem(item);
        };
    } else {
        claimButton.style.display = 'none';
        claimButton.onclick = null
    }

    if (!isItemCreator) {
        reportButton.style.display = 'inline-block';
        reportButton.onclick = () => handleReportItem(item, reportButton);
    } else {
        reportButton.style.display = 'none';
        reportButton.onclick = null;
    }

    // Only show delete button if user is the item creator and 
    // there is no active resolution (claim) on the item
    if (isItemCreator) {
        deleteButton.style.display = 'inline-block';
        deleteButton.disabled = false;
        deleteButton.textContent = 'Delete Item';
        deleteButton.onclick = () => handleDeleteItem(item, hasActiveResolution, deleteButton);
    } else {
        deleteButton.style.display = 'none';
        deleteButton.onclick = null;
    }

    contentDiv.hidden = false;
}

function handleClaimItem(item) {
    const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
    if (!token) {
        showLoginAlert();
        return;
    }

    // Store item data for modal submission
    window.currentItemForClaim = item;
    showMessageModal();
}

function showLoginAlert() {
    alert('Please log in to claim or return items.');
}

async function handleReportItem(item, reportButton) {
    const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
    if (!token) {
        alert('Please log in to report items.');
        return;
    }

    const reason = await promptReportReason();
    if (reason === null) {
        return;
    }

    if (!reason) {
        alert(`Invalid reason. Please select one.`);
        return;
    }

    const originalLabel = reportButton ? reportButton.textContent : '';
    if (reportButton) {
        reportButton.disabled = true;
        reportButton.textContent = 'Reporting...';
    }

    try {
        await reportItem(item.id, reason, token);
        alert('Item reported successfully. Thank you for helping keep the platform safe.');
    } catch (error) {
        console.error('Error reporting item:', error);
        alert(error.message || 'Failed to report item. Please try again.');
    } finally {
        if (reportButton) {
            reportButton.disabled = false;
            reportButton.textContent = originalLabel || 'Report Item';
        }
    }
}

async function handleDeleteItem(item, hasActiveResolution, deleteButton) {
    const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
    if (!token) {
        alert('Please log in to delete this item.');
        return;
    }

    if (hasActiveResolution) {
        alert('You cannot delete an item that has an active resolution.');
        return;
    }

    const shouldDelete = window.confirm('Delete this item permanently? This action cannot be undone.');
    if (!shouldDelete) {
        return;
    }

    const originalLabel = deleteButton ? deleteButton.textContent : '';
    if (deleteButton) {
        deleteButton.disabled = true;
        deleteButton.textContent = 'Deleting...';
    }

    try {
        await deleteItem(item.id, token);
        alert('Item deleted successfully.');
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error deleting item:', error);
        alert(error.message || 'Failed to delete item. Please try again.');

        if (deleteButton) {
            deleteButton.disabled = false;
            deleteButton.textContent = originalLabel || 'Delete Item';
        }
    }
}

async function handleMessageSubmit() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    const item = window.currentItemForClaim;
    
    if (!item) {
        alert('Error: Item information not found');
        return;
    }
    
    // Validate message length (20-280 characters as per backend requirement)
    if (message.length < 20) {
        alert('Message must be at least 20 characters long');
        messageInput.focus();
        return;
    }
    
    if (message.length > 280) {
        alert('Message cannot exceed 280 characters');
        messageInput.focus();
        return;
    }
    
    const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
    if (!token) {
        alert('Please log in to proceed');
        hideMessageModal();
        return;
    }
    
    try {
        // Show loading state
        const submitBtn = document.getElementById('messageSubmitBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
        
        // Create resolution with the message
        await createResolution(item.id, message, token);
        
        hideMessageModal();
    } catch (error) {
        console.error('Error creating resolution:', error);
        
        // Check for specific error about own item
        if (error.message.includes('400') || error.message.includes('own')) {
            alert('You cannot claim your own item');
        } else {
            alert('Failed to submit request: ' + error.message);
        }
        
        // Reset button
        const submitBtn = document.getElementById('messageSubmitBtn');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit';
    }
}

export async function initItemDetail() {
    const itemId = getQueryParam('id');
    
    if (!itemId) {
        setDetailState('Item not found. Please select an item from the browse page.', true);
        return;
    }
    
    // Populate report reasons dropdown
    populateReportReasons();
    
    setDetailState('Loading Item Details...');
    
    // Set up modal event listeners
    const messageModal = document.getElementById('messageModal');
    const messageCancelBtn = document.getElementById('messageCancelBtn');
    const messageSubmitBtn = document.getElementById('messageSubmitBtn');
    const modalCloseBtn = document.querySelector('.modal-close-btn');
    const messageInput = document.getElementById('messageInput');
    const charCount = document.getElementById('charCount');
    
    // Disable submit button initially
    if (messageSubmitBtn) {
        messageSubmitBtn.disabled = true;
    }
    
    if (messageCancelBtn) {
        messageCancelBtn.onclick = hideMessageModal;
    }
    
    if (messageSubmitBtn) {
        messageSubmitBtn.onclick = handleMessageSubmit;
    }
    
    if (modalCloseBtn) {
        modalCloseBtn.onclick = hideMessageModal;
    }
    
    // Add character counter listener
    if (messageInput) {
        messageInput.addEventListener('input', () => {
            const count = messageInput.value.length;
            if (charCount) {
                charCount.textContent = count;
            }
            
            // Update counter color based on character count
            const counterElement = document.querySelector('.message-counter');
            if (counterElement) {
                counterElement.classList.remove('warning', 'error');
                if (count < 20) {
                    counterElement.classList.add('error');
                } else if (count > 250) {
                    counterElement.classList.add('warning');
                }
            }
            
            // Disable/enable submit button based on character count
            if (messageSubmitBtn) {
                messageSubmitBtn.disabled = count < 20 || count > 280;
            }
        });
    }
    
    // Close modal when clicking outside
    if (messageModal) {
        messageModal.onclick = (e) => {
            if (e.target === messageModal) {
                hideMessageModal();
            }
        };
    }
    
    try {
        const itemData = await fetchItemDetails(itemId);
        
        if (!itemData) {
            setDetailState('Item not found.', true);
            return;
        }
        
        // Verify we have at least the item data
        const item = itemData.item || itemData;
        if (!item) {
            setDetailState('Item not found.', true);
            return;
        }

        // Get the resolution status
        const claimStatus = itemData.claim_status;
        
        // Optionally fetch current user for contextual actions
        let currentUser = null;
        
        try {
            currentUser = await fetchCurrentUser();
        } catch (e) {
            // User not logged in, that's okay
            console.log('User not logged in');
        }
        
        hideDetailState();
        renderItemDetails(itemData, claimStatus, currentUser);
    } catch (error) {
        console.error('Error loading item details:', error);
        setDetailState('Unable to load item details. Please try again.', true);
    }
}

