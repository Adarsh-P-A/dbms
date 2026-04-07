import { fetchCurrentUser } from './auth.js';
import { ACCESS_TOKEN_STORAGE_KEY, API_BASE_URL } from './config.js';

const ITEMS_ENDPOINT = '/items';
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

function renderItemDetails(itemData, currentUser) {
    const contentDiv = document.getElementById('itemDetailContent');
    
    // Handle both full response object and plain item object for backwards compatibility
    const item = itemData.item || itemData;
    const reporter = itemData.reporter || null;
    
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
    
    // Set owner/reporter info
    const ownerInfo = document.getElementById('itemOwnerInfo');
    if (reporter && reporter.name) {
        ownerInfo.textContent = `${reporter.name}`;
    } else {
        ownerInfo.textContent = 'Posted by another user';
    }
    
    // Show/hide action buttons based on user and item type
    const claimButton = document.getElementById('claimButton');
    const reportButton = document.getElementById('reportButton');
    
    // Check if current user is the item creator (reporter)
    // Only hide claim button if user is logged in AND is the item creator
    let isItemCreator = false;
    if (currentUser && currentUser.publicId && reporter && reporter.public_id) {
        isItemCreator = currentUser.publicId === reporter.public_id;
    }
    
    // Show claim button only for found/lost items and only if user is NOT the creator
    if ((item.type === 'found' || item.type === 'lost') && !isItemCreator) {
        claimButton.style.display = 'inline-block';
        reportButton.style.display = 'inline-block';
        if (item.type === 'found') {
            claimButton.textContent = 'This is mine';
            
        } else {
            claimButton.textContent = 'I found it';
        }
    } else {
        claimButton.style.display = 'none';
    }
    
    
    
    // Add event listeners
    claimButton.onclick = () => handleClaimItem(item);
    reportButton.onclick = () => handleReportItem(item);
    
    contentDiv.hidden = false;
}

function handleClaimItem(item) {
    // Store item data for modal submission
    window.currentItemForClaim = item;
    showMessageModal();
}

function handleReportItem(item) {
    // Navigate to report page with item ID pre-filled
    window.location.href = `report.html?itemId=${item.id}`;
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
        alert('Request submitted successfully! Redirecting to notifications...');
        
        // Redirect to notifications page (since API only returns {"ok": true})
        window.location.href = 'notifications.html';
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
    
    setDetailState('Loading item details...');
    
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
        
        // Optionally fetch current user for contextual actions
        let currentUser = null;
        try {
            currentUser = await fetchCurrentUser();
        } catch (e) {
            // User not logged in, that's okay
            console.log('User not logged in');
        }
        
        hideDetailState();
        renderItemDetails(itemData, currentUser);
    } catch (error) {
        console.error('Error loading item details:', error);
        setDetailState('Unable to load item details. Please try again.', true);
    }
}

