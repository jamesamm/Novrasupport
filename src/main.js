import './style.css'

// ─── CAROUSEL ─────────────────────────────────────────────────────────────────
const TOTAL = 7
const TRANS = 'transform 0.72s cubic-bezier(0.4,0,0.2,1), opacity 0.72s ease, filter 0.72s ease'

function getPOS() {
  const mobile = window.innerWidth <= 640
  return {
    center:  { x:   0,                 s: 1.15,              o: 1,              b: 0,              z: 3 },
    left:    { x: mobile ? -260 : -180, s: mobile ? 0.75 : 0.82, o: mobile ? 0 : 0.45, b: mobile ? 0 : 1.5, z: 2 },
    right:   { x: mobile ?  260 :  180, s: mobile ? 0.75 : 0.82, o: mobile ? 0 : 0.45, b: mobile ? 0 : 1.5, z: 2 },
    hidden:  { x: mobile ?  360 :  420, s: 0.65,             o: 0,              b: 0,              z: 1 },
    farLeft: { x: mobile ? -360 : -420, s: 0.65,             o: 0,              b: 0,              z: 1 },
    farRight:{ x: mobile ?  360 :  420, s: 0.65,             o: 0,              b: 0,              z: 1 },
  }
}

const cItems = Array.from({ length: TOTAL }, (_, i) => document.getElementById(`ci${i}`))
const cDots  = document.querySelectorAll('.carousel-dot')
let cOrder   = [0, 1, 5, 6, 2, 3, 4]

function styleItem(el, pos, animate) {
  const p = getPOS()[pos]
  el.style.transition = animate ? TRANS : 'none'
  el.style.transform  = `translateX(${p.x}px) scale(${p.s})`
  el.style.opacity    = p.o
  el.style.filter     = `blur(${p.b}px)`
  el.style.zIndex     = p.z
}

function syncDots() {
  cDots.forEach((d, i) => d.classList.toggle('active', i === cOrder[1]))
}

function initCarousel() {
  styleItem(cItems[cOrder[0]], 'left',   false)
  styleItem(cItems[cOrder[1]], 'center', false)
  styleItem(cItems[cOrder[2]], 'right',  false)
  for (let i = 3; i < TOTAL; i++) styleItem(cItems[cOrder[i]], 'hidden', false)
  syncDots()
}

function carouselNext() {
  const outLeft = cOrder[0]
  styleItem(cItems[outLeft], 'farLeft', false)
  requestAnimationFrame(() => requestAnimationFrame(() => {
    cOrder = [...cOrder.slice(1), cOrder[0]]
    styleItem(cItems[cOrder[0]], 'left',   true)
    styleItem(cItems[cOrder[1]], 'center', true)
    styleItem(cItems[cOrder[2]], 'right',  true)
    for (let i = 3; i < TOTAL; i++) styleItem(cItems[cOrder[i]], 'hidden', false)
    syncDots()
  }))
}

function carouselPrev() {
  const incoming = cOrder[TOTAL - 1]
  styleItem(cItems[incoming], 'farLeft', false)
  cOrder = [cOrder[TOTAL - 1], ...cOrder.slice(0, TOTAL - 1)]
  requestAnimationFrame(() => requestAnimationFrame(() => {
    styleItem(cItems[cOrder[0]], 'left',   true)
    styleItem(cItems[cOrder[1]], 'center', true)
    styleItem(cItems[cOrder[2]], 'right',  true)
    styleItem(cItems[cOrder[3]], 'hidden', true)
    for (let i = 4; i < TOTAL; i++) styleItem(cItems[cOrder[i]], 'hidden', false)
    syncDots()
  }))
}

window.carouselGoto = function(targetIdx) {
  let steps = 0
  while (cOrder[1] !== targetIdx && steps < TOTAL) {
    carouselNext()
    steps++
  }
  resetAuto()
}

// Auto-advance
let autoTimer = setInterval(carouselNext, 3000)
function resetAuto() {
  clearInterval(autoTimer)
  autoTimer = setInterval(carouselNext, 3000)
}

// Touch / swipe
const stage = document.getElementById('carouselStage')
let touchStartX = 0
let touchStartY = 0

stage.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
}, { passive: true })

stage.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX
  const dy = e.changedTouches[0].clientY - touchStartY
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
    dx < 0 ? carouselNext() : carouselPrev()
    resetAuto()
  }
}, { passive: true })

// Re-init positions on resize (e.g. orientation change)
window.addEventListener('resize', () => initCarousel(), { passive: true })

initCarousel()

// ─── MOBILE NAV ───────────────────────────────────────────────────────────────
const hamburger  = document.getElementById('navHamburger')
const mobileMenu = document.getElementById('mobileMenu')

hamburger.addEventListener('click', () => {
  const isOpen = mobileMenu.classList.toggle('open')
  hamburger.classList.toggle('open', isOpen)
  document.body.style.overflow = isOpen ? 'hidden' : ''
})

window.closeMobileNav = function() {
  mobileMenu.classList.remove('open')
  hamburger.classList.remove('open')
  document.body.style.overflow = ''
}

// Close mobile nav on any link click
mobileMenu.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => window.closeMobileNav())
})

// ─── FAQ ──────────────────────────────────────────────────────────────────────
window.toggleFaq = function(el) {
  const item   = el.parentElement
  const isOpen = item.classList.contains('open')
  document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'))
  if (!isOpen) item.classList.add('open')
}

// ─── SEARCH ───────────────────────────────────────────────────────────────────
window.handleSearch = function() {
  const q = document.getElementById('searchInput').value.toLowerCase().trim()
  document.querySelectorAll('.faq-item').forEach(item => {
    const keywords = (item.dataset.keywords || '').toLowerCase()
    const text     = item.innerText.toLowerCase()
    const match    = !q || keywords.includes(q) || text.includes(q)
    item.style.display = match ? '' : 'none'
  })

  // Auto-scroll to FAQ if user types
  if (q) {
    document.getElementById('faq').scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// ─── CONTACT FORM ─────────────────────────────────────────────────────────────
window.handleSubmit = function(event) {
  event.preventDefault()
  const form   = event.target
  const btn    = form.querySelector('.btn-submit')
  const data   = new FormData(form)

  btn.disabled    = true
  btn.textContent = 'Sending…'

  fetch('https://formspree.io/f/mlgpgaqo', {
    method:  'POST',
    body:    data,
    headers: { 'Accept': 'application/json' },
  })
    .then(res => {
      if (res.ok) {
        const msg = document.getElementById('successMsg')
        msg.style.display = 'flex'
        form.reset()
        msg.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      } else {
        btn.textContent = 'Try again →'
        btn.disabled    = false
      }
    })
    .catch(() => {
      btn.textContent = 'Try again →'
      btn.disabled    = false
    })
}
