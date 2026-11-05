'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
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

const LIGHTS = (
  <>
    <directionalLight position={[2.6, 2.4, 3.4]} intensity={2.4} color="#fff6ec" />
    <directionalLight position={[-3.2, 0.6, -2.2]} intensity={1.1} color="#cfd8e6" />
    {/* Contraluz: en prendas negras el borde iluminado es lo que define la
        silueta; sin él el modelo se ve como una mancha. */}
    <directionalLight position={[-1.6, 1.8, -3.4]} intensity={3.2} color="#ffffff" />
    <directionalLight position={[0, -1.6, 1.4]} intensity={0.45} color="#ffffff" />
    <ambientLight intensity={0.9} />
  </>
)

/* ── Modelo GLB del motor local ──────────────────────────── */

/**
 * Carga el GLB generado por el motor 3D y lo tiñe con el color elegido.
 *
 * El GLB trae la textura de detalle en gris normalizado: al multiplicarla por
 * `material.color`, la prenda entera toma el color del catálogo conservando el
 * acanalado, las costuras y el relieve del tejido.
 */
function GlbModel({
  url,
  colorHex,
  onReady,
}: {
  url: string
  colorHex: string
  onReady?: () => void
}) {
  const { scene } = useGLTF(url)
  const { camera, size } = useThree()

  // Se clona una sola vez: cambiar de color solo ajusta el material.
  const prepared = useMemo(() => {
    const clone = scene.clone(true)

    clone.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return

      const source = mesh.material as THREE.MeshStandardMaterial
      const material = source.clone()
      material.metalness = 0
      // Rugosidad media: en prendas negras el brillo es lo único que define
      // la forma, con 0.95 el modelo se ve como una mancha.
      material.roughness = 0.72
      if (material.map) {
        material.map.colorSpace = THREE.SRGBColorSpace
        material.map.anisotropy = 8
      }
      material.needsUpdate = true
      mesh.material = material
    })

    // Centrar y escalar para que la prenda entre completa en el encuadre.
    // Se ajusta al eje más restrictivo: en un visor vertical el ancho suele
    // ser el límite real, no el alto.
    const box = new THREE.Box3().setFromObject(clone)
    const tamano = new THREE.Vector3()
    const centro = new THREE.Vector3()
    box.getSize(tamano)
    box.getCenter(centro)

    const perspectiva = camera as THREE.PerspectiveCamera
    const fovRad = THREE.MathUtils.degToRad(perspectiva.fov ?? 30)
    const distancia = Math.abs(perspectiva.position.z) || 2.38
    const altoVisible = 2 * Math.tan(fovRad / 2) * distancia
    const anchoVisible = altoVisible * (size.width / Math.max(size.height, 1))

    const margen = 0.62
    const escalaAlto = (altoVisible * margen) / Math.max(tamano.y, 1e-6)
    const escalaAncho = (anchoVisible * margen) / Math.max(tamano.x, 1e-6)

    // Permite fijar la escala por URL (?escala=0.5) para calibrar el encuadre
    // sin recompilar. Sin el parámetro se usa el cálculo por cámara.
    const override =
      typeof window !== 'undefined'
        ? Number(new URLSearchParams(window.location.search).get('escala'))
        : NaN
    const escala =
      Number.isFinite(override) && override > 0 ? override : Math.min(escalaAlto, escalaAncho)

    const grupo = new THREE.Group()
    grupo.scale.setScalar(Number.isFinite(escala) && escala > 0 ? escala : 0.5)
    grupo.add(clone)

    // Centrar con la caja YA escalada: centrar antes de escalar deja la prenda
    // desplazada y se corta por el bajo.
    grupo.updateMatrixWorld(true)
    const cajaFinal = new THREE.Box3().setFromObject(grupo)
    const centroFinal = new THREE.Vector3()
    cajaFinal.getCenter(centroFinal)
    if (
      Number.isFinite(centroFinal.x) &&
      Number.isFinite(centroFinal.y) &&
      Number.isFinite(centroFinal.z)
    ) {
      grupo.position.set(-centroFinal.x, -centroFinal.y, -centroFinal.z)
    }

    if (typeof window !== 'undefined') {
      const fin = new THREE.Vector3()
      cajaFinal.getSize(fin)
      console.debug(
        `[GLB v4] caja=${tamano.x.toFixed(3)}x${tamano.y.toFixed(3)} escala=${escala.toFixed(3)} final=${fin.x.toFixed(3)}x${fin.y.toFixed(3)} centroY=${centroFinal.y.toFixed(3)}`,
      )
    }

    return grupo
  }, [scene, camera, size.width, size.height])

  useEffect(() => {
    const color = new THREE.Color(colorHex)
    prepared.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh) (mesh.material as THREE.MeshStandardMaterial).color.copy(color)
    })
  }, [prepared, colorHex])

  useEffect(() => {
    onReady?.()
  }, [onReady])

  return <primitive object={prepared} />
}

/* ── Volumen procedural (respaldo sin GLB) ───────────────── */

type Built = {
  photo: THREE.Texture
  backPhoto: THREE.Texture | null
  volume: VolumeResult
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

  useFrame(({ pointer }) => {
    if (keyLight.current) {
      keyLight.current.position.x = pointer.x * 0.9 + 2.2
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

      <mesh geometry={built.volume.front}>
        <meshStandardMaterial map={built.photo} roughness={0.95} metalness={0.02} alphaTest={0.4} />
      </mesh>

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

/* ── Visor ───────────────────────────────────────────────── */

export function ProductViewer({
  imageUrl,
  depthUrl,
  backImageUrl,
  glbUrl,
  colorHex = '#ffffff',
  label,
  className,
}: {
  imageUrl: string
  depthUrl?: string | null
  backImageUrl?: string | null
  /** GLB del motor local; si no existe se usa el volumen procedural. */
  glbUrl?: string | null
  /** Color del catálogo: tiñe la textura de detalle del GLB. */
  colorHex?: string
  label: string
  className?: string
}) {
  const [ready, setReady] = useState(false)
  const [interacted, setInteracted] = useState(false)
  const [glbDisponible, setGlbDisponible] = useState<boolean | null>(null)

  // El GLB es opcional: se comprueba antes de pedirlo para no romper el visor.
  useEffect(() => {
    if (!glbUrl) {
      setGlbDisponible(false)
      return
    }
    let alive = true
    setGlbDisponible(null)
    fetch(glbUrl, { method: 'HEAD' })
      .then((r) => {
        if (alive) setGlbDisponible(r.ok)
      })
      .catch(() => {
        if (alive) setGlbDisponible(false)
      })
    return () => {
      alive = false
    }
  }, [glbUrl])

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
          {glbDisponible && glbUrl ? (
            <>
              {LIGHTS}
              <group position={[0, -0.05, 0]}>
                <GlbModel url={glbUrl} colorHex={colorHex} onReady={() => setReady(true)} />
              </group>
            </>
          ) : glbDisponible === false ? (
            <GarmentModel
              photoUrl={imageUrl}
              depthUrl={depthUrl ?? null}
              backImageUrl={backImageUrl ?? null}
              onReady={() => setReady(true)}
            />
          ) : null}
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
