import { initSidebar } from './sidebar.js';
import { initGoogleLogin } from './auth.js';
import { initProfile } from './profile.js';
import { initReportForm } from './report-form.js';
import { initNotifications } from './notifications.js';
import { initOnboarding } from './onboarding.js';
import { initItemsFeed } from './items.js';
import { initItemDetail } from './item-detail.js';
// import { initResolutionDetail } from './resolution-detail.js';

document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
    initGoogleLogin();
    initProfile();
    initReportForm();
    initNotifications();
    initOnboarding();
    initItemsFeed();
    initItemDetail();
    // initResolutionDetail();
});
