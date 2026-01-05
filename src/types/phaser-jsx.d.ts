/* src/types/phaser-jsx.d.ts */

/**
 * Minimal JSX typings for phaser-jsx tags.
 * This removes TS7026: "no interface JSX.IntrinsicElements exists".
 *
 * If later you want strict typing, we can replace `any` with exact prop types.
 */
declare global {
  namespace JSX {
    interface IntrinsicElements {
      container: any;
      rectangle: any;
      text: any;
      image: any;
      sprite: any;
      nineSlice: any;
      graphics: any;
      bitmapText: any;
    }
  }
}

export {};
