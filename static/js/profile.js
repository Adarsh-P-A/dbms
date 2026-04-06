import { fetchCurrentUser } from './auth.js';

// Utility function to get the initial from a name for avatar fallback
function getInitial(name) {
    if (!name) {
        return '?';
    }

    return name.trim().charAt(0).toUpperCase() || '?';
}

// Generates a list of avatar URL candidates based on the provided image URL, including common variations for Google profile images.
function buildAvatarCandidates(imageUrl) {
    if (!imageUrl || typeof imageUrl !== 'string') {
        return [];
    }

    const trimmed = imageUrl.trim();
    if (!trimmed) {
        return [];
    }

    const candidates = [trimmed];

    // Google profile URLs often carry a size suffix like "=s96-c".
    const googleSizedUrlMatch = trimmed.match(/^(https:\/\/[^\s]+)=s\d+-c$/i);
    if (googleSizedUrlMatch) {
        const base = googleSizedUrlMatch[1];
        candidates.unshift(`${base}=s256-c`);
        candidates.push(`${base}=s96-c`);
        candidates.push(base);
    }

    return [...new Set(candidates)];
}

// Renders the user's profile avatar with a fallback to initials if the image fails to load or is not available.
function renderProfileAvatar(profileAvatar, user) {
    if (!profileAvatar) {
        return;
    }

    const fallbackInitial = getInitial(user.name || '');
    const fallback = () => {
        profileAvatar.innerHTML = '';
        profileAvatar.textContent = fallbackInitial;
    };

    const avatarCandidates = buildAvatarCandidates(user.image);
    if (avatarCandidates.length === 0) {
        fallback();
        return;
    }

    const avatarImage = document.createElement('img');
    avatarImage.alt = `${user.name || 'User'} avatar`;
    avatarImage.style.width = '100%';
    avatarImage.style.height = '100%';
    avatarImage.style.objectFit = 'cover';
    avatarImage.style.borderRadius = '50%';
    avatarImage.referrerPolicy = 'no-referrer';
    avatarImage.decoding = 'async';

    let currentIndex = 0;

    avatarImage.onload = () => {
        profileAvatar.innerHTML = '';
        profileAvatar.appendChild(avatarImage);
    };

    avatarImage.onerror = () => {
        currentIndex += 1;
        if (currentIndex >= avatarCandidates.length) {
            fallback();
            return;
        }

        avatarImage.src = avatarCandidates[currentIndex];
    };

    avatarImage.src = avatarCandidates[currentIndex];
}

export async function initProfile() {
    const profileName = document.getElementById('profileName');
    const profileDepartment = document.getElementById('profileDepartment');
    const profileEmail = document.getElementById('profileEmail');
    const profileAvatar = document.getElementById('profileAvatar');
    const profilePhone = document.getElementById('profilePhone');
    const profileHostel = document.getElementById('profileHostel');
    const profileInstagram = document.getElementById('profileInstagram');
    const profileRole = document.getElementById('profileRole');
    const profilePublicId = document.getElementById('profilePublicId');

    if (!profileName && !profileDepartment && !profileEmail && !profileAvatar) {
        return;
    }

    const user = await fetchCurrentUser();
    if (!user) {
        if (profileName) {
            profileName.textContent = 'Please log in';
        }

        if (profileDepartment) {
            profileDepartment.textContent = 'No active session';
        }

        if (profileEmail) {
            profileEmail.textContent = '-';
        }

        if (profilePhone) {
            profilePhone.textContent = '-';
        }

        if (profileHostel) {
            profileHostel.textContent = '-';
        }

        if (profileInstagram) {
            profileInstagram.textContent = '-';
        }

        if (profileRole) {
            profileRole.textContent = '-';
        }

        if (profilePublicId) {
            profilePublicId.textContent = '-';
        }

        return;
    }

    if (profileName) {
        profileName.textContent = user.name || 'Google User';
    }

    if (profileDepartment) {
        profileDepartment.textContent = `Role: ${user.role || 'user'}`;
    }

    if (profileEmail) {
        profileEmail.textContent = user.email || 'Not set';
    }

    if (profilePhone) {
        profilePhone.textContent = user.phone || 'Not set';
    }

    if (profileHostel) {
        profileHostel.textContent = user.hostel || 'Not set';
    }

    if (profileInstagram) {
        profileInstagram.textContent = user.instagramId || 'Not set';
    }

    if (profileRole) {
        profileRole.textContent = user.role || 'user';
    }

    if (profilePublicId) {
        profilePublicId.textContent = user.publicId || '-';
    }

    renderProfileAvatar(profileAvatar, user);
}
