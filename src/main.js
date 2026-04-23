import './style.css'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

/* ── SCROLL REVEAL ── */
const revealObserver = new IntersectionObserver(
  (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') }),
  { threshold: 0.1 }
)
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el))

/* ── NAV SCROLL ── */
const nav = document.getElementById('nav')
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 20)
}, { passive: true })

/* ── HAMBURGER ── */
const hamburger = document.getElementById('hamburger')
const mobileMenu = document.getElementById('mobile-menu')
hamburger?.addEventListener('click', () => {
  hamburger.classList.toggle('open')
  mobileMenu.classList.toggle('open')
})
mobileMenu?.querySelectorAll('.mobile-link').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('open')
    mobileMenu.classList.remove('open')
  })
})

/* ── FAQ ── */
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item')
    const isOpen = item.classList.contains('open')
    document.querySelectorAll('.faq-item.open').forEach(el => el.classList.remove('open'))
    if (!isOpen) item.classList.add('open')
  })
})

const faqSearch = document.getElementById('faq-search')
faqSearch?.addEventListener('input', () => {
  const q = faqSearch.value.toLowerCase().trim()
  document.querySelectorAll('.faq-item').forEach(item => {
    const text = (item.textContent + ' ' + (item.dataset.keywords || '')).toLowerCase()
    item.classList.toggle('hidden', q.length > 0 && !text.includes(q))
  })
})

/* ── CONTACT FORM ── */
const form = document.getElementById('contact-form')
const successEl = document.getElementById('form-success')
form?.addEventListener('submit', async (e) => {
  e.preventDefault()
  try {
    const res = await fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' }
    })
    if (res.ok) {
      form.reset()
      successEl.classList.add('visible')
      setTimeout(() => successEl.classList.remove('visible'), 5000)
    }
  } catch {}
})

/* ══════════════════════════════════════
   PHONE MODEL LOADER, reusable
══════════════════════════════════════ */
const loader = new GLTFLoader()

