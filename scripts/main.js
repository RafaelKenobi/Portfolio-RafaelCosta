window.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.getElementById('renderCanvas');
  const engine = new BABYLON.Engine(canvas, true);
  const scene = new BABYLON.Scene(engine);
  let controloAtivo = false;

  scene.createDefaultEnvironment();
  scene.clearColor = new BABYLON.Color3(0.05, 0.05, 0.1);
  scene.gravity = new BABYLON.Vector3(0, 0, 0);
  scene.collisionsEnabled = true;

  await BABYLON.SceneLoader.AppendAsync("models/", "cenario.glb", scene);

  scene.meshes.forEach(mesh => {
    if (mesh instanceof BABYLON.Mesh && mesh.isVisible && mesh.getTotalVertices() > 0) {
      mesh.checkCollisions = false;
    }
  });

  const naveResult = await BABYLON.SceneLoader.ImportMeshAsync("", "models/", "nave.glb", scene);
  const nave = naveResult.meshes[0];
  nave.position = new BABYLON.Vector3(0, 2, 0);
  nave.scaling = new BABYLON.Vector3(0.5, 0.5, 0.5);
  nave.rotationQuaternion = BABYLON.Quaternion.Identity();
  nave.checkCollisions = true;

  const chaseCamPos = new BABYLON.TransformNode("chaseCamPos", scene);
  chaseCamPos.parent = nave;
  chaseCamPos.position = new BABYLON.Vector3(0, 2, -10);

  const chaseCamLook = new BABYLON.TransformNode("chaseCamLook", scene);
  chaseCamLook.parent = nave;
  chaseCamLook.position = new BABYLON.Vector3(0, 1, 10);

  const camera = new BABYLON.UniversalCamera("ChaseCamera", new BABYLON.Vector3(0, 0, 0), scene);
  camera.maxZ = 10000;
  camera.attachControl(canvas, true);

  const inputMap = {};
  scene.actionManager = new BABYLON.ActionManager(scene);
  scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
    BABYLON.ActionManager.OnKeyDownTrigger, evt => inputMap[evt.sourceEvent.key.toLowerCase()] = true
  ));
  scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
    BABYLON.ActionManager.OnKeyUpTrigger, evt => inputMap[evt.sourceEvent.key.toLowerCase()] = false
  ));

  const MaxThrust = 20;
  const TurnSpeed = 1.5;
  const Drag = 0.25;
  const BrakingCoefficient = 3.5;
  const velocity = new BABYLON.Vector3();

  let mouseState = null;
  scene.onPointerObservable.add((pointerInfo) => {
    switch (pointerInfo.type) {
      case BABYLON.PointerEventTypes.POINTERDOWN:
        mouseState = { down: pointerInfo.event, last: pointerInfo.event };
        break;
      case BABYLON.PointerEventTypes.POINTERUP:
        mouseState = null;
        break;
      case BABYLON.PointerEventTypes.POINTERMOVE:
        if (mouseState) mouseState.last = pointerInfo.event;
        break;
    }
  });

  function getMouseInput() {
    if (!mouseState) return { yaw: 0, pitch: 0 };
    const screenSize = Math.min(scene.getEngine().getRenderWidth(), scene.getEngine().getRenderHeight());
    const dragSize = 0.25 * screenSize;
    const dragX = mouseState.last.clientX - mouseState.down.clientX;
    const dragY = mouseState.down.clientY - mouseState.last.clientY;

    const yaw = BABYLON.Scalar.Clamp(dragX / dragSize, -1, 1);
    const pitch = BABYLON.Scalar.Clamp(-dragY / dragSize, -1, 1);
    return { yaw, pitch };
  }

  scene.onBeforeRenderObservable.add(() => {
    if (!controloAtivo) return;

    const delta = scene.deltaTime / 1000;
    const input = getMouseInput();

    const rotation = BABYLON.Quaternion.RotationYawPitchRoll(
      input.yaw * TurnSpeed * delta,
      input.pitch * TurnSpeed * delta,
      0
    );
    nave.rotationQuaternion.multiplyInPlace(rotation);

    let moveDirection = BABYLON.Vector3.Zero();
    const forward = nave.forward;
    const right = BABYLON.Vector3.Cross(BABYLON.Axis.Y, forward).normalize();

    if (inputMap["w"]) moveDirection.addInPlace(forward);
    if (inputMap["s"]) moveDirection.subtractInPlace(forward);
    if (inputMap["a"]) moveDirection.subtractInPlace(right);
    if (inputMap["d"]) moveDirection.addInPlace(right);

    moveDirection.normalize();

    const isBoosting = inputMap[" "];
    const thrustPower = isBoosting ? MaxThrust * 2 : MaxThrust;

    const acceleration = moveDirection.scale(thrustPower * delta);
    velocity.addInPlace(acceleration);

    const isMoving = inputMap["w"] || inputMap["a"] || inputMap["s"] || inputMap["d"];
    const damping = isMoving ? Drag : BrakingCoefficient;
    velocity.scaleInPlace(1 - damping * delta);

    nave.moveWithCollisions(velocity.scale(delta));

    camera.position = BABYLON.Vector3.Lerp(camera.position, chaseCamPos.getAbsolutePosition(), delta * 3);
    camera.setTarget(chaseCamLook.getAbsolutePosition());
  });

  engine.runRenderLoop(() => scene.render());
  window.addEventListener('resize', () => engine.resize());

  // Evento do botão
  document.getElementById('startButton').addEventListener('click', (e) => {
  e.preventDefault();
  controloAtivo = true;
  document.getElementById('uiOverlay').style.display = 'none';
  document.getElementById('gameUI').style.display = 'block';
});


  document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    controloAtivo = false;
    document.getElementById('uiOverlay').style.display = 'block';
    document.getElementById('gameUI').style.display = 'none';
  }
});

const musicas = [
  'musicas/musica1.wav',
  'musicas/musica2.mp3'
];

let indiceAtual = 0;
const audioPlayer = new Audio(musicas[indiceAtual]);
audioPlayer.volume = 0.1;
document.getElementById('startButton').addEventListener('click', () => {
  audioPlayer.play();
});


audioPlayer.addEventListener('ended', () => {
  indiceAtual = (indiceAtual + 1) % musicas.length;
  audioPlayer.src = musicas[indiceAtual];
  audioPlayer.play();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    audioPlayer.pause();
  }
});

document.getElementById('startButton').addEventListener('click', () => {
  audioPlayer.play();
});

const muteButton = document.getElementById('toggleMute');

muteButton.addEventListener('click', () => {
  audioPlayer.muted = !audioPlayer.muted;
  muteButton.textContent = audioPlayer.muted ? '🔇' : '🔊';
});



});