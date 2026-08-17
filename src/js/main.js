function toggleSidenav() {
  const sidenav = document.querySelector("#sidenav");

  if (window.innerWidth <= 768) {
    sidenav.classList.remove("min");
    sidenav.classList.toggle("active");
  } else {
    sidenav.classList.remove("active");
    sidenav.classList.toggle("min");
  }
}
