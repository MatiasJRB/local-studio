let url;
document.getElementById("file").onchange = (e) => {
  const f = e.target.files[0];
  if (!f) return;
  if (url) URL.revokeObjectURL(url);
  url = URL.createObjectURL(f);
  document.getElementById("movie").src = url;
  document.getElementById("movie").hidden = false;
  document.getElementById("note").textContent =
    f.name + " · archivo local, sin subir";
};
