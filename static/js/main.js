import { initSidebar } from './sidebar.js';
import { initGoogleLogin } from './auth.js';
import { initProfile } from './profile.js';
import { initReportForm } from './report-form.js';
import { initNotifications } from './notifications.js';
import { initOnboarding } from './onboarding.js';
import { initItemsFeed } from './items.js';
import { initItemDetail } from './item-detail.js';
import { initResolutionDetail } from './resolution-detail.js';

document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
    initGoogleLogin();
    initProfile();
    initReportForm();
    initNotifications();
    initOnboarding();
    initItemsFeed();
    initItemDetail();

    // Conditionally load resolution detail if on resolution page
    const resolutionStateElement = document.getElementById('resolutionDetailState');
    if (resolutionStateElement) {
        initResolutionDetail();
    }

    // Conditionally load admin dashboard if on admin page and user is admin
    const adminStateElement = document.getElementById('adminState');
    if (adminStateElement) {
        import('./admin-dashboard.js').then(({ initAdminDashboard }) => {
            initAdminDashboard();
        });
    }
});
