/**
 * Shader designs for cards-shader-effect.
 *
 * The original 21st.dev file for this path is behind a login and was not
 * available, so the map is built from the site's own shader: the brand-blue
 * Warp already used behind the contact form (pauses off-screen and under
 * reduced motion). Add more entries to give the card more designs; the card
 * picks `SHADERS_MAP[designIndex % SHADERS_MAP.length]`.
 */
import type { ComponentType } from "react";
import WarpShaderBackground from "@/components/ui/wrap-shader";

export const SHADERS_MAP: ComponentType[] = [WarpShaderBackground];
