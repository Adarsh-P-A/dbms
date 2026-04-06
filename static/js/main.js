import { initSidebar } from './sidebar.js';
import { initGoogleLogin } from './auth.js';
import { initProfile } from './profile.js';
import { initReportForm } from './report-form.js';
import { initNotifications } from './notifications.js';

document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
    initGoogleLogin();
    initProfile();
    initReportForm();
    initNotifications();
});
