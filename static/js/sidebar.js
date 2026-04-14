import { ACCESS_TOKEN_STORAGE_KEY, API_BASE_URL } from './config.js';

function decodeJwtPayload(token) {
    if (!token || typeof token !== 'string') {
        return null;
    }

    const segments = token.split('.'); // JWT format: header.payload.signature
    if (segments.length < 2) {
        return null;
    }

    try {
        const normalized = segments[1] // Extract payload segment only
            .replace(/-/g, '+')
            .replace(/_/g, '/'); // Normalize base64 string for decoding
        
        const decoded = atob(normalized); // Decode base64 string
        return JSON.parse(decoded);
    } catch {
        return null;
    }
}

function isAdminFromStoredToken() {
    const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
    if (!token) {
        return false;
    }

    const payload = decodeJwtPayload(token);

    return payload?.role === 'admin';
}

function isCurrentAdminPage() {
    const pathname = window.location.pathname || '';
    const page = pathname.split('/').pop() || 'index.html';
    return page === 'admin.html';
}

function syncAdminNavLink() {
    const nav = document.querySelector('.nav-links');
    if (!nav) {
        return;
    }

    const shouldShow = isAdminFromStoredToken();
    let adminLink = nav.querySelector('[data-admin-link]');

    if (!adminLink) {
        adminLink = document.createElement('a');
        adminLink.href = 'admin.html';
        adminLink.dataset.adminLink = 'true';
        adminLink.textContent = 'Admin Page';
        nav.appendChild(adminLink);
    }

    adminLink.hidden = !shouldShow;
    adminLink.classList.toggle('active', shouldShow && isCurrentAdminPage());
}

async function updateUnreadIndicator() {
    try {
        const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
        if (!token) {
            return;
        }

        const response = await fetch(`${API_BASE_URL}/notifications/count`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            return;
        }

        const data = await response.json();
        const unreadCount = data.count || 0;

        // Find notifications link
        const notificationsLink = document.querySelector('a[href="notifications.html"]');
        if (!notificationsLink) {
            return;
        }

        // Remove existing indicator if present
        const existingIndicator = notificationsLink.querySelector('.unread-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        // Add indicator if there are unread notifications
        if (unreadCount > 0) {
            const indicator = document.createElement('span');
            indicator.className = 'unread-indicator';
            indicator.title = `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`;
            notificationsLink.appendChild(indicator);
        }
    } catch (error) {
        console.error('Error updating unread indicator:', error);
    }
}

export function initSidebar() {
    const body = document.body;
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const closeBtn = document.querySelector('.close-btn');
    const openBtn = document.getElementById('openMenu');

    if (!body || !sidebar || !mainContent || !closeBtn || !openBtn) {
        return;
    }

    syncAdminNavLink();
    updateUnreadIndicator();

    window.addEventListener('retrievo-auth-changed', syncAdminNavLink);
    window.addEventListener('storage', syncAdminNavLink);
    window.addEventListener('unread-notifications-updated', updateUnreadIndicator);

    body.classList.add('sidebar-open');

    closeBtn.addEventListener('click', () => {
        body.classList.remove('sidebar-open');
        sidebar.classList.add('sidebar-hidden');
        mainContent.classList.add('full-width');
    });

    openBtn.addEventListener('click', () => {
        body.classList.add('sidebar-open');
        sidebar.classList.remove('sidebar-hidden');
        mainContent.classList.remove('full-width');
    });
}
