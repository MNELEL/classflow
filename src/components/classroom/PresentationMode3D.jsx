import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Camera, X, Monitor, Box } from 'lucide-react';
import { getStudentSeat } from '@/lib/seatingUtils';

const CAMERA_PRESETS = {
  front: { pos: [0, 6, 12], target: [0, 0, 0], label: 'מלפנים' },
  back: { pos: [0, 6, -12], target: [0, 0, 0], label: 'מאחור' },
  side: { pos: [14, 8, 0], target: [0, 0, 0], label: 'מהצד' },
  top: { pos: [0, 18, 0.1], target: [0, 0, 0], label: 'מלמעלה' },
};

export default function PresentationMode3D({ seats, students, rows, cols, open, onClose }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const animRef = useRef(null);
  const labelsRef = useRef([]);
  const [anonymous, setAnonymous] = useState(false);
  const [currentCamera, setCurrentCamera] = useState('front');

  // Setup scene
  useEffect(() => {
    if (!open || !mountRef.current) return;

    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a202c);
    scene.fog = new THREE.Fog(0x1a202c, 20, 50);

    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    const preset = CAMERA_PRESETS.front;
    camera.position.set(...preset.pos);
    camera.lookAt(...preset.target);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    const ceilingLight = new THREE.DirectionalLight(0xffffff, 0.8);
    ceilingLight.position.set(0, 15, 5);
    ceilingLight.castShadow = true;
    ceilingLight.shadow.mapSize.width = 1024;
    ceilingLight.shadow.mapSize.height = 1024;
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

    // Floor
    const floorGeo = new THREE.PlaneGeometry(cols * 2.5, rows * 2.5);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x3a4a5c, roughness: 0.9 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Teacher's board (front wall)
    const boardGeo = new THREE.BoxGeometry(cols * 0.8, 1.5, 0.1);
    const boardMat = new THREE.MeshStandardMaterial({ color: 0x2d5a4a, roughness: 0.3 });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.set(0, 2, -rows * 0.8 - 0.5);
    board.castShadow = true;
    scene.add(board);

    // Board frame
    const frameGeo = new THREE.BoxGeometry(cols * 0.8 + 0.2, 1.7, 0.05);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x6b5b3d, roughness: 0.6 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(0, 2, -rows * 0.8 - 0.52);
    scene.add(frame);

    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;

    // Render seats + students
    renderClassroom(scene, seats, students, rows, cols, false);

    // Animation loop
    function animate() {
      animRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }
    animate();

    // Resize handler
    function handleResize() {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      rendererRef.current.setSize(w, h);
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
    }
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', handleResize);
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
    renderClassroom(sceneRef.current, seats, students, rows, cols, anonymous);
  }, [anonymous, seats, students, rows, cols, open]);

  // Camera transition
  useEffect(() => {
    if (!cameraRef.current || !open) return;
    const preset = CAMERA_PRESETS[currentCamera];
    const camera = cameraRef.current;
    // Smooth transition
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
      if (t < 1) requestAnimationFrame(step);
    }
    step();
  }, [currentCamera, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black" dir="rtl">
      <div ref={mountRef} className="w-full h-full" />

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-2">
          <Monitor className="w-5 h-5 text-white" />
          <span className="text-white font-semibold text-sm">מצב מצגת</span>
        </div>
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

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

function renderClassroom(scene, seats, students, rows, cols, anonymous) {
  // Remove old seat meshes + labels
  const toRemove = [];
  scene.traverse((obj) => {
    if (obj.userData.isSeat || obj.userData.isLabel) toRemove.push(obj);
  });
  toRemove.forEach(obj => scene.remove(obj));

  const studentMap = Object.fromEntries(students.map(s => [s.id, s]));
  const offsetX = -(cols - 1) * 1.2 / 2;
  const offsetZ = -(rows - 1) * 1.2 / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const seat = seats.find(s => s.row === r && s.col === c);
      if (!seat || seat.is_hidden || seat.is_gap) continue;

      const x = offsetX + c * 1.2;
      const z = offsetZ + r * 1.2;

      if (seat.is_blocked) {
        // Blocked seat — red cone
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
      const deskMat = new THREE.MeshStandardMaterial({ color: 0xc4a96a, roughness: 0.7 });
      const desk = new THREE.Mesh(deskGeo, deskMat);
      desk.position.set(x, 0.55, z);
      desk.castShadow = true;
      desk.receiveShadow = true;
      desk.userData.isSeat = true;
      scene.add(desk);

      // Desk legs
      const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.55);
      const legMat = new THREE.MeshStandardMaterial({ color: 0x8a7650 });
      [[-0.35, -0.22], [0.35, -0.22], [-0.35, 0.22], [0.35, 0.22]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(x + lx, 0.275, z + lz);
        leg.castShadow = true;
        leg.userData.isSeat = true;
        scene.add(leg);
      });

      // Chair
      const chairBackGeo = new THREE.BoxGeometry(0.5, 0.5, 0.05);
      const chairMat = new THREE.MeshStandardMaterial({ color: 0x4a6578, roughness: 0.8 });
      const chairBack = new THREE.Mesh(chairBackGeo, chairMat);
      chairBack.position.set(x, 0.5, z + 0.4);
      chairBack.castShadow = true;
      chairBack.userData.isSeat = true;
      scene.add(chairBack);

      const chairSeatGeo = new THREE.BoxGeometry(0.5, 0.04, 0.45);
      const chairSeat = new THREE.Mesh(chairSeatGeo, chairMat);
      chairSeat.position.set(x, 0.45, z + 0.2);
      chairSeat.castShadow = true;
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

        // Body (torso)
        const bodyGeo = new THREE.CapsuleGeometry(0.15, 0.3, 4, 8);
        const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.set(x, 0.9, z);
        body.castShadow = true;
        body.userData.isSeat = true;
        scene.add(body);

        // Head
        const headGeo = new THREE.SphereGeometry(0.12, 12, 12);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xf0c8a0, roughness: 0.5 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.set(x, 1.25, z);
        head.castShadow = true;
        head.userData.isSeat = true;
        scene.add(head);

        // Name label (sprite)
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
        // Locked indicator
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