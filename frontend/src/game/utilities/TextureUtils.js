import * as THREE from 'three';

export function applyTriplanarMapping(material, scale = 0.05) {
    material.onBeforeCompile = (shader) => {
        shader.vertexShader = `
            varying vec3 vLocalPos;
            varying vec3 vLocalNorm;
            ${shader.vertexShader}
        `.replace(
            '#include <begin_vertex>',
            `
            #include <begin_vertex>
            vLocalPos = position;
            vLocalNorm = normal;
            `
        );

        shader.fragmentShader = `
            varying vec3 vLocalPos;
            varying vec3 vLocalNorm;
            ${shader.fragmentShader}
        `.replace(
            '#include <map_fragment>',
            `
            #ifdef USE_MAP
                vec3 blend = abs(vLocalNorm);
                blend = normalize(max(blend, 0.00001));
                float b = blend.x + blend.y + blend.z;
                blend /= b;
                
                float texScale = ${scale};
                vec4 tx = texture2D(map, vLocalPos.yz * texScale);
                vec4 ty = texture2D(map, vLocalPos.xz * texScale);
                vec4 tz = texture2D(map, vLocalPos.xy * texScale);
                
                vec4 texColor = tx * blend.x + ty * blend.y + tz * blend.z;
                diffuseColor *= texColor;
            #endif
            `
        );
    };
}
