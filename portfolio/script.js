document.addEventListener("DOMContentLoaded", function () {
  new Typed("#intro", {
    strings: ["Hi, Myself"],
    typeSpeed: 60,
    backSpeed: 0,
    showCursor: false,
  });

  new Typed("#name", {
    strings: ["Akshay Kokate"],
    typeSpeed: 80,
    startDelay: 1200,
    backSpeed: 0,
    showCursor: false,
  });

  new Typed("#tagline", {
    strings: ["Code. Build. Break. Learn."],
    typeSpeed: 60,
    startDelay: 2600,
    backSpeed: 30,
    loop: true,
    showCursor: true,
    cursorChar: "|",
  });
});

const menuIcon = document.getElementById("menu-icon");
const navbar = document.querySelector(".navbar");

menuIcon.addEventListener("click", () => {
  navbar.classList.toggle("active"); 
});

document.querySelectorAll(".navbar a").forEach((link) => {
  link.addEventListener("click", () => {
    navbar.classList.remove("active");
  });
});
