import { computed } from 'vue'

function getCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export function useChartTheme() {
  function getColors() {
    return {
      blue: getCssVar('--color-chart-blue'),
      green: getCssVar('--color-chart-green'),
      orange: getCssVar('--color-chart-orange'),
      purple: getCssVar('--color-chart-purple'),
      red: getCssVar('--color-chart-red'),
      cyan: getCssVar('--color-chart-cyan'),
      pink: getCssVar('--color-chart-pink'),
      teal: getCssVar('--color-chart-teal'),
      yellow: getCssVar('--color-chart-yellow'),
      sky: getCssVar('--color-chart-sky'),
      lavender: getCssVar('--color-chart-lavender'),
      mauve: getCssVar('--color-chart-mauve'),
      blueBg: getCssVar('--color-chart-blue-bg'),
      greenBg: getCssVar('--color-chart-green-bg'),
      orangeBg: getCssVar('--color-chart-orange-bg'),
      purpleBg: getCssVar('--color-chart-purple-bg'),
      border: getCssVar('--color-border'),
      tooltipBg: getCssVar('--color-chart-tooltip-bg'),
      text: getCssVar('--color-text'),
      textMuted: getCssVar('--color-chart-text-muted'),
      textSubtle: getCssVar('--color-chart-text-subtle')
    }
  }

  function palette(): string[] {
    const c = getColors()
    return [
      c.blue, c.green, c.orange, c.purple, c.red,
      c.cyan, c.pink, c.teal, c.yellow, c.sky,
      c.lavender, c.mauve
    ]
  }

  function makeChartOptions(
    titleText: string,
    yCallback?: (v: number | string) => string
  ) {
    const c = getColors()
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 0 } as const,
      interaction: {
        intersect: false,
        mode: 'index' as const
      },
      plugins: {
        title: {
          display: true,
          text: titleText,
          color: c.textMuted,
          font: { size: 12, weight: 'normal' as const }
        },
        tooltip: {
          backgroundColor: c.tooltipBg,
          titleColor: c.text,
          bodyColor: c.textSubtle,
          borderColor: c.border,
          borderWidth: 1
        }
      },
      scales: {
        x: {
          display: true,
          grid: { color: c.border, drawBorder: false },
          ticks: {
            color: c.textMuted,
            maxTicksLimit: 6,
            font: { size: 10 }
          }
        },
        y: {
          display: true,
          beginAtZero: true,
          grid: { color: c.border, drawBorder: false },
          ticks: {
            color: c.textMuted,
            font: { size: 10 },
            ...(yCallback ? { callback: yCallback } : {})
          }
        }
      }
    }
  }

  function makeBarChartOptions(
    titleText: string,
    yCallback?: (v: number | string) => string
  ) {
    const opts = makeChartOptions(titleText, yCallback)
    return {
      ...opts,
      animation: { duration: 200 } as const,
      indexAxis: 'y' as const,
      plugins: {
        ...opts.plugins,
        legend: { display: false }
      },
      scales: {
        ...opts.scales,
        y: {
          ...opts.scales.y,
          grid: { display: false }
        }
      }
    }
  }

  const typeColors = computed<Record<string, string>>(() => {
    const c = getColors()
    return {
      string: c.blue,
      hash: c.green,
      list: c.orange,
      set: c.purple,
      zset: c.red,
      stream: c.cyan,
      json: c.pink,
      unknown: c.textMuted
    }
  })

  return {
    getColors,
    palette,
    makeChartOptions,
    makeBarChartOptions,
    typeColors
  }
}
