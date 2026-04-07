import { fetchCurrentUser, initGoogleLogin } from './auth.js';
import { API_BASE_URL, ITEMS_ALL_ENDPOINT, ACCESS_TOKEN_STORAGE_KEY } from './config.js';

let allItems = [];

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Google Login
    initGoogleLogin();
   
    // Sidebar code 
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

    // Select DOM Elements
    const itemsGrid = document.getElementById('itemsGrid');
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');

    // Render Function
    function renderCards(dataToRender) {
        // Handle empty state if search returns no results
        if (dataToRender.length === 0) {
            itemsGrid.innerHTML = "<p>No items found matching your criteria.</p>";
            return;
        }

        // Rendering cards
        const cardsHTML = dataToRender.map(item => {
            const date = new Date(item.date).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            return `
                <a href="item-details.html?id=${item.id}" style="text-decoration: none; color: inherit; display: block;">
                    <div class="item-card">
                        <div class="image-placeholder">
                            <img src="${item.image}" alt="${item.title}" style="width: 100%; height: 150px; object-fit: cover;" />
                        </div>
                        <div class="card-info">
                            <h3 class="card-title">${item.title}</h3>
                            <div class="card-details">
                                <span class="place">${item.location}</span> | 
                                <span class="date">${date}</span>
                            </div>
                        </div>
                    </div>
                </a>
            `;
        }).join('');

        itemsGrid.innerHTML = cardsHTML;
    }

    // Filter Function
    function filterItems() {
        // Get the current values from the inputs and convert to lowercase for easy comparison
        const searchTerm = searchInput.value.toLowerCase();
        const selectedCategory = categoryFilter.value;

        // Filter the items array
        const filteredData = allItems.filter(item => {
            // Check if the title OR the location includes the search text
            const matchesSearch = item.title.toLowerCase().includes(searchTerm) || 
                                item.location.toLowerCase().includes(searchTerm);
            
            // Check if the category matches (or if 'all' is selected)
            const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

            // Only keep the item if it matches BOTH the search and the category
            return matchesSearch && matchesCategory;
        });

        // Re-render the grid with the newly filtered data
        renderCards(filteredData);
    }

    // Fetch items from API
    async function fetchItems() {
        try {
            itemsGrid.innerHTML = "<p>Loading items...</p>";
            
            const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
            
            let url = `${API_BASE_URL}${ITEMS_ALL_ENDPOINT}`;
            const headers = { 'Content-Type': 'application/json' };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(url, {
                method: 'GET',
                headers: headers
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch items: ${response.status}`);
            }

            const data = await response.json();
            allItems = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []);

            if (allItems.length === 0) {
                itemsGrid.innerHTML = "<p>No items found.</p>";
            } else {
                renderCards(allItems);
            }
        } catch (error) {
            console.error('Error fetching items:', error);
            itemsGrid.innerHTML = "<p>Failed to load items. Please try again.</p>";
        }
    }

    // Event Listeners
    searchInput.addEventListener('input', filterItems);
    categoryFilter.addEventListener('change', filterItems);

    // Initial Load
    fetchItems();

});