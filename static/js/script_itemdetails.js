// details-script.js
import { backendData } from './backendData.js';

//Sidebar code 
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

    // 1. Get the ID from the URL query string (e.g., ?id=123)
    const urlParams = new URLSearchParams(window.location.search);
    const itemId = urlParams.get('id');

    // 2. Find the item in our mock database
    const currentItem = backendData.find(item => item.id === itemId);

    // 3. Populate the DOM if the item exists
    if (currentItem) {
        // Handle the image (with a fallback if image is null)
        const imgElement = document.getElementById('detail-image');
        if (currentItem.image) {
            imgElement.src = currentItem.image;
            imgElement.style.display = "block";
        }

        // Populate standard text fields
        document.getElementById('detail-title').textContent = currentItem.title;
        document.getElementById('detail-category').textContent = currentItem.category;
        document.getElementById('detail-type').textContent = currentItem.type;
        document.getElementById('detail-visibility').textContent = `Visibility: ${currentItem.visibility}`;
        
        document.getElementById('detail-date').textContent = currentItem.date;
        document.getElementById('detail-location').textContent = currentItem.location;
        
        // Format the created_at string to look nicer (optional)
        const createdDate = new Date(currentItem.created_at).toLocaleDateString();
        document.getElementById('detail-created').textContent = createdDate;
        
        document.getElementById('detail-poster').textContent = currentItem.poster_id;
        document.getElementById('detail-description').textContent = currentItem.description;

    } else {
        // What to do if someone typed a bad ID into the URL
        document.querySelector('.item-details-section').innerHTML = `
            <h1 style="color: red; text-align: center;">Item Not Found</h1>
            <p style="text-align: center;"><a href="index.html">Return to Home</a></p>
        `;
    }

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