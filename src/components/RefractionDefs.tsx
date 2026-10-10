/**
 * Definicion del filtro SVG opcional de refraccion.
 * Se aplica solo a superficies destacadas (.lg-refract). Es estatico para
 * no consumir recursos graficos de forma continua.
 */
export function RefractionDefs() {
  return (
    <svg className="fm-svg-defs" aria-hidden="true" focusable="false" width="0" height="0">
      <defs>
        <filter
          id="fm-liquid-refraction"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.006 0.009"
            numOctaves="2"
            seed="7"
            result="fm-noise"
          />
          <feGaussianBlur in="fm-noise" stdDeviation="1.1" result="fm-soft-noise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="fm-soft-noise"
            scale="9"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  )
}
