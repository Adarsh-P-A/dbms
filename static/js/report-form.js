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
            }
        });
    }

    const form = document.getElementById('reportForm');
    if (!form) {
        return;
    }

    const getFieldValue = (id) => {
        const field = document.getElementById(id);
        return field ? field.value : '';
    };

    form.addEventListener('submit', (event) => {
        event.preventDefault();

        const data = {
            title: getFieldValue('title'),
            category: getFieldValue('category'),
            type: getFieldValue('type'),
            visibility: getFieldValue('visibility'),
            location: getFieldValue('location'),
            date: getFieldValue('date'),
            description: getFieldValue('description'),
            image: imageInput && imageInput.files && imageInput.files[0] ? imageInput.files[0].name : null
        };

        console.log('Form Data:', data);
        alert('Report submitted (not saved yet)');
    });
}
