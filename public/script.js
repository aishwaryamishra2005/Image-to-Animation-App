const $ = id => document.getElementById(id);
let imageId = null, lastResult = null;

function show(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  $(view).classList.add('active');
}

async function handleFile(file) {
  $('uploadError').textContent = '';
  if (!file) return;
  if (!/\.(jpe?g|png|webp)$/i.test(file.name)) return ($('uploadError').textContent = 'Please choose a JPG, PNG or WEBP image.');
  const fd = new FormData();
  fd.append('image', file);
  try {
    const res = await fetch('/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    imageId = data.id;
    $('preview').src = data.url;
    show('settingsView');
  } catch (e) { $('uploadError').textContent = e.message; }
}

$('fileInput').addEventListener('change', e => handleFile(e.target.files[0]));
const dz = $('dropzone');
['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('drag'); }));
['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('drag'); }));
dz.addEventListener('drop', e => handleFile(e.dataTransfer.files[0]));

$('generateBtn').addEventListener('click', async () => {
  $('genError').textContent = '';
  $('generateBtn').disabled = true; $('progress').hidden = false;
  const body = {
    id: imageId,
    style: document.querySelector('input[name=style]:checked').value,
    duration: $('duration').value, format: $('format').value,
    motion: $('motion').value, speed: $('speed').value
  };
  try {
    const res = await fetch('/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    lastResult = data; showResult();
  } catch (e) { $('genError').textContent = e.message; }
  $('generateBtn').disabled = false; $('progress').hidden = true;
});

function showResult() {
  const r = lastResult, src = r.url + '?t=' + Date.now();
  $('player').innerHTML = r.format === 'gif'
    ? `<img src="${src}" alt="Animation">`
    : `<video src="${src}" controls autoplay loop muted playsinline></video>`;
  $('meta').textContent = `Animation: ${r.style} · Duration: ${r.duration} seconds`;
  $('downloadBtn').href = r.download;
  show('resultView');
}

$('replayBtn').addEventListener('click', showResult);
$('anotherBtn').addEventListener('click', () => { $('fileInput').value = ''; show('uploadView'); });
$('homeLink').addEventListener('click', e => { e.preventDefault(); show('uploadView'); });
