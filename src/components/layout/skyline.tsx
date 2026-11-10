import { createRandom, pick } from "@/lib/random";

const WIDTH = 1600;
const HEIGHT = 420;

type Tower = { x: number; width: number; height: number; windows: string; mast: boolean; neon: string };

function row(seed: number, minHeight: number, maxHeight: number): Tower[] {
  const random = createRandom(seed);
  const towers: Tower[] = [];
  let x = -20;
  while (x < WIDTH) {
    const width = 34 + random() * 60;
    towers.push({
      x,
      width,
      height: minHeight + random() * (maxHeight - minHeight),
      windows: pick(random, ["skyline-windows-a", "skyline-windows-b", "skyline-windows-c"]),
      mast: random() < 0.35,
      neon: pick(random, ["stroke-accent", "stroke-hot", "stroke-sun"]),
    });
    x += width + random() * 10 - 4;
  }
  return towers;
}

const far = row(11, 140, 330);
const near = row(29, 60, 210);

/** A few lit windows in a tile; three tiles mixed give an irregular look. */
function WindowPattern({ id, seed }: { id: string; seed: number }) {
  const random = createRandom(seed);
  const lights = Array.from({ length: 7 }, () => ({
    x: Math.floor(random() * 5) * 8 + 3,
    y: Math.floor(random() * 6) * 10 + 4,
    tone: pick(random, ["fill-sun", "fill-sun", "fill-accent", "fill-hot"]),
  }));
  return (
    <pattern id={id} width="40" height="60" patternUnits="userSpaceOnUse">
      {lights.map((light, index) => (
        <rect key={index} x={light.x} y={light.y} width="3" height="4" className={light.tone} />
      ))}
    </pattern>
  );
}

/**
 * Decorative city silhouette fixed behind every page: the same city as the
 * home page, seen from a distance. Pure SVG, generated at build time.
 */
export function Skyline() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 bottom-0 -z-10 h-[46vh] opacity-80 [mask-image:linear-gradient(to_top,black_55%,transparent)]"
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="xMidYMax slice"
        className="h-full w-full"
        focusable="false"
      >
        <defs>
          <WindowPattern id="skyline-windows-a" seed={3} />
          <WindowPattern id="skyline-windows-b" seed={7} />
          <WindowPattern id="skyline-windows-c" seed={13} />
          <linearGradient id="skyline-sun" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: "var(--sun)" }} />
            <stop offset="1" style={{ stopColor: "var(--hot)" }} />
          </linearGradient>
        </defs>

        {/* Rising sun with its retro bands. */}
        <circle cx={WIDTH / 2} cy={HEIGHT} r="170" fill="url(#skyline-sun)" opacity="0.5" />
        {[0, 1, 2, 3].map((band) => (
          <rect key={band} x={WIDTH / 2 - 180} y={HEIGHT - 26 - band * 30} width="360" height={6 + band * 1.5} className="fill-background" />
        ))}

        <g opacity="0.55">
          {far.map((tower, index) => (
            <rect key={index} x={tower.x} y={HEIGHT - tower.height} width={tower.width} height={tower.height} className="fill-border" />
          ))}
        </g>

        {near.map((tower, index) => {
          const top = HEIGHT - tower.height;
          return (
            <g key={index}>
              <rect x={tower.x} y={top} width={tower.width} height={tower.height} className="fill-background stroke-border" />
              <rect x={tower.x} y={top} width={tower.width} height={tower.height} fill={`url(#${tower.windows})`} opacity="0.55" />
              <line x1={tower.x} y1={top} x2={tower.x + tower.width} y2={top} className={tower.neon} strokeWidth="1.5" opacity="0.8" />
              {tower.mast ? (
                <>
                  <line x1={tower.x + tower.width / 2} y1={top} x2={tower.x + tower.width / 2} y2={top - 26} className="stroke-border" strokeWidth="1.5" />
                  <circle cx={tower.x + tower.width / 2} cy={top - 27} r="2" className="fill-hot" />
                </>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
