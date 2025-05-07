'use client';

import { useEffect, useRef } from 'react';

export default function MysticalOrb() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false // Tells browser output is NOT premultiplied
    });

    const vertexShaderSource = String.raw`
    attribute vec2 a_position;
    varying vec2 v_uv;

    void main() {
        v_uv = (a_position + 1.0) / 2.0; // Convert from -1..1 to 0..1
        gl_Position = vec4(a_position, 0.0, 1.0);
    }
`;

const fragmentShaderSource = String.raw`
   precision highp float;

    uniform vec2 u_resolution;
    uniform float u_time;

    varying vec2 v_uv;

    // Simpler smoothstep helper for falloff (center is 1, edge is 0)
    float smoothFalloff(float dist, float radius_core, float radius_edge) {
        return 1.0 - smoothstep(radius_core, radius_edge, dist);
    }

    void main() {
        vec2 centered_uv = v_uv - 0.5;
        centered_uv.x *= u_resolution.x / u_resolution.y; // Aspect ratio correction

        vec3 bg_color = vec3(1.0); // Light background

        // --- Outer Shell ---
        float shell_radius = 0.4;
        float shell_feather_outer = shell_radius + 0.08;
        float shell_feather_inner = shell_radius - 0.08;
        
        float shell_dist = length(centered_uv);
        float shell_edge_alpha = 1.0 - smoothstep(shell_feather_inner, shell_feather_outer, shell_dist);
        float max_radius = shell_feather_inner + 0.015;
        if (shell_dist > max_radius) {
            gl_FragColor = vec4(0.0);
            return;
        }
        
        vec3 shell_material_color = vec3(0.95, 0.95, 1.0); // Slightly bluish white
        float shell_material_opacity = shell_edge_alpha * (0.2 + 0.2 * smoothFalloff(shell_dist, 0.0, shell_radius));
        
        // --- Marble-like Edge Illumination ---
        // The main light direction (as if coming from top-right)
        vec2 light_dir = normalize(vec2(0.6, 0.8));
        
        // Direction from center to current pixel
        vec2 normal_dir = normalize(centered_uv);
        
        // Calculate how much light hits this part of the surface
        float light_intensity = 0.5 + 0.5 * dot(normal_dir, light_dir);
        
        // Create a refraction-like effect at the edge
        float edge_thickness = 0.03;
        float edge_dist = abs(shell_dist - shell_radius);
        float edge_intensity = smoothstep(edge_thickness, 0.0, edge_dist) * shell_edge_alpha;
        
        // Create a bright highlight on the edge where light hits directly
        float edge_highlight = pow(light_intensity, 5.0) * edge_intensity;
        // Create subtle color variation for the edge (slightly blue tinted)
        vec3 edge_color = mix(vec3(0.7, 0.8, 1.0), vec3(0.9, 0.95, 1.0), light_intensity);
        
        // --- Inner Core (Swirling Animation) ---
        vec3 inner_core_final_color = vec3(0.0);
        float inner_core_final_alpha = 0.0;

        // 1. Global rotation for the S-shape structure
        float s_shape_angle = u_time * 0.25; // Slower overall swirl of the S-shape
        mat2 s_rot_matrix = mat2(cos(s_shape_angle), -sin(s_shape_angle),
                                sin(s_shape_angle), cos(s_shape_angle));

        // 2. Modulation for S-shape "breathing" or "undulation"
        float s_shape_y_undulation = 0.020 * sin(u_time * 0.55);

        // Blob 1 (Blue)
        float b1_path_radius_x_base = 0.16; 
        float b1_path_radius_y_base = 0.11;
        vec2 blob1_local_anim = vec2(
            b1_path_radius_x_base * sin(u_time * 0.75),
            (b1_path_radius_y_base + s_shape_y_undulation) * cos(u_time * 0.75 + 1.57)
        );
        vec2 blob1_base_offset = s_rot_matrix * vec2(-0.07, 0.0);
        vec2 blob1_pos = blob1_base_offset + blob1_local_anim;

        float dist_to_blob1 = length(centered_uv - blob1_pos);
        float blob1_radius_mod = 0.02 * sin(u_time * 0.4 + 0.5); 
        float blob1_intensity = smoothFalloff(dist_to_blob1, 0.0, 0.24 + blob1_radius_mod);
        blob1_intensity = pow(blob1_intensity, 1.6);
        vec3 blob1_color = vec3(0.15, 0.4, 0.9); // Deeper blue

        // Blob 2 (Light Blue)
        float b2_path_radius_x_base = 0.16;
        float b2_path_radius_y_base = 0.11;
        vec2 blob2_local_anim = vec2(
            b2_path_radius_x_base * sin(u_time * 0.75 + 3.14159),
            (b2_path_radius_y_base - s_shape_y_undulation) * cos(u_time * 0.75 + 1.57 + 3.14159)
        );
        vec2 blob2_base_offset = s_rot_matrix * vec2(0.07, 0.0);
        vec2 blob2_pos = blob2_base_offset + blob2_local_anim;

        float dist_to_blob2 = length(centered_uv - blob2_pos);
        float blob2_radius_mod = 0.02 * sin(u_time * 0.4 - 0.8);
        float blob2_intensity = smoothFalloff(dist_to_blob2, 0.0, 0.25 + blob2_radius_mod);
        blob2_intensity = pow(blob2_intensity, 1.6);
        vec3 blob2_color = vec3(0.4, 0.7, 0.95); // Lighter blue

        // Blend blobs
        inner_core_final_alpha = max(blob1_intensity, blob2_intensity);
        if (blob1_intensity + blob2_intensity > 0.001) {
            inner_core_final_color = (blob1_color * blob1_intensity + blob2_color * blob2_intensity) / (blob1_intensity + blob2_intensity);
        } else {
            inner_core_final_color = (blob1_color + blob2_color) * 0.5;
        }
        inner_core_final_color = clamp(inner_core_final_color, 0.0, 1.0);
        inner_core_final_alpha *= shell_edge_alpha;

        // --- Composite Layers ---
        // First, blend the inner core with background
        vec3 color_behind_shell = mix(bg_color, inner_core_final_color, inner_core_final_alpha);
        
        // Add marble-like edge illumination
        color_behind_shell = mix(color_behind_shell, edge_color, edge_intensity * 0.5);
        
        // Add the translucent shell
        vec3 final_color = mix(color_behind_shell, shell_material_color, shell_material_opacity);
        
// Calculate specular intensity (wider and softer highlight)
float raw_specular = dot(reflect(-light_dir, normal_dir), vec2(0.0, -1.0));
raw_specular = max(raw_specular, 0.0);

// Lower exponent = softer spread, multiply to reduce harshness
float specular = pow(raw_specular, 5.0) * 0.15;

// Apply a wide Gaussian-style blur based on distance from center
float blur_falloff = exp(-pow(shell_dist / shell_radius, 2.0) * 1.0); // adjust 6.0 to control blur spread
specular *= blur_falloff;

// Subtle color tint
vec3 specular_color = vec3(0.9, 0.195, 0.01);

// Final blend
final_color += specular_color * specular * shell_edge_alpha;
        
        // Add the edge highlight on top
        final_color += edge_color * edge_highlight * 0.7;
        
        // Add subtle outer glow
        float outer_glow_dist = shell_dist - shell_radius;
        float outer_glow = smoothFalloff(outer_glow_dist, -0.05, 0.15); 
        vec3 outer_glow_color = vec3(0.7, 0.85, 1.0); // Subtle blue glow
        final_color = mix(final_color, outer_glow_color, outer_glow * 0.15);
        

        final_color = clamp(final_color, 0.0, 1.0);
        gl_FragColor = vec4(final_color, shell_edge_alpha);
    }
`;

    const createShader = (gl, type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const timeLocation = gl.getUniformLocation(program, 'u_time');

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1,
    ]), gl.STATIC_DRAW);
    gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(program);
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    window.addEventListener('resize', resize);
    resize();

    const startTime = Date.now();
    const render = () => {
      const currentTime = (Date.now() - startTime) / 1000.0;
      gl.clearColor(0.0, 0.0, 0.0, 0.0); // RGBA, alpha = 0 = fully transparent
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform1f(timeLocation, currentTime);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      requestAnimationFrame(render);
    };
    render();

    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full rounded-full"
      style={{ display: 'block', backgroundColor: 'transparent' }}
    />
  );
}

// Optional helper to strip shader indentation
function stripIndents(str) {
  return str.split('\n').map(s => s.trim()).join('\n');
}