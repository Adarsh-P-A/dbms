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

  // Image Preview
    const imageInput = document.getElementById("imageInput");
    const preview = document.getElementById("preview");

    imageInput.addEventListener("change", function () {
       const file = this.files[0];

       if (file) {
           const reader = new FileReader();

           reader.onload = function () {
              preview.src = reader.result;
              preview.style.display = "block";
           };

        reader.readAsDataURL(file);
       }
   });


   // Form Submit
   const form = document.getElementById("reportForm");

   form.addEventListener("submit", function (e) {
        e.preventDefault();

     const data = {
        title: document.getElementById("title").value,
        category: document.getElementById("category").value,
        type: document.getElementById("type").value,
        visibility: document.getElementById("visibility").value,
        location: document.getElementById("location").value,
        date: document.getElementById("date").value,
        description: document.getElementById("description").value,
        image: imageInput.files[0] ? imageInput.files[0].name : null
      };

    console.log("Form Data:", data);
    alert("Report submitted (not saved yet)");
   });
});