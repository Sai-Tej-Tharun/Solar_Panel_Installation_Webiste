
  // Set current year in footer
  const fy = document.getElementById('footer-year');
  if (fy) fy.textContent = new Date().getFullYear();

  // Newsletter submit
  function handleNewsletterSubmit(e) {
    e.preventDefault();
    const input = e.target.querySelector('input[type="email"]');
    if (!input.value || !input.checkValidity()) {
      input.focus();
      return;
    }
    if (window.SolarEchos) {
      window.SolarEchos.showToast('Thank you! You\'re now subscribed to Solar Echos updates.', 'success');
    }
    input.value = '';
  }
document.addEventListener("DOMContentLoaded", () => {
  const links = document.querySelectorAll(".nav-link"); // change if your class differs
  const currentPage = window.location.pathname.split("/").pop();

  links.forEach(link => {
    const linkPage = link.getAttribute("href").split("/").pop();

    if (linkPage === currentPage) {
      link.classList.add("active");
    }
  });
});