const analyticNoise = /* glsl */`
  float oceanHash(vec2 p) {
    vec3 h = fract(p.xyx * .1031);
    h += dot(h, h.yzx + 33.33);
    return fract((h.x+h.y)*h.z);
  }
  float oceanNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f*f*(3.-2.*f);
    return mix(mix(oceanHash(i),oceanHash(i+vec2(1,0)),f.x),
               mix(oceanHash(i+vec2(0,1)),oceanHash(i+1.),f.x),f.y);
  }
`;
const laceGLSL = /* glsl */`
  float lace(vec2 p) {
    return smoothstep(.22,.77,.64*oceanNoise(p*3.6)+.36*oceanNoise(p*8.1));
  }
`;

// The signed distance is positive offshore. Both materials use the same front and retreat time.
export const noiseGLSL = analyticNoise + laceGLSL;
export const waveFrontGLSL = /* glsl */`
  uniform sampler2D waterNoise;
  vec4 noiseSamples(vec2 p) {
    vec2 f=fract(p);
    return texture2D(waterNoise,(floor(p)+f*f*(3.-2.*f)+.5)/256.);
  }
  float oceanNoise(vec2 p) { return noiseSamples(p).r; }
  float wavePhase(vec2 p, float t) {
    return fract(t/7. + oceanNoise(p*.063)*.85);
  }
  float waveFront(float phase) {
    return .5+1.1*cos(6.2831853*phase);
  }
`;
export const shoreGLSL = waveFrontGLSL + laceGLSL + /* glsl */`
  vec2 shoreWash(vec2 p, float distance, float t) {
    float phase = wavePhase(p,t);
    float front = waveFront(phase);
    float halfWidth = .2+.2*oceanNoise(p*.62);
    float edge = 1.-smoothstep(.06,halfWidth,abs(distance-front));
    float breakup = lace(p+vec2(t*.08,0));
    float receded = 1.-acos(clamp((distance-.5)/1.1,-1.,1.))/6.2831853;
    float age = 7.*fract(phase-receded);
    float washed = smoothstep(-1.,-.6,distance);
    float wet = washed * (distance >= front ? 1. : 1.-smoothstep(0.,3.,age));
    float streak = (1.-smoothstep(0.,1.5,age))*smoothstep(.55,.87,breakup)*washed
      * (1.-smoothstep(1.6,1.85,distance));
    return vec2(edge*(.22+.78*breakup)+.38*streak,wet);
  }
`;
