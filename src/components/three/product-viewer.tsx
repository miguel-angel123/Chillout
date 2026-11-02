'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Move3d } from 'lucide-react'
import * as THREE from 'three'
import { buildVolumeGeometry, type VolumeResult } from '@/lib/3d/volume-geometry'
import { cn } from '@/lib/utils'

function loadTexture(url: string): Promise<THREE.Texture | null> {
  return new Promise((resolve) => {
    new THREE.TextureLoader().load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace
        // Sin mipmaps: la minificación promedia el alfa y puntea el contorno.
        texture.generateMipmaps = false
        texture.minFilter = THREE.LinearFilter
        texture.magFilter = THREE.LinearFilter
        texture.anisotropy = 8
        texture.needsUpdate = true
        resolve(texture)
      },
      undefined,
      () => resolve(null),
    )
  })
}

type Built = {
  photo: THREE.Texture
  backPhoto: THREE.Texture | null
  volume: VolumeResult
}

/**
 * Percha de alambre: gancho metálico, dos varas finas y travesaño inferior.
 * El travesaño queda oculto dentro de los hombros, así se lee como colgada.
 */
function Hanger({ y = 0.44 }: { y?: number }) {
  const wire = '#c9ccd1'
  const arm = 0.36
  const angle = 0.588 // 33.69°

  return (
    // Ligeramente detrás del plano delantero: las varas quedan tras el cuello.
    <group position={[0, y, -0.07]}>
      <mesh position={[0, 0.168, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.026, 0.0038, 8, 26, Math.PI * 1.55]} />
        <meshStandardMaterial color={wire} metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.105, 0]}>
        <cylinderGeometry args={[0.0038, 0.0038, 0.09, 8]} />
        <meshStandardMaterial color={wire} metalness={0.9} roughness={0.3} />
      </mesh>

      <mesh position={[-0.15, -0.1, 0]} rotation={[0, 0, angle]}>
        <boxGeometry args={[arm, 0.008, 0.008]} />
        <meshStandardMaterial color={wire} metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[0.15, -0.1, 0]} rotation={[0, 0, -angle]}>
        <boxGeometry args={[arm, 0.008, 0.008]} />
        <meshStandardMaterial color={wire} metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.2, 0]}>
        <boxGeometry args={[0.6, 0.008, 0.008]} />
        <meshStandardMaterial color={wire} metalness={0.9} roughness={0.3} />
      </mesh>
    </group>
  )
}

function GarmentModel({
  photoUrl,
  depthUrl,
  backImageUrl,
  onReady,
}: {
  photoUrl: string
  depthUrl: string | null
  backImageUrl?: string | null
  onReady?: () => void
}) {
  const [built, setBuilt] = useState<Built | null>(null)
  const keyLight = useRef<THREE.DirectionalLight>(null)

  useEffect(() => {
    let alive = true
    let created: Built | null = null

    void (async () => {
      const [photo, depth, back] = await Promise.all([
        loadTexture(photoUrl),
        depthUrl ? loadTexture(depthUrl) : Promise.resolve(null),
        backImageUrl ? loadTexture(backImageUrl) : Promise.resolve(null),
      ])
      if (!alive || !photo || !photo.image) return

      const volume = buildVolumeGeometry(
        photo.image as HTMLImageElement,
        (depth?.image as HTMLImageElement | undefined) ?? null,
        (back?.image as HTMLImageElement | undefined) ?? null,
      )
      created = { photo, backPhoto: back, volume }
      setBuilt(created)
      onReady?.()
    })()

    return () => {
      alive = false
      if (created) {
        created.volume.front.dispose()
        created.volume.back.dispose()
        created.photo.dispose()
        created.backPhoto?.dispose()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoUrl, depthUrl])

  useFrame(({ clock, pointer }) => {
    const t = clock.getElapsedTime()
    if (keyLight.current) {
      keyLight.current.position.x = Math.sin(t * 0.32) * 3.1 + pointer.x * 0.9
      keyLight.current.position.y = 2.3 + pointer.y * 0.7
    }
  })

  if (!built) return null

  return (
    <group position={[0, -0.12, 0]}>
      <directionalLight ref={keyLight} position={[2.6, 2.4, 3.4]} intensity={2.1} color="#fff6ec" />
      <directionalLight position={[-3.2, 0.6, -2.2]} intensity={1.0} color="#cfd8e6" />
      <directionalLight position={[0, -1.6, 1.4]} intensity={0.35} color="#ffffff" />
      <ambientLight intensity={0.85} />

      <Hanger />

      {/* Frente: la foto exacta sobre la superficie con bulto */}
      <mesh geometry={built.volume.front}>
        <meshStandardMaterial map={built.photo} roughness={0.95} metalness={0.02} alphaTest={0.4} />
      </mesh>

      {/* Revés: si hay foto trasera real se usa tal cual; si no, la delantera
          reflejada (el UV ya viene invertido en la capa trasera). */}
      <mesh geometry={built.volume.back}>
        <meshStandardMaterial
          map={built.backPhoto ?? built.photo}
          color={built.backPhoto ? '#ffffff' : '#cfc8bd'}
          roughness={0.97}
          metalness={0.0}
          alphaTest={0.4}
        />
      </mesh>
    </group>
  )
}

export function ProductViewer({
  imageUrl,
  depthUrl,
  backImageUrl,
  label,
  className,
}: {
  imageUrl: string
  depthUrl?: string | null
  /** Vista trasera real; si falta, el revés usa la delantera reflejada. */
  backImageUrl?: string | null
  label: string
  className?: string
}) {
  const [ready, setReady] = useState(false)
  const [interacted, setInteracted] = useState(false)

  const framed = useMemo(() => ({ position: [0, 0, 2.38] as [number, number, number], fov: 30 }), [])

  return (
    <div
      className={cn('relative aspect-[3/4] w-full overflow-hidden bg-white', className)}
      role="img"
      aria-label={`${label}. Arrastra para girar la prenda.`}
    >
      <Canvas
        camera={framed}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        onPointerDown={() => setInteracted(true)}
        style={{ touchAction: 'pan-y' }}
      >
        <Suspense fallback={null}>
          <GarmentModel
            photoUrl={imageUrl}
            depthUrl={depthUrl ?? null}
            backImageUrl={backImageUrl ?? null}
            onReady={() => setReady(true)}
          />
        </Suspense>

        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI * 0.3}
          maxPolarAngle={Math.PI * 0.7}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.6}
          autoRotate={!interacted}
          autoRotateSpeed={0.7}
        />
      </Canvas>

      {!ready ? (
        <div className="absolute inset-0 grid place-items-center bg-white">
          <p className="text-[10px] tracking-[0.24em] text-stone uppercase">Generando 3D…</p>
        </div>
      ) : null}

      {!interacted && ready ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-ink/85 px-3.5 py-2 text-[9px] tracking-[0.18em] text-paper uppercase backdrop-blur-sm">
            <Move3d className="size-3.5" strokeWidth={1.6} />
            Arrastra para girar · 360°
          </span>
        </div>
      ) : null}
    </div>
  )
}

export default ProductViewer
