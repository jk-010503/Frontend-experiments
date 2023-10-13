const audioInput = document.getElementById("audio");
let noise = new SimplexNoise();
const area = document.getElementById("visualiser");
const label = document.getElementById("label");
let audio = new Audio("Still.mp3");

audioInput.addEventListener("change", setAudio, false);

function setAudio() {
  audio.pause();
  const audioFile = this.files[0];
  if (audioFile.name.includes(".mp3")) {
    const audioURL = URL.createObjectURL(audioFile);
    audio = new Audio(audioURL);
    document.getElementById("audio-name").textContent = `Now playing: ${audioFile.name}`;
    clearScene();
    startVis();
  } else {
    alert("Invalid File Type!");
  }
}

function createGradientTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 1;
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, 'red');
  gradient.addColorStop(0.25, 'green');
  gradient.addColorStop(0.5, 'blue');
  gradient.addColorStop(0.75, 'red');
  gradient.addColorStop(1, 'green');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const gradientTexture = new THREE.Texture(canvas);
  gradientTexture.needsUpdate = true;
  return gradientTexture;
}

const gradientTexture = createGradientTexture();

area.addEventListener('click', () => {
  if (audio.paused) {
    audio.play();
    label.style.display = "none";
  } else {
    audio.pause();
    label.style.display = "flex";
  }
});

startVis();

function clearScene() {
  const canvas = area.firstElementChild;
  area.removeChild(canvas);
}

function startVis() {
  const context = new AudioContext();
  const src = context.createMediaElementSource(audio);
  const analyser = context.createAnalyser();
  src.connect(analyser);
  analyser.connect(context.destination);
  analyser.fftSize = 512;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 200; // Increased camera z-position
  scene.add(camera);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor("#000000");

  area.appendChild(renderer.domElement);
  const geometry = new THREE.IcosahedronGeometry(60, 4); // Increased sphere size
  const material = new THREE.MeshBasicMaterial({
    map: gradientTexture,
    wireframe: true,
  });

  const sphere = new THREE.Mesh(geometry, material);

  const light = new THREE.DirectionalLight("#ffffff", 0.8);
  light.position.set(0, 50, 100);
  scene.add(light);
  scene.add(sphere);

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  function render() {
    analyser.getByteFrequencyData(dataArray);

    const lowerHalf = dataArray.slice(0, (dataArray.length / 2) - 1);
    const upperHalf = dataArray.slice((dataArray.length / 2) - 1, dataArray.length - 1);

    const lowerMax = max(lowerHalf);
    const upperAvg = avg(upperHalf);

    const lowerMaxFr = lowerMax / lowerHalf.length;
    const upperAvgFr = upperAvg / upperHalf.length;

    sphere.rotation.x += 0.001;
    sphere.rotation.y += 0.003;
    sphere.rotation.z += 0.005;

    WarpSphere(sphere, modulate(Math.pow(lowerMaxFr, 0.8), 0, 1, 0, 12), modulate(upperAvgFr, 0, 1, 0, 6));
    requestAnimationFrame(render);
    renderer.render(scene, camera);
  }

  function WarpSphere(mesh, bassFr, treFr) {
    mesh.geometry.vertices.forEach(function (vertex, i) {
      var offset = mesh.geometry.parameters.radius;
      var amp = 8; // Increase the amplitude for more distortion
      var time = window.performance.now();
      vertex.normalize();
      var rf = 0.00001;
      var distance = (offset + bassFr) + noise.noise3D(vertex.x + time * rf * 4, vertex.y + time * rf * 6, vertex.z + time * rf * 7) * amp * treFr * 2;
      vertex.multiplyScalar(distance);
    });
    mesh.geometry.verticesNeedUpdate = true;
    mesh.geometry.normalsNeedUpdate = true;
    mesh.geometry.computeVertexNormals();
    mesh.geometry.computeFaceNormals();
  }

  render();
}

// Helper functions (unchanged)
function fractionate(val, minVal, maxVal) {
  return (val - minVal) / (maxVal - minVal);
}

function modulate(val, minVal, maxVal, outMin, outMax) {
  var fr = fractionate(val, minVal, maxVal);
  var delta = outMax - outMin;
  return outMin + (fr * delta);
}

function avg(arr) {
  var total = arr.reduce(function (sum, b) {
    return sum + b;
  });
  return total / arr.length;
}

function max(arr) {
  return arr.reduce(function (a, b) {
    return Math.max(a, b);
  });
}
