export function initSidebar() {
    const body = document.body;
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const closeBtn = document.querySelector('.close-btn');
    const openBtn = document.getElementById('openMenu');

    if (!body || !sidebar || !mainContent || !closeBtn || !openBtn) {
        return;
    }

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
