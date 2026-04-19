import { fetchCurrentUser, needsOnboardingForUser } from './auth.js';
import { ACCESS_TOKEN_STORAGE_KEY, API_BASE_URL } from './config.js';

const ITEM_CREATE_ENDPOINT = '/items/create';
const MAX_UPLOAD_BYTES = 1024 * 1024;

const ALLOWED_ITEM_TYPES = new Set(['lost', 'found']);
const ALLOWED_VISIBILITIES = new Set(['public', 'boys', 'girls']);
const ALLOWED_CATEGORIES = new Set(['electronics', 'clothing', 'bags', 'keys-wallets', 'documents', 'others']);
const ALLOWED_LOCATIONS = new Set([
    'admin_block', 'swadishtam', 'coops', 'gym', 'creative_zone', 'amul', 'main_ground', 'main_building', 'nlhc', 'elhc',
    'rajpath', 'bb_court', 'oat', 'aryabhatta', 'bhaskara', 'chanakya', 'audi', 'amphitheatre', 'hostel_office',
    'mini_canteen', 'avenue_97', 'ccc', 'it_complex', 'mech_lab', 'civil_lab', 'production_lab', 'csed', 'eced', 'eeed',
    'med', 'chd', 'ced', 'btd', 'ped', 'mtd', 'egd', 'arch', 'maths', 'physics', 'hostel_a', 'hostel_b', 'hostel_c',
    'hostel_d', 'hostel_e', 'hostel_f', 'hostel_g', 'pg1', 'pg2', 'mbh1', 'mbh2', 'lh', 'mlh', 'micro_canteen', 'eclhc',
    'sumedhyam', 'library', 'guest_house', 'tbi', 'swimming_pool', 'bbc', 'faculty_residence', 'soms', 'mba_auditorium'
]);

const TYPE_MAP = {
    Lost: 'lost',
    Found: 'found',
    lost: 'lost',
    found: 'found'
};

const VISIBILITY_MAP = {
    Public: 'public',
    Boys: 'boys',
    Girls: 'girls',
    public: 'public',
    boys: 'boys',
    girls: 'girls'
};

const CATEGORY_MAP = {
    Electronics: 'electronics',
    Clothing: 'clothing',
    Bags: 'bags',
    'Keys & Wallets': 'keys-wallets',
    Documents: 'documents',
    Others: 'others'
};

const LOCATION_MAP = {
    NLHC: 'nlhc',
    ELHC: 'elhc',
    ECLHC: 'eclhc',
    'Main Ground': 'main_ground',
    'Main Building': 'main_building',
    OAT: 'oat',
    Rajpath: 'rajpath',
    'Basketball Court': 'bb_court',
    Auditorium: 'audi',
    'A Hostel': 'hostel_a',
    'B Hostel': 'hostel_b',
    'C Hostel': 'hostel_c',
    'D Hostel': 'hostel_d',
    'E Hostel': 'hostel_e',
    'F Hostel': 'hostel_f',
    'G Hostel': 'hostel_g',
    'MBH 1': 'mbh1',
    'MBH 2': 'mbh2',
    LH: 'lh',
    MLH: 'mlh',
    'PG Hostel 1': 'pg1',
    'PG Hostel 2': 'pg2',
    'IT Complex': 'it_complex',
    CCC: 'ccc',
    'Mech Labs': 'mech_lab',
    'Civil Labs': 'civil_lab',
    'Production Labs': 'production_lab',
    CSED: 'csed',
    ECED: 'eced',
    EEE: 'eeed',
    Mechanical: 'med',
    Civil: 'ced',
    Biotechnology: 'btd',
    Production: 'ped',
    'Material Science': 'mtd',
    'Engineering Physics': 'egd',
    Architecture: 'arch',
    Mathematics: 'maths',
    Physics: 'physics'
};

