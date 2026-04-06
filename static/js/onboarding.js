import { fetchCurrentUser, needsOnboardingForUser } from './auth.js';
import {
    ACCESS_TOKEN_STORAGE_KEY,
    API_BASE_URL,
    PROFILE_COMPLETE_ONBOARDING_ENDPOINT
} from './config.js';

function normalizeOptional(value) {
    const normalized = String(value || '').trim();
    return normalized === '' ? null : normalized;
}

function setStatus(statusElement, message, isError = false) {
    if (!statusElement) {
        return;
    }

    statusElement.textContent = message;
    statusElement.classList.toggle('is-error', isError);
}

async function getApiErrorMessage(response) {
    try {
        const payload = await response.json();

        if (typeof payload?.detail === 'string') {
            return payload.detail;
        }

        if (Array.isArray(payload?.detail) && payload.detail.length > 0) {
            const firstError = payload.detail[0];
            if (typeof firstError === 'string') {
                return firstError;
            }

            if (typeof firstError?.msg === 'string') {
                return firstError.msg;
            }
        }
    } catch (error) {
        return `Request failed (${response.status})`;
    }

    return `Request failed (${response.status})`;
}

export async function initOnboarding() {
    const form = document.getElementById('onboardingForm');
    if (!form) {
        return;
    }

    const statusElement = document.getElementById('onboardingStatus');
    const hostelField = document.getElementById('onboardingHostel');
    const phoneField = document.getElementById('onboardingPhone');
    const instagramField = document.getElementById('onboardingInstagram');
    const hostelLockNote = document.getElementById('hostelLockNote');
    const submitButton = form.querySelector('button[type="submit"]');

    if (!hostelField || !phoneField || !instagramField || !submitButton) {
        return;
    }

    setStatus(statusElement, 'Checking your onboarding status...');

    const user = await fetchCurrentUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    if (!needsOnboardingForUser(user)) {
        window.location.href = 'profile.html';
        return;
    }

    hostelField.value = user.hostel || '';
    phoneField.value = user.phone || '';
    instagramField.value = user.instagramId || '';

    if (user.hostel) {
        hostelField.disabled = true;

        if (hostelLockNote) {
            hostelLockNote.hidden = false;
        }
    }

    setStatus(statusElement, 'Add your hostel and at least one contact method.');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
        if (!token) {
            setStatus(statusElement, 'Session expired. Please log in again.', true);
            return;
        }

        const hostel = String(hostelField.value || '').trim();
        const phone = normalizeOptional(phoneField.value);
        const instagramId = normalizeOptional(instagramField.value);

        if (!hostel) {
            setStatus(statusElement, 'Please select your hostel.', true);
            return;
        }

        if (!phone && !instagramId) {
            setStatus(statusElement, 'Please add phone or Instagram ID.', true);
            return;
        }

        const originalLabel = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Saving...';

        try {
            const response = await fetch(`${API_BASE_URL}${PROFILE_COMPLETE_ONBOARDING_ENDPOINT}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    hostel,
                    phone,
                    instagramId
                })
            });

            if (!response.ok) {
                throw new Error(await getApiErrorMessage(response));
            }

            setStatus(statusElement, 'Onboarding complete. Redirecting to profile...');
            window.location.href = 'profile.html';
        } catch (error) {
            setStatus(statusElement, error.message || 'Could not complete onboarding.', true);
            submitButton.disabled = false;
            submitButton.textContent = originalLabel || 'Complete Onboarding';
        }
    });
}
