<template>
  <div class="magic-circle-container" @click="$emit('click')">
    <canvas ref="canvasRef" class="magic-canvas"></canvas>
    <div class="magic-glow"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

defineEmits<{
  click: []
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationId: number | null = null

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const size = 40
  canvas.width = size
  canvas.height = size

  let progress = 0
  let rotation = 0

  const drawStar = (cx: number, cy: number, outerRadius: number, innerRadius: number, points: number, rotationOffset: number, drawProgress: number, color: string) => {
    const totalPoints = points * 2
    const drawnPoints = Math.floor(totalPoints * drawProgress)
    
    if (drawnPoints === 0) return

    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.lineCap = 'round'

    for (let i = 0; i <= drawnPoints; i++) {
      const angle = (Math.PI / points) * i - Math.PI / 2 + rotationOffset
      const radius = i % 2 === 0 ? outerRadius : innerRadius
      const x = cx + Math.cos(angle) * radius
      const y = cy + Math.sin(angle) * radius

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }

    ctx.stroke()
  }

  const drawCircle = (cx: number, cy: number, radius: number, drawProgress: number, color: string) => {
    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.lineCap = 'round'

    const startAngle = -Math.PI / 2
    const endAngle = startAngle + Math.PI * 2 * drawProgress

    ctx.arc(cx, cy, radius, startAngle, endAngle)
    ctx.stroke()
  }

  const drawRune = (cx: number, cy: number, radius: number, index: number, total: number, rotationOffset: number, drawProgress: number) => {
    const angle = (Math.PI * 2 / total) * index + rotationOffset
    const x = cx + Math.cos(angle) * radius
    const y = cy + Math.sin(angle) * radius

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle + Math.PI / 2)

    const runeHeight = 8 * drawProgress
    ctx.beginPath()
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)'
    ctx.lineWidth = 1.5

    ctx.moveTo(0, -runeHeight / 2)
    ctx.lineTo(0, runeHeight / 2)

    ctx.moveTo(-2, -runeHeight / 4)
    ctx.lineTo(2, -runeHeight / 4)

    ctx.moveTo(-2, runeHeight / 4)
    ctx.lineTo(2, runeHeight / 4)

    ctx.stroke()
    ctx.restore()
  }

  const animate = () => {
    ctx.clearRect(0, 0, size, size)

    const cx = size / 2
    const cy = size / 2

    progress += 0.008
    if (progress > 1) {
      progress = 1
    }

    if (progress >= 1) {
      rotation += 0.005
    }

    const glowIntensity = 0.3 + Math.sin(Date.now() / 1500) * 0.2

    if (progress < 0.3) {
      drawCircle(cx, cy, 22, progress / 0.3, `rgba(59, 130, 246, ${0.5 * (progress / 0.3)})`)
    } else {
      drawCircle(cx, cy, 22, 1, `rgba(59, 130, 246, ${0.5 + glowIntensity * 0.3})`)
    }

    if (progress < 0.5) {
      drawCircle(cx, cy, 16, (progress - 0.3) / 0.2, `rgba(168, 85, 247, ${0.4 * ((progress - 0.3) / 0.2)})`)
    } else {
      drawCircle(cx, cy, 16, 1, `rgba(168, 85, 247, ${0.4 + glowIntensity * 0.2})`)
    }

    if (progress < 0.7) {
      const starProgress = (progress - 0.5) / 0.2
      drawStar(cx, cy, 18, 8, 6, rotation, starProgress, 'rgba(59, 130, 246, 0.7)')
      drawStar(cx, cy, 18, 8, 6, rotation + Math.PI / 6, starProgress, 'rgba(168, 85, 247, 0.5)')
    } else {
      drawStar(cx, cy, 18, 8, 6, rotation, 1, `rgba(59, 130, 246, ${0.7 + glowIntensity * 0.3})`)
      drawStar(cx, cy, 18, 8, 6, rotation + Math.PI / 6, 1, `rgba(168, 85, 247, ${0.5 + glowIntensity * 0.2})`)
    }

    if (progress >= 0.7) {
      const runeProgress = (progress - 0.7) / 0.3
      for (let i = 0; i < 6; i++) {
        drawRune(cx, cy, 24, i, 6, rotation, runeProgress)
      }
    }

    if (progress >= 1) {
      ctx.beginPath()
      ctx.fillStyle = `rgba(59, 130, 246, ${0.15 + glowIntensity * 0.1})`
      ctx.arc(cx, cy, 5, 0, Math.PI * 2)
      ctx.fill()

      ctx.beginPath()
      ctx.strokeStyle = `rgba(59, 130, 246, ${0.4 + glowIntensity * 0.2})`
      ctx.lineWidth = 1
      ctx.arc(cx, cy, 5, 0, Math.PI * 2)
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
})
</script>

<style scoped>
.magic-circle-container {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  cursor: pointer;
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
  width: 30px;
  height: 30px;
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