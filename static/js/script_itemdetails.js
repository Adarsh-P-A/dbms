// details-script.js
import { fetchCurrentUser, initGoogleLogin } from './auth.js';
import { API_BASE_URL, ACCESS_TOKEN_STORAGE_KEY, RESOLUTIONS_ENDPOINT } from './config.js';

// Initialize Google Login
initGoogleLogin();

// Sidebar code 
const sidebar = document.querySelector('.sidebar');
const mainContent = document.querySelector('.main-content');
const closeBtn = document.querySelector('.close-btn');
const openBtn = document.getElementById('openMenu');
const body = document.body;

body.classList.add('sidebar-open');

// Function to close sidebar
closeBtn.addEventListener('click', () => {
    body.classList.remove('sidebar-open');
    sidebar.classList.add('sidebar-hidden');
    mainContent.classList.add('full-width');
});

// Function to open sidebar
openBtn.addEventListener('click', () => {
    body.classList.add('sidebar-open');
    sidebar.classList.remove('sidebar-hidden');
    mainContent.classList.remove('full-width');
});

// Get the ID from the URL query string
const urlParams = new URLSearchParams(window.location.search);
const itemId = urlParams.get('id');

async function loadItemDetails() {
    if (!itemId) {
        document.querySelector('.item-details-section').innerHTML = `
            <h1 style="color: red; text-align: center;">No item ID provided</h1>
            <p style="text-align: center;"><a href="index.html">Return to Home</a></p>
        `;
        return;
    }

    try {
        document.querySelector('.item-details-section').innerHTML = '<p>Loading item details...</p>';

        const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
        const headers = { 'Content-Type': 'application/json' };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE_URL}/items/${itemId}`, {
            method: 'GET',
            headers: headers
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch item: ${response.status}`);
        }

        const data = await response.json();
        const currentItem = data.item || data;

        // Restore the HTML structure
        document.querySelector('.item-details-section').innerHTML = `
            <div class="details-header">
                <h1 id="detail-title" class="details-title">Loading...</h1>
                <p id="detail-description" class="detail-subtitle">Loading description...</p>
            </div>

            <div class="content-grid">
                <div class="left-column">
                    <div class="image-canvas">
                        <img id="detail-image" src="" alt="Item Image">
                    </div>
                </div>

                <div class="right-column">
                    <div class="details-card">
                        <div class="badges">
                            <span id="detail-category" class="badge category">Category</span>
                            <span id="detail-type" class="badge type">Type</span>
                            <span id="detail-visibility" class="badge visibility">Visibility</span>
                        </div>

                        <h3 class="section-heading">Details of the Item</h3>
                        <ul class="meta-list">
                            <li>
                                <span class="meta-label">Date:</span> 
                                <span id="detail-date" class="meta-value"></span>
                            </li>
                            <li>
                                <span class="meta-label">Location:</span> 
                                <span id="detail-location" class="meta-value"></span>
                            </li>
                            <li>
                                <span class="meta-label">Posted On:</span> 
                                <span id="detail-created" class="meta-value"></span>
                            </li>
                            <li>
                                <span class="meta-label">Poster ID:</span> 
                                <span id="detail-poster" class="meta-value"></span>
                            </li>
                        </ul>
                        
                        <button class="primary-action-btn">Take Action</button>
                    </div>
                </div>
            </div>
        `;

        // Populate the DOM
        const imgElement = document.getElementById('detail-image');
        if (currentItem.image) {
            imgElement.src = currentItem.image;
            imgElement.style.display = "block";
        }

        // Populate standard text fields
        document.getElementById('detail-title').textContent = currentItem.title || 'Untitled';
        document.getElementById('detail-category').textContent = currentItem.category || 'Unknown';
        document.getElementById('detail-type').textContent = (currentItem.type || 'item').toUpperCase();
        document.getElementById('detail-visibility').textContent = `Visibility: ${currentItem.visibility || 'N/A'}`;
        
        const foundDate = new Date(currentItem.date).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        document.getElementById('detail-date').textContent = foundDate;
        document.getElementById('detail-location').textContent = currentItem.location || 'Unknown';
        
        const createdDate = new Date(currentItem.created_at).toLocaleDateString('en-IN');
        document.getElementById('detail-created').textContent = createdDate;
        
        document.getElementById('detail-poster').textContent = currentItem.poster_id || 'Unknown';
        document.getElementById('detail-description').textContent = currentItem.description || 'No description provided';

        setupModal(itemId, currentItem);

    } catch (error) {
        console.error('Error loading item:', error);
        document.querySelector('.item-details-section').innerHTML = `
            <h1 style="color: red; text-align: center;">Item Not Found</h1>
            <p style="text-align: center;"><a href="index.html">Return to Home</a></p>
        `;
    }
}

function setupModal(itemId, itemData) {
    const actionBtn = document.querySelector('.primary-action-btn');
    const modal = document.getElementById('action-modal');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalCancel = document.getElementById('modal-cancel');
    const modalSubmit = document.getElementById('modal-submit');
    const messageInput = document.getElementById('action-message');

    const openModal = () => {
        if (!modal) return;
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        messageInput?.focus();
    };

    const closeModal = () => {
        if (!modal) return;
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
        if (messageInput) {
            messageInput.value = '';
        }
    };

    actionBtn?.addEventListener('click', openModal);
    modalBackdrop?.addEventListener('click', closeModal);
    modalCancel?.addEventListener('click', closeModal);
    modalSubmit?.addEventListener('click', async () => {
        if (!messageInput) return;
        const message = messageInput.value.trim();
        if (!message) {
            alert('Please write a message before submitting.');
            messageInput.focus();
            return;
        }

        await submitResolution(itemId, message);
        closeModal();
    });
}

async function submitResolution(itemId, message) {
    try {
        const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
        if (!token) {
            alert('Please login to submit a resolution.');
            return;
        }

        const currentUser = await fetchCurrentUser();
        if (!currentUser) {
            alert('Please login to submit a resolution.');
            return;
        }

        const response = await fetch(`${API_BASE_URL}${RESOLUTIONS_ENDPOINT}/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                item_id: itemId,
                message: message,
                resolution_type: currentUser.role === 'finder' ? 'finder_initiated' : 'owner_initiated'
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to create resolution: ${response.status}`);
        }

        const data = await response.json();
        alert('Resolution submitted successfully!');
        
        // Redirect to resolution page if resolution_id is provided
        if (data.resolution_id) {
            window.location.href = `resolution.html?id=${data.resolution_id}`;
        } else {
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Error submitting resolution:', error);
        alert('Failed to submit resolution. Please try again.');
    }
}

// Load item details when DOM is ready
document.addEventListener('DOMContentLoaded', loadItemDetails);

const closeModal = () => {
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    if (messageInput) {
        messageInput.value = '';
    }
};

actionBtn?.addEventListener('click', openModal);
modalBackdrop?.addEventListener('click', closeModal);
modalCancel?.addEventListener('click', closeModal);
modalSubmit?.addEventListener('click', () => {
    if (!messageInput) return;
    const message = messageInput.value.trim();
    if (!message) {
        alert('Please write a message before submitting.');
        messageInput.focus();
        return;
    }

    alert(`Submitted message:\n${message}`);
    closeModal();
});