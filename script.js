// script.js
window.addEventListener("load", () => {
  const video = document.getElementById("video");
  const snapshotCanvas = document.getElementById("snapshot");
  const captureBtn = document.getElementById("captureBtn");
  const absenBtn = document.getElementById("absenBtn");
  const status = document.getElementById("status");
  const locationText = document.getElementById("location");
  const retryLocationBtn = document.getElementById("retryLocation");
  const facesPanel = document.getElementById("facesPanel");
  const facesList = document.getElementById("facesList");

  let userLocation = null;
  let faceMatcher = null;
  let currentMode = "single";
  let faceRecognized = false;

  // --- Mulai Aplikasi ---
  async function startApp() {
    try {
      await Promise.all([loadModels(), startCamera(), checkLocation()]);
      faceMatcher = await createFaceMatcher();
      status.innerText = "Arahkan wajah ke kamera lalu tekan 'Ambil Foto'.";
      captureBtn.disabled = false;
      snapshotCanvas.style.display = "block"; // preview selalu muncul
      console.log("Aplikasi siap.");
    } catch (err) {
      console.error(err);
      status.innerText = "Gagal memulai aplikasi. Periksa console.";
    }
  }

  async function loadModels() {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("models"),
    ]);
    console.log("Model dimuat.");
  }

  async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    return new Promise((resolve) => video.addEventListener("canplay", resolve));
  }

  function checkLocation() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          userLocation = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          locationText.innerHTML = `Lokasi terdeteksi (Akurasi ±${userLocation.accuracy.toFixed(
            0
          )} meter)`;
          resolve();
        },
        (err) => {
          locationText.innerText = "Gagal mendeteksi lokasi. Klik 'Coba Lagi'.";
          retryLocationBtn.style.display = "inline-block";
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  retryLocationBtn.addEventListener("click", startApp);

  async function createFaceMatcher() {
    const res = await fetch("list_dataset.php");
    const data = await res.json();
    if (data.status !== "success" || !data.data)
      throw new Error("Gagal memuat dataset.");

    const labels = Object.keys(data.data);
    const labeledDescriptors = await Promise.all(
      labels.map(async (label) => {
        const descriptors = [];
        for (const imgFile of data.data[label]) {
          try {
            const img = await faceapi.fetchImage(
              `/sistemabsensi/dataset/${imgFile}`
            );
            const detection = await faceapi
              .detectSingleFace(
                img,
                new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3 })
              )
              .withFaceLandmarks()
              .withFaceDescriptor();
            if (detection) descriptors.push(detection.descriptor);
          } catch (err) {
            console.warn(`Gagal memproses ${imgFile}`, err);
          }
        }
        return descriptors.length > 0
          ? new faceapi.LabeledFaceDescriptors(label, descriptors)
          : null;
      })
    );

    const validDescriptors = labeledDescriptors.filter((d) => d);
    if (!validDescriptors.length)
      throw new Error("Tidak ada wajah valid di dataset.");
    return new faceapi.FaceMatcher(validDescriptors, 0.6);
  }

  // --- Mode Toggle ---
  document.getElementById("modeSingle").addEventListener("click", () => {
    currentMode = "single";
    facesPanel.style.display = "none";
    snapshotCanvas.style.display = "block";
    status.innerText = "Mode Uni aktif. Ambil foto untuk verifikasi.";
    document.getElementById("modeSingle").classList.add("active");
    document.getElementById("modeMulti").classList.remove("active");
  });

  document.getElementById("modeMulti").addEventListener("click", () => {
    currentMode = "multi";
    facesPanel.style.display = "block";
    snapshotCanvas.style.display = "none";
    facesList.innerHTML = "";
    status.innerText =
      "Mode Multi aktif. Ambil foto untuk menampilkan semua wajah.";
    document.getElementById("modeMulti").classList.add("active");
    document.getElementById("modeSingle").classList.remove("active");
  });

  // --- Capture Face ---
  captureBtn.addEventListener("click", async () => {
    const ctx = snapshotCanvas.getContext("2d");
    ctx.drawImage(video, 0, 0, snapshotCanvas.width, snapshotCanvas.height);

    if (currentMode === "single") {
      const detection = await faceapi
        .detectSingleFace(
          snapshotCanvas,
          new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3 })
        )
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (detection) {
        const match = faceMatcher.findBestMatch(detection.descriptor);
        status.innerText =
          match.label !== "unknown"
            ? `Wajah dikenali: ${match.label}`
            : "Wajah tidak dikenali";
        faceRecognized = match.label !== "unknown";
        absenBtn.disabled = !faceRecognized;
      } else {
        status.innerText = "Tidak ada wajah terdeteksi.";
        faceRecognized = false;
        absenBtn.disabled = true;
      }
    } else {
      facesList.innerHTML = "";
      const detections = await faceapi
        .detectAllFaces(
          snapshotCanvas,
          new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3 })
        )
        .withFaceLandmarks()
        .withFaceDescriptors();
      if (detections.length) {
        detections.forEach((detection, idx) => {
          const match = faceMatcher.findBestMatch(detection.descriptor);
          const { x, y, width, height } = detection.detection.box;
          const faceCanvas = document.createElement("canvas");
          faceCanvas.width = width;
          faceCanvas.height = height;
          faceCanvas
            .getContext("2d")
            .drawImage(
              snapshotCanvas,
              x,
              y,
              width,
              height,
              0,
              0,
              width,
              height
            );
          const div = document.createElement("div");
          div.className = "face-item";
          div.innerHTML = `<img src="${faceCanvas.toDataURL()}" alt="Wajah ${
            idx + 1
          }">
                           <div>${
                             match.label !== "unknown"
                               ? match.label
                               : "Tidak dikenal"
                           }</div>`;
          facesList.appendChild(div);
        });
        status.innerText = `${detections.length} wajah terdeteksi.`;
        absenBtn.disabled = false;
      } else {
        status.innerText = "Tidak ada wajah terdeteksi.";
        absenBtn.disabled = true;
      }
    }
  });

  // --- Absensi ---
  absenBtn.addEventListener("click", () => {
    if (!faceRecognized || !userLocation) {
      alert("Wajah belum dikenali atau lokasi belum siap.");
      return;
    }
    const foto = snapshotCanvas.toDataURL("image/png");
    console.log("Absensi berhasil:", { foto, lokasi: userLocation });
    status.innerText = "Absensi berhasil!";
    alert(
      `Absensi berhasil!\nLokasi: Lat ${userLocation.lat}, Lon ${userLocation.lon}`
    );
    captureBtn.disabled = true;
    absenBtn.disabled = true;
  });

  startApp();
});
