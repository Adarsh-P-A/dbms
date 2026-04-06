import { backendData } from './backendData.js';

document.addEventListener('DOMContentLoaded', () => {
   
   //Sidebar code 
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const closeBtn = document.querySelector('.close-btn');
    const openBtn = document.getElementById('openMenu');
    const body = document.body;

    body.classList.add('sidebar-open');

    // Function to close sidebar
    closeBtn.addEventListener('click', () => {
        body.classList.remove('sidebar-open');
        sidebar.classList.add('sidebar-hidden');
        mainContent.classList.add('full-width');
    });

    // Function to open sidebar
    openBtn.addEventListener('click', () => {
        body.classList.add('sidebar-open');
        sidebar.classList.remove('sidebar-hidden');
        mainContent.classList.remove('full-width');
    });



        // 2. Select DOM Elements
        const itemsGrid = document.getElementById('itemsGrid');
        const searchInput = document.getElementById('searchInput');
        const categoryFilter = document.getElementById('categoryFilter');

        // 3. The Render Function
        function renderCards(dataToRender) {
            // Handle empty state if search returns no results
            if (dataToRender.length === 0) {
                itemsGrid.innerHTML = "<p>No items found matching your criteria.</p>";
                return;
            }

            const cardsHTML = dataToRender.map(item => {
                return `
                    <div class="item-card">
                        <div class="image-placeholder">
                            <img src="${item.image}" alt="${item.title}" style="width: 100%; height: 150px; object-fit: cover;" />
                        </div>
                        <div class="card-info">
                            <h3 class="card-title">${item.title}</h3>
                            <div class="card-details">
                                <span class="place">${item.place}</span> | 
                                <span class="date">${item.date}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            itemsGrid.innerHTML = cardsHTML;
        }

        // 4. The Filter Function
        function filterItems() {
            // Get the current values from the inputs and convert to lowercase for easy comparison
            const searchTerm = searchInput.value.toLowerCase();
            const selectedCategory = categoryFilter.value;

            // Filter the original array
            const filteredData = backendData.filter(item => {
                // Check if the title OR the place includes the search text
                const matchesSearch = item.title.toLowerCase().includes(searchTerm) || 
                                    item.place.toLowerCase().includes(searchTerm);
                
                // Check if the category matches (or if 'all' is selected)
                const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

                // Only keep the item if it matches BOTH the search and the category
                return matchesSearch && matchesCategory;
            });

            // Re-render the grid with the newly filtered data
            renderCards(filteredData);
        }

        // 5. Event Listeners
        // Listen for typing in the search bar
        searchInput.addEventListener('input', filterItems);

        // Listen for changes in the dropdown
        categoryFilter.addEventListener('change', filterItems);

        // 6. Initial Render (Show all items on page load)
        renderCards(backendData);

});