function normalizeCategory(rawCategory) {
    if (ALLOWED_CATEGORIES.has(rawCategory)) {
        return rawCategory;
    }

    if (CATEGORY_MAP[rawCategory]) {
        return CATEGORY_MAP[rawCategory];
    }

    return String(rawCategory || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-');
}

function normalizeLocation(rawLocation) {
    if (ALLOWED_LOCATIONS.has(rawLocation)) {
        return rawLocation;
    }

    if (LOCATION_MAP[rawLocation]) {
        return LOCATION_MAP[rawLocation];
    }

    return String(rawLocation || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]+/g, '');
}

function normalizeDateInput(rawDate) {
    const value = String(rawDate || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
    }

    const dmYMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (dmYMatch) {
        const [, dd, mm, yyyy] = dmYMatch;
        return `${yyyy}-${mm}-${dd}`;
    }

    return '';
}

function getAllowedVisibilitiesForUser(user) {
    if (!user || !user.hostel) {
        return ALLOWED_VISIBILITIES;
    }

    if (user.hostel === 'boys') {
        return new Set(['public', 'boys']);
    }

    if (user.hostel === 'girls') {
        return new Set(['public', 'girls']);
    }

    return ALLOWED_VISIBILITIES;
}

function applyVisibilityRestrictions(user) {
    const visibilityField = document.getElementById('visibility');
    if (!visibilityField) {
        return;
    }

    const allowedVisibilities = getAllowedVisibilitiesForUser(user);

    for (const option of visibilityField.options) {
        if (!option.value) {
            option.disabled = false;
            option.hidden = false;
            continue;
        }

        const isAllowed = allowedVisibilities.has(option.value);
        option.disabled = !isAllowed;
        option.hidden = !isAllowed;
    }

    if (visibilityField.value && !allowedVisibilities.has(visibilityField.value)) {
        visibilityField.value = allowedVisibilities.has('public') ? 'public' : '';
    }
}

function validateFormPayload(payload) {
    if (!ALLOWED_ITEM_TYPES.has(payload.itemType)) {
        return 'Invalid item type selected.';
    }

    if (!ALLOWED_VISIBILITIES.has(payload.visibility)) {
        return 'Invalid visibility selected.';
    }

    if (!ALLOWED_CATEGORIES.has(payload.category)) {
        return 'Invalid category selected.';
    }

    if (!ALLOWED_LOCATIONS.has(payload.location)) {
        return 'Invalid location selected.';
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.itemDate)) {
        return 'Please pick a valid date.';
    }
    //Date range validation
    const selectedDate = new Date(payload.itemDate);
    const today = new Date();
    const minDate = new Date('2026-01-01');

    if (selectedDate > today) {
        return 'Date cannot be in the future.';
    }

    if (selectedDate < minDate) {
        return 'Date cannot be before Jan 1, 2026.';
    }

    if (payload.title.length < 2 || payload.title.length > 20) {
        return 'Title must be between 2 and 20 characters.';
    }

    if (payload.description.length < 20 || payload.description.length > 280) {
        return 'Description must be between 20 and 280 characters.';
    }

    return '';
}

async function getApiErrorMessage(response) {
    try {
        const payload = await response.json();

        if (!payload) {
            return `Request failed (${response.status}).`;
        }

        if (typeof payload.detail === 'string') {
            return payload.detail;
        }

        if (Array.isArray(payload.detail) && payload.detail.length > 0) {
            const firstError = payload.detail[0];
            if (typeof firstError === 'string') {
                return firstError;
            }

            if (firstError && typeof firstError.msg === 'string') {
                return firstError.msg;
            }
        }

        return `Request failed (${response.status}).`;
    } catch (error) {
        return `Request failed (${response.status}).`;
    }
}

