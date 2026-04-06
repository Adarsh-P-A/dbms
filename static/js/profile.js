import { fetchCurrentUser } from './auth.js';

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

    if (!profileAvatar) {
        return;
    }

    if (user.image) {
        profileAvatar.innerHTML = '';
        const avatarImage = document.createElement('img');
        avatarImage.src = user.image;
        avatarImage.alt = `${user.name || 'User'} avatar`;
        avatarImage.style.width = '100%';
        avatarImage.style.height = '100%';
        avatarImage.style.objectFit = 'cover';
        avatarImage.style.borderRadius = '50%';
        profileAvatar.appendChild(avatarImage);
    } else if (user.name) {
        profileAvatar.textContent = user.name.charAt(0).toUpperCase();
    }
}
