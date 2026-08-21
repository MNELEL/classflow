import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Eye, EyeOff, Camera, X, Monitor, Printer, Move } from 'lucide-react';

const CAMERA_PRESETS = {
  front: { pos: [0, 6, 12], target: [0, 0, 0], label: 'מלפנים' },
  back: { pos: [0, 6, -12], target: [0, 0, 0], label: 'מאחור' },
  side: { pos: [14, 8, 0], target: [0, 0, 0], label: 'מהצד' },
  top: { pos: [0, 18, 0.1], target: [0, 0, 0], label: 'מלמעלה' },
};

export default function PresentationMode3D({ seats, students, rows, cols, open, onClose, onMoveStudent }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const animRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const dragRef = useRef({ studentId: null, fromSeatId: null, body: null, hoveredDesk: null });
  const [anonymous, setAnonymous] = useState(false);
  const [currentCamera, setCurrentCamera] = useState('front');
  const [dragging, setDragging] = useState(false);
  const lowPowerRef = useRef(false);
  const needsRenderRef = useRef(true);
  const onMoveStudentRef = useRef(onMoveStudent);
  useEffect(() => { onMoveStudentRef.current = onMoveStudent; });

  // Setup scene
  useEffect(() => {
    if (!open || !mountRef.current) return;

    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const lowPower = (
      (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
      (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
      (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    );
    lowPowerRef.current = lowPower;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a202c);
    scene.fog = new THREE.Fog(0x1a202c, 20, 50);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    const preset = CAMERA_PRESETS.front;
    camera.position.set(...preset.pos);
    camera.lookAt(...preset.target);

    // preserveDrawingBuffer so the canvas can be screenshotted for printing
    const renderer = new THREE.WebGLRenderer({ antialias: !lowPower, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = !lowPower;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    const ceilingLight = new THREE.DirectionalLight(0xffffff, 0.8);
    ceilingLight.position.set(0, 15, 5);
    ceilingLight.castShadow = !lowPower;
    ceilingLight.shadow.mapSize.width = lowPower ? 512 : 1024;
    ceilingLight.shadow.mapSize.height = lowPower ? 512 : 1024;
    ceilingLight.shadow.camera.near = 0.5;
    ceilingLight.shadow.camera.far = 40;
    ceilingLight.shadow.camera.left = -15;
    ceilingLight.shadow.camera.right = 15;
    ceilingLight.shadow.camera.top = 15;
    ceilingLight.shadow.camera.bottom = -15;
    scene.add(ceilingLight);

    const fillLight = new THREE.DirectionalLight(0x88bbff, 0.3);
    fillLight.position.set(-10, 5, -5);
    scene.add(fillLight);

    const floorGeo = new THREE.PlaneGeometry(cols * 2.5, rows * 2.5);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x3a4a5c, roughness: 0.9 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const boardGeo = new THREE.BoxGeometry(cols * 0.8, 1.5, 0.1);
    const boardMat = new THREE.MeshStandardMaterial({ color: 0x2d5a4a, roughness: 0.3 });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.set(0, 2, -rows * 0.8 - 0.5);
    board.castShadow = !lowPower;
    scene.add(board);

    const frameGeo = new THREE.BoxGeometry(cols * 0.8 + 0.2, 1.7, 0.05);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x6b5b3d, roughness: 0.6 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(0, 2, -rows * 0.8 - 0.52);
    scene.add(frame);

    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;

    renderClassroom(scene, seats, students, rows, cols, false, lowPower);

    needsRenderRef.current = true;
    function animate() {
      animRef.current = requestAnimationFrame(animate);
      if (needsRenderRef.current) {
        renderer.render(scene, camera);
        needsRenderRef.current = false;
      }
    }
    animate();

    function handleResize() {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      rendererRef.current.setSize(w, h);
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      needsRenderRef.current = true;
    }
    window.addEventListener('resize', handleResize);

    // ── Drag-to-move students via raycasting ──
    const dom = renderer.domElement;

    function getPointerNDC(event) {
      const rect = dom.getBoundingClientRect();
      return new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
    }

    function collectByFlag(flag) {
      const arr = [];
      scene.traverse((o) => { if (o.userData[flag]) arr.push(o); });
      return arr;
    }

    function onPointerDown(event) {
      if (!onMoveStudentRef.current) return;
      const pointer = getPointerNDC(event);
      raycasterRef.current.setFromCamera(pointer, camera);
      const hits = raycasterRef.current.intersectObjects(collectByFlag('isStudent'), false);
      if (hits.length > 0) {
        const hit = hits[0].object;
        dragRef.current = {
          studentId: hit.userData.studentId,
          fromSeatId: hit.userData.seatId,
          body: hit,
          hoveredDesk: null,
        };
        hit.position.y += 0.4; // lift for visual feedback
        dom.style.cursor = 'grabbing';
        setDragging(true);
        needsRenderRef.current = true;
      }
    }

    function onPointerMove(event) {
      const d = dragRef.current;
      if (!d.studentId) return;
      const pointer = getPointerNDC(event);
      raycasterRef.current.setFromCamera(pointer, camera);
      if (d.hoveredDesk) {
        d.hoveredDesk.material.emissive.setHex(0x000000);
        d.hoveredDesk = null;
      }
      const hits = raycasterRef.current.intersectObjects(collectByFlag('isDesk'), false);
      if (hits.length > 0) {
        const desk = hits[0].object;
        if (desk.userData.seatId && desk.userData.seatId !== d.fromSeatId) {
          desk.material.emissive.setHex(0x10b981);
          desk.material.emissiveIntensity = 0.5;
          d.hoveredDesk = desk;
        }
      }
      needsRenderRef.current = true;
    }

    function onPointerUp(event) {
      const d = dragRef.current;
      if (!d.studentId) return;
      const pointer = getPointerNDC(event);
      raycasterRef.current.setFromCamera(pointer, camera);
      if (d.hoveredDesk) {
        d.hoveredDesk.material.emissive.setHex(0x000000);
      }
      const hits = raycasterRef.current.intersectObjects(collectByFlag('isDesk'), false);
      if (hits.length > 0) {
        const toSeatId = hits[0].object.userData.seatId;
        if (toSeatId && toSeatId !== d.fromSeatId && onMoveStudentRef.current) {
          onMoveStudentRef.current(d.studentId, d.fromSeatId, toSeatId);
        }
      }
      if (d.body) d.body.position.y -= 0.4;
      dragRef.current = { studentId: null, fromSeatId: null, body: null, hoveredDesk: null };
      dom.style.cursor = onMoveStudentRef.current ? 'grab' : 'default';
      setDragging(false);
      needsRenderRef.current = true;
    }

    const hasMove = !!onMoveStudentRef.current;
    if (hasMove) {
      dom.style.cursor = 'grab';
      dom.addEventListener('pointerdown', onPointerDown);
      dom.addEventListener('pointermove', onPointerMove);
      dom.addEventListener('pointerup', onPointerUp);
      dom.addEventListener('pointercancel', onPointerUp);
    }

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', handleResize);
      if (hasMove) {
        dom.removeEventListener('pointerdown', onPointerDown);
        dom.removeEventListener('pointermove', onPointerMove);
        dom.removeEventListener('pointerup', onPointerUp);
        dom.removeEventListener('pointercancel', onPointerUp);
      }
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
    };
  }, [open]);

  // Update labels when anonymous toggle changes
  useEffect(() => {
    if (!sceneRef.current || !open) return;
    renderClassroom(sceneRef.current, seats, students, rows, cols, anonymous, lowPowerRef.current);
    needsRenderRef.current = true;
  }, [anonymous, seats, students, rows, cols, open]);

  // Camera transition
  useEffect(() => {
    if (!cameraRef.current || !open) return;
    const preset = CAMERA_PRESETS[currentCamera];
    const camera = cameraRef.current;
    const startPos = camera.position.clone();
    const endPos = new THREE.Vector3(...preset.pos);
    const startTarget = camera.userData.target || new THREE.Vector3(0, 0, 0);
    const endTarget = new THREE.Vector3(...preset.target);
    const duration = 800;
    const startTime = Date.now();

    function step() {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      camera.position.lerpVectors(startPos, endPos, eased);
      const currentTarget = new THREE.Vector3().lerpVectors(startTarget, endTarget, eased);
      camera.lookAt(currentTarget);
      camera.userData.target = endTarget;
      needsRenderRef.current = true;
      if (t < 1) requestAnimationFrame(step);
    }
    step();
  }, [currentCamera, open]);

  function handlePrint() {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!renderer || !scene || !camera) return;
    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/png');
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><title>תצוגת כיתה 3D</title><style>@page{size:A4 landscape;margin:10mm}html,body{margin:0;height:100%;background:#fff}body{display:flex;align-items:center;justify-content:center}img{max-width:100%;max-height:100%;object-fit:contain}</style></head><body><img src="${dataUrl}"/></body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black" dir="rtl">
      <div ref={mountRef} className="w-full h-full" />

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-2">
          <Monitor className="w-5 h-5 text-white" />
          <span className="text-white font-semibold text-sm">מצב מצגת</span>
          {onMoveStudent && (
            <span className="hidden sm:flex items-center gap-1 text-white/70 text-xs mr-2">
              <Move className="w-3 h-3" /> גררו תלמידים בין מקומות
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
            title="הדפסת מצב תלת-מימד"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">הדפסה</span>
          </button>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Drag hint while dragging */}
      {dragging && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-primary/90 text-primary-foreground text-xs font-medium px-3 py-1.5 rounded-full">
          גורר תלמיד — שחררו על מושב
        </div>
      )}

      {/* Camera angle buttons */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-black/50 backdrop-blur-md rounded-2xl">
        {Object.entries(CAMERA_PRESETS).map(([key, preset]) => (
          <button
            key={key}
            onClick={() => setCurrentCamera(key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              currentCamera === key
                ? 'bg-primary text-primary-foreground'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            {preset.label}
          </button>
        ))}
      </div>

      {/* Anonymity toggle */}
      <div className="absolute bottom-8 right-4">
        <button
          onClick={() => setAnonymous(v => !v)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            anonymous
              ? 'bg-amber-500 text-white'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          {anonymous ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {anonymous ? 'מצב אנונימי' : 'הצג שמות'}
        </button>
      </div>

      {anonymous && (
        <div className="absolute top-16 right-4 bg-amber-500/20 border border-amber-500/40 rounded-lg px-3 py-1.5">
          <p className="text-amber-200 text-xs font-medium">🔒 השמות מוסתרים — מצב מפקח</p>
        </div>
      )}
    </div>
  );
}

function disposeObject3D(obj) {
  if (obj.geometry) obj.geometry.dispose();
  if (obj.material) {
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
    materials.forEach((m) => {
      if (m.map) m.map.dispose();
      m.dispose();
    });
  }
}

function renderClassroom(scene, seats, students, rows, cols, anonymous, lowPower = false) {
  const toRemove = [];
  scene.traverse((obj) => {
    if (obj.userData.isSeat || obj.userData.isLabel) toRemove.push(obj);
  });
  toRemove.forEach((obj) => {
    scene.remove(obj);
    disposeObject3D(obj);
  });

  const studentMap = Object.fromEntries(students.map(s => [s.id, s]));
  // Mirror the X axis so column 0 sits on the right (matching the RTL 2D grid)
  const offsetX = -(cols - 1) * 1.2 / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const seat = seats.find(s => s.row === r && s.col === c);
      if (!seat || seat.is_hidden || seat.is_gap) continue;

      const x = -offsetX - c * 1.2;
      const z = -(rows - 1) * 0.6 + r * 1.2;

      if (seat.is_blocked) {
        const coneGeo = new THREE.ConeGeometry(0.3, 0.6, 4);
        const coneMat = new THREE.MeshStandardMaterial({ color: 0xff6b35, transparent: true, opacity: 0.8 });
        const cone = new THREE.Mesh(coneGeo, coneMat);
        cone.position.set(x, 0.5, z);
        cone.userData.isSeat = true;
        scene.add(cone);
        continue;
      }

      // Desk
      const deskGeo = new THREE.BoxGeometry(0.9, 0.05, 0.6);
      const deskMat = new THREE.MeshStandardMaterial({ color: 0xc4a96a, roughness: 0.7, emissive: 0x000000, emissiveIntensity: 0 });
      const desk = new THREE.Mesh(deskGeo, deskMat);
      desk.position.set(x, 0.55, z);
      desk.castShadow = !lowPower;
      desk.receiveShadow = !lowPower;
      desk.userData.isSeat = true;
      desk.userData.isDesk = true;
      desk.userData.seatId = seat.id;
      scene.add(desk);

      // Desk legs
      const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.55);
      const legMat = new THREE.MeshStandardMaterial({ color: 0x8a7650 });
      [[-0.35, -0.22], [0.35, -0.22], [-0.35, 0.22], [0.35, 0.22]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(x + lx, 0.275, z + lz);
        leg.castShadow = !lowPower;
        leg.userData.isSeat = true;
        scene.add(leg);
      });

      // Chair
      const chairBackGeo = new THREE.BoxGeometry(0.5, 0.5, 0.05);
      const chairMat = new THREE.MeshStandardMaterial({ color: 0x4a6578, roughness: 0.8 });
      const chairBack = new THREE.Mesh(chairBackGeo, chairMat);
      chairBack.position.set(x, 0.5, z + 0.4);
      chairBack.castShadow = !lowPower;
      chairBack.userData.isSeat = true;
      scene.add(chairBack);

      const chairSeatGeo = new THREE.BoxGeometry(0.5, 0.04, 0.45);
      const chairSeat = new THREE.Mesh(chairSeatGeo, chairMat);
      chairSeat.position.set(x, 0.45, z + 0.2);
      chairSeat.castShadow = !lowPower;
      chairSeat.userData.isSeat = true;
      scene.add(chairSeat);

      // Student figure
      if (seat.student_id) {
        const student = studentMap[seat.student_id];
        const color = student?.academic_level === 'excellent' ? 0x9333ea :
                      student?.academic_level === 'strong' ? 0x10b981 :
                      student?.academic_level === 'above_average' ? 0x3b82f6 :
                      student?.academic_level === 'weak' ? 0xef4444 :
                      student?.academic_level === 'below_average' ? 0xf97316 :
                      0x6b7280;

        const bodyGeo = lowPower
          ? new THREE.CapsuleGeometry(0.15, 0.3, 2, 5)
          : new THREE.CapsuleGeometry(0.15, 0.3, 4, 8);
        const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.set(x, 0.9, z);
        body.castShadow = !lowPower;
        body.userData.isSeat = true;
        body.userData.isStudent = true;
        body.userData.studentId = seat.student_id;
        body.userData.seatId = seat.id;
        scene.add(body);

        const headGeo = lowPower
          ? new THREE.SphereGeometry(0.12, 6, 6)
          : new THREE.SphereGeometry(0.12, 12, 12);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xf0c8a0, roughness: 0.5 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.set(x, 1.25, z);
        head.castShadow = !lowPower;
        head.userData.isSeat = true;
        head.userData.isStudent = true;
        head.userData.studentId = seat.student_id;
        head.userData.seatId = seat.id;
        scene.add(head);

        if (!anonymous && student) {
          const canvas = document.createElement('canvas');
          canvas.width = 256;
          canvas.height = 64;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(0, 0, 256, 64);
          ctx.fillStyle = 'white';
          ctx.font = 'bold 28px Heebo, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.direction = 'rtl';
          ctx.fillText(student.name, 128, 32);

          const texture = new THREE.CanvasTexture(canvas);
          const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
          const sprite = new THREE.Sprite(spriteMat);
          sprite.position.set(x, 1.6, z);
          sprite.scale.set(1.2, 0.3, 1);
          sprite.userData.isLabel = true;
          scene.add(sprite);
        }
      } else if (seat.is_locked) {
        const lockGeo = new THREE.OctahedronGeometry(0.15);
        const lockMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 0.3 });
        const lock = new THREE.Mesh(lockGeo, lockMat);
        lock.position.set(x, 0.8, z);
        lock.userData.isSeat = true;
        scene.add(lock);
      }
    }
  }
}