function loadPhone(canvasId, stageId, modelPath, rotationY = -0.12, videoSrc = null, exposure = 1.5, options = {}) {
  const canvas = document.getElementById(canvasId)
  const stage  = document.getElementById(stageId)
  if (!canvas || !stage) return
  const { draggable = false, scaleMultiplier = 1 } = options

  const W = stage.clientWidth  || 280
  const H = stage.clientHeight || 560

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(W, H)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = exposure

  const scene  = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(36, W / H, 0.01, 100)
  camera.position.set(0, 0, 5.5)

  scene.add(new THREE.AmbientLight(0xffffff, 0.7))
  const key = new THREE.DirectionalLight(0xffffff, 4)
  key.position.set(3, 5, 6)
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xccddff, 1.5)
  fill.position.set(-4, -1, 4)
  scene.add(fill)
  const rim = new THREE.DirectionalLight(0xffffff, 2.5)
  rim.position.set(-1, 6, -5)
  scene.add(rim)
  const accent = new THREE.PointLight(0xFF5A1A, 2, 10)
  accent.position.set(0, -5, 1)
  scene.add(accent)

  /* ── Video texture setup (created before model loads so it's ready) ── */
  let videoTexture = null
  let videoEl = null
  if (videoSrc) {
    videoEl = document.createElement('video')
    videoEl.src = videoSrc
    videoEl.loop = true
    videoEl.muted = true
    videoEl.playsInline = true
    videoEl.autoplay = true
    videoEl.preload = 'auto'

    videoTexture = new THREE.VideoTexture(videoEl)
    videoTexture.colorSpace = THREE.SRGBColorSpace
    videoTexture.minFilter = THREE.LinearFilter
    videoTexture.magFilter = THREE.LinearFilter
    videoTexture.generateMipmaps = false
    /* GLTF UVs are already flipped by the loader, don't double-flip */
    videoTexture.flipY = false
  }

  loader.load(modelPath, (gltf) => {
    const model = gltf.scene
    const box    = new THREE.Box3().setFromObject(model)
    const center = box.getCenter(new THREE.Vector3())
    const size   = box.getSize(new THREE.Vector3())

    const frustumH = 2 * Math.tan(THREE.MathUtils.degToRad(18)) * 5.5
    const scale    = ((frustumH * 0.72) / size.y) * scaleMultiplier
    model.scale.setScalar(scale)
    model.position.sub(center.multiplyScalar(scale))
    model.rotation.y = rotationY

    /* ── Apply video to every emissive-white mesh (the phone screen) ── */
    if (videoTexture) {
      let assignedVideoToScreen = false
      model.traverse(child => {
        if (!child.isMesh) return
        const mats = Array.isArray(child.material) ? child.material : [child.material]
        mats.forEach(mat => {
          if (!mat) return
          const matName = (mat.name || '').toLowerCase()
          const meshName = (child.name || '').toLowerCase()
          const hasBrightEmissive =
            mat.emissive &&
            mat.emissive.r > 0.9 &&
            mat.emissive.g > 0.9 &&
            mat.emissive.b > 0.9
          const nameLooksLikeScreen =
            matName.includes('screen') ||
            matName.includes('display') ||
            meshName.includes('screen') ||
            meshName.includes('display')

          /* Screen detection: emissive-white OR explicit screen/display names */
          if (hasBrightEmissive || nameLooksLikeScreen) {
            const boostedMat = new THREE.MeshBasicMaterial({
              map: videoTexture,
              color: 0xffffff,
              toneMapped: false
            })
            boostedMat.name = `${mat.name || 'screen'}-video-bright`
            if (Array.isArray(child.material)) {
              const idx = child.material.indexOf(mat)
              if (idx >= 0) child.material[idx] = boostedMat
            } else {
              child.material = boostedMat
            }
            assignedVideoToScreen = true
          }
        })
      })

      /* Fallback for models without emissive-tagged screen materials */
      if (!assignedVideoToScreen) {
        model.traverse(child => {
          if (!child.isMesh || !child.material) return
          const mats = Array.isArray(child.material) ? child.material : [child.material]
          mats.forEach(mat => {
            if (!mat || !mat.map) return
            const fallbackMat = new THREE.MeshBasicMaterial({
              map: videoTexture,
              color: 0xffffff,
              toneMapped: false
            })
            fallbackMat.name = `${mat.name || 'screen'}-video-fallback`
            if (Array.isArray(child.material)) {
              const idx = child.material.indexOf(mat)
              if (idx >= 0) child.material[idx] = fallbackMat
            } else {
              child.material = fallbackMat
            }
          })
        })
      }

      /* Start playback, autoplay policy requires muted for immediate play */
      videoEl.play().catch(() => {
        /* Fallback: play on first user interaction with the page */
        document.addEventListener('pointerdown', () => videoEl.play(), { once: true })
      })
    }

    scene.add(model)

    let dragOffsetY = 0
    let isDragging = false
    let dragStartX = 0
    let dragStartOffset = 0
    const maxDrag = 0.55

    if (draggable) {
      canvas.style.touchAction = 'none'
      canvas.style.cursor = 'grab'

      const onPointerDown = (e) => {
        isDragging = true
        dragStartX = e.clientX
        dragStartOffset = dragOffsetY
        canvas.style.cursor = 'grabbing'
        canvas.setPointerCapture?.(e.pointerId)
      }
      const onPointerMove = (e) => {
        if (!isDragging) return
        const dx = e.clientX - dragStartX
        const delta = (dx / stage.clientWidth) * 2.4
        dragOffsetY = THREE.MathUtils.clamp(dragStartOffset + delta, -maxDrag, maxDrag)
      }
      const onPointerUp = (e) => {
        isDragging = false
        canvas.style.cursor = 'grab'
        canvas.releasePointerCapture?.(e.pointerId)
      }

      canvas.addEventListener('pointerdown', onPointerDown)
      canvas.addEventListener('pointermove', onPointerMove)
      canvas.addEventListener('pointerup', onPointerUp)
      canvas.addEventListener('pointercancel', onPointerUp)
      canvas.addEventListener('pointerleave', onPointerUp)
    }

    let raf
    const tick = () => {
      raf = requestAnimationFrame(tick)
      if (draggable && !isDragging) {
        dragOffsetY += (0 - dragOffsetY) * 0.1
      }
      model.rotation.y = rotationY + dragOffsetY
      renderer.render(scene, camera)
    }
    tick()

    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        if (!raf) tick()
        if (videoEl) videoEl.play().catch(() => {})
      } else {
        cancelAnimationFrame(raf); raf = null
        if (videoEl) videoEl.pause()
      }
    }, { threshold: 0.05 }).observe(canvas)
  })

  window.addEventListener('resize', () => {
    const w = stage.clientWidth
    const h = stage.clientHeight
    if (!w || !h) return
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  }, { passive: true })
}

/* Section 1, hero: welcome screen, phone right */
loadPhone('hero-canvas', 'hero-model-stage', '/models/first_screen-yourbodyrebuilt.glb', -0.12, null, 1.5, { draggable: true, scaleMultiplier: 1.14 })

/* Section 2, dashboard, phone left */
loadPhone('dashboard-canvas', 'dashboard-model-stage', '/models/maindashboardscreen.glb', 0.12, null, 1.5, { draggable: true, scaleMultiplier: 1.14 })

/* Section 3, AI meal scanner, phone right */
loadPhone('scanner-canvas', 'scanner-model-stage', '/models/aimealscannerscreen.glb', -0.12, null, 1.5, { draggable: true, scaleMultiplier: 1.14 })

/* Section 4, AI meal plan, phone left, video plays on the screen */
loadPhone('mealplan-canvas', 'mealplan-model-stage', '/models/AImealplanloadingVIDEO.glb', 0.12, '/videos/mealplan.mp4', 2.1, { scaleMultiplier: 1.14 })

/* Section 5, all-in-one AI suite (GPS, nutrition preferences, physique scan) */
loadPhone('gps-canvas', 'gps-model-stage', '/models/startGPSactivityrunningwalkinghikingbikingscreen.glb', 0)
loadPhone('nutrition-canvas', 'nutrition-model-stage', '/models/nutritionpreferencescreen.glb', 0)
loadPhone('physique-canvas', 'physique-model-stage', '/models/AIphysiquescanphysiquereportresultsscreen.glb', 0)