export function initReportForm() {
    const imageInput = document.getElementById('imageInput');
    const preview = document.getElementById('preview');

    if (imageInput && preview) {
        imageInput.addEventListener('change', function () {
            const file = this.files && this.files[0];

            if (file) {
                const reader = new FileReader();

                reader.onload = function () {
                    preview.src = reader.result;
                    preview.style.display = 'block';
                };

                reader.readAsDataURL(file);
            } else {
                preview.src = '';
                preview.style.display = 'none';
            }
        });
    }

    const form = document.getElementById('reportForm');
    if (!form) {
        return;
    }
    
    const dateInput = document.getElementById('date');
    if (dateInput) {
        const today = new Date();

        const formattedToday = today.getFullYear() + "-" +
            String(today.getMonth() + 1).padStart(2, '0') + "-" +
            String(today.getDate()).padStart(2, '0');

      dateInput.max = formattedToday;   // no future dates
      dateInput.min = "2026-01-01";     // lower bound
      dateInput.value = formattedToday; // default today
    }

    // Prevent onboarding-incomplete users from accessing report creation.
    fetchCurrentUser().then((user) => {
        applyVisibilityRestrictions(user);

        if (user && needsOnboardingForUser(user)) {
            alert('Complete onboarding before reporting a new item.');
            window.location.href = 'onboarding.html';
        }
    });

    const getFieldValue = (id) => {
        const field = document.getElementById(id);
        return field ? field.value.trim() : '';
    };

    const submitButton = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!imageInput || !imageInput.files || !imageInput.files[0]) {
            alert('Please upload an image before submitting.');
            return;
        }

        if (imageInput.files[0].size > MAX_UPLOAD_BYTES) {
            alert('Image exceeds 1MB limit. Please compress the image and try again.');
            return;
        }

        const user = await fetchCurrentUser();
        const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
        if (!user || !token) {
            alert('Please log in to submit a report.');
            return;
        }

        if (needsOnboardingForUser(user)) {
            alert('Complete onboarding before reporting a new item.');
            window.location.href = 'onboarding.html';
            return;
        }

        const originalButtonLabel = submitButton ? submitButton.textContent : '';
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Submitting...';
        }

        const itemTypeRaw = getFieldValue('type');
        const visibilityRaw = getFieldValue('visibility');
        const categoryRaw = getFieldValue('category');
        const locationRaw = getFieldValue('location');
        const dateRaw = getFieldValue('date');
        const title = getFieldValue('title');
        const description = getFieldValue('description');

        const itemType = TYPE_MAP[itemTypeRaw] || itemTypeRaw;
        const visibility = VISIBILITY_MAP[visibilityRaw] || visibilityRaw;
        const category = normalizeCategory(categoryRaw);
        const location = normalizeLocation(locationRaw);
        const itemDate = normalizeDateInput(dateRaw);

        const allowedVisibilities = getAllowedVisibilitiesForUser(user);
        if (!allowedVisibilities.has(visibility)) {
            alert('You can only post with your hostel visibility or public visibility.');
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonLabel || 'Submit Report';
            }
            return;
        }

        const validationMessage = validateFormPayload({
            itemType,
            visibility,
            category,
            location,
            itemDate,
            title,
            description
        });

        if (validationMessage) {
            alert(validationMessage);
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonLabel || 'Submit Report';
            }
            return;
        }

        const formData = new FormData();
        formData.append('item_type', itemType);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('category', category);
        formData.append('date', itemDate);
        formData.append('location', location);
        formData.append('visibility', visibility);
        formData.append('image', imageInput.files[0]);

        try {
            const response = await fetch(`${API_BASE_URL}${ITEM_CREATE_ENDPOINT}`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(await getApiErrorMessage(response));
            }

            const payload = await response.json();
            form.reset();

            if (preview) {
                preview.src = '';
                preview.style.display = 'none';
            }

            if (payload && payload.item_id) {
                alert(`Report submitted successfully.`);
                window.location.href = `item-detail.html?id=${payload.item_id}`;
            } else {
                alert('Report submitted successfully.');
            }
        } catch (error) {
            alert(error.message || 'Failed to submit report. Please try again.');
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonLabel || 'Submit Report';
            }
        }
    });
}
