import {
    ACCESS_TOKEN_REFRESHED_AT_STORAGE_KEY,
    ACCESS_TOKEN_EXPIRES_AT_STORAGE_KEY,
    ACCESS_TOKEN_STORAGE_KEY,
    API_BASE_URL,
    GOOGLE_AUTH_ENDPOINT,
    GOOGLE_CLIENT_ID,
    PROFILE_ME_ENDPOINT,
    REFRESH_AUTH_ENDPOINT
} from './config.js';

let googleInitPromise;
let googlePopupProxyContainer;
let tokenRefreshIntervalId;
const ONBOARDING_PAGE = 'onboarding.html';
const REFRESH_INTERVAL_MS = 25 * 60 * 1000;
const ONE_SECOND_MS = 1000;

let refreshPromise = null;

function emitAuthStateChanged() {
    window.dispatchEvent(new CustomEvent('retrievo-auth-changed'));
}

function getCurrentPageName() {
    const pathname = window.location.pathname || '';
    const page = pathname.split('/').pop();
    return page || 'index.html';
}

function normalizeUser(payload) {
    if (!payload || typeof payload !== 'object') {
        return null;
    }

    let source = payload;
    if (payload.data && typeof payload.data === 'object') {
        source = payload.data;
    }

    if (source.user && typeof source.user === 'object') {
        source = source.user;
    }

    const name = source.name || '';
    const email = source.email || '';
    const image = source.image || source.picture || source.avatar || '';

    if (!name && !email && !source.public_id) {
        return null;
    }

    return {
        publicId: source.public_id || '',
        name: name || 'Google User',
        email,
        image,
        hostel: source.hostel || '',
        phone: source.phone || '',
        instagramId: source.instagram_id || '',
        role: source.role || 'user'
    };
}

// If NOT (has hostel AND has contact) -> onboarding required.
export function needsOnboarding(session) {
    if (!session || !session.user) {
        return false;
    }

    const hasHostel = !!session.user.hostel;
    const hasContact = !!session.user.phone || !!session.user.instagramId;

    return !(hasHostel && hasContact);
}

export function needsOnboardingForUser(user) {
    if (!user) {
        return false;
    }

    return needsOnboarding({ user });
}

function getStoredAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

function getStoredNumber(key) {
    const rawValue = localStorage.getItem(key);
    if (!rawValue) {
        return null;
    }

    const parsedValue = Number(rawValue);
    return Number.isFinite(parsedValue) ? parsedValue : null;
}

function setStoredAccessToken(token, expiresAt) {
    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
    localStorage.setItem(ACCESS_TOKEN_REFRESHED_AT_STORAGE_KEY, String(Math.floor(Date.now() / 1000)));

    if (typeof expiresAt === 'number') {
        localStorage.setItem(ACCESS_TOKEN_EXPIRES_AT_STORAGE_KEY, String(expiresAt));
    }

    emitAuthStateChanged();
}

function clearStoredAccessToken() {
    localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    localStorage.removeItem(ACCESS_TOKEN_EXPIRES_AT_STORAGE_KEY);
    localStorage.removeItem(ACCESS_TOKEN_REFRESHED_AT_STORAGE_KEY);
    emitAuthStateChanged();
}

function isPeriodicRefreshDue() {
    const refreshedAt = getStoredNumber(ACCESS_TOKEN_REFRESHED_AT_STORAGE_KEY);
    if (refreshedAt === null) {
        return true;
    }

    return Date.now() >= (refreshedAt * ONE_SECOND_MS) + REFRESH_INTERVAL_MS;
}

function isStoredTokenExpired() {
    const expiresAt = getStoredNumber(ACCESS_TOKEN_EXPIRES_AT_STORAGE_KEY);
    if (expiresAt === null) {
        return false;
    }

    return Date.now() >= expiresAt * ONE_SECOND_MS;
}

