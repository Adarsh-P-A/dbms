import { fetchCurrentUser } from './auth.js';
import { ACCESS_TOKEN_STORAGE_KEY, API_BASE_URL } from './config.js';

const NOTIFICATIONS_ALL_ENDPOINT = '/notifications/all';

function formatRelativeTime(createdAt) {
    if (!createdAt) {
        return 'Just now';
    }

    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) {
        return 'Just now';
    }

    const diffInSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (diffInSeconds < 60) {
        return 'Just now';
    }

    const units = [
        { label: 'year', seconds: 365 * 24 * 60 * 60 },
        { label: 'month', seconds: 30 * 24 * 60 * 60 },
        { label: 'day', seconds: 24 * 60 * 60 },
        { label: 'hour', seconds: 60 * 60 },
        { label: 'minute', seconds: 60 }
    ];

    for (const unit of units) {
        const value = Math.floor(diffInSeconds / unit.seconds);
        if (value >= 1) {
            return `${value} ${unit.label}${value > 1 ? 's' : ''} ago`;
        }
    }

    return 'Just now';
}

function getNotificationTitle(notification) {
    const title = notification.title || notification.type || notification.event_type || notification.category;
    if (!title || typeof title !== 'string') {
        return 'Notification';
    }

    return title;
}

function getNotificationMessage(notification) {
    const message = notification.message || notification.body || notification.content || notification.text || notification.description;
    if (typeof message === 'string' && message.trim() !== '') {
        return message;
    }

    return 'You have a new update.';
}

function setStateText(stateElement, message) {
    if (!stateElement) {
        return;
    }

    stateElement.textContent = message;
    stateElement.hidden = false;
}

function renderNotifications(listElement, notifications) {
    listElement.innerHTML = '';

    for (const notification of notifications) {
        const item = document.createElement('div');
        item.className = 'notification-item';

        if (!notification.is_read) {
            item.classList.add('unread');
        }

        const message = document.createElement('p');
        const title = document.createElement('strong');
        title.textContent = `${getNotificationTitle(notification)}: `;
        message.appendChild(title);
        message.appendChild(document.createTextNode(getNotificationMessage(notification)));

        const time = document.createElement('span');
        time.className = 'time';
        time.textContent = formatRelativeTime(notification.created_at);

        item.appendChild(message);
        item.appendChild(time);
        
        // Add click handler to navigate to resolution page if resolution_id exists
        if (notification.resolution_id) {
            item.style.cursor = 'pointer';
            item.addEventListener('click', () => {
                window.location.href = `resolution.html?id=${notification.resolution_id}`;
            });
        }
        
        listElement.appendChild(item);
    }
}

async function fetchNotifications(token) {
    const response = await fetch(`${API_BASE_URL}${NOTIFICATIONS_ALL_ENDPOINT}?limit=100`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.notifications)) {
        return [];
    }

    return data.notifications;
}

export async function initNotifications() {
    const listElement = document.getElementById('notificationList');
    const stateElement = document.getElementById('notificationsState');

    if (!listElement || !stateElement) {
        return;
    }

    setStateText(stateElement, 'Loading notifications...');

    const user = await fetchCurrentUser();
    if (!user) {
        listElement.innerHTML = '';
        setStateText(stateElement, 'Log in to see your notifications.');
        return;
    }

    const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
    if (!token) {
        listElement.innerHTML = '';
        setStateText(stateElement, 'Log in to see your notifications.');
        return;
    }

    try {
        const notifications = await fetchNotifications(token);

        if (notifications.length === 0) {
            listElement.innerHTML = '';
            setStateText(stateElement, 'You have no notifications yet.');
            return;
        }

        stateElement.hidden = true;
        renderNotifications(listElement, notifications);
    } catch (error) {
        listElement.innerHTML = '';
        setStateText(stateElement, 'Unable to load notifications right now. Please try again.');
    }
}