import { describe, expect, it } from 'vitest';
import { iconsModule } from './icons.mjs';

describe('iconsModule', () => {
  it('wraps every icon so className sizes and colours it, and keeps outlines unfilled', () => {
    const out = iconsModule(['PawPrint', 'Star']);
    expect(out).toContain('PawPrint as PawPrintGlyph');
    expect(out).toContain('export const Star = withUniwind(outlined(StarGlyph), fromClassName);');
    // Without the default every outline icon renders as a black disc.
    expect(out).toContain("fill: fill ?? 'none'");
    // Copied code types icon maps with LucideIcon; it must describe these exports.
    expect(out).toContain('export type LucideIcon = ComponentType<LucideProps>;');
  });

  it('still exports the types when the app uses no icon yet', () => {
    const out = iconsModule([]);
    expect(out).toContain('export type LucideIcon');
    expect(out).not.toContain('withUniwind');
  });
});
