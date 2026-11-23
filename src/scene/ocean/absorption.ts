export const absorptionRates = [.42,.13,.075] as const;
export const shelfFade = [8.5,11.9] as const;

// The inputs and result use linear RGB, as in the refraction shader.
export function absorbedColor(refracted: readonly number[], deep: readonly number[], depth: number) {
  const t=Math.max(0,Math.min(1,(depth-shelfFade[0])/(shelfFade[1]-shelfFade[0])));
  const visible=1-t*t*(3-2*t);
  return absorptionRates.map((rate,i)=>deep[i]!+(refracted[i]!-deep[i]!)*visible*Math.exp(-depth*rate));
}
