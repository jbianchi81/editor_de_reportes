function closeModal() {
  const modalEl = document.getElementById('hidrolinksModal');
  const modal = bootstrap.Modal.getInstance(modalEl);
  modal.hide();
}

const hidrolinksModal = document.getElementById('hidrolinksModal');

hidrolinksModal.addEventListener('show.bs.modal', function (event) {
  alert("show modal")
  const trigger = event.relatedTarget;
  const title = trigger.getAttribute('data-title');
  const id = trigger.getAttribute('data-id');
  const seccionesurl = trigger.getAttribute('data-seccionesurl');

  hidrolinksModal.querySelector('.modal-title').textContent = title;
  hidrolinksModal.querySelector('#hidrograma-link').setAttribute("href", `#hidrograma-${id}`)
  const hidrograma = document.getElementById(`hidrograma-${id}`)
  if (hidrograma) {
    hidrolinksModal.querySelector('#hidrograma-link').classList.remove("hidden")
  } else {
    hidrolinksModal.querySelector('#hidrograma-link').classList.add("hidden")
  }
  hidrolinksModal.querySelector('#secciones-link').setAttribute("href", seccionesurl);
});
const hidrograma_link = hidrolinksModal.querySelector('#hidrograma-link')
hidrograma_link.addEventListener("click", (event) => {
  event.preventDefault()
  const hidrograma_id = event.target.getAttribute("href").replace("#", "")
  const hidrograma = document.getElementById(hidrograma_id)
  if (hidrograma) {
    hidrograma.parentElement.parentElement.classList.add("open")
    hidrograma.parentElement.parentElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
});
