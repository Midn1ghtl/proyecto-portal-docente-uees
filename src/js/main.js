function toggleSidenav() {
  const barraLateral= document.querySelector(".barra-lateral");
  const main= document.querySelector("main");

  if (window.innerWidth <= 768) {
    barraLateral.classList.toggle("activa");
  } else {
    barraLateral.classList.toggle("min");
    main.classList.toggle("expandido");
  }
}