async function refreshAccessToken(token) {
    try {
        const response = await fetch(`${API_BASE_URL}${REFRESH_AUTH_ENDPOINT}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token })
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        if (!data || !data.access_token) {
            return null;
        }

        setStoredAccessToken(data.access_token, data.expires_at);
        return data.access_token;
    } catch (error) {
        return null;
    }
}

async function refreshAccessTokenOrClear(token) {
    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = refreshAccessToken(token)
        .finally(() => {
            refreshPromise = null;
        });

    const refreshedToken = await refreshPromise;

    if (!refreshedToken) {
        clearStoredAccessToken();
    }

    return refreshedToken;
}

async function fetchProfileWithToken(token) {
    const response = await fetch(`${API_BASE_URL}${PROFILE_ME_ENDPOINT}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (!response.ok) {
        clearStoredAccessToken();
        alert("Your account has been banned.");
        window.location.href = "index.html";
        return null;
    }

    const data = await response.json();
    return normalizeUser(data);
}

export async function fetchCurrentUser() {
    try {
        const token = getStoredAccessToken();
        if (!token) {
            return null;
        }

        let activeToken = token;
        if (isStoredTokenExpired() || isPeriodicRefreshDue()) {
            const refreshedToken = await refreshAccessTokenOrClear(token);
            if (!refreshedToken) {
                return null;
            }

            activeToken = refreshedToken;
        }

        const user = await fetchProfileWithToken(activeToken);
        if (user) {
            return user;
        }

        const refreshedToken = await refreshAccessTokenOrClear(activeToken);
        if (!refreshedToken) {
            return null;
        }

        const refreshedUser = await fetchProfileWithToken(refreshedToken);
        if (!refreshedUser) {
            clearStoredAccessToken();
        }

        return refreshedUser;
    } catch (error) {
        return null;
    }
}

function startTokenRefreshLoop() {
    if (tokenRefreshIntervalId) {
        return;
    }

    tokenRefreshIntervalId = window.setInterval(async () => {
        const token = getStoredAccessToken();
        if (!token || !isPeriodicRefreshDue()) {
            return;
        }

        await refreshAccessTokenOrClear(token);
    }, 60 * 1000);
}

async function authenticateWithBackend(idToken) {
    try {
        const response = await fetch(`${API_BASE_URL}${GOOGLE_AUTH_ENDPOINT}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id_token: idToken })
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        if (!data || !data.access_token) {
            return null;
        }

        setStoredAccessToken(data.access_token, data.expires_at);
        return await fetchCurrentUser();
    } catch (error) {
        return null;
    }
}

export function logout() {
    clearStoredAccessToken();
}

function hasGoogleIdentityApi() {
    return Boolean(window.google && window.google.accounts && window.google.accounts.id);
}

function loadGoogleIdentityScript() {
    if (hasGoogleIdentityApi()) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        const existingScript = document.querySelector('script[data-google-identity]');
        if (existingScript) {
            existingScript.addEventListener('load', () => resolve(), { once: true });
            existingScript.addEventListener('error', () => reject(new Error('Failed to load Google script.')), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.dataset.googleIdentity = 'true';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google script.'));
        document.head.appendChild(script);
    });
}

function getGooglePopupProxyContainer() {
    if (googlePopupProxyContainer) {
        return googlePopupProxyContainer;
    }

    const container = document.createElement('div');
    container.id = 'googlePopupProxy';
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '1px';
    container.style.height = '1px';
    container.style.overflow = 'hidden';
    document.body.appendChild(container);

    googlePopupProxyContainer = container;
    return container;
}

function openGoogleAccountChooserViaRenderedButton() {
    if (!hasGoogleIdentityApi()) {
        return false;
    }

    const container = getGooglePopupProxyContainer();

    if (!container.dataset.gsiRendered) {
        window.google.accounts.id.renderButton(container, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            shape: 'pill'
        });

        container.dataset.gsiRendered = 'true';
    }

    const clickable = container.querySelector('div[role="button"], button');
    if (!clickable) {
        return false;
    }

    clickable.click();
    return true;
}

async function initializeGoogleLogin(onCredential) {
    if (GOOGLE_CLIENT_ID === '' || typeof GOOGLE_CLIENT_ID === 'undefined') {
        throw new Error('Set your Google client ID in static/js/config.js before using login.');
    }

    if (!googleInitPromise) {
        googleInitPromise = loadGoogleIdentityScript().then(() => {
            window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: onCredential,
                ux_mode: 'popup',
                auto_select: false,
                use_fedcm_for_prompt: false
            });
        });
    }

    return googleInitPromise;
}

function setAuthButtonsState(loginButton, logoutButton, user) {
    if (loginButton) {
        if (user && user.name) {
            const firstName = user.name.split(' ')[0];
            loginButton.textContent = `Continue as ${firstName}`;
            loginButton.classList.add('logged-in');
        } else {
            loginButton.textContent = 'Login with Google';
            loginButton.classList.remove('logged-in');
        }
    }

    if (logoutButton) {
        logoutButton.hidden = !Boolean(user);
    }
}

export function initGoogleLogin() {
    const loginButton = document.querySelector('[data-google-login]');
    const logoutButton = document.querySelector('[data-logout-button]');

    startTokenRefreshLoop();

    if (!loginButton && !logoutButton) {
        return;
    }

    async function handleGoogleCredentialResponse(response) {
        if (!response || !response.credential) {
            alert('Google login failed. Please try again.');
            return;
        }

        const user = await authenticateWithBackend(response.credential);
        if (!user) {
            alert('Could not authenticate with backend. Please try again.');
            return;
        }

        setAuthButtonsState(loginButton, logoutButton, user);

        if (needsOnboardingForUser(user)) {
            window.location.href = ONBOARDING_PAGE;
            return;
        }

        window.location.href = 'profile.html';
    }

    async function startGoogleLogin() {
        try {
            await initializeGoogleLogin(handleGoogleCredentialResponse);

            // Always open the account chooser when login is clicked.
            if (hasGoogleIdentityApi()) {
                window.google.accounts.id.disableAutoSelect();
            }

            const openedPopup = openGoogleAccountChooserViaRenderedButton();
            if (!openedPopup) {
                window.google.accounts.id.prompt();
            }
        } catch (error) {
            alert(error.message || 'Unable to start Google login right now.');
        }
    }

    setAuthButtonsState(loginButton, logoutButton, null);

    fetchCurrentUser().then((user) => {
        setAuthButtonsState(loginButton, logoutButton, user);

        const currentPage = getCurrentPageName();
        if (user && needsOnboardingForUser(user) && currentPage === 'report.html') {
            window.location.href = ONBOARDING_PAGE;
        }
    });

    if (loginButton) {
        loginButton.addEventListener('click', startGoogleLogin);
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            logout();

            if (hasGoogleIdentityApi()) {
                window.google.accounts.id.disableAutoSelect();
            }

            setAuthButtonsState(loginButton, logoutButton, null);

            const isProfilePage = window.location.pathname.endsWith('/profile.html') || window.location.pathname.endsWith('profile.html');
            if (isProfilePage) {
                window.location.href = 'index.html';
            }
        });
    }
}
