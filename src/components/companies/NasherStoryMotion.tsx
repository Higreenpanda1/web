'use client'

import { useEffect, useRef } from 'react'

import type { ReactNode } from 'react'

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const seg = (p: number, a: number, b: number) => ease(clamp((p - a) / (b - a)))
const SVG = 'http://www.w3.org/2000/svg'

/** When each pinned scene enters, opens and settles, as a share of its scroll. */
const PLAN = {
  sea: { enter: [0.3, 0.42], drive: false, ex: [0.44, 0.8], gap: 0.045, rest: [0.84, 0.92] },
  land: { enter: [0.02, 0.2], drive: true, ex: [0.24, 0.52], gap: 0.035, rest: [0.56, 0.63] },
} as const

/**
 * Drives the Nasher story that NasherStory renders: the winding thread, the
 * dim-until-centred focus, the yacht and car opening into their parts, the
 * 3D engine (three.js, loaded only when the car scene comes near), the map
 * and the benefit cards. Reduced motion shows every scene at rest, opened.
 */
export function NasherStoryMotion({
  children,
  order,
  hubCaption,
}: {
  children: ReactNode
  order: [string, string, string][]
  hubCaption: [string, string]
}) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const header = document.querySelector('header')
    const headerH = () => header?.offsetHeight ?? 0
    const stageH = () => innerHeight - headerH()
    const progress = (el: HTMLElement) => {
      const r = el.getBoundingClientRect()
      return clamp((headerH() - r.top) / (el.offsetHeight - stageH()))
    }
    const hooks: (() => void)[] = []
    const timers: number[] = []
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms))

    // ---- the yacht's sea photo ----
    const sea = root.querySelector<HTMLElement>('#sea')!
    const seaPhoto = sea.querySelector<HTMLElement>('.photo')!
    const seaVeil = sea.querySelector<HTMLElement>('.veil')!
    const seaCopy = sea.querySelector<HTMLElement>('.copy')!
    const seaSay = sea.querySelector<HTMLElement>('.say')!
    const hint = sea.querySelector<HTMLElement>('[data-hint]')!
    hooks.push(() => {
      const p = still ? 1 : progress(sea)
      seaPhoto.style.transform = `scale(${(1.02 + 0.12 * seg(p, 0, 1)).toFixed(3)})`
      seaVeil.style.opacity = (0.97 * seg(p, 0.24, 0.4)).toFixed(3)
      seaCopy.style.opacity = (1 - seg(p, 0.25, 0.4)).toFixed(3)
      hint.style.opacity = (1 - seg(p, 0, 0.08)).toFixed(3)
      seaSay.style.opacity = seg(p, 0.86, 0.95).toFixed(3)
      seaSay.style.setProperty('--hl', `${(seg(p, 0.9, 0.99) * 100).toFixed(0)}%`)
    })

    // ---- focus: dim until the element's centre nears the screen's centre ----
    const fx = Array.from(root.querySelectorAll<HTMLElement>('.fx'))
    hooks.push(() => {
      const mid = innerHeight / 2,
        band = innerHeight * 0.12,
        range = innerHeight * 0.3
      for (const el of fx) {
        const r = el.getBoundingClientRect()
        if (r.bottom < -200 || r.top > innerHeight + 200) continue
        const c = r.top + Math.min(r.height, innerHeight * 0.8) / 2
        const f = still ? 1 : 1 - clamp((Math.abs(c - mid) - band) / range)
        el.style.setProperty('--f', ease(f).toFixed(3))
      }
    })

    // ---- the yacht and the car open into their parts ----
    const land = root.querySelector<HTMLElement>('#land')!
    const landCopy = land.querySelector<HTMLElement>('.copy')!
    const boxes = Array.from(root.querySelectorAll<HTMLElement>('[data-ex]')).map((box) => ({
      sec: box.closest<HTMLElement>('.scene')!,
      pl: PLAN[box.dataset.ex as keyof typeof PLAN],
      body: box.querySelector<HTMLElement>('.body')!,
      parts: Array.from(box.querySelectorAll<HTMLElement>('.part')).map((el) => ({
        el,
        d: el.dataset.d!.split(',').map(Number) as [number, number, number],
        m: el.dataset.m!.split(',').map(Number) as [number, number, number],
      })),
    }))
    hooks.push(() => {
      const W = innerWidth,
        H = stageH(),
        narrow = W < 700
      for (const b of boxes) {
        const pl = b.pl
        const p = still ? pl.ex[1] + 0.01 : progress(b.sec)
        const e = seg(p, pl.enter[0], pl.enter[1]),
          rest = seg(p, pl.rest[0], pl.rest[1]),
          ex = seg(p, pl.ex[0], pl.ex[1])
        // the car faces left, so it drives in from the right
        const x = pl.drive ? (1 - e) * W * 0.9 : 0,
          y = pl.drive ? 0 : (1 - e) * H * 0.08
        b.body.style.opacity = (e * (1 - 0.62 * ex) * (1 - rest)).toFixed(3)
        b.body.style.transform = `translate(-50%,-50%) translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${(0.92 + 0.08 * e - 0.1 * ex).toFixed(3)})`
        const span = pl.ex[1] - pl.ex[0] - pl.gap * (b.parts.length - 1)
        b.parts.forEach((pt, i) => {
          const a = pl.ex[0] + i * pl.gap,
            t = seg(p, a, a + span),
            v = narrow ? pt.m : pt.d
          const tx = v[0] * W * 0.5 * t,
            ty = v[1] * H * 0.5 * t,
            rot = (1 - t) * v[2]
          pt.el.style.opacity = (clamp(t * 3) * (1 - rest)).toFixed(3)
          pt.el.style.transform = `translate(-50%,-50%) translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scale(${(0.3 + 0.7 * t).toFixed(3)})`
          pt.el.style.setProperty('--g', (Math.sin(Math.PI * t) * 0.9 + 0.15 * t).toFixed(3))
          pt.el.style.setProperty('--l', (seg(t, 0.85, 1) * (1 - rest)).toFixed(3))
        })
      }
      if (!still) landCopy.style.opacity = (1 - seg(progress(land), 0.16, 0.24)).toFixed(3)
    })

    // ---- the winding thread: a bird-like path down the middle, lighting each stop ----
    const svg = root.querySelector<SVGSVGElement>('.thread')!
    const base = svg.querySelector<SVGPathElement>('.base')!,
      lit = svg.querySelector<SVGPathElement>('.lit')!,
      glw = svg.querySelector<SVGPathElement>('.glow')!,
      tip = svg.querySelector<SVGCircleElement>('.tip')!,
      nodesG = svg.querySelector<SVGGElement>('.nodes')!
    const stops = Array.from(root.querySelectorAll<HTMLElement>('[data-stop]'))
    let stopPts: { y: number; g: SVGGElement }[] = []
    let table: [number, number, number, number][] = []
    let total = 0
    const top = (el: Element) => el.getBoundingClientRect().top - root.getBoundingClientRect().top
    const build = () => {
      const W = root.clientWidth,
        H = root.scrollHeight,
        vh = stageH(),
        narrow = W < 700
      svg.setAttribute('width', String(W))
      svg.setAttribute('height', String(H))
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
      svg.style.height = `${H}px`
      const A = narrow ? W * 0.36 : Math.min(W * 0.3, 420),
        cx = W / 2,
        edge = narrow ? 14 : Math.max(36, (W - 1180) / 2 + 20)
      const pts: [number, number][] = []
      const ys: number[] = []
      let side = 1
      stops.forEach((sec, i) => {
        const t0 = top(sec),
          h = sec.offsetHeight,
          y0 = t0 + (i === 0 ? vh * 0.62 : Math.min(140, vh * 0.18))
        pts.push([cx, y0])
        ys.push(y0)
        const next =
          i < stops.length - 1 ? top(stops[i + 1]!) + Math.min(140, vh * 0.18) : t0 + h - vh * 0.3
        if (sec.hasAttribute('data-scene')) {
          // pinned scene: glide to the edge and run down beside the stage, swaying gently
          const ex = side > 0 ? W - edge : edge
          const span = next - y0,
            n = Math.max(3, Math.round(span / (vh * 0.9)))
          for (let k = 1; k < n; k++) {
            const sway = Math.sin(k * 1.7) * (narrow ? 6 : 22)
            pts.push([
              k === 1 ? (cx + ex) / 2 : ex + sway * (side > 0 ? -1 : 1),
              y0 + (span * k) / n,
            ])
          }
          side = -side
        } else {
          const items = sec.querySelectorAll('.alt-list>li')
          if (items.length) {
            items.forEach((li, k) => {
              const r = li.getBoundingClientRect()
              const y = top(li) + r.height / 2
              // pass on the free side of each card (cards alternate sides)
              pts.push([
                narrow ? (k % 2 ? W * 0.12 : W * 0.88) : k % 2 ? cx + A * 0.95 : cx - A * 0.95,
                y,
              ])
            })
          } else {
            const span = next - y0,
              m = Math.max(2, Math.round(span / (vh * 0.7)))
            for (let j = 1; j < m; j++)
              pts.push([cx + side * A * (j % 2 ? 1 : -0.6), y0 + (span * j) / m])
            side = -side
          }
        }
      })
      pts.push([cx, H - 60])
      // Catmull-Rom through the points, as cubic Béziers
      let d = `M${pts[0]![0].toFixed(1)},${pts[0]![1].toFixed(1)}`
      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i]!,
          p0 = pts[i - 1] ?? p1,
          p2 = pts[i + 1]!,
          p3 = pts[i + 2] ?? p2
        d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
      }
      base.setAttribute('d', d)
      lit.setAttribute('d', d)
      glw.setAttribute('d', d)
      total = lit.getTotalLength()
      lit.style.strokeDasharray = glw.style.strokeDasharray = String(total)
      table = []
      let my = -1
      for (let L = 0; L <= total; L += 6) {
        const q = lit.getPointAtLength(L)
        my = Math.max(my, q.y)
        table.push([L, my, q.x, q.y])
      }
      nodesG.replaceChildren()
      stopPts = ys.map((y) => {
        const g = document.createElementNS(SVG, 'g')
        for (const cls of ['node', 'halo']) {
          const c = document.createElementNS(SVG, 'circle')
          c.setAttribute('class', cls)
          c.setAttribute('cx', String(cx))
          c.setAttribute('cy', String(y))
          c.setAttribute('r', '4')
          g.appendChild(c)
        }
        nodesG.appendChild(g)
        return { y, g }
      })
    }
    hooks.push(() => {
      if (!table.length) return
      const target = -root.getBoundingClientRect().top + innerHeight * 0.55
      let lo = 0,
        hi = table.length - 1
      while (lo < hi) {
        const m = (lo + hi + 1) >> 1
        if (table[m]![1] <= target) lo = m
        else hi = m - 1
      }
      const row = table[lo]!
      lit.style.strokeDashoffset = glw.style.strokeDashoffset = (total - row[0]).toFixed(1)
      tip.setAttribute('cx', String(row[2]))
      tip.setAttribute('cy', String(row[3]))
      for (const s of stopPts) {
        const on = target >= s.y - 2
        s.g.firstElementChild!.classList.toggle('on', on)
        s.g.lastElementChild!.classList.toggle('on', on && target < s.y + innerHeight * 1.2)
      }
    })

    // ---- benefits: a calm light passes from card to card, then they rest until the pointer finds them ----
    const ben = root.querySelector<HTMLElement>('[data-benefits]')!
    let benDone = false
    hooks.push(() => {
      if (benDone) return
      const r = ben.getBoundingClientRect()
      if (r.top + r.height / 2 >= innerHeight * 0.62) return
      benDone = true
      const items = Array.from(ben.children)
      items.forEach((li, i) => {
        later(() => li.classList.add('on'), still ? 0 : i * 700)
        if (!still)
          later(() => li.classList.remove('on'), i * 700 + (i === items.length - 1 ? 2200 : 1500))
      })
    })

    // ---- map: the line reaches each country in turn, then it lights and shows its name ----
    const map = root.querySelector<HTMLElement>('[data-map]')!
    const msvg = map.querySelector('svg')!
    const cap = map.querySelector<HTMLElement>('[data-cap]')!,
      capr = map.querySelector<HTMLElement>('[data-capr]')!
    const hub = msvg.querySelector<SVGGElement>('[data-hub]')!
    const hx = +hub.dataset.x!,
      hy = +hub.dataset.y!
    const arcs = msvg.querySelector('[data-arcs]')!
    const arcOf = new Map<string, SVGPathElement>()
    for (const [id] of order) {
      const pin = msvg.querySelector<SVGGElement>(`[data-pin="${id}"]`)!
      const x = +pin.dataset.x!,
        y = +pin.dataset.y!
      const mx = (hx + x) / 2,
        my = Math.min(hy, y) - Math.abs(x - hx) * 0.2 - 10
      const d = `M${hx},${hy} Q${mx.toFixed(1)},${my.toFixed(1)} ${x},${y}`
      const mk = (cls: string) => {
        const a = document.createElementNS(SVG, 'path')
        a.setAttribute('class', cls)
        a.setAttribute('d', d)
        arcs.appendChild(a)
        return a
      }
      const a = mk('m-arc')
      const L = a.getTotalLength()
      a.style.strokeDasharray = String(L)
      a.style.strokeDashoffset = still ? '0' : String(L)
      arcOf.set(id, a)
      mk('m-flow')
      mk('m-flow back')
    }
    const lightCountry = ([id, name, region]: [string, string, string]) => {
      arcOf.get(id)!.style.strokeDashoffset = '0'
      later(
        () => {
          msvg.querySelector(`[data-c="${id}"]`)?.classList.add('on')
          msvg.querySelector(`[data-pin="${id}"]`)?.classList.add('on')
          msvg.querySelector(`[data-lbl="${id}"]`)?.classList.add('on')
          cap.textContent = name
          capr.textContent = region
        },
        still ? 0 : 800,
      )
    }
    let mapDone = false
    hooks.push(() => {
      if (mapDone) return
      const r = map.getBoundingClientRect()
      if (r.top + r.height / 2 >= innerHeight * 0.62) return
      mapDone = true
      order.forEach((o, i) =>
        later(
          () => {
            lightCountry(o)
            if (i === order.length - 1)
              later(() => {
                map.classList.add('all')
                cap.textContent = hubCaption[0]
                capr.textContent = hubCaption[1]
              }, 1800)
          },
          still ? 0 : i * 950,
        ),
      )
    })

    // ---- the engine: a real engine model that turns, then opens into its parts ----
    const canvas = root.querySelector<HTMLCanvasElement>('#ns-engine')!
    const engineSay = land.querySelector<HTMLElement>('[data-engine-say]')!
    let engineFrame: (() => void) | null = null
    let disposeEngine: (() => void) | null = null
    const startEngine = async () => {
      const THREE = await import('three')
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
      const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js')
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
      renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1))
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.outputColorSpace = THREE.SRGBColorSpace
      const scene = new THREE.Scene()
      scene.environment = new THREE.PMREMGenerator(renderer).fromScene(
        new RoomEnvironment(renderer),
        0.04,
      ).texture
      const camera = new THREE.PerspectiveCamera(28, 1, 1, 20000)
      const key = new THREE.DirectionalLight(0xffffff, 1.8)
      scene.add(key)
      const rim = new THREE.PointLight(0x74c07e, 0, 0, 0)
      scene.add(rim)
      const rig = new THREE.Group()
      scene.add(rig)
      const GREEN = new THREE.Color(0x4fa75b)
      type EP = {
        o: THREE.Mesh
        mat: THREE.MeshPhysicalMaterial
        local0: THREE.Vector3
        local1: THREE.Vector3
        k: number
      }
      const parts: EP[] = []
      let radius = 1
      const resize = () => {
        const w = canvas.clientWidth,
          h = canvas.clientHeight
        if (!w) return
        renderer.setSize(w, h, false)
        camera.aspect = w / h
        camera.updateProjectionMatrix()
      }
      const gltf = await new GLTFLoader().loadAsync('/brand/nasher-story/engine.glb')
      const m = gltf.scene
      rig.add(m)
      m.updateMatrixWorld(true)
      const box = new THREE.Box3().setFromObject(m)
      radius = box.getSize(new THREE.Vector3()).length() / 2
      m.position.sub(box.getCenter(new THREE.Vector3()))
      m.updateMatrixWorld(true)
      const steel = new THREE.MeshPhysicalMaterial({
        color: 0xc7cbd0,
        metalness: 0.92,
        roughness: 0.3,
        clearcoat: 0.25,
      })
      const dark = new THREE.MeshPhysicalMaterial({
        color: 0x2f3236,
        metalness: 0.85,
        roughness: 0.38,
      })
      let seed = 1
      const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
      m.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return
        const light =
          (o.material as THREE.MeshStandardMaterial).color.getHSL({ h: 0, s: 0, l: 0 }).l > 0.45
        const mat = (light ? steel : dark).clone()
        o.material = mat
        const dir = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3())
        if (dir.length() < radius * 0.05) dir.set(0, 1, 0)
        const w0 = o.getWorldPosition(new THREE.Vector3())
        parts.push({
          o,
          mat,
          local0: o.position.clone(),
          local1: o.parent!.worldToLocal(w0.add(dir.multiplyScalar(0.85))),
          k: rand() * 0.25,
        })
      })
      resize()
      addEventListener('resize', resize)
      engineFrame = () => {
        const p = still ? 0.92 : progress(land)
        const show = seg(p, 0.62, 0.7)
        canvas.style.opacity = show.toFixed(3)
        if (show <= 0) return
        const ex = seg(p, 0.72, 0.92)
        rig.rotation.set(0.35, -0.9 + p * 1.6, 0)
        // keep the whole engine, and later all its parts, inside the frame at any screen shape
        const r = radius * (1 + ex * 0.95),
          vf = THREE.MathUtils.degToRad(camera.fov / 2),
          hf = Math.atan(Math.tan(vf) * camera.aspect)
        const dist = (r / Math.sin(Math.min(vf, hf))) * (camera.aspect < 1 ? 1.18 : 0.95)
        camera.position.set(0, r * 0.12, dist)
        camera.lookAt(0, -r * 0.08, 0)
        key.position.set(dist * 0.4, dist * 0.6, dist * 0.5)
        rim.position.set(-dist * 0.5, dist * 0.2, -dist * 0.4)
        rim.intensity = 60 * show
        for (const g of parts) {
          const t = seg(ex, g.k, g.k + 0.75)
          g.o.position.lerpVectors(g.local0, g.local1, t)
          g.mat.emissive.copy(GREEN)
          g.mat.emissiveIntensity = t <= 0 ? 0 : 0.28 * Math.sin(t * Math.PI) + 0.04 * t
        }
        renderer.render(scene, camera)
      }
      disposeEngine = () => {
        removeEventListener('resize', resize)
        renderer.dispose()
      }
      engineFrame()
    }
    let engineStarted = false
    hooks.push(() => {
      const p = still ? 1 : progress(land)
      engineSay.style.opacity = seg(p, 0.9, 0.97).toFixed(3)
      engineSay.style.setProperty('--hl', `${(seg(p, 0.93, 1) * 100).toFixed(0)}%`)
      if (!engineStarted && land.getBoundingClientRect().top < innerHeight * 3) {
        engineStarted = true
        startEngine().catch((e) => console.error(e))
      }
      engineFrame?.()
    })

    // ---- one frame per scroll ----
    let ticking = false
    const frame = () => {
      ticking = false
      for (const h of hooks) h()
    }
    const onScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(frame)
      }
    }
    let rt = 0
    const onResize = () => {
      clearTimeout(rt)
      rt = window.setTimeout(() => {
        build()
        frame()
      }, 150)
    }
    addEventListener('scroll', onScroll, { passive: true })
    addEventListener('resize', onResize)
    build()
    frame()
    // images and fonts change the page's height; rebuild the thread once they settle
    const onLoad = () => {
      build()
      frame()
    }
    addEventListener('load', onLoad)
    const ro = new ResizeObserver(() => onResize())
    ro.observe(root)
    return () => {
      removeEventListener('scroll', onScroll)
      removeEventListener('resize', onResize)
      removeEventListener('load', onLoad)
      ro.disconnect()
      timers.forEach(clearTimeout)
      clearTimeout(rt)
      disposeEngine?.()
    }
  }, [order, hubCaption])

  return (
    <div ref={rootRef} className="ns">
      {children}
    </div>
  )
}
