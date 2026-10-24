import("./main.js").catch((error) => {
  console.error(error);
  const panel = document.querySelector("#error");
  panel.hidden = false;
  panel.textContent = `Dunia belum dapat dibuka. Gunakan server HTTP dan browser dengan WebGL 2. ${error.message}`;
});
