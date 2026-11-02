'use client'

import { Suspense, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Move3d } from 'lucide-react'
import * as THREE from 'three'
import { buildReliefGeometry } from '@/lib/3d/relief-geometry'
import { cn } from '@/lib/utils'

function Garment({
  url,
  onReady,
}: {
  url: string
  onReady?: () => void
}) {
  const texture = useLoader(THREE.TextureLoader, url)

  const { geometry } = useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8
    // Sin mipmaps: la minificación promedia el canal alfa y produce un borde
    // punteado donde el `alphaTest` recorta la silueta.
    texture.generateMipmaps = false
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.needsUpdate = true
    const image = texture.image as HTMLImageElement
    const result = buildReliefGeometry(image)
    onReady?.()
    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texture])

  const group = useRef<THREE.Group>(null)
  const keyLight = useRef<THREE.DirectionalLight>(null)

  useFrame(({ clock, pointer }) => {
    const t = clock.getElapsedTime()
    // Haz de luz que recorre la tela suavemente
    if (keyLight.current) {
      keyLight.current.position.x = Math.sin(t * 0.35) * 3.2 + pointer.x * 0.8
      keyLight.current.position.y = 2.2 + pointer.y * 0.6
    }
  })

  return (
    <group ref={group}>
      <directionalLight ref={keyLight} position={[2.6, 2.4, 3.4]} intensity={2.1} color="#fff6ec" />
      <directionalLight position={[-3.2, 0.6, -1.6]} intensity={0.85} color="#cfd8e6" />
      <ambientLight intensity={0.85} />
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          map={texture}
          roughness={0.95}
          metalness={0.02}
          alphaTest={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

export function ProductViewer({
  imageUrl,
  label,
  className,
}: {
  imageUrl: string
  label: string
  className?: string
}) {
  const [ready, setReady] = useState(false)
  const [interacted, setInteracted] = useState(false)

  return (
    <div
      className={cn('relative aspect-[3/4] w-full overflow-hidden bg-paper-dim', className)}
      role="img"
      aria-label={`${label}. Arrastra para girar la prenda.`}
    >
      <Canvas
        camera={{ position: [0, 0, 2.2], fov: 30 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        onPointerDown={() => setInteracted(true)}
        style={{ touchAction: 'pan-y' }}
      >
        <Suspense fallback={null}>
          <Garment url={imageUrl} onReady={() => setReady(true)} />
        </Suspense>
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI * 0.33}
          maxPolarAngle={Math.PI * 0.67}
          minAzimuthAngle={-Math.PI / 3}
          maxAzimuthAngle={Math.PI / 3}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.55}
        />
      </Canvas>

      {!ready ? (
        <div className="absolute inset-0 grid place-items-center bg-paper-dim">
          <p className="text-[10px] tracking-[0.24em] text-stone uppercase">Generando 3D…</p>
        </div>
      ) : null}

      {!interacted && ready ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-ink/85 px-3.5 py-2 text-[9px] tracking-[0.18em] text-paper uppercase backdrop-blur-sm">
            <Move3d className="size-3.5" strokeWidth={1.6} />
            Arrastra para girar
          </span>
        </div>
      ) : null}
    </div>
  )
}

export default ProductViewer
