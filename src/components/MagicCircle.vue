<template>
  <div class="magic-circle-container" @click="handleClick" title="点击查看系统使用说明">
    <canvas ref="canvasRef" class="magic-canvas"></canvas>
    <div class="magic-glow"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const emit = defineEmits<{
  click: []
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationId: number | null = null
let dprMediaQuery: MediaQueryList | null = null
let onDprChange: (() => void) | null = null

type AnimationType = 'hexagram' | 'flower' | 'clover' | 'snowflake'
const animations: AnimationType[] = ['hexagram', 'flower', 'clover', 'snowflake']
let currentAnimation: AnimationType = 'hexagram'
let resetProgress = false

function handleClick() {
  const others = animations.filter(a => a !== currentAnimation)
  currentAnimation = others[Math.floor(Math.random() * others.length)]
  resetProgress = true
  emit('click')
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const size = 64

  const setupCanvas = () => {
    const ratio = window.devicePixelRatio
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    canvas.width = size * ratio
    canvas.height = size * ratio
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(ratio, ratio)
  }

  setupCanvas()

  onDprChange = () => {
    setupCanvas()
  }
  dprMediaQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
  dprMediaQuery.addEventListener('change', onDprChange)

  let progress = 0
  let rotation = 0

  const drawStar = (cx: number, cy: number, outerR: number, innerR: number, points: number, rot: number, drawP: number, color: string) => {
    const totalPts = points * 2
    const drawn = Math.floor(totalPts * drawP)
    if (drawn === 0) return

    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.lineCap = 'round'

    for (let i = 0; i <= drawn; i++) {
      const angle = (Math.PI / points) * i - Math.PI / 2 + rot
      const r = i % 2 === 0 ? outerR : innerR
      const x = cx + Math.cos(angle) * r
      const y = cy + Math.sin(angle) * r
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  const drawCircle = (cx: number, cy: number, radius: number, drawP: number, color: string, lineW = 1) => {
    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.lineWidth = lineW
    ctx.lineCap = 'round'
    const startA = -Math.PI / 2
    const endA = startA + Math.PI * 2 * drawP
    ctx.arc(cx, cy, radius, startA, endA)
    ctx.stroke()
  }

  const drawPetal = (cx: number, cy: number, r: number, angle: number, drawP: number, color: string) => {
    const petalLen = r * drawP
    if (petalLen <= 0) return

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(angle)
    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.lineCap = 'round'
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(r * 0.5, -r * 0.3, 0, -petalLen)
    ctx.quadraticCurveTo(-r * 0.5, -r * 0.3, 0, 0)
    ctx.stroke()
    ctx.restore()
  }

  const drawFlower = (cx: number, cy: number, r: number, petals: number, rot: number, drawP: number, color: string) => {
    const petalProgress = drawP * petals
    const fullPetals = Math.floor(petalProgress)
    const partialP = petalProgress - fullPetals

    for (let i = 0; i < fullPetals; i++) {
      const angle = (Math.PI * 2 / petals) * i + rot
      drawPetal(cx, cy, r, angle, 1, color)
    }
    if (partialP > 0 && fullPetals < petals) {
      const angle = (Math.PI * 2 / petals) * fullPetals + rot
      drawPetal(cx, cy, r, angle, partialP, color)
    }
  }

  const drawCloverLeaf = (cx: number, cy: number, r: number, angle: number, drawP: number, color: string) => {
    const leafSize = r * drawP
    if (leafSize <= 0) return

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(angle)
    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.lineCap = 'round'
    const leafR = r * 0.55
    const offset = r * 0.4
    ctx.moveTo(0, 0)
    ctx.arc(-leafR, -offset, leafR, 0, Math.PI, true)
    ctx.arc(leafR, -offset, leafR, 0, Math.PI, true)
    ctx.lineTo(0, 0)
    ctx.stroke()
    ctx.restore()
  }

  const drawClover = (cx: number, cy: number, r: number, rot: number, drawP: number, color: string) => {
    const leaves = 4
    const leafProgress = drawP * leaves
    const fullLeaves = Math.floor(leafProgress)
    const partialP = leafProgress - fullLeaves

    for (let i = 0; i < fullLeaves; i++) {
      const angle = (Math.PI * 2 / leaves) * i + Math.PI / 4 + rot
      drawCloverLeaf(cx, cy, r, angle, 1, color)
    }
    if (partialP > 0 && fullLeaves < leaves) {
      const angle = (Math.PI * 2 / leaves) * fullLeaves + Math.PI / 4 + rot
      drawCloverLeaf(cx, cy, r, angle, partialP, color)
    }
  }

  const drawSnowflakeArm = (cx: number, cy: number, len: number, angle: number, drawP: number, color: string) => {
    const armLen = len * drawP
    if (armLen <= 0) return

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(angle)
    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.lineCap = 'round'
    ctx.moveTo(0, 0)
    ctx.lineTo(0, -armLen)
    const branchLen = armLen * 0.35
    if (armLen > len * 0.3) {
      ctx.moveTo(0, -armLen * 0.4)
      ctx.lineTo(-branchLen, -armLen * 0.4 - branchLen * 0.6)
      ctx.moveTo(0, -armLen * 0.4)
      ctx.lineTo(branchLen, -armLen * 0.4 - branchLen * 0.6)
    }
    if (armLen > len * 0.65) {
      ctx.moveTo(0, -armLen * 0.7)
      ctx.lineTo(-branchLen * 0.8, -armLen * 0.7 - branchLen * 0.5)
      ctx.moveTo(0, -armLen * 0.7)
      ctx.lineTo(branchLen * 0.8, -armLen * 0.7 - branchLen * 0.5)
    }
    ctx.stroke()
    ctx.restore()
  }

  const drawSnowflake = (cx: number, cy: number, r: number, rot: number, drawP: number, color: string) => {
    const arms = 6
    const armProgress = drawP * arms
    const fullArms = Math.floor(armProgress)
    const partialP = armProgress - fullArms

    for (let i = 0; i < fullArms; i++) {
      const angle = (Math.PI * 2 / arms) * i + rot
      drawSnowflakeArm(cx, cy, r, angle, 1, color)
    }
    if (partialP > 0 && fullArms < arms) {
      const angle = (Math.PI * 2 / arms) * fullArms + rot
      drawSnowflakeArm(cx, cy, r, angle, partialP, color)
    }
  }

  const drawRunes = (cx: number, cy: number, r: number, count: number, rot: number, drawP: number, color: string) => {
    const runeProgress = drawP * count
    const fullCount = Math.floor(runeProgress)
    const partialP = runeProgress - fullCount

    for (let i = 0; i < fullCount; i++) {
      const angle = (Math.PI * 2 / count) * i + rot
      const x = cx + Math.cos(angle) * r
      const y = cy + Math.sin(angle) * r
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(angle + Math.PI / 2)
      const runeH = 6
      ctx.beginPath()
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.moveTo(0, -runeH / 2)
      ctx.lineTo(0, runeH / 2)
      ctx.moveTo(-2, -runeH / 4)
      ctx.lineTo(2, -runeH / 4)
      ctx.moveTo(-2, runeH / 4)
      ctx.lineTo(2, runeH / 4)
      ctx.stroke()
      ctx.restore()
    }
    if (partialP > 0 && fullCount < count) {
      const angle = (Math.PI * 2 / count) * fullCount + rot
      const x = cx + Math.cos(angle) * r
      const y = cy + Math.sin(angle) * r
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(angle + Math.PI / 2)
      const runeH = 6 * partialP
      ctx.beginPath()
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.moveTo(0, -runeH / 2)
      ctx.lineTo(0, runeH / 2)
      if (partialP > 0.5) {
        ctx.moveTo(-2, -runeH / 4)
        ctx.lineTo(2, -runeH / 4)
      }
      ctx.stroke()
      ctx.restore()
    }
  }

  const animate = () => {
    ctx.clearRect(0, 0, size, size)

    const cx = size / 2
    const cy = size / 2

    if (resetProgress) {
      progress = 0
      resetProgress = false
    }

    progress += 0.01
    if (progress > 1) progress = 1

    if (progress >= 1) {
      rotation += 0.004
    }

    const glow = 0.3 + Math.sin(Date.now() / 1500) * 0.2
    const blue = `rgba(59, 130, 246, ${0.7 + glow * 0.3})`
    const purple = `rgba(168, 85, 247, ${0.5 + glow * 0.2})`
    const lightBlue = `rgba(59, 130, 246, ${0.5 + glow * 0.3})`
    const lightPurple = `rgba(168, 85, 247, ${0.4 + glow * 0.2})`
    const center = `rgba(59, 130, 246, ${0.15 + glow * 0.1})`
    const centerBorder = `rgba(59, 130, 246, ${0.4 + glow * 0.2})`

    switch (currentAnimation) {
      case 'hexagram':
        if (progress < 0.3) {
          drawCircle(cx, cy, 15, progress / 0.3, lightBlue)
        } else {
          drawCircle(cx, cy, 15, 1, lightBlue)
        }
        if (progress < 0.5) {
          drawCircle(cx, cy, 11, Math.max(0, (progress - 0.3) / 0.2), lightPurple)
        } else {
          drawCircle(cx, cy, 11, 1, lightPurple)
        }
        if (progress < 0.7) {
          const sp = Math.max(0, (progress - 0.5) / 0.2)
          drawStar(cx, cy, 12.5, 5.5, 6, rotation, sp, blue)
          drawStar(cx, cy, 12.5, 5.5, 6, rotation + Math.PI / 6, sp, purple)
        } else {
          drawStar(cx, cy, 12.5, 5.5, 6, rotation, 1, blue)
          drawStar(cx, cy, 12.5, 5.5, 6, rotation + Math.PI / 6, 1, purple)
        }
        if (progress >= 0.7) {
          const rp = (progress - 0.7) / 0.3
          drawRunes(cx, cy, 16.5, 6, rotation, rp, 'rgba(59, 130, 246, 0.5)')
        }
        break

      case 'flower':
        if (progress < 0.4) {
          drawCircle(cx, cy, 15, progress / 0.4, lightPurple)
        } else {
          drawCircle(cx, cy, 15, 1, lightPurple)
        }
        if (progress < 0.85) {
          const fp = Math.max(0, (progress - 0.15) / 0.7)
          drawFlower(cx, cy, 12, 8, -Math.PI / 2 + rotation, fp, purple)
          drawFlower(cx, cy, 9, 8, Math.PI / 8 - rotation, fp * 0.8, blue)
        } else {
          drawFlower(cx, cy, 12, 8, -Math.PI / 2 + rotation, 1, purple)
          drawFlower(cx, cy, 9, 8, Math.PI / 8 - rotation, 1, blue)
        }
        break

      case 'clover':
        if (progress < 0.4) {
          drawCircle(cx, cy, 15, progress / 0.4, lightBlue)
        } else {
          drawCircle(cx, cy, 15, 1, lightBlue)
        }
        if (progress < 0.85) {
          const cp = Math.max(0, (progress - 0.2) / 0.65)
          drawClover(cx, cy, 12, rotation, cp, blue)
        } else {
          drawClover(cx, cy, 12, rotation, 1, blue)
        }
        if (progress >= 0.6) {
          const dp = (progress - 0.6) / 0.4
          drawCircle(cx, cy, 4, dp, purple, 1.5)
        }
        break

      case 'snowflake':
        if (progress < 0.4) {
          drawCircle(cx, cy, 15, progress / 0.4, lightBlue)
        } else {
          drawCircle(cx, cy, 15, 1, lightBlue)
        }
        if (progress < 0.85) {
          const sp = Math.max(0, (progress - 0.15) / 0.7)
          drawSnowflake(cx, cy, 13, -Math.PI / 2 + rotation, sp, blue)
        } else {
          drawSnowflake(cx, cy, 13, -Math.PI / 2 + rotation, 1, blue)
        }
        if (progress >= 0.6) {
          const ip = (progress - 0.6) / 0.4
          drawCircle(cx, cy, 3.5, ip, purple, 1.5)
        }
        break
    }

    if (progress >= 1) {
      ctx.beginPath()
      ctx.fillStyle = center
      ctx.arc(cx, cy, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.strokeStyle = centerBorder
      ctx.lineWidth = 1
      ctx.arc(cx, cy, 3, 0, Math.PI * 2)
      ctx.stroke()
    }

    animationId = requestAnimationFrame(animate)
  }

  animate()
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  if (dprMediaQuery && onDprChange) {
    dprMediaQuery.removeEventListener('change', onDprChange)
  }
})
</script>

<style scoped>
.magic-circle-container {
  position: absolute;
  right: -15px;
  top: 50%;
  transform: translateY(-50%);
  width: 64px;
  height: 64px;
  aspect-ratio: 1 / 1;
  cursor: pointer;
  overflow: visible;
}

.magic-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.magic-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 28px;
  height: 28px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%);
  animation: glowPulse 3s ease-in-out infinite;
  pointer-events: none;
}

@keyframes glowPulse {
  0%, 100% {
    opacity: 0.5;
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.2);
  }
}

.magic-circle-container:hover .magic-glow {
  animation-duration: 1.5s;
}

.magic-circle-container:hover {
  filter: brightness(1.1);
}
</style>