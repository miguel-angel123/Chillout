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
  volume: VolumeResult
}

function GarmentModel({
  photoUrl,
  depthUrl,
  onReady,
}: {
  photoUrl: string
  depthUrl: string | null
  onReady?: () => void
}) {
  const [built, setBuilt] = useState<Built | null>(null)
  const keyLight = useRef<THREE.DirectionalLight>(null)

  useEffect(() => {
    let alive = true
    let created: Built | null = null

    void (async () => {
      const [photo, depth] = await Promise.all([
        loadTexture(photoUrl),
        depthUrl ? loadTexture(depthUrl) : Promise.resolve(null),
      ])
      if (!alive || !photo || !photo.image) return

      const volume = buildVolumeGeometry(
        photo.image as HTMLImageElement,
        (depth?.image as HTMLImageElement | undefined) ?? null,
      )
      created = { photo, volume }
      setBuilt(created)
      onReady?.()
    })()

    return () => {
      alive = false
      if (created) {
        created.volume.front.dispose()
        created.volume.back.dispose()
        created.photo.dispose()
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
    <group>
      <directionalLight ref={keyLight} position={[2.6, 2.4, 3.4]} intensity={2.1} color="#fff6ec" />
      <directionalLight position={[-3.2, 0.6, -2.2]} intensity={1.0} color="#cfd8e6" />
      <directionalLight position={[0, -1.6, 1.4]} intensity={0.35} color="#ffffff" />
      <ambientLight intensity={0.8} />

      {/* Frente: la foto exacta sobre la superficie con bulto */}
      <mesh geometry={built.volume.front}>
        <meshStandardMaterial map={built.photo} roughness={0.95} metalness={0.02} alphaTest={0.4} />
      </mesh>

      {/* Revés: misma prenda, cerrada, ligeramente más apagada */}
      <mesh geometry={built.volume.back}>
        <meshStandardMaterial
          map={built.photo}
          color="#cfc8bd"
          roughness={0.98}
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
  label,
  className,
}: {
  imageUrl: string
  depthUrl?: string | null
  label: string
  className?: string
}) {
  const [ready, setReady] = useState(false)
  const [interacted, setInteracted] = useState(false)

  const framed = useMemo(() => ({ position: [0, 0, 2.15] as [number, number, number], fov: 30 }), [])

  return (
    <div
      className={cn('relative aspect-[3/4] w-full overflow-hidden bg-paper-dim', className)}
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
          <GarmentModel photoUrl={imageUrl} depthUrl={depthUrl ?? null} onReady={() => setReady(true)} />
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
        <div className="absolute inset-0 grid place-items-center bg-paper-dim">
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
