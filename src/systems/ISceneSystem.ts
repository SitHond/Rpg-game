export interface ISceneSystem {
  create(): void;
  update?(dt: number): void;
  destroy?(): void;
}
