import { fetchCurrentUser } from './auth.js';
import { ACCESS_TOKEN_STORAGE_KEY, API_BASE_URL } from './config.js';

const ADMIN_ACTIVITY_ENDPOINT = '/admin/activity';
const ADMIN_USERS_ENDPOINT = '/admin/users';
const ADMIN_REPORTED_ITEMS_ENDPOINT = '/admin/reported-items';

function getToken() {
    return localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

function setAdminState(message, isError = false) {
    const stateElement = document.getElementById('adminState');
    if (!stateElement) {
        return;
    }

    stateElement.textContent = message;
    stateElement.hidden = false;
    stateElement.classList.toggle('is-error', isError);
}

function hideAdminState() {
    const stateElement = document.getElementById('adminState');
    if (!stateElement) {
        return;
    }

    stateElement.hidden = true;
}

function clearContainer(id) {
    const container = document.getElementById(id);
    if (!container) {
        return null;
    }

    container.innerHTML = '';
    return container;
}

function createEmptyNote(message) {
    const note = document.createElement('div');
    note.className = 'empty-note';
    note.textContent = message;
    return note;
}

function formatDate(rawValue) {
    if (!rawValue) {
        return 'N/A';
    }

    const date = new Date(rawValue);
    if (Number.isNaN(date.getTime())) {
        return String(rawValue);
    }

    return date.toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function titleCase(value) {
    if (!value) {
        return '';
    }

    return String(value)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function parseApiError(response, fallback) {
    try {
        const payload = await response.json();

        if (typeof payload?.detail === 'string') {
            return payload.detail;
        }

        if (Array.isArray(payload?.detail) && payload.detail.length > 0) {
            const first = payload.detail[0];
            if (typeof first === 'string') {
                return first;
            }
            if (typeof first?.msg === 'string') {
                return first.msg;
            }
        }

        return fallback;
    } catch {
        return fallback;
    }
}

async function request(path, token, options = {}) {
    const method = options.method || 'GET';
    const hasBody = Boolean(options.body);

    const headers = {
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
    };

    if (hasBody) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers,
        body: hasBody ? JSON.stringify(options.body) : undefined
    });

    if (!response.ok) {
        const fallback = `Request failed (${response.status}).`;
        throw new Error(await parseApiError(response, fallback));
    }

    if (response.status === 204) {
        return null;
    }

    return await response.json();
}

async function fetchActivity(token) {
    return request(`${ADMIN_ACTIVITY_ENDPOINT}?limit=40`, token);
}

async function fetchUsers(token) {
    return request(`${ADMIN_USERS_ENDPOINT}?limit=50`, token);
}

async function fetchReportedItems(token) {
    return request(`${ADMIN_REPORTED_ITEMS_ENDPOINT}?limit=50`, token);
}

function createActionButton(label, className, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `action-btn ${className}`;
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
}

function renderActivity(items) {
    const container = clearContainer('activityList');
    if (!container) {
        return;
    }

    if (!Array.isArray(items) || items.length === 0) {
        container.appendChild(createEmptyNote('No recent admin activity.'));
        return;
    }

    for (const entry of items) {
        const card = document.createElement('article');
        card.className = 'list-card';

        const heading = document.createElement('h3');
        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = titleCase(entry.type || 'activity');
        heading.appendChild(badge);

        const description = document.createElement('p');
        description.className = 'meta-row';
        description.textContent = entry.description || 'No description';

        const timestamp = document.createElement('p');
        timestamp.className = 'meta-row';
        timestamp.textContent = `Time: ${formatDate(entry.timestamp)}`;

        card.appendChild(heading);
        card.appendChild(description);
        card.appendChild(timestamp);

        container.appendChild(card);
    }
}

function renderUsers(users, onAction) {
    const container = clearContainer('userList');
    if (!container) {
        return;
    }

    if (!Array.isArray(users) || users.length === 0) {
        container.appendChild(createEmptyNote('No users found.'));
        return;
    }

    for (const user of users) {
        const card = document.createElement('article');
        card.className = 'list-card';

        const name = document.createElement('h3');
        name.textContent = `${user.name || 'Unnamed'} (${user.public_id || 'No ID'})`;

        const email = document.createElement('p');
        email.className = 'meta-row';
        email.textContent = `Email: ${user.email || 'N/A'}`;

        const reports = document.createElement('p');
        reports.className = 'meta-row';
        reports.textContent = `Reports received: ${user.reports_received ?? 0} | Items posted: ${user.items_posted ?? 0}`;

        const moderation = document.createElement('p');
        moderation.className = 'meta-row';
        moderation.textContent = `Warnings: ${user.warning_count ?? 0} | Banned: ${user.is_banned ? 'Yes' : 'No'}`;

        const row = document.createElement('div');
        row.className = 'action-row';

        row.appendChild(
            createActionButton('Warn', 'warn', async () => {
                await onAction({ userId: user.id, action: 'warn' });
            })
        );

        row.appendChild(
            createActionButton('Temp Ban', 'ban', async () => {
                const reason = 'Temporary Ban';
                const daysInput = window.prompt('Ban duration in days:', '7');
                const parsedDays = Number.parseInt(daysInput || '7', 10);
                const banDays = Number.isFinite(parsedDays) && parsedDays > 0 ? parsedDays : 7;

                await onAction({
                    userId: user.id,
                    action: 'temp_ban',
                    reason,
                    ban_days: banDays
                });
            })
        );

        row.appendChild(
            createActionButton('Unban', 'unban', async () => {
                await onAction({ userId: user.id, action: 'unban' });
            })
        );

        card.appendChild(name);
        card.appendChild(email);
        card.appendChild(reports);
        card.appendChild(moderation);
        card.appendChild(row);

        container.appendChild(card);
    }
}

function renderReportedItems(items, onAction) {
    const container = clearContainer('reportedItemsList');
    if (!container) {
        return;
    }

    if (!Array.isArray(items) || items.length === 0) {
        container.appendChild(createEmptyNote('No reported items pending review.'));
        return;
    }

    for (const item of items) {
        const card = document.createElement('article');
        card.className = 'list-card';

        const title = document.createElement('h3');
        title.textContent = item.title || 'Untitled item';

        const info = document.createElement('p');
        info.className = 'meta-row';
        info.textContent = `Item ID: ${item.id} | Owner: ${item.owner_name || 'N/A'} | Visibility: ${item.visibility || 'N/A'}`;

        const count = document.createElement('p');
        count.className = 'meta-row';
        count.textContent = `Reports: ${item.report_count ?? 0} | Created: ${formatDate(item.created_at)}`;

        const status = document.createElement('p');
        status.className = 'meta-row';
        const statusBadge = document.createElement('span');
        statusBadge.className = `badge ${item.is_hidden ? 'hidden' : 'visible'}`;
        statusBadge.textContent = item.is_hidden
            ? `Hidden (${titleCase(item.hidden_reason || 'unknown')})`
            : 'Visible';
        status.appendChild(statusBadge);

        const row = document.createElement('div');
        row.className = 'action-row';

        row.appendChild(
            createActionButton('Hide', 'ban', async () => {
                await onAction({ itemId: item.id, action: 'hide' });
            })
        );

        row.appendChild(
            createActionButton('Restore', 'restore', async () => {
                await onAction({ itemId: item.id, action: 'restore' });
            })
        );

        row.appendChild(
            createActionButton('Delete', 'delete', async () => {
                const confirmed = window.confirm('Delete this item permanently?');
                if (!confirmed) {
                    return;
                }
                await onAction({ itemId: item.id, action: 'delete' });
            })
        );

        card.appendChild(title);
        card.appendChild(info);
        card.appendChild(count);
        card.appendChild(status);

        if (Array.isArray(item.reports) && item.reports.length > 0) {
            const reportHistory = document.createElement('div');
            reportHistory.className = 'report-history';

            for (const report of item.reports.slice(0, 3)) {
                const line = document.createElement('p');
                line.className = 'meta-row';
                line.textContent = `${report.reporter_name || 'Unknown'}: ${titleCase(report.reason)} (${titleCase(report.status)})`;
                reportHistory.appendChild(line);
            }

            card.appendChild(reportHistory);
        }

        card.appendChild(row);
        container.appendChild(card);
    }
}

async function moderateUser(token, payload) {
    const path = `${ADMIN_USERS_ENDPOINT}/${payload.userId}/moderate`;
    const body = {
        action: payload.action
    };

    if (payload.reason) {
        body.reason = payload.reason;
    }
    if (payload.ban_days) {
        body.ban_days = payload.ban_days;
    }

    return request(path, token, {
        method: 'POST',
        body
    });
}

async function moderateItem(token, payload) {
    const path = `/admin/items/${payload.itemId}/moderate`;
    return request(path, token, {
        method: 'POST',
        body: { action: payload.action }
    });
}

async function loadDashboard(token) {
    const [activity, users, reportedItems] = await Promise.all([
        fetchActivity(token),
        fetchUsers(token),
        fetchReportedItems(token)
    ]);

    renderActivity(activity);
    renderUsers(users, async (payload) => {
        await moderateUser(token, payload);
        await refreshDashboard(token);
    });
    renderReportedItems(reportedItems, async (payload) => {
        await moderateItem(token, payload);
        await refreshDashboard(token);
    });
}

let isRefreshing = false;

async function refreshDashboard(token) {
    if (isRefreshing) {
        return;
    }

    isRefreshing = true;
    try {
        setAdminState('Refreshing dashboard...');
        await loadDashboard(token);
        hideAdminState();
        const panels = document.getElementById('adminPanels');
        if (panels) {
            panels.hidden = false;
        }
    } catch (error) {
        setAdminState(error.message || 'Failed to load admin dashboard.', true);
    } finally {
        isRefreshing = false;
    }
}

export async function initAdminDashboard() {
    const stateElement = document.getElementById('adminState');
    if (!stateElement) {
        return;
    }

    setAdminState('Checking access...');

    const user = await fetchCurrentUser();
    if (!user) {
        setAdminState('Log in with an admin account to use this page.', true);
        return;
    }

    if (user.role !== 'admin') {
        setAdminState('This page is restricted to admin accounts.', true);
        return;
    }

    const token = getToken();
    if (!token) {
        setAdminState('Missing access token. Log in again.', true);
        return;
    }

    const refreshButton = document.getElementById('adminRefreshBtn');
    if (refreshButton) {
        refreshButton.addEventListener('click', async () => {
            await refreshDashboard(token);
        });
    }

    await refreshDashboard(token);
}
