// WP28: the private pixel plant (algorithm from docs/design/v6/Flow.dc.html).
// 14 by 18 cells; one leaf per try made, a flower on every third leaf. The
// newest leaf pops. Colour lives only here (rule 42).

const W = 14;
const H = 18;
const GREENS = ["#2E8B3E", "#47A847", "#1F7A4D"];
const BLOOMS = ["#E8618C", "#F2B630", "#5B8DEF"];

export function Plant({ leaves, grew = -1, cell = 8 }: { leaves: number; grew?: number; cell?: number }) {
  const n = Math.min(leaves, 9);
  const cells: ({ col: string; pop: boolean } | null)[] = Array.from({ length: W * H }, () => null);
  const set = (r: number, c: number, col: string, pop = false) => {
    if (r >= 0 && r < H && c >= 0 && c < W) cells[r * W + c] = { col, pop };
  };
  const ink = "#182513";
  const soil = "#304327";
  const count = Math.min(n, 6);
  const stemH = 2 + 2 * count;
  for (let r = 14 - stemH; r < 14; r++) {
    set(r, 6, n > 0 ? "#2B6B2F" : ink);
    set(r, 7, n > 0 ? "#2B6B2F" : ink);
  }
  for (let i = 0; i < count; i++) {
    const r = 12 - 2 * i;
    const g = GREENS[i % 3];
    const pop = i === grew;
    if (i % 2 === 0) {
      set(r, 5, g, pop);
      set(r, 4, g, pop);
      set(r - 1, 4, g, pop);
      set(r - 1, 3, g, pop);
    } else {
      set(r, 8, g, pop);
      set(r, 9, g, pop);
      set(r - 1, 9, g, pop);
      set(r - 1, 10, g, pop);
    }
    if ((i + 1) % 3 === 0 || n - 6 > i) {
      const b = BLOOMS[i % 3];
      const bp = pop || (grew >= 6 && i === n - 7);
      if (i % 2 === 0) {
        set(r - 2, 3, b, bp);
        set(r - 1, 2, b, bp);
        set(r - 1, 3, "#F2E28C", bp);
      } else {
        set(r - 2, 10, b, bp);
        set(r - 1, 11, b, bp);
        set(r - 1, 10, "#F2E28C", bp);
      }
    }
  }
  if (n >= 3) {
    const top = 14 - stemH;
    set(top - 1, 6, "#E8618C");
    set(top - 1, 7, "#E8618C");
    set(top - 2, 6, "#F2B630");
    set(top - 2, 7, "#F2B630");
  }
  for (let c = 3; c <= 10; c++) set(14, c, ink);
  for (let r = 15; r < 18; r++) for (let c = 4; c <= 9; c++) set(r, c, r === 15 ? soil : ink);
  return (
    <div
      class="plant"
      role="img"
      aria-label={leaves === 0 ? "A bare pot. One try and the plant starts." : `Your plant with ${leaves} ${leaves === 1 ? "leaf" : "leaves"}.`}
      style={{ gridTemplateColumns: `repeat(14, ${cell}px)`, gridAutoRows: `${cell}px` }}
    >
      {cells.map((x, i) => (
        <div key={i} class={x?.pop ? "plant-pop" : undefined} style={x ? { background: x.col } : undefined} />
      ))}
    </div>
  );
}
