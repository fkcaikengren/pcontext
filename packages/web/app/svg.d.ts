declare module "*.svg?react" {
  import type { ComponentType, SVGProps } from "react";
  const content: ComponentType<SVGProps<SVGElement>>;
  export default content;
